// src/index.ts
import { readFileSync } from "node:fs";

// src/service.ts
import http4 from "node:http";
import { randomUUID } from "node:crypto";

// src/tailscale.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { posix, win32 } from "node:path";
import { homedir } from "node:os";

// src/protocol.ts
import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
var PROTOCOL = 1;
var PORTS = Object.freeze(Array.from({ length: 16 }, (_, i) => 42180 + i));
var DISCOVERY = "/.well-known/tailseek";
var ID_HEADER = "x-tailseek-instance";
var BOOT_HEADER = "x-tailseek-boot";
var AUTH_HEADER = "x-tailseek-internal";
function equalSecret(a, b) {
  return typeof a === "string" && typeof b === "string" && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function instanceId(scope) {
  return createHash("sha256").update(scope).digest("hex").slice(0, 32);
}
function isLoopback(ip = "") {
  return ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1";
}
function tailIP(ip) {
  if (typeof ip !== "string") return false;
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 100 && b >= 64 && b <= 127;
  }
  return isIP(ip) === 6 && ip.toLowerCase().startsWith("fd7a:115c:a1e0:");
}
function compatible(version) {
  return /^0\.2\.2-rc\.[23]$/.test(version);
}
function parseAdvertisement(value, nodeId) {
  if (typeof value !== "object" || value === null) throw new Error("incompatible-advertisement");
  const data = value;
  if (data.protocol !== PROTOCOL || data.nodeId !== nodeId || typeof data.id !== "string" || !/^[a-f0-9]{32}$/.test(data.id) || typeof data.boot !== "string" || !/^[a-f0-9-]{36}$/.test(data.boot) || typeof data.version !== "string" || data.version.length > 64 || typeof data.label !== "string" || data.label.length > 120 || data.surface !== "web" && data.surface !== "desktop") throw new Error("incompatible-advertisement");
  return {
    protocol: PROTOCOL,
    id: data.id,
    boot: data.boot,
    nodeId,
    label: data.label,
    version: data.version,
    surface: data.surface,
    compatible: compatible(data.version)
  };
}
function json(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(JSON.stringify(value));
}
async function boundedBody(req, limit = 8192) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("body-too-large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// src/tailscale.ts
var exec = promisify(execFile);
function cliCandidates(platform = process.platform, env = process.env, home = homedir(), exists = existsSync) {
  const isWindows = platform === "win32";
  const path = isWindows ? win32 : posix;
  const executable = isWindows ? "tailscale.exe" : "tailscale";
  const fromPath = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, executable));
  const standard = platform === "darwin" ? [
    "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
    path.join(home, "Applications/Tailscale.app/Contents/MacOS/Tailscale"),
    "/opt/homebrew/bin/tailscale",
    "/usr/local/bin/tailscale"
  ] : isWindows ? [
    path.join(env.ProgramFiles ?? "C:\\Program Files", "Tailscale", executable),
    ...env.LOCALAPPDATA ? [path.join(env.LOCALAPPDATA, "Tailscale", executable)] : []
  ] : ["/usr/bin/tailscale", "/usr/local/bin/tailscale", "/opt/bin/tailscale"];
  return [...new Set([...fromPath, ...standard].filter((file) => exists(file)))];
}
function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid-tailscale-response");
  return value;
}
function strings(value) {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) throw new Error("invalid-tailscale-response");
  return value;
}
function parseNode(value) {
  const node = object(value);
  if (typeof node.ID !== "string" || typeof node.UserID !== "number") throw new Error("invalid-tailscale-response");
  return {
    ID: node.ID,
    UserID: node.UserID,
    TailscaleIPs: strings(node.TailscaleIPs),
    Online: node.Online !== false,
    HostName: typeof node.HostName === "string" ? node.HostName : void 0,
    DNSName: typeof node.DNSName === "string" ? node.DNSName : void 0
  };
}
function parseStatus(value) {
  const data = object(value);
  if (data.BackendState !== "Running") throw new Error("tailscale-not-running");
  if (data.TUN === false) throw new Error("tailscale-userspace-unsupported");
  const peers = Object.fromEntries(Object.entries(object(data.Peer ?? {})).map(([key, peer]) => [key, parseNode(peer)]));
  return { BackendState: data.BackendState, Self: parseNode(data.Self), Peer: peers, TailscaleIPs: strings(data.TailscaleIPs) };
}
function parseIdentity(value) {
  const node = object(object(value).Node);
  if (typeof node.StableID !== "string" || typeof node.User !== "number") throw new Error("invalid-tailscale-response");
  return { Node: { StableID: node.StableID, User: node.User, Expired: node.Expired === true, Addresses: strings(node.Addresses) } };
}
var Tailscale = class {
  allowedNodes;
  execute;
  candidatesCLI;
  cli;
  status;
  checkedAt = 0;
  error = "tailscale-unavailable";
  identities = /* @__PURE__ */ new Map();
  constructor({ cli, allowedNodes = [], execute = exec } = {}) {
    this.candidatesCLI = cli ? [cli] : cliCandidates();
    this.allowedNodes = new Set(allowedNodes);
    this.execute = execute;
  }
  async command(args, cli = this.cli) {
    if (!cli) throw new Error("tailscale-cli-missing");
    const { stdout } = await this.execute(cli, args, { timeout: 4e3, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
    return JSON.parse(stdout);
  }
  async refresh() {
    this.error = this.candidatesCLI.length ? "tailscale-unavailable" : "tailscale-cli-missing";
    for (const cli of this.cli ? [this.cli] : this.candidatesCLI) {
      try {
        const status = parseStatus(await this.command(["status", "--json"], cli));
        this.cli = cli;
        this.status = status;
        this.checkedAt = Date.now();
        this.error = void 0;
        return status;
      } catch (error) {
        if (error instanceof Error && ["tailscale-not-running", "tailscale-userspace-unsupported"].includes(error.message)) this.error = error.message;
      }
    }
    this.status = void 0;
    this.checkedAt = 0;
    this.identities.clear();
    this.cli = void 0;
    return void 0;
  }
  permitted(nodeId, userId) {
    return !!this.status && Date.now() - this.checkedAt < 12e3 && (this.allowedNodes.has(nodeId) || userId === this.status.Self.UserID && userId > 0);
  }
  candidates() {
    if (!this.status) return [];
    return [this.status.Self, ...Object.values(this.status.Peer)].filter((p) => p.Online !== false && this.permitted(p.ID, p.UserID)).flatMap((p) => {
      const ips = p.TailscaleIPs.filter(tailIP);
      const ip = ips.find((ip2) => !ip2.includes(":")) ?? ips[0];
      return ip ? [{ nodeId: p.ID, ip, label: p.DNSName?.split(".")[0] || p.HostName || "Harness" }] : [];
    });
  }
  async authorize(address) {
    const ip = address?.replace(/^::ffff:/, "");
    if (!tailIP(ip) || !this.status) return false;
    try {
      let cached = this.identities.get(ip);
      if (!cached || cached.until < Date.now()) {
        if (this.identities.size > 256) this.identities.clear();
        cached = { until: Date.now() + 4e3, pending: this.command(["whois", "--json", ip]).then(parseIdentity) };
        this.identities.set(ip, cached);
      }
      const { Node: node } = await cached.pending;
      return !node.Expired && this.permitted(node.StableID, node.User) && node.Addresses.some((address2) => address2.split("/")[0] === ip);
    } catch {
      return false;
    }
  }
};

// src/discovery.ts
import http from "node:http";
var directPeerFetch = async (input, init) => {
  const url = new URL(String(input));
  return new Promise((resolve, reject) => {
    const request = http.get(url, { agent: new http.Agent({ keepAlive: false }), signal: init?.signal ?? void 0 }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error("discovery-unavailable"));
        return;
      }
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > 4096) {
          response.destroy(new Error("advertisement-too-large"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => resolve(new Response(Buffer.concat(chunks), { status: 200 })));
    });
    request.on("error", reject);
  });
};
var Discovery = class {
  tailscale;
  ports;
  timeout;
  fetcher;
  instances;
  running;
  constructor(tailscale, { ports = PORTS, timeout = 1200, fetcher = directPeerFetch } = {}) {
    this.tailscale = tailscale;
    this.ports = ports;
    this.timeout = timeout;
    this.fetcher = fetcher;
    this.instances = /* @__PURE__ */ new Map();
    this.running = false;
  }
  async scan() {
    if (this.running) return;
    this.running = true;
    try {
      const jobs = this.tailscale.candidates().flatMap((node) => this.ports.map((port) => ({ node, port })));
      const found = /* @__PURE__ */ new Map();
      await Promise.all(Array.from({ length: Math.min(24, jobs.length) }, async () => {
        while (jobs.length) {
          const { node, port } = jobs.shift();
          const origin = `http://${node.ip.includes(":") ? `[${node.ip}]` : node.ip}:${port}`;
          try {
            const started = performance.now();
            const response = await this.fetcher(`${origin}${DISCOVERY}`, {
              signal: AbortSignal.timeout(this.timeout),
              redirect: "error"
            });
            if (!response.ok) continue;
            const text = await response.text();
            const latencyMs = Math.ceil(performance.now() - started);
            if (text.length > 4096) continue;
            const ad = parseAdvertisement(JSON.parse(text), node.nodeId);
            const key = `${ad.nodeId}/${ad.id}`;
            if (found.has(key)) {
              found.set(key, null);
              continue;
            }
            found.set(key, { ...ad, key, origin, machine: node.label, online: true, seen: Date.now(), latencyMs });
          } catch {
          }
        }
      }));
      for (const [key, item] of this.instances) {
        if (!found.get(key)) this.instances.set(key, { ...item, online: false });
      }
      for (const [key, item] of found) if (item) this.instances.set(key, item);
    } finally {
      this.running = false;
    }
  }
  get(key) {
    const item = this.instances.get(key);
    if (!item || !this.tailscale.status || Date.now() - item.seen > 12e3) return item && { ...item, online: false };
    return item;
  }
  list() {
    return [...this.instances.keys()].map((key) => {
      const { origin, seen, latencyMs, ...publicItem } = this.get(key);
      return publicItem.online ? { ...publicItem, latencyMs } : publicItem;
    });
  }
};

