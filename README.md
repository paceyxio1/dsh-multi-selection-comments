# DSH Multi-Selection Comments

[English](README_EN.md) | 简体中文

为 DeepSeek Harness（DSH）带来仿 Codex 的“多段选中文本、逐条提出要求”体验。

你可以在助手回复或工具输出里连续选择多段文字，分别写下后续要求，再把它们作为一组结构化上下文随主消息一起发送。主输入框始终保持简洁。

## 界面预览

### 为一段选中文字添加后续要求

![为一段选中文字添加后续要求](docs/images/add-selection-comment.png)

### 集中查看多条独立要求

![在输入框上方集中查看多条独立要求](docs/images/multiple-independent-comments.png)

## 功能特点

- 仿 Codex 的选区交互：选中文字后直接填写对该段内容的后续要求。
- 支持连续选择多段内容，每条“所选文本 + 你的要求”彼此独立。
- 主输入框上方只显示紧凑的“N 条选中内容”胶囊，不再堆叠多段引用正文。
- 点击胶囊可查看全部选中内容、逐条删除；点击弹窗外部可收起详情。
- 发送时才将这些要求作为结构化上下文注入本次消息，主消息照常编辑。
- 发送后的聊天记录以右对齐胶囊展示，不直接暴露结构化 XML。
- 不会在用户消息、输入框、可编辑区域或 steering 消息中误触发。
- 中文和英文界面文案会跟随 DSH 页面语言。

## Windows 本地安装

需要 Node.js、npm，以及可正常运行的 DSH。

```powershell
git clone https://github.com/yuanc1204/dsh-multi-selection-comments.git
cd dsh-multi-selection-comments
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

安装脚本会：

1. 安装依赖并执行类型检查、测试和构建。
2. 将仓库目录链接到 DSH profile 的 `node_modules`。
3. 幂等注册插件到 `~/.dsh/profiles/web/cordis.patch.yml`。

完成后停止当前进程并重新运行：

```powershell
dsh web
```

验证插件已经进入 DSH 实际加载配置：

```powershell
dsh --profile web --dump-config | Select-String dsh-plugin-multi-selection-comments
```

如果页面仍显示旧版本，请强制刷新浏览器缓存。

从旧版 `dsh-plugin-quote-to-chat` 升级时，请先在 DSH 插件管理器中卸载旧插件，再安装本仓库，避免两个客户端模块同时加载。

## 使用方法

1. 在助手回复或工具输出中选中一段文字。
2. 在弹窗的“你的要求”中输入对 AI 的后续要求，然后点击“添加到对话”。
3. 对其他文字重复操作；输入框上方会显示选中内容数量胶囊。
4. 在主输入框中填写你的正文并发送。

插件内部会把各段要求序列化为结构化上下文，但聊天记录中只显示可展开的选中内容胶囊。

## 开发

```powershell
npm install
npm run check
```

也可以分别运行：

```powershell
npm run typecheck
npm test
npm run build
```

构建产物为 `dist/index.js`（服务端入口）和 `client.js`（DSH Web 客户端模块）。

## 兼容性

插件使用 DSH Web 的 `conversation.input.dock` 插槽，并依赖会话 DOM 上的 `data-conversation-scroll` 与 `data-chat-flow-kind` 标记。已使用 DSH `0.1.0-rc.6` 客户端包进行类型检查。

## License

[MIT](LICENSE)
