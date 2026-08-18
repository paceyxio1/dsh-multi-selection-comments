# dsh-plugin-quote-to-chat

给 DeepSeek Harness（DSH）增加类似 Codex 的“选中文字、逐条评论并添加到对话”交互。

## 功能

- 在助手回复或工具输出中选中文字，会浮出独立评论框。
- 每次填写的“所选文本 + 用户评论”独立保存，不写入主输入框。
- 输入框上方只显示紧凑的“N 条评论”胶囊；点击可展开查看或逐条删除。
- 主对话仍正常输入；点击发送或按 Enter 时，插件才把评论作为结构化上下文注入本次消息。
- 用户消息、steering 消息、输入框和可编辑区域不会触发按钮。
- 支持中文和英文按钮文案，跟随 DSH 页面语言。

例如连续添加两段评论后，输入框仍只显示主对话：

```text
💬 2 条评论  ×

这是主对话
```

展开胶囊后会按顺序显示每条“所选文本”和“用户评论”。

## Windows 本地安装

在 PowerShell 中进入本目录后运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

脚本会安装依赖、执行类型检查/测试/构建，将本目录链接到 DSH 的 web profile，并幂等注册到：

```text
~/.dsh/profiles/web/cordis.patch.yml
```

完成后停止当前进程并重新运行 `dsh web`。

验证插件已被配置加载：

```powershell
dsh --profile web --dump-config | Select-String dsh-plugin-quote-to-chat
```

## 手动安装

```powershell
npm install
npm run check
```

然后将本目录以目录链接方式放到 `~/.dsh/profiles/node_modules/dsh-plugin-quote-to-chat`，并在 `~/.dsh/profiles/web/cordis.patch.yml` 中加入：

```yaml
- insert:
    - id: quote-to-chat
      name: dsh-plugin-quote-to-chat
```

重启 `dsh web` 后生效。

## 开发

```powershell
npm run typecheck
npm test
npm run build
```

构建产物为 `dist/index.js`（服务端空入口）和 `client.js`（DSH Web 客户端模块）。

## 兼容性说明

插件使用 DSH Web 当前的 `conversation.input.dock` 插槽，并依赖会话 DOM 上的 `data-conversation-scroll` 与 `data-chat-flow-kind` 标记。已按 DSH `0.1.0-rc.6` 客户端包进行类型检查。

## License

MIT