// src/view.ts
import http3 from "node:http";
import { randomBytes } from "node:crypto";

// src/proxy.ts
import http2 from "node:http";
import { pipeline } from "node:stream";
var STRIP = /* @__PURE__ */ new Set([
  "host",
  "cookie",
  "authorization",
  "origin",
  "referer",
  "forwarded",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  AUTH_HEADER,
  ID_HEADER,
  BOOT_HEADER,
  "connection",
  "proxy-authorization",
  "proxy-authenticate",
  "keep-alive",
  "te",
  "trailer",
  "transfer-encoding"
]);
function proxyHeaders(req, target, extra, upgrade = false) {
  const headers = {};
  const connectionHeaders = new Set(String(req.headers.connection ?? "").toLowerCase().split(",").map((x) => x.trim()));
  for (const [key, value] of Object.entries(req.headers)) {
    if (!STRIP.has(key) && !connectionHeaders.has(key) && !key.startsWith("sec-fetch-")) headers[key] = value;
  }
  headers.host = new URL(target).host;
  headers["accept-encoding"] = "identity";
  if (upgrade) {
    headers.connection = "Upgrade";
    headers.upgrade = "websocket";
  }
  return { ...headers, ...extra };
}
function options(req, target, headers) {
  const url = new URL(target);
  if (!req.url?.startsWith("/") || req.url.startsWith("//") || /[\r\n]/.test(req.url)) throw new Error("invalid-path");
  if (url.protocol !== "http:") throw new Error("unsupported-upstream-protocol");
  return {
    hostname: url.hostname.replace(/^\[|\]$/g, ""),
    port: url.port,
    protocol: url.protocol,
    method: req.method,
    path: req.url,
    headers
  };
}
function relayHTTP(req, res, target, extra = {}, agent = new http2.Agent()) {
  let upstream;
  try {
    const opts = options(req, target, proxyHeaders(req, target, extra));
    upstream = http2.request({ ...opts, agent }, (response) => {
      const headers = { ...response.headers };
      delete headers["set-cookie"];
      delete headers[AUTH_HEADER];
      if (headers.location && (!headers.location.startsWith("/") || headers.location.startsWith("//") || /token=/i.test(headers.location))) {
        response.resume();
        json(res, 502, { error: "upstream-redirect-refused" });
        return;
      }
      delete headers["transfer-encoding"];
      delete headers.connection;
      res.writeHead(response.statusCode ?? 502, headers);
      pipeline(response, res, () => {
      });
    });
  } catch {
    json(res, 400, { error: "invalid-request" });
    return;
  }
  upstream.setTimeout(3e4, () => upstream.destroy());
  upstream.on("error", () => {
    if (!res.headersSent) json(res, 503, { error: "target-offline" });
    else res.destroy();
  });
  res.on("close", () => upstream.destroy());
  pipeline(req, upstream, () => {
  });
}
function relayUpgrade(req, socket, head, target, extra = {}, sockets = /* @__PURE__ */ new Set(), agent = new http2.Agent()) {
  if (req.url !== "/api/remote.mux") {
    socket.destroy();
    return;
  }
  const opts = options(req, target, proxyHeaders(req, target, extra, true));
  const request = http2.request({ ...opts, agent });
  sockets.add(socket);
  const fail = () => {
    socket.destroy();
    request.destroy();
    sockets.delete(socket);
  };
  socket.on("error", fail);
  socket.on("close", fail);
  request.on("error", fail);
  request.on("response", (response) => {
    response.resume();
    fail();
  });
  request.setTimeout(5e3, fail);
  request.on("upgrade", (response, upstream, upstreamHead) => {
    request.setTimeout(0);
    sockets.add(upstream);
    upstream.on("error", fail);
    upstream.on("close", () => {
      sockets.delete(upstream);
      fail();
    });
    socket.on("close", () => upstream.destroy());
    const headers = Object.entries(response.headers).filter(([key]) => !["set-cookie", AUTH_HEADER].includes(key)).map(([key, value]) => `${key}: ${value}`).join("\r\n");
    socket.write(`HTTP/1.1 101 Switching Protocols\r
${headers}\r
\r
`);
    if (upstreamHead.length) socket.write(upstreamHead);
    if (head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  request.end();
}
function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const error = (err) => {
      server.off("listening", ready);
      reject(err);
    };
    const ready = () => {
      server.off("error", error);
      resolve(server.address().port);
    };
    server.once("error", error);
    server.once("listening", ready);
    server.listen(port, host);
  });
}
async function closeServer(server, sockets = /* @__PURE__ */ new Set()) {
  for (const socket of sockets) socket.destroy();
  server.closeAllConnections();
  if (server.listening) await new Promise((resolve) => server.close(resolve));
}

