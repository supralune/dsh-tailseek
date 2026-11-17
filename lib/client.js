window.__ModuleLoader__.load({id:"dsh-tailseek",factory(require){const module={exports:{}};const exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.ts
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var React3 = __toESM(require("react"), 1);

// src/directory-client.ts
var React = __toESM(require("react"), 1);

// src/types.ts
var REMOTE_DIRECTORY = "/__tailseek/workspace-directory";
var DIRECTORY_CAPABILITY = "x-tailseek-directory-browser";
var REMOTE_ATTACHMENT = "/__tailseek/workspace-attachment";
var ATTACHMENT_CAPABILITY = "x-tailseek-workspace-attachment";
var ATTACHMENT_VERSION = "2";

// src/directory-client.ts
var slots = ["conversation.hero.workspace.directoryFlow", "sidebar.workspaces.directoryFlow", "workspace.picker.directoryFlow"];
var messages = {
  zh: {
    title: "\u9009\u62E9\u8FDC\u7AEF\u5DE5\u4F5C\u533A\u76EE\u5F55",
    path: "\u8FDC\u7AEF\u7EDD\u5BF9\u8DEF\u5F84",
    go: "\u524D\u5F80",
    home: "\u4E3B\u76EE\u5F55",
    up: "\u4E0A\u4E00\u7EA7",
    folders: "\u6587\u4EF6\u5939",
    hidden: "\u663E\u793A\u9690\u85CF\u6587\u4EF6\u5939",
    empty: "\u6CA1\u6709\u53EF\u663E\u793A\u7684\u5B50\u6587\u4EF6\u5939",
    truncated: "\u6587\u4EF6\u5939\u8F83\u591A\uFF0C\u4EC5\u663E\u793A\u524D\u90E8\u5206\u7ED3\u679C\u3002",
    loading: "\u6B63\u5728\u8BFB\u53D6\u6587\u4EF6\u5939\u2026",
    unreadable: "\u65E0\u6CD5\u8BFB\u53D6\u6B64\u76EE\u5F55\u3002\u8BF7\u68C0\u67E5\u8DEF\u5F84\u548C\u8BBF\u95EE\u6743\u9650\u3002",
    exists: "\u540C\u540D\u6587\u4EF6\u6216\u6587\u4EF6\u5939\u5DF2\u5B58\u5728\u3002",
    createFailed: "\u65E0\u6CD5\u786E\u8BA4\u6587\u4EF6\u5939\u5DF2\u521B\u5EFA\u3002\u8BF7\u68C0\u67E5\u76EE\u5F55\u540E\u91CD\u8BD5\u3002",
    newFolder: "\u65B0\u5EFA\u6587\u4EF6\u5939",
    name: "\u6587\u4EF6\u5939\u540D\u79F0",
    create: "\u521B\u5EFA",
    creating: "\u6B63\u5728\u521B\u5EFA\u2026",
    cancel: "\u53D6\u6D88",
    select: "\u9009\u7528\u6B64\u76EE\u5F55"
  },
  en: {
    title: "Choose remote workspace folder",
    path: "Remote absolute path",
    go: "Go",
    home: "Home",
    up: "Up",
    folders: "Folders",
    hidden: "Show hidden folders",
    empty: "No folders to show",
    truncated: "This folder contains more entries than shown.",
    loading: "Loading folders\u2026",
    unreadable: "Could not read this folder. Check its path and access permissions.",
    exists: "A file or folder with this name already exists.",
    createFailed: "Could not confirm folder creation. Check the directory and try again.",
    newFolder: "New folder",
    name: "Folder name",
    create: "Create",
    creating: "Creating\u2026",
    cancel: "Cancel",
    select: "Use this folder"
  }
};
var h = React.createElement;
var directoryDialogCss = `
.tailseek-directory{box-sizing:border-box;width:min(560px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);margin:auto;padding:18px;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:12px;background:var(--dsw-alias-bg-base,Canvas);color:var(--dsw-alias-label-primary,CanvasText);font:14px system-ui}
.tailseek-directory::backdrop{background:rgb(0 0 0 / .35)}
.tailseek-directory h2{margin:0 0 14px;font-size:17px;font-weight:600}
.tailseek-directory button,.tailseek-directory input:not([type=checkbox]){box-sizing:border-box;min-height:32px;padding:4px 8px;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:6px;background:var(--dsw-alias-bg-base,Canvas);color:inherit;font:inherit}
.tailseek-directory button{cursor:pointer;white-space:nowrap}.tailseek-directory button:disabled{cursor:default;opacity:.5}
.tailseek-directory button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1,Canvas)}
.tailseek-directory :is(button,input):focus-visible{outline:2px solid Highlight;outline-offset:1px}
.tailseek-directory form,.tailseek-directory nav,.tailseek-directory footer{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tailseek-directory form input{flex:1;min-width:7em}.tailseek-directory nav{margin:8px 0}
.tailseek-directory nav label{display:flex;align-items:center;gap:4px;margin-inline-start:auto;font-size:12px}
.tailseek-directory ul{box-sizing:border-box;height:min(260px,38dvh);overflow:auto;margin:0;padding:4px;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:6px;list-style:none}
.tailseek-directory ul button{width:100%;border-color:transparent;text-align:start;white-space:normal;overflow-wrap:anywhere}
.tailseek-directory p{margin:8px 0;color:var(--dsw-alias-label-secondary,GrayText);line-height:1.5}
.tailseek-directory ul>li>p{margin:5px 8px}.tailseek-directory footer,.tailseek-directory .tailseek-create-folder{margin-top:10px}
.tailseek-directory footer>button:nth-last-child(2){margin-inline-start:auto}
.tailseek-directory footer .tailseek-use-folder{background:var(--dsw-alias-bg-layer-1,Canvas);font-weight:600}
`;
async function requestDirectory(request2, signal) {
  const response = await fetch(REMOTE_DIRECTORY, {
    method: "POST",
    credentials: "same-origin",
    redirect: "error",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request2),
    signal: AbortSignal.any([signal, AbortSignal.timeout(12e3)])
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error === "directory-exists" ? "directory-exists" : "directory-request-failed");
  }
  return response.json();
}
function DirectoryDialog({ busy, onCancel, onPicked, t }) {
  const dialog = React.useRef(null);
  const request2 = React.useRef(null);
  const titleId = React.useId();
  const [listing, setListing] = React.useState();
  const [path, setPath] = React.useState("");
  const [name, setName] = React.useState();
  const [hidden, setHidden] = React.useState(false);
  const [pending, setPending] = React.useState("list");
  const [error, setError] = React.useState();
  async function navigate(input) {
    if (request2.current) return;
    const controller = new AbortController();
    request2.current = controller;
    setPending(input.action);
    setError(void 0);
    let target = input.path;
    let errorKey2 = input.action === "create" ? "createFailed" : "unreadable";
    try {
      if (input.action === "create") {
        target = (await requestDirectory(input, controller.signal)).path;
        if (controller.signal.aborted) return;
        setName(void 0);
        setListing(void 0);
        setPath(target);
        setPending("list");
        errorKey2 = "unreadable";
      }
      const result = await requestDirectory({ action: "list", path: target }, controller.signal);
      if (controller.signal.aborted) return;
      setListing(result);
      setPath(result.path);
      setName(void 0);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error && cause.message === "directory-exists" ? "exists" : errorKey2);
    } finally {
      if (request2.current === controller) {
        request2.current = null;
        setPending(null);
      }
    }
  }
  React.useEffect(() => {
    const element = dialog.current;
    element.showModal();
    void navigate({ action: "list" });
    return () => {
      const active = request2.current;
      request2.current = null;
      active?.abort();
      element.close();
    };
  }, []);
  const disabled = busy || pending !== null;
  const parent = listing?.crumbs.at(-2);
  const folders = listing?.entries.filter((entry) => hidden || !entry.hidden) ?? [];
  const current = listing?.path === path ? listing : void 0;
  const go = (path2) => {
    void navigate({ action: "list", path: path2 });
  };
  const create = (event) => {
    event.preventDefault();
    if (!current || !name?.trim() || disabled) return;
    void navigate({ action: "create", path: current.path, name });
  };
  return h(
    React.Fragment,
    null,
    h("style", null, directoryDialogCss),
    h(
      "dialog",
      {
        className: "tailseek-directory",
        ref: dialog,
        "aria-labelledby": titleId,
        onCancel: (event) => {
          event.preventDefault();
          if (!busy) onCancel();
        }
      },
      h("h2", { id: titleId }, t("title")),
      h(
        "form",
        { onSubmit: (event) => {
          event.preventDefault();
          if (!disabled && path) go(path);
        } },
        h("input", {
          value: path,
          "aria-label": t("path"),
          placeholder: t("path"),
          spellCheck: false,
          disabled,
          onChange: (event) => setPath(event.currentTarget.value)
        }),
        h("button", { type: "submit", disabled: disabled || !path }, t("go"))
      ),
      h(
        "nav",
        { "aria-label": t("folders") },
        h("button", { type: "button", disabled, onClick: () => go(listing?.home) }, t("home")),
        h("button", { type: "button", disabled: disabled || !parent, onClick: () => go(parent?.path) }, t("up")),
        h("label", null, h("input", {
          type: "checkbox",
          checked: hidden,
          onChange: (event) => setHidden(event.currentTarget.checked)
        }), t("hidden"))
      ),
      h(
        "ul",
        { "aria-label": t("folders"), "aria-busy": pending !== null },
        folders.map((entry) => h("li", { key: entry.path }, h("button", { type: "button", disabled, onClick: () => go(entry.path) }, entry.name))),
        listing && folders.length === 0 && h("li", null, h("p", null, t("empty")))
      ),
      pending && h("p", { role: "status" }, t(pending === "create" ? "creating" : "loading")),
      error && h("p", { role: "alert" }, t(error)),
      listing?.truncated && h("p", null, t("truncated")),
      name !== void 0 && h(
        "form",
        { className: "tailseek-create-folder", onSubmit: create },
        h("input", {
          value: name,
          "aria-label": t("name"),
          placeholder: t("name"),
          autoFocus: true,
          disabled,
          onChange: (event) => setName(event.currentTarget.value)
        }),
        h("button", { type: "submit", disabled: disabled || !current || !name.trim() }, t("create")),
        h("button", { type: "button", disabled, onClick: () => setName(void 0) }, t("cancel"))
      ),
      h(
        "footer",
        null,
        h("button", { type: "button", disabled: disabled || !current || name !== void 0, onClick: () => setName("") }, t("newFolder")),
        h("button", { type: "button", disabled: busy, onClick: onCancel }, t("cancel")),
        h("button", {
          type: "button",
          className: "tailseek-use-folder",
          disabled: disabled || !current || name !== void 0,
          onClick: () => {
            if (current) onPicked(current.path);
          }
        }, t("select"))
      )
    )
  );
}
function DirectoryFlow(props) {
  return props.open ? h(DirectoryDialog, props) : null;
}
async function enableRemoteDirectory(ctx, signal) {
  const response = await fetch(REMOTE_DIRECTORY, {
    method: "HEAD",
    credentials: "same-origin",
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(4e3)])
  });
  if (signal.aborted || response.status !== 204 || response.headers.get(DIRECTORY_CAPABILITY) !== "1") return;
  ctx.effect(() => ctx.locale.register("tailseek-directory", messages));
  for (const name of slots) {
    ctx.slots.inject(name, () => ctx.slots.register({ name, priority: -100, locale: "tailseek-directory" }, DirectoryFlow));
  }
}

