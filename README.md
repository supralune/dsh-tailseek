# Tailseek

**简体中文** · [English](README.en.md)

Tailseek 是一个 [DeepSeek Harness][harness] 插件，可在 [Tailscale][tailscale] 网络中自动发现其他 Harness 实例，并在当前窗口打开它们的原生界面。你可以继续远端会话、切换工作区和处理工具审批。桌面版和 Web 版均可使用。

## 快速开始

1. 让两端设备接入同一个 Tailscale 网络。
2. 在两端的 Harness 中打开 **插件 → 添加插件**，填入 Tailseek `.tgz` 安装包在该设备上的绝对路径。需要安装包时，可[从源码打包](#从源码打包)。
3. 在左侧边栏点击 **Tailseek**，选择要打开的实例。

通过命令行安装到 Web profile 时，将 `<package.tgz>` 替换为安装包路径。

```sh
dsh plugin --profile web add "<package.tgz>"
```

## 使用

- 在远端界面点击 **添加工作区**，选择目标设备上的目录。
- 在会话的 **＋** 菜单中，选择 **远端选取** 或 **本机上传** 来添加附件。
- 用底部连接栏切换实例，或点击 **切回本机**。

## 从源码打包

在仓库根目录运行以下命令，生成用于安装的 `.tgz`。

```sh
npm ci --ignore-scripts
npm run check
npm pack
```

欢迎提交 Issue 和 Pull Request。提交代码前请运行 `npm run check`。

[版本要求](package.json) · [MIT 许可证](LICENSE)

[harness]: https://github.com/deepseek-ai/deepseek-harness
[tailscale]: https://tailscale.com/