// src/view.ts
var TargetView = class {
  key;
  discovery;
  sockets;
  secret;
  ticket;
  cookie;
  created;
  lastUsed;
  boot;
  server;
  origin = "";
  constructor(key, discovery) {
    this.key = key;
    this.discovery = discovery;
    this.sockets = /* @__PURE__ */ new Set();
    this.secret = randomBytes(32).toString("base64url");
    this.ticket = randomBytes(32).toString("base64url");
    this.cookie = `tailseek_${randomBytes(12).toString("hex")}`;
    this.created = Date.now();
    this.lastUsed = Date.now();
    this.boot = discovery.get(key)?.boot;
    this.server = http3.createServer((req, res) => {
      this.handle(req, res).catch(() => {
        if (!res.headersSent) json(res, 400, { error: "invalid-request" });
        else res.destroy();
      });
    });
    this.server.on("upgrade", (req, socket, head) => {
      const target = this.target();
      if (!this.authorized(req) || !target) {
        socket.destroy();
        return;
      }
      relayUpgrade(req, socket, head, target.origin, this.headers(target), this.sockets);
    });
  }
  async start() {
    const port = await listen(this.server, 0, "127.0.0.1");
    this.origin = `http://127.0.0.1:${port}`;
    return { origin: this.origin, ticket: this.ticket };
  }
  target() {
    const target = this.discovery.get(this.key);
    return target?.online && target.compatible && target.boot === this.boot ? target : void 0;
  }
  headers(target) {
    return { [ID_HEADER]: target.id, [BOOT_HEADER]: this.boot };
  }
  authorized(req) {
    if (!isLoopback(req.socket.remoteAddress) || req.headers.host !== new URL(this.origin).host) return false;
    if (req.headers.origin && req.headers.origin !== this.origin) return false;
    const pair = String(req.headers.cookie ?? "").split(";").map((x) => x.trim()).find((x) => x.startsWith(`${this.cookie}=`));
    return equalSecret(pair?.slice(this.cookie.length + 1), this.secret);
  }
  async handle(req, res) {
    if (req.url === "/__tailseek/enter" && req.method === "POST") {
      if (!isLoopback(req.socket.remoteAddress) || req.headers.host !== new URL(this.origin).host) {
        json(res, 403, { error: "forbidden" });
        return;
      }
      const body = new URLSearchParams(await boundedBody(req));
      if (!this.ticket || Date.now() - this.created > 3e4 || !equalSecret(body.get("ticket"), this.ticket)) {
        json(res, 401, { error: "entry-expired" });
        return;
      }
      this.ticket = void 0;
      res.writeHead(303, {
        location: "/",
        "cache-control": "no-store",
        "set-cookie": `${this.cookie}=${this.secret}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/`
      });
      res.end();
      return;
    }
    if (!this.authorized(req)) {
      json(res, 401, { error: "unauthorized" });
      return;
    }
    this.lastUsed = Date.now();
    const target = this.target();
    if (!target) {
      json(res, 503, { error: "target-offline-or-restarted" });
      return;
    }
    if (req.url?.startsWith("/api/tailseek/")) {
      json(res, 403, { error: "nested-control-disabled" });
      return;
    }
    relayHTTP(req, res, target.origin, this.headers(target));
  }
  suspend() {
    for (const socket of this.sockets) socket.destroy();
    this.server.closeAllConnections();
  }
  close() {
    return closeServer(this.server, this.sockets);
  }
};

