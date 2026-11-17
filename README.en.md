# Tailseek

[简体中文](README.md) · **English**

Tailseek is a [DeepSeek Harness][harness] plugin that discovers other Harness instances on your [Tailscale][tailscale] network and opens their native interface in your current window. Resume remote sessions, switch workspaces, and respond to tool approvals from Harness Desktop or Web.

## Quick start

1. Connect both devices to the same Tailscale network.
2. On both Harness instances, open **Plugins → Add plugin**, enter `github:supralune/dsh-tailseek`, and install it.
3. Select **Tailseek** in the left sidebar and choose an instance.

You can also install it into the web profile from the CLI.

```sh
dsh plugin --profile web add github:supralune/dsh-tailseek
```

To use a local package, enter its absolute `.tgz` path in **Add plugin**. See [Package from source](#package-from-source) to create one.

## Usage

- Select **Add workspace** in the remote interface to choose a folder on the target device.
- In a session's **+** menu, select **Choose remote files** or **Upload from this device** to attach files.
- Use the connection bar to switch instances or select **Back to local**.

## Package from source

Run the following commands from the repository root to create an installable `.tgz` package.

```sh
npm ci --ignore-scripts
npm run check
npm pack
```

Issues and pull requests are welcome. Run `npm run check` before submitting code changes.

[Version requirements](package.json) · [MIT License](LICENSE)

[harness]: https://github.com/deepseek-ai/deepseek-harness
[tailscale]: https://tailscale.com/