// src/client/remote-files.ts
var React2 = __toESM(require("react"), 1);

// src/client/attachment-compat.ts
var remoteFileCommand = "tailseek-remote-file";
function findCommandSource(ctx) {
  const triggers = ctx.get("inputTriggers");
  if (!Array.isArray(triggers?.live?.sources)) return;
  return triggers.live.sources.find((entry) => entry.name === "command" && entry.trigger === "/" && typeof entry.candidates === "function");
}
function fileMenuRows(rows, localLabel) {
  const local = rows.find((row) => row.name === "file");
  const remote = rows.find((row) => row.name === remoteFileCommand);
  if (!local) return rows;
  const renamed = { ...local, label: localLabel };
  if (!remote) return rows.map((row) => row === local ? renamed : row);
  return rows.flatMap((row) => row === local ? [{ ...remote, section: local.section, icon: remote.icon ?? local.icon }, renamed] : row === remote ? [] : [row]);
}
function bindAttachmentDrafts(ctx, bindingFor, reselect) {
  const conversation = ctx.get("conversation");
  const upload = ctx.get("fileUpload");
  if (typeof conversation?.input?.for !== "function" || typeof conversation.createDrafts !== "function" || typeof conversation.releaseDraftAttachments !== "function" || typeof upload?.upload !== "function" || typeof upload.uploadImage !== "function") return;
  const files = /* @__PURE__ */ new WeakMap();
  for (const method of ["upload", "uploadImage"]) {
    const original = upload[method].bind(upload);
    const wrapped = (sessionId, file, ...args) => {
      const remote = files.get(file);
      if (!remote) return original(sessionId, file, ...args);
      if (remote.target.id !== sessionId || bindingFor(sessionId) !== remote.target.binding) {
        return Promise.reject(new Error(reselect()));
      }
      return Promise.resolve({ ok: true, value: remote.receipt });
    };
    ctx.accessor(`fileUpload.${method}`, { get: () => wrapped });
  }
  return (target, staged) => {
    const chosen = staged.map((item) => {
      const image = "image" in item.value ? item.value.image : void 0;
      const contents = item.preview ? [Uint8Array.from(atob(item.preview), (character) => character.charCodeAt(0))] : [];
      const file = new File(contents, item.name, { type: image?.mediaType });
      Object.defineProperty(file, "size", { value: item.bytes });
      files.set(file, { target, receipt: item.value });
      return file;
    });
    const input = conversation.input.for(target.binding.ctx);
    const drafts = conversation.createDrafts(target.id, chosen, true);
    if (!input.addAttachments(drafts.map((draft) => draft.id))) {
      conversation.releaseDraftAttachments(drafts);
      throw new Error("draft-unavailable");
    }
  };
}