// src/directory.ts
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// src/types.ts
var REMOTE_DIRECTORY = "/__tailseek/workspace-directory";
var DIRECTORY_CAPABILITY = "x-tailseek-directory-browser";
var REMOTE_ATTACHMENT = "/__tailseek/workspace-attachment";
var ATTACHMENT_CAPABILITY = "x-tailseek-workspace-attachment";
var ATTACHMENT_VERSION = "2";

// src/directory.ts
async function loadDirectoryBrowser(ctx, installAnchor) {
  try {
    const webBundle = createRequire(installAnchor).resolve("@deepseek-ai/dsh-web-app/package.json");
    const entry = createRequire(webBundle).resolve("@deepseek-ai/dsh-host-directory-picker-browse");
    const { default: browse } = await import(pathToFileURL(entry).href);
    const scope = ctx.isolate("directoryPicker");
    const fiber = scope.plugin(browse, { maxEntries: 1e3 });
    try {
      await fiber.await();
      const browser = scope.get("directoryPicker")?.capability();
      if (browser?.kind === "browse") return browser;
    } catch {
    }
    await fiber.dispose();
  } catch {
  }
  return void 0;
}
function directoryRequest(input) {
  if (typeof input !== "object" || input === null || !("action" in input)) return;
  const path = "path" in input ? input.path : void 0;
  if (path !== void 0 && (typeof path !== "string" || !path || path.includes("\0"))) return;
  if (input.action === "list") return { action: "list", path };
  if (input.action !== "create" || typeof path !== "string" || !("name" in input)) return;
  const name2 = input.name;
  if (typeof name2 !== "string" || !name2.trim() || name2 === "." || name2 === ".." || /[/\\\0]/.test(name2)) return;
  return { action: "create", path, name: name2 };
}
async function handleDirectory(req, res, browser) {
  if (!browser) {
    json(res, 404, { error: "directory-browser-unavailable" });
    return;
  }
  if (req.method === "HEAD") {
    res.writeHead(204, { "cache-control": "no-store", [DIRECTORY_CAPABILITY]: "1" }).end();
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { error: "method-not-allowed" });
    return;
  }
  let request;
  try {
    request = directoryRequest(JSON.parse(await boundedBody(req)));
  } catch {
  }
  if (!request) {
    json(res, 400, { error: "invalid-directory-request" });
    return;
  }
  if (res.destroyed) return;
  const closed = new AbortController();
  const onClose = () => closed.abort();
  res.once("close", onClose);
  try {
    const result = request.action === "list" ? await browser.list(request.path, AbortSignal.any([closed.signal, AbortSignal.timeout(1e4)])) : { path: await browser.createDirectory(request.path, request.name) };
    if (!res.destroyed) json(res, 200, result);
  } catch (error) {
    if (res.destroyed) return;
    if (error && typeof error === "object" && "code" in error && error.code === "directory-exists") {
      json(res, 409, { error: "directory-exists" });
      return;
    }
    json(res, 422, { error: request.action === "list" ? "directory-unreadable" : "directory-create-failed" });
  } finally {
    res.off("close", onClose);
  }
}

// src/service.ts
var Tailseek = class {
  id;
  version;
  label;
  surface;
  upstream;
  credentials;
  tailscale;
  ports;
  directoryBrowser;
  remoteAttachment;
  boot;
  discovery;
  views;
  sockets;
  error;
  closed;
  scanInProgress;
  completedScans = 0;
  server;
  ip;
  constructor({
    id,
    version,
    label,
    surface,
    upstream,
    credentials,
    tailscale = new Tailscale(),
    ports = PORTS,
    directoryBrowser,
    remoteAttachment
  }) {
    this.id = id;
    this.version = version;
    this.label = label;
    this.surface = surface;
    this.upstream = upstream;
    this.credentials = credentials;
    this.tailscale = tailscale;
    this.ports = ports;
    this.directoryBrowser = directoryBrowser;
    this.remoteAttachment = remoteAttachment;
    this.boot = randomUUID();
    this.discovery = new Discovery(tailscale, { ports });
    this.views = /* @__PURE__ */ new Map();
    this.sockets = /* @__PURE__ */ new Set();
    this.error = "starting";
    this.closed = false;
  }
  advertisement() {
    return {
      protocol: PROTOCOL,
      id: this.id,
      boot: this.boot,
      nodeId: this.tailscale.status.Self.ID,
      version: this.version,
      label: this.label,
      surface: this.surface
    };
  }
  async admit(req) {
    if (req.headers.origin || req.headers["sec-fetch-site"] || !await this.tailscale.authorize(req.socket.remoteAddress)) return false;
    return true;
  }
  matches(req) {
    return req.headers[ID_HEADER] === this.id && req.headers[BOOT_HEADER] === this.boot;
  }
  async startListener(ip) {
    const server = http4.createServer((req, res) => {
      (async () => {
        if (!await this.admit(req)) {
          json(res, 403, { error: "tailnet-access-denied" });
          return;
        }
        if (req.url === DISCOVERY && req.method === "GET") {
          json(res, 200, this.advertisement());
          return;
        }
        if (!this.matches(req)) {
          json(res, 409, { error: "instance-changed" });
          return;
        }
        if (req.url === REMOTE_DIRECTORY) {
          await handleDirectory(req, res, await this.directoryBrowser);
          return;
        }
        if (req.url === REMOTE_ATTACHMENT && this.remoteAttachment) {
          await this.remoteAttachment(req, res);
          return;
        }
        if (req.url?.startsWith("/api/tailseek/") || req.url?.startsWith("/connect") || /[?&]token=/i.test(req.url ?? "")) {
          json(res, 403, { error: "control-route-denied" });
          return;
        }
        relayHTTP(req, res, this.upstream(), this.credentials());
      })().catch(() => {
        if (!res.headersSent) json(res, 503, { error: "tailnet-unavailable" });
        else res.destroy();
      });
    });
    server.headersTimeout = 1e4;
    server.requestTimeout = 6e4;
    server.maxConnections = 128;
    server.on("upgrade", (req, socket, head) => {
      (async () => {
        if (!await this.admit(req) || !this.matches(req)) {
          socket.destroy();
          return;
        }
        relayUpgrade(req, socket, head, this.upstream(), this.credentials(), this.sockets);
      })().catch(() => socket.destroy());
    });
    for (const port of this.ports) {
      try {
        await listen(server, port, ip);
        this.server = server;
        this.ip = ip;
        return;
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "EADDRINUSE")) {
          await closeServer(server);
          throw error;
        }
      }
    }
    throw new Error("instance-ports-exhausted");
  }
  async tick() {
    if (this.closed) return;
    this.scanInProgress ??= this.scan().finally(() => {
      this.completedScans++;
      this.scanInProgress = void 0;
    });
    return this.scanInProgress;
  }
  refresh() {
    if (this.closed) throw new Error("tailseek-closed");
    void this.tick();
    return { boot: this.boot, sequence: this.completedScans + 1 };
  }
  async scan() {
    try {
      this.upstream();
      await this.tailscale.refresh();
      const ips = this.tailscale.status?.TailscaleIPs;
      const ip = ips?.find((ip2) => !ip2.includes(":")) ?? ips?.[0];
      if ((!ip || ip !== this.ip) && this.server) {
        await closeServer(this.server, this.sockets);
        this.server = void 0;
        this.ip = void 0;
      }
      if (ip && !this.server && !this.closed) await this.startListener(ip);
      if (this.closed) return;
      await this.discovery.scan();
      this.error = this.tailscale.error;
      for (const [id, view] of this.views) {
        if (!view.target()) view.suspend();
        const expiry = view.ticket ? 3e4 : 60 * 60 * 1e3;
        if (!view.sockets.size && Date.now() - view.lastUsed > expiry) {
          await view.close();
          this.views.delete(id);
        }
      }
    } catch {
      this.error = "listener-unavailable";
    }
  }
  snapshot() {
    return {
      local: { id: this.id, version: this.version, surface: this.surface },
      error: this.error,
      instances: this.discovery.list().filter((item) => item.id !== this.id || item.nodeId !== this.tailscale.status?.Self.ID),
      lastScan: { boot: this.boot, sequence: this.completedScans }
    };
  }
  async open(key) {
    const target = this.discovery.get(key);
    if (!target?.online || !target.compatible) throw new Error("target-unavailable");
    if (this.views.size >= 32) throw new Error("too-many-views");
    const view = new TargetView(key, this.discovery);
    const id = randomUUID();
    const entry = await view.start();
    this.views.set(id, view);
    return { ...entry, viewId: id, boot: target.boot };
  }
  async release(id) {
    const view = this.views.get(id);
    if (!view) return;
    this.views.delete(id);
    await view.close();
  }
  async close() {
    this.closed = true;
    await this.scanInProgress;
    await Promise.all([...this.views.values()].map((view) => view.close()));
    this.views.clear();
    if (this.server) await closeServer(this.server, this.sockets);
  }
};