// src/client/remote-files.ts
var messages2 = {
  zh: {
    remote: "\u8FDC\u7AEF\u9009\u53D6",
    local: "\u672C\u673A\u4E0A\u4F20",
    title: "\u9009\u53D6\u8FDC\u7AEF\u6587\u4EF6",
    workspace: "\u5F53\u524D\u5DE5\u4F5C\u533A",
    up: "\u4E0A\u4E00\u7EA7",
    home: "\u4E3B\u76EE\u5F55",
    root: "\u6839\u76EE\u5F55",
    path: "\u8FDC\u7AEF\u7EDD\u5BF9\u8DEF\u5F84",
    go: "\u524D\u5F80",
    hidden: "\u663E\u793A\u9690\u85CF\u6587\u4EF6",
    empty: "\u6B64\u76EE\u5F55\u6CA1\u6709\u53EF\u9009\u6587\u4EF6",
    truncated: "\u6761\u76EE\u8F83\u591A\uFF0C\u53EF\u8F93\u5165\u5B8C\u6574\u8DEF\u5F84\u76F4\u63A5\u5B9A\u4F4D\u3002",
    loading: "\u6B63\u5728\u8BFB\u53D6\u2026",
    unreadable: "\u65E0\u6CD5\u8BFB\u53D6\u6B64\u76EE\u5F55\u3002",
    failed: "\u65E0\u6CD5\u6DFB\u52A0\u9009\u4E2D\u7684\u6587\u4EF6\u3002\u8BF7\u68C0\u67E5\u6587\u4EF6\u540E\u91CD\u8BD5\u3002",
    cancel: "\u53D6\u6D88",
    add: "\u6DFB\u52A0\u5230\u6D88\u606F",
    preparing: "\u6B63\u5728\u51C6\u5907\u9644\u4EF6\u2026",
    reselect: "\u8BF7\u4E3A\u5F53\u524D\u4F1A\u8BDD\u91CD\u65B0\u9009\u53D6\u8FD9\u4E2A\u8FDC\u7AEF\u6587\u4EF6\u3002"
  },
  en: {
    remote: "Choose remote files",
    local: "Upload from this device",
    title: "Choose remote files",
    workspace: "Current workspace",
    up: "Up",
    home: "Home",
    root: "Root",
    path: "Remote absolute path",
    go: "Go",
    hidden: "Show hidden files",
    empty: "No files to choose in this folder",
    truncated: "The list is limited. Enter a full path to locate a file directly.",
    loading: "Loading\u2026",
    unreadable: "Could not read this folder.",
    failed: "Could not add the selected files. Check the files and try again.",
    cancel: "Cancel",
    add: "Add to message",
    preparing: "Preparing attachments\u2026",
    reselect: "Choose this remote file again for the current session."
  }
};
var h2 = React2.createElement;
var pickerCss = `
.tailseek-directory .tailseek-file-row{display:flex;align-items:center;gap:8px;min-height:32px;padding:0 8px;overflow-wrap:anywhere;cursor:pointer}
.tailseek-directory .tailseek-file-row:hover{background:var(--dsw-alias-bg-layer-1,Canvas)}
.tailseek-directory .tailseek-file-row small{margin-inline-start:auto;white-space:nowrap;color:var(--dsw-alias-label-secondary,GrayText)}
`;
function FilePicker({ t, close, list, add }) {
  const dialog = React2.useRef(null);
  const request2 = React2.useRef(null);
  const [listing, setListing] = React2.useState();
  const [pathInput, setPathInput] = React2.useState("");
  const [hidden, setHidden] = React2.useState(false);
  const [selected, setSelected] = React2.useState(() => /* @__PURE__ */ new Set());
  const [pending, setPending] = React2.useState("list");
  const [error, setError] = React2.useState();
  const id = React2.useId();
  async function run(action, operation) {
    if (request2.current) return;
    const controller = new AbortController();
    request2.current = controller;
    setPending(action);
    setError(void 0);
    try {
      await operation(controller.signal);
    } catch {
      if (!controller.signal.aborted) setError(action === "list" ? "unreadable" : "failed");
    } finally {
      if (request2.current === controller) {
        request2.current = null;
        setPending(null);
      }
    }
  }
  const go = (location) => {
    void run("list", async (signal) => {
      const next = await list(location, signal);
      if (signal.aborted) return;
      setListing(next);
      setPathInput(next.path);
      const picked = next.picked;
      if (picked) setSelected((old) => /* @__PURE__ */ new Set([...old, picked]));
    });
  };
  React2.useEffect(() => {
    const element = dialog.current;
    element.showModal();
    go({ place: "workspace" });
    return () => {
      const active = request2.current;
      request2.current = null;
      active?.abort();
      element.close();
    };
  }, []);
  const disabled = pending !== null;
  const entries = listing?.entries.filter((entry) => hidden || !entry.name.startsWith(".") || selected.has(entry.path)) ?? [];
  const rawSize = (size) => new Intl.NumberFormat(void 0, { style: "unit", unit: "byte" }).format(size);
  return h2(
    React2.Fragment,
    null,
    h2("style", null, directoryDialogCss + pickerCss),
    h2(
      "dialog",
      {
        ref: dialog,
        className: "tailseek-directory",
        "aria-labelledby": id,
        onCancel: (event) => {
          event.preventDefault();
          close();
        }
      },
      h2("h2", { id }, t("title")),
      h2(
        "form",
        { onSubmit: (event) => {
          event.preventDefault();
          if (!disabled && pathInput) go({ path: pathInput });
        } },
        h2("input", {
          value: pathInput,
          disabled,
          placeholder: t("path"),
          "aria-label": t("path"),
          spellCheck: false,
          onChange: (event) => setPathInput(event.currentTarget.value)
        }),
        h2("button", { type: "submit", disabled: disabled || !pathInput }, t("go"))
      ),
      h2(
        "nav",
        { "aria-label": t("workspace") },
        h2("button", { type: "button", disabled, onClick: () => go({ place: "workspace" }) }, t("workspace")),
        h2("button", { type: "button", disabled, onClick: () => go({ place: "home" }) }, t("home")),
        h2("button", {
          type: "button",
          disabled: disabled || !listing?.parent,
          onClick: () => {
            if (listing?.parent) go({ path: listing.parent });
          }
        }, t("up")),
        h2("button", {
          type: "button",
          disabled: disabled || !listing || listing.path === listing.root,
          onClick: () => {
            if (listing) go({ path: listing.root });
          }
        }, t("root")),
        h2("label", null, h2("input", {
          type: "checkbox",
          checked: hidden,
          onChange: (event) => setHidden(event.currentTarget.checked)
        }), t("hidden"))
      ),
      h2("ul", { "aria-busy": disabled }, entries.map((entry) => {
        const target = entry.path;
        return h2("li", { key: target }, entry.type === "directory" ? h2("button", { type: "button", disabled, onClick: () => go({ path: target }) }, `${entry.name}/`) : h2("label", { className: "tailseek-file-row" }, h2("input", {
          type: "checkbox",
          disabled,
          checked: selected.has(target),
          onChange: (event) => {
            const checked = event.currentTarget.checked;
            setSelected((old) => {
              const next = new Set(old);
              if (checked) next.add(target);
              else next.delete(target);
              return next;
            });
          }
        }), entry.name, entry.size === void 0 ? null : h2("small", null, rawSize(entry.size))));
      }), listing && entries.length === 0 && h2("li", null, h2("p", null, t("empty")))),
      pending && h2("p", { role: "status" }, t(pending === "list" ? "loading" : "preparing")),
      error && h2("p", { role: "alert" }, t(error)),
      listing?.truncated && h2("p", null, t("truncated")),
      h2(
        "footer",
        null,
        h2("button", { type: "button", onClick: close }, t("cancel")),
        h2(
          "button",
          {
            type: "button",
            className: "tailseek-use-folder",
            disabled: disabled || selected.size === 0,
            onClick: () => {
              void run("add", async (signal) => {
                await add([...selected], signal);
                if (!signal.aborted) close();
              });
            }
          },
          `${t("add")}${selected.size ? ` (${selected.size})` : ""}`
        )
      )
    )
  );
}
async function request(input, signal) {
  const response = await fetch(REMOTE_ATTACHMENT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    redirect: "error",
    signal,
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("remote-attachment-failed");
  return response.json();
}
async function enableRemoteFiles(ctx, signal) {
  const response = await fetch(REMOTE_ATTACHMENT, {
    method: "HEAD",
    credentials: "same-origin",
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(4e3)])
  });
  if (signal.aborted || response.status !== 204 || response.headers.get(ATTACHMENT_CAPABILITY) !== ATTACHMENT_VERSION) return;
  ctx.inject(["commandUi", "inputTriggers", "remote", "sessions", "fileUpload", "conversation"], (scope) => {
    const source = findCommandSource(scope);
    if (!source) return;
    const commands = scope.get("commandUi");
    const sessions = scope.get("sessions");
    const t = scope.locale.bind("tailseek-files");
    const addDrafts = bindAttachmentDrafts(scope, (id) => sessions.binding(id), () => t("reselect"));
    if (!addDrafts) return;
    scope.effect(() => scope.locale.register("tailseek-files", messages2));
    let target = null;
    const listeners = /* @__PURE__ */ new Set();
    const subscribe = (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    };
    const setTarget = (next) => {
      target = next;
      listeners.forEach((listener) => listener());
    };
    const bindingFor = (id) => {
      const binding = sessions.binding(id);
      const state = binding?.session.getSnapshot();
      return state?.openState === "open" && state.subagent === null ? binding : void 0;
    };
    scope.effect(() => commands.register({
      name: remoteFileCommand,
      label: () => t("remote"),
      available: ({ sessionId }) => !!bindingFor(sessionId),
      ui: { kind: "action", run: ({ sessionId }) => {
        const binding = bindingFor(sessionId);
        if (binding) setTarget({ id: sessionId, binding });
      } }
    }));
    scope.effect(() => {
      const original = source.candidates;
      const decorated = async (session, request2) => fileMenuRows(await original.call(source, session, request2), t("local"));
      source.candidates = decorated;
      return () => {
        if (source.candidates === decorated) source.candidates = original;
      };
    });
    scope.slots.inject("shell.overlay", () => scope.slots.register({ name: "shell.overlay", id: remoteFileCommand, locale: "tailseek-files" }, () => {
      const active = React2.useSyncExternalStore(subscribe, () => target);
      if (!active) return null;
      const assertActive = () => {
        if (bindingFor(active.id) !== active.binding) throw new Error("session-changed");
      };
      return h2(FilePicker, {
        key: active.id,
        t,
        close: () => setTarget(null),
        list: (location, signal2) => {
          assertActive();
          return request({ action: "list", sessionId: active.id, ...location }, signal2);
        },
        add: async (paths, signal2) => {
          const chosen = [];
          for (const path of paths) {
            assertActive();
            const staged = await request({ action: "stage", sessionId: active.id, path }, signal2);
            signal2.throwIfAborted();
            chosen.push(staged);
          }
          assertActive();
          signal2.throwIfAborted();
          addDrafts(active, chosen);
        }
      });
    }));
  });
}