// src/harness.ts
import { randomBytes as randomBytes2 } from "node:crypto";
function harnessCredentials(ctx) {
  const connection = ctx.connection;
  if (typeof connection.authenticatedUrl === "function" && typeof connection.authorizeIndex === "function") {
    let cookie = "";
    let expires = 0;
    return () => {
      if (Date.now() < expires) return { cookie };
      const origin = ctx.webServer.getOrigin();
      const signed = new URL(connection.authenticatedUrl(origin));
      let status = 0;
      connection.authorizeIndex({ method: "GET", url: `${signed.pathname}${signed.search}`, headers: { host: signed.host } }, {
        writeHead(code, headers) {
          status = code;
          cookie = headers?.["set-cookie"]?.split(";")[0] ?? "";
        },
        end() {
        }
      });
      if (status !== 303 || !cookie) throw new Error("harness-authentication-unavailable");
      expires = Date.now() + 60 * 60 * 1e3;
      return { cookie };
    };
  }
  const registry = ctx.get("connection.authentication");
  if (!registry || typeof registry.register !== "function") throw new Error("unsupported-harness-authentication");
  const secret = randomBytes2(32).toString("base64url");
  const peer = connection.createPeer({ principal: { kind: "owner" }, interactions: "answer" });
  registry.register({ authenticate(request) {
    const value = request.headers instanceof Headers ? request.headers.get(AUTH_HEADER) : request.headers[AUTH_HEADER];
    return equalSecret(value, secret) ? peer : void 0;
  } });
  return () => ({ [AUTH_HEADER]: secret });
}

// src/attachment.ts
import { homedir as homedir2 } from "node:os";
import { basename, dirname, join, normalize, parse } from "node:path";
var imageTypes = /* @__PURE__ */ new Map([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["webp", "image/webp"],
  ["gif", "image/gif"]
]);
function isHostPath(path, platform = process.platform) {
  if (path.includes("\0")) return false;
  if (platform !== "win32") return path.startsWith("/");
  return /^[a-z]:[/\\]/i.test(path) || /^[/\\]{2}[^/\\?.][^/\\]*[/\\][^/\\]+/.test(path);
}
function attachmentRequest(input) {
  if (!input || typeof input !== "object" || !("sessionId" in input) || !("action" in input)) return;
  const { sessionId, action } = input;
  if (typeof sessionId !== "string" || !sessionId || sessionId.length > 200) return;
  if ("path" in input) {
    if (typeof input.path !== "string" || !isHostPath(input.path)) return;
    const path = normalize(input.path);
    if (action === "list") return { sessionId, action, path };
    if (action === "stage") return { sessionId, action, path };
  }
  if (action === "list" && "place" in input && (input.place === "workspace" || input.place === "home")) {
    return { sessionId, action, place: input.place };
  }
}
async function listFiles(fs, selectedPath, signal) {
  const target = await fs.resolve(selectedPath, { signal });
  const info = await fs.stat(target, signal);
  if (info?.type !== "directory" && info?.type !== "file") throw new Error("invalid-file");
  const picked = info.type === "file" ? selectedPath : void 0;
  const path = picked ? dirname(picked) : selectedPath;
  const parent = dirname(path);
  const folder = picked ? await fs.resolve(path, { signal }) : target;
  const entries = (await fs.listDir(folder, signal)).flatMap(({ name: name2, type, size }) => type === "other" ? [] : [{ name: name2, type, size, path: join(path, name2) }]);
  entries.sort((a, b) => Number(a.type === "file") - Number(b.type === "file") || a.name.localeCompare(b.name));
  const limit = 1e3;
  const visible = entries.slice(0, limit);
  if (picked && !visible.some((entry) => entry.path === picked)) {
    visible.unshift({ name: basename(picked), type: "file", size: info.size, path: picked });
  }
  return {
    path,
    parent: parent === path ? void 0 : parent,
    root: parse(path).root,
    entries: visible,
    truncated: entries.length > limit,
    picked
  };
}
async function* readFile(fs, target, size, version, signal) {
  for (let offset = 0; offset < size; ) {
    signal.throwIfAborted();
    const length = Math.min(1024 * 1024, size - offset);
    const bytes = await fs.readByteRange(target, { offset, length }, signal);
    if (bytes.byteLength !== length) throw new Error("remote-file-changed");
    offset += length;
    yield bytes;
  }
  const current = await fs.stat(target, signal);
  if (current?.version !== version || current.size !== size) throw new Error("remote-file-changed");
}
async function handleRemoteAttachment(ctx, req, res) {
  const fs = ctx.get("fs");
  const uploads = ctx.get("fileUploads");
  const sessions = ctx.get("sessions");
  const attachments = ctx.get("attachments");
  const sandbox = ctx.get("sandboxPolicy");
  if (typeof fs?.readByteRange !== "function" || typeof fs.listDir !== "function" || typeof uploads?.uploadStream !== "function" || typeof uploads.uploadImageStream !== "function" || typeof sessions?.get !== "function" || typeof attachments?.readImage !== "function") {
    json(res, 404, { error: "remote-attachment-unavailable" });
    return;
  }
  if (req.method === "HEAD") {
    res.writeHead(204, { "cache-control": "no-store", [ATTACHMENT_CAPABILITY]: ATTACHMENT_VERSION }).end();
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { error: "method-not-allowed" });
    return;
  }
  let request;
  try {
    request = attachmentRequest(JSON.parse(await boundedBody(req)));
  } catch {
  }
  if (!request) {
    json(res, 400, { error: "invalid-remote-file" });
    return;
  }
  if (res.destroyed) return;
  const controller = new AbortController();
  const onClose = () => controller.abort();
  res.once("close", onClose);
  const signal = controller.signal;
  try {
    const header = sessions.get(request.sessionId)?.header;
    if (!header || header.origin === "subagent") throw new Error("session-unavailable");
    if (request.action === "list") {
      const workspace = header.cwd ?? sandbox?.workspaceRoot;
      const path = "path" in request ? request.path : request.place === "workspace" && workspace && isHostPath(workspace) ? workspace : homedir2();
      const listing = await listFiles(fs, normalize(path), AbortSignal.any([signal, AbortSignal.timeout(1e4)]));
      if (!res.destroyed) json(res, 200, listing);
      return;
    }
    const target = await fs.resolve(request.path, { signal });
    const stat = await fs.stat(target, signal);
    const size = stat?.size;
    if (stat?.type !== "file" || size === void 0 || !Number.isSafeInteger(size) || size < 0) throw new Error("invalid-file");
    const name2 = basename(request.path);
    const input = { sessionId: request.sessionId, data: readFile(fs, target, size, stat.version, signal), signal, name: name2 };
    const dot = name2.lastIndexOf(".");
    const mediaType = dot > 0 ? imageTypes.get(name2.slice(dot + 1).toLowerCase()) : void 0;
    let result;
    if (mediaType) {
      const value = await uploads.uploadImageStream({ ...input, mediaType });
      const stored = await attachments.readImage(value.image, signal);
      result = { value, name: name2, bytes: size, preview: Buffer.from(stored.data).toString("base64") };
    } else {
      result = { value: await uploads.uploadStream(input), name: name2, bytes: size };
    }
    if (!res.destroyed) json(res, 200, result);
  } catch (error) {
    if (res.destroyed) return;
    if (error instanceof Error && error.message === "remote-file-changed") json(res, 409, { error: "remote-file-changed" });
    else json(res, 422, { error: "remote-file-unavailable" });
  } finally {
    res.off("close", onClose);
  }
}