// src/client.ts
var messages3 = {
  zh: {
    local: "\u672C\u673A",
    back: "\u5207\u56DE\u672C\u673A",
    connected: "\u5DF2\u8FDE\u63A5",
    offline: "\u79BB\u7EBF",
    retry: "\u91CD\u8FDE",
    paused: "\u53D1\u9001\u5DF2\u6682\u505C\uFF1B\u4E0D\u4F1A\u8F6C\u53D1\u5230\u672C\u673A\u3002\u65AD\u7EBF\u524D\u5DF2\u63D0\u4EA4\u7684\u64CD\u4F5C\u53EF\u80FD\u4ECD\u5728\u76EE\u6807\u8FD0\u884C\uFF0C\u8BF7\u5148\u68C0\u67E5\u4F1A\u8BDD\u518D\u91CD\u8BD5\u3002",
    unavailable: "Tailscale \u6216 Tailseek \u76D1\u542C\u4E0D\u53EF\u7528",
    incompatible: "\u7248\u672C\u4E0D\u517C\u5BB9",
    selector: "\u9009\u62E9 Harness \u5B9E\u4F8B",
    failed: "\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u91CD\u8FDE",
    native: "\u8FDC\u7AEF Harness \u539F\u751F\u754C\u9762",
    loading: "\u6B63\u5728\u52A0\u8F7D\u539F\u751F\u754C\u9762",
    timeout: "\u539F\u751F\u754C\u9762\u8FDE\u63A5\u8D85\u65F6\uFF1B\u8BF7\u68C0\u67E5\u6D4F\u89C8\u5668\u662F\u5426\u5141\u8BB8 loopback \u5206\u533A Cookie\uFF0C\u518D\u70B9\u51FB\u91CD\u8FDE\u3002",
    desktop: "\u684C\u9762\u7248",
    web: "Web \u7248",
    current: "\u5F53\u524D\u5B9E\u4F8B",
    available: "\u53EF\u8FDE\u63A5",
    description: "\u81EA\u52A8\u53D1\u73B0\u540C\u4E00 Tailscale \u7F51\u7EDC\u4E2D\u7684 Harness \u5B9E\u4F8B\u3002",
    refresh: "\u5237\u65B0",
    refreshing: "\u6B63\u5728\u63A2\u6D4B\u2026",
    refreshFailed: "\u65E0\u6CD5\u5237\u65B0\u5B9E\u4F8B\u5217\u8868\uFF0C\u8BF7\u91CD\u8BD5\u3002",
    latency: "\u5EF6\u8FDF",
    empty: "\u6682\u672A\u53D1\u73B0\u8FDC\u7AEF\u5B9E\u4F8B",
    emptyHint: "\u8BF7\u786E\u8BA4\u53E6\u4E00\u53F0\u8BBE\u5907\u5DF2\u8FDE\u63A5 Tailscale\uFF0C\u5E76\u5DF2\u542F\u52A8\u5B89\u88C5 Tailseek \u7684 Harness\u3002",
    cli: "\u672A\u627E\u5230 Tailscale CLI\uFF0C\u8BF7\u5B89\u88C5 Tailscale \u6216\u8BBE\u7F6E tailscaleCLI",
    stopped: "Tailscale \u672A\u767B\u5F55\u6216\u672A\u8FDE\u63A5",
    userspace: "\u6682\u4E0D\u652F\u6301 Tailscale userspace \u7F51\u7EDC",
    listener: "\u65E0\u6CD5\u76D1\u542C Tailscale \u5730\u5740\uFF0C\u8BF7\u68C0\u67E5\u672C\u673A\u9632\u706B\u5899\u548C\u7AEF\u53E3\u5360\u7528",
    harness: "\u5F53\u524D Harness \u76D1\u542C\u6216\u8BA4\u8BC1\u63A5\u53E3\u4E0D\u53D7\u652F\u6301\uFF0C\u8BF7\u67E5\u770B\u63D2\u4EF6\u8BF4\u660E"
  },
  en: {
    local: "Local",
    back: "Back to local",
    connected: "Connected",
    offline: "offline",
    retry: "Reconnect",
    paused: "Sending is paused. Nothing is routed to local. Previously submitted work may still be running; check the session before retrying.",
    unavailable: "Tailscale or Tailseek listener unavailable",
    incompatible: "Incompatible version",
    selector: "Choose Harness instance",
    failed: "Connection failed; reconnect",
    native: "Remote native Harness interface",
    loading: "Loading native interface",
    timeout: "Native interface timed out. Check browser support for loopback partitioned cookies, then reconnect.",
    desktop: "Desktop",
    web: "Web",
    current: "Current instance",
    available: "Available",
    description: "Automatically discover Harness instances on your Tailscale network.",
    refresh: "Refresh",
    refreshing: "Discovering\u2026",
    refreshFailed: "Could not refresh instances. Try again.",
    latency: "Latency",
    empty: "No remote instances found",
    emptyHint: "Connect the other device to Tailscale and start Harness with Tailseek installed.",
    cli: "Tailscale CLI not found; install Tailscale or set tailscaleCLI",
    stopped: "Tailscale is signed out or disconnected",
    userspace: "Tailscale userspace networking is not supported yet",
    listener: "Cannot listen on Tailscale address; check firewall and port availability",
    harness: "Unsupported Harness listener or authentication API; see plugin documentation"
  }
};
var h3 = React3.createElement;
var storageKey = "tailseek.selected.v2";
var css = `
.tailseek-modal{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:var(--dsw-alias-bg-base,Canvas);color:var(--dsw-alias-label-primary,CanvasText)}
.tailseek-modal[open]{display:flex;flex-direction:column}
.tailseek-modal::backdrop{background:var(--dsw-alias-bg-base,Canvas)}
.tailseek-titlebar{display:none}
html[data-platform='darwin']:not([data-fullscreen]) .tailseek-titlebar,
html[data-windows-titlebar]:not([data-fullscreen]) .tailseek-titlebar{display:block;flex:none;height:42px;-webkit-app-region:drag}
html[data-windows-titlebar]:not([data-fullscreen]) .tailseek-titlebar{height:max(42px,env(titlebar-area-height,0px))}
.tailseek-viewport{position:relative;flex:1;min-height:0}
.tailseek-dock{display:flex;flex:none;align-items:center;justify-content:center;gap:6px;padding:5px 10px max(5px,env(safe-area-inset-bottom,0px));border-top:1px solid var(--dsw-alias-border-l2,GrayText);font:12px system-ui}
.tailseek-dock select,.tailseek-dock button{box-sizing:border-box;min-height:28px;padding:3px 8px;border:1px solid transparent;border-radius:7px;background:transparent;color:inherit;font:inherit}
.tailseek-dock select{min-width:0;max-width:320px;overflow:hidden;text-overflow:ellipsis;border-color:var(--dsw-alias-border-l2,GrayText)}
.tailseek-dock button{flex:none;cursor:pointer;white-space:nowrap}.tailseek-dock button:disabled{opacity:.5;cursor:default}
.tailseek-dock .tailseek-back,.tailseek-dock button:hover:not(:disabled),.tailseek-dock select:hover{background:var(--dsw-alias-bg-layer-1,Canvas)}
.tailseek-dock .tailseek-back{border-color:var(--dsw-alias-border-l2,GrayText)}
.tailseek-page{height:100%;overflow:auto;box-sizing:border-box;padding:32px 24px;color:var(--dsw-alias-label-primary,CanvasText);font:14px system-ui}
.tailseek-page-inner{max-width:720px;margin:0 auto}.tailseek-page h1{font-size:24px;font-weight:600;margin:0}.tailseek-page p{color:var(--dsw-alias-label-secondary,GrayText);line-height:1.6;margin:0 0 24px}
.tailseek-page-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px 12px;margin-bottom:8px}
.tailseek-refresh{font:inherit;color:inherit;background:var(--dsw-alias-bg-base,Canvas);border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:7px;padding:6px 12px;cursor:pointer}
.tailseek-refresh:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1,Canvas)}.tailseek-refresh:disabled{cursor:default;opacity:.6}
.tailseek-instances{display:grid;gap:10px;list-style:none;margin:0;padding:0}.tailseek-instance{display:flex;align-items:center;gap:14px;box-sizing:border-box;width:100%;padding:16px;text-align:left;font:inherit;color:inherit;background:var(--dsw-alias-bg-base,Canvas);border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:12px;cursor:pointer}
.tailseek-instance:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1,Canvas)}.tailseek-instance:disabled{cursor:default;opacity:.6}.tailseek-instance>svg{flex-shrink:0}.tailseek-instance-info{flex:1;min-width:0}.tailseek-instance strong{display:block;font-weight:500;overflow-wrap:anywhere}.tailseek-instance small{display:block;margin-top:5px;color:var(--dsw-alias-label-secondary,GrayText);overflow-wrap:anywhere;line-height:1.5}
.tailseek-instance-status{display:grid;justify-items:end;gap:4px;flex-shrink:0;text-align:right}
.tailseek-latency{font-size:12px;white-space:nowrap;color:var(--dsw-alias-label-secondary,GrayText)}
.tailseek-latency-value{font-weight:600;font-variant-numeric:tabular-nums;color:var(--tailseek-latency-color);color:color-mix(in srgb,var(--tailseek-latency-color) 65%,var(--dsw-alias-label-primary,CanvasText))}
.tailseek-latency[data-level=low]{--tailseek-latency-color:var(--dsw-alias-state-success-primary,#22c55e)}
.tailseek-latency[data-level=moderate]{--tailseek-latency-color:var(--dsw-alias-state-warn-label,#dd8629)}
.tailseek-latency[data-level=high]{--tailseek-latency-color:var(--dsw-alias-state-error-primary,#ef4444)}
.tailseek-badge{font-size:12px;color:var(--dsw-alias-label-secondary,GrayText);flex-shrink:0}.tailseek-refresh:focus-visible,.tailseek-instance:focus-visible,.tailseek-dock select:focus-visible,.tailseek-dock button:focus-visible{outline:2px solid Highlight;outline-offset:2px}
.tailseek-notice{padding:16px;margin:20px 0;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:12px;line-height:1.6}.tailseek-notice p{margin:4px 0 0}
@media(max-width:480px){.tailseek-page{padding:24px 12px}.tailseek-instance{padding:12px;gap:10px}.tailseek-badge{max-width:5em;text-align:right;white-space:normal}}
.tailseek-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:var(--dsw-alias-bg-base,Canvas)}
.tailseek-block{position:absolute;inset:0;z-index:1;display:grid;place-content:center;justify-items:center;background:var(--dsw-alias-bg-base,Canvas);text-align:center;font:15px system-ui;gap:12px;padding:20px}
.tailseek-block small{color:var(--dsw-alias-label-secondary,GrayText);max-width:460px;line-height:1.6}
.tailseek-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-success-primary,Highlight)}.tailseek-dot[data-blocked=true]{background:GrayText}
`;
function savedSelection() {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey) || "null");
    if (value && typeof value === "object" && "key" in value && "label" in value && typeof value.key === "string" && typeof value.label === "string") return { key: value.key, label: value.label };
    const previous = sessionStorage.getItem("tailseek.selected.v1");
    if (previous) return { key: previous, label: previous.split("/")[0] };
  } catch {
  }
  return { key: "", label: "" };
}
function instanceLabel(item, t) {
  const name = item.label && item.label !== item.surface ? `${item.machine} / ${item.label}` : item.machine;
  return `${name} \xB7 ${t(item.surface)} \xB7 ${item.version} \xB7 ${item.id.slice(0, 6)}`;
}
function errorKey(error) {
  switch (error) {
    case "tailscale-cli-missing":
      return "cli";
    case "tailscale-not-running":
      return "stopped";
    case "tailscale-userspace-unsupported":
      return "userspace";
    case "listener-unavailable":
      return "listener";
    case "unsupported-harness":
      return "harness";
    default:
      return "unavailable";
  }
}
async function api(path, body, signal = AbortSignal.timeout(5e3)) {
  const response = await fetch(`/api/tailseek/${path}`, {
    credentials: "same-origin",
    signal,
    ...body === void 0 ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
  });
  if (!response.ok) throw new Error("tailseek-unavailable");
  return response.json();
}
function release(old) {
  if (old) void api("close", { viewId: old.viewId }).catch(() => {
  });
}
function createSelectorStore() {
  let snapshot = null;
  const listeners = /* @__PURE__ */ new Set();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish: (next) => {
      snapshot = next;
      listeners.forEach((listener) => listener());
    }
  };
}
function InstanceSelect({ state, t, id }) {
  const { status, selected, label } = state ?? { status: { instances: [] }, selected: "", label: "" };
  return h3(
    "select",
    {
      id,
      value: selected,
      disabled: !state,
      title: `${t("selector")} \xB7 ${label || t("local")}`,
      "aria-label": t("selector"),
      onChange: (e) => state?.choose(e.currentTarget.value)
    },
    h3("option", { value: "" }, `${t("local")}${status.local?.version ? ` \xB7 ${status.local.version}` : ""}`),
    selected && !status.instances.some((item) => item.key === selected) && h3("option", { value: selected }, `${label} \xB7 ${t("offline")}`),
    status.instances.map((item) => h3(
      "option",
      { key: item.key, value: item.key, disabled: !item.online || !item.compatible },
      `${instanceLabel(item, t)}${!item.online ? ` \xB7 ${t("offline")}` : !item.compatible ? ` \xB7 ${t("incompatible")}` : ""}`
    ))
  );
}
function InstanceIcon({ size = 18 }) {
  return h3(
    "svg",
    { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, "aria-hidden": true },
    h3("rect", { x: 3, y: 3, width: 18, height: 6, rx: 2 }),
    h3("rect", { x: 3, y: 15, width: 18, height: 6, rx: 2 }),
    h3("path", { d: "M12 9v6M6 6h.01M6 18h.01" })
  );
}
function InstanceLatency({ latencyMs, t }) {
  const level = latencyMs < 50 ? "low" : latencyMs < 150 ? "moderate" : "high";
  return h3(
    "span",
    { className: "tailseek-latency", "data-level": level },
    `${t("latency")} `,
    h3("span", { className: "tailseek-latency-value" }, `${latencyMs} ms`)
  );
}
function InstancePage({ t, store }) {
  const state = React3.useSyncExternalStore(store.subscribe, store.getSnapshot);
  const status = state?.status;
  const lastScan = status?.lastScan;
  const [refresh, setRefresh] = React3.useState(null);
  const refreshRequest = React3.useRef(null);
  React3.useEffect(() => () => refreshRequest.current?.abort(), []);
  const refreshing = refresh === "requesting" || refresh !== null && typeof refresh === "object" && (!lastScan || lastScan.boot === refresh.boot && lastScan.sequence < refresh.sequence);
  const rescan = async () => {
    if (refreshing || refreshRequest.current) return;
    const controller = new AbortController();
    refreshRequest.current = controller;
    setRefresh("requesting");
    try {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5e3)]);
      const scan = await api("refresh", {}, signal);
      if (!controller.signal.aborted) setRefresh(scan);
    } catch {
      if (!controller.signal.aborted) setRefresh("failed");
    } finally {
      refreshRequest.current = null;
    }
  };
  return h3("section", { className: "tailseek-page", "aria-label": "Tailseek" }, h3(
    "div",
    { className: "tailseek-page-inner" },
    h3(
      "div",
      { className: "tailseek-page-heading" },
      h3("h1", null, "Tailseek"),
      h3("button", {
        type: "button",
        className: "tailseek-refresh",
        disabled: refreshing || status?.error === "unsupported-harness",
        onClick: () => {
          void rescan();
        }
      }, t(refreshing ? "refreshing" : "refresh"))
    ),
    h3("p", null, t("description")),
    h3(
      "ul",
      { className: "tailseek-instances", "aria-label": t("selector") },
      h3("li", null, h3(
        "button",
        {
          className: "tailseek-instance",
          disabled: !state,
          "aria-current": !state?.selected ? "true" : void 0,
          onClick: () => state?.choose("")
        },
        h3(InstanceIcon, { size: 22 }),
        h3(
          "span",
          { className: "tailseek-instance-info" },
          h3("strong", null, t("local")),
          h3("small", null, status?.local?.version)
        ),
        !state?.selected && h3("span", { className: "tailseek-badge" }, t("current"))
      )),
      status?.instances.map((item) => {
        const online = item.online && !status.error;
        return h3("li", { key: item.key }, h3(
          "button",
          {
            className: "tailseek-instance",
            disabled: !online || !item.compatible,
            onClick: () => state?.choose(item.key)
          },
          h3(InstanceIcon, { size: 22 }),
          h3(
            "span",
            { className: "tailseek-instance-info" },
            h3("strong", null, item.label && item.label !== item.surface ? `${item.machine} / ${item.label}` : item.machine),
            h3("small", null, `${t(item.surface)} \xB7 ${item.version} \xB7 ${item.id.slice(0, 6)}`)
          ),
          h3(
            "span",
            { className: "tailseek-instance-status" },
            online && item.latencyMs !== void 0 && h3(InstanceLatency, { t, latencyMs: item.latencyMs }),
            h3("span", { className: "tailseek-badge" }, !online ? t("offline") : !item.compatible ? t("incompatible") : t("available"))
          )
        ));
      })
    ),
    refresh === "failed" && h3("div", { className: "tailseek-notice", role: "status" }, t("refreshFailed")),
    status?.error && h3("div", { className: "tailseek-notice", role: "status" }, t(errorKey(status.error))),
    status && !status.error && status.instances.length === 0 && h3(
      "div",
      { className: "tailseek-notice", role: "status" },
      h3("strong", null, t("empty")),
      h3("p", null, t("emptyHint"))
    )
  ));
}
function Panel({ t, store }) {
  const [status, setStatus] = React3.useState({ instances: [] });
  const [selection, setSelection] = React3.useState(savedSelection);
  const selected = selection.key;
  const [view, setView] = React3.useState(null);
  const [ready, setReady] = React3.useState(false);
  const [failure, setFailure] = React3.useState(null);
  const frame = React3.useRef(null);
  const form = React3.useRef(null);
  const modal = React3.useRef(null);
  const seq = React3.useRef(0);
  const currentView = React3.useRef(null);
  const opening = React3.useRef(false);
  const selectedRef = React3.useRef(selected);
  const lastMessage = React3.useRef(0);
  const openedAt = React3.useRef(0);
  const everReady = React3.useRef(false);
  const nextAttempt = React3.useRef(0);
  const open = async (key) => {
    if (opening.current) return;
    opening.current = true;
    const generation = ++seq.current;
    release(currentView.current);
    currentView.current = null;
    setView(null);
    setReady(false);
    setFailure(null);
    everReady.current = false;
    nextAttempt.current = Date.now() + 1e4;
    try {
      const next = await api("open", { key });
      if (seq.current !== generation || selectedRef.current !== key) {
        release(next);
        return;
      }
      currentView.current = next;
      openedAt.current = Date.now();
      lastMessage.current = 0;
      setView(next);
    } catch {
      if (seq.current === generation) setFailure("failed");
    } finally {
      opening.current = false;
    }
  };
  const choose = (key) => {
    ++seq.current;
    selectedRef.current = key;
    setReady(false);
    setFailure(null);
    nextAttempt.current = 0;
    const target2 = status.instances.find((item) => item.key === key);
    const next = { key, label: target2 ? instanceLabel(target2, t) : "" };
    setSelection(next);
    release(currentView.current);
    currentView.current = null;
    setView(null);
    try {
      sessionStorage.removeItem("tailseek.selected.v1");
      sessionStorage.setItem(storageKey, JSON.stringify(next));
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
    }
  };
  React3.useEffect(() => {
    let active = true;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const next = await api("status");
        if (!active) return;
        setStatus(next);
        const key = selectedRef.current;
        const target2 = next.instances.find((item) => item.key === key);
        const old = currentView.current;
        if (key && target2?.online && target2.compatible && !next.error && (!old && Date.now() >= nextAttempt.current || old && old.boot !== target2.boot)) void open(key);
        if (key && (!target2?.online || Date.now() - lastMessage.current > 4e3)) setReady(false);
        if (old && !everReady.current && Date.now() - openedAt.current > 15e3) setFailure("timeout");
      } catch {
        if (active) {
          setStatus((old) => ({ ...old, error: "unavailable" }));
          setReady(false);
        }
      } finally {
        polling = false;
      }
    };
    const message = (event) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== currentView.current?.origin || event.data?.type !== "tailseek:connection") return;
      lastMessage.current = Date.now();
      setReady(event.data.connected === true);
      if (event.data.connected === true) {
        everReady.current = true;
        setFailure(null);
      }
    };
    window.addEventListener("message", message);
    const timer = setInterval(poll, 1e3);
    void poll();
    return () => {
      active = false;
      ++seq.current;
      clearInterval(timer);
      window.removeEventListener("message", message);
      release(currentView.current);
    };
  }, []);
  React3.useLayoutEffect(() => {
    if (selected && !modal.current?.open) modal.current?.showModal();
    if (!selected && modal.current?.open) modal.current.close();
  }, [selected]);
  React3.useEffect(() => {
    if (view) form.current?.submit();
  }, [view]);
  const target = status.instances.find((item) => item.key === selected);
  const label = target ? instanceLabel(target, t) : selection.label || t("local");
  const online = !!target?.online && !status.error;
  const blocked = !online || !ready;
  const connectionLabel = t(!online || blocked && everReady.current ? "offline" : !blocked ? "connected" : failure ?? "loading");
  React3.useLayoutEffect(() => {
    store.publish({ status, selected, label, choose });
  });
  React3.useEffect(() => () => {
    store.publish(null);
  }, [store]);
  const dock = h3(
    "footer",
    { className: "tailseek-dock", "aria-label": "Tailseek" },
    h3("span", { className: "tailseek-dot", "data-blocked": blocked, role: "img", "aria-label": connectionLabel, title: connectionLabel }),
    h3(InstanceSelect, { state: { status, selected, label, choose }, t }),
    h3("button", { type: "button", onClick: () => {
      void open(selected);
    }, disabled: !online }, t("retry")),
    h3("button", { type: "button", className: "tailseek-back", onClick: () => choose("") }, t("back"))
  );
  return h3(
    React3.Fragment,
    null,
    h3("style", null, css),
    h3(
      "dialog",
      { ref: modal, className: "tailseek-modal", "aria-label": label, onCancel: (e) => e.preventDefault() },
      h3("div", { className: "tailseek-titlebar", "aria-hidden": true }),
      h3(
        "div",
        { className: "tailseek-viewport" },
        view && h3("iframe", {
          ref: frame,
          key: view.viewId,
          name: `tailseek-${view.viewId}`,
          title: t("native"),
          className: "tailseek-frame",
          inert: blocked ? "" : void 0,
          tabIndex: blocked ? -1 : 0,
          sandbox: "allow-scripts allow-same-origin allow-forms allow-downloads allow-modals",
          referrerPolicy: "no-referrer"
        }),
        view && h3(
          "form",
          { ref: form, method: "POST", action: `${view.origin}/__tailseek/enter`, target: `tailseek-${view.viewId}`, hidden: true },
          h3("input", { type: "hidden", name: "ticket", value: view.ticket })
        ),
        selected && blocked && h3(
          "div",
          { className: "tailseek-block", role: "status", "aria-live": "polite" },
          h3("strong", null, `${label} \u2014 ${connectionLabel}`),
          status.error && h3("small", null, t(errorKey(status.error))),
          h3("small", null, t("paused"))
        )
      ),
      selected && dock
    )
  );
}
var inject = ["slots", "connection", "locale"];
function apply(ctx) {
  if (window.parent !== window) {
    ctx.effect(() => {
      const controller = new AbortController();
      let initialized = false;
      const publish = () => window.parent.postMessage({
        type: "tailseek:connection",
        connected: initialized && ctx.connection.state.getSnapshot() === "connected"
      }, "*");
      const off = ctx.connection.state.subscribe(publish);
      const timer = setInterval(publish, 1e3);
      publish();
      void Promise.allSettled([enableRemoteDirectory(ctx, controller.signal), enableRemoteFiles(ctx, controller.signal)]).then(() => {
        if (!controller.signal.aborted) {
          initialized = true;
          publish();
        }
      });
      return () => {
        controller.abort();
        off();
        clearInterval(timer);
      };
    });
    return;
  }
  const store = createSelectorStore();
  ctx.effect(() => ctx.locale.register("tailseek", messages3));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register(
    { name: "shell.overlay", id: "tailseek", locale: "tailseek" },
    ({ t }) => h3(Panel, { t, store })
  ));
  ctx.slots.inject("main", () => ctx.slots.register(
    { name: "main", key: "tailseek", locale: "tailseek" },
    ({ t }) => h3(InstancePage, { t, store })
  ));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({ name: "sidebar.panellist", id: "tailseek", order: 20, label: "Tailseek" }, InstanceIcon));
}

return module.exports;}});