// src/index.ts
import z from "@deepseek-ai/schemastery";
var Config = z.object({
  instanceName: z.string().max(120).default(""),
  allowedNodes: z.array(String).default([]),
  tailscaleCLI: z.string().default(""),
  refreshIntervalMs: z.natural().min(1e3).max(8e3).default(4e3)
});
var name = "tailseek";
var inject = ["connection", "webServer", "profileContext"];
function apply(ctx, config) {
  const profile = ctx.get("profileContext");
  const version = JSON.parse(readFileSync(profile.installAnchor, "utf8")).version;
  let supported = compatible(version) && ctx.webServer.protocol === "http:" && ["127.0.0.1", "::1"].includes(ctx.webServer.host);
  if (config.allowedNodes !== void 0 && (!Array.isArray(config.allowedNodes) || config.allowedNodes.some((n) => typeof n !== "string"))) {
    throw new Error("Tailseek allowedNodes must contain Tailscale stable node IDs");
  }
  if (config.instanceName !== void 0 && (typeof config.instanceName !== "string" || config.instanceName.length > 120)) {
    throw new Error("Tailseek instanceName must be at most 120 characters");
  }
  const surface = profile.name === "desktop" ? "desktop" : "web";
  const id = instanceId(`${profile.dir}
${profile.installAnchor}
${surface === "desktop" ? surface : new URL(ctx.webServer.getOrigin()).port}`);
  let credentials = () => {
    throw new Error("unsupported-harness");
  };
  try {
    if (supported) credentials = harnessCredentials(ctx);
  } catch {
    supported = false;
  }
  const service = new Tailseek({
    id,
    version,
    surface,
    credentials,
    label: config.instanceName || surface,
    upstream: () => ctx.webServer.getOrigin(),
    tailscale: new Tailscale({ allowedNodes: config.allowedNodes, cli: config.tailscaleCLI || void 0 }),
    directoryBrowser: supported ? loadDirectoryBrowser(ctx, profile.installAnchor) : void 0,
    remoteAttachment: supported ? (req, res) => handleRemoteAttachment(ctx, req, res) : void 0
  });
  const routes = [
    ["/api/tailseek/status", ["GET"], () => supported ? service.snapshot() : { ...service.snapshot(), error: "unsupported-harness" }],
    ["/api/tailseek/refresh", ["POST"], () => {
      if (!supported) throw new Error("unsupported-harness");
      return service.refresh();
    }],
    ["/api/tailseek/open", ["POST"], async (request) => {
      const data = await request.json();
      if (typeof data.key !== "string" || data.key.length > 200) throw new Error("invalid-target");
      return service.open(data.key);
    }],
    ["/api/tailseek/close", ["POST"], async (request) => {
      const data = await request.json();
      if (typeof data.viewId !== "string") throw new Error("invalid-view");
      await service.release(data.viewId);
      return { ok: true };
    }]
  ];
  for (const [path, methods, handler] of routes) ctx.connection.fetch.register({ path, methods, requestBody: "buffered", async fetch(request) {
    try {
      return Response.json(await handler(request), { headers: { "cache-control": "no-store" } });
    } catch {
      return Response.json({ error: "tailseek-operation-unavailable" }, { status: 409 });
    }
  } });
  ctx.effect(() => {
    if (!supported) return () => {
    };
    const timer = setInterval(() => {
      void service.tick();
    }, config.refreshIntervalMs);
    void service.tick();
    return async () => {
      clearInterval(timer);
      await service.close();
    };
  });
}
export {
  Config,
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
