# DSH Multi-Selection Comments

[English](README_EN.md) | 简体中文

为 DeepSeek Harness（DSH）带来仿 Codex 的“多段选中文本、逐条提出要求”体验。

你可以在 AI 的正式回复中连续选择多段文字，也可以直接在侧栏打开的文件预览里划词，分别写下后续要求，再把它们作为一组结构化上下文随主消息一起发送。Think 思考过程、工具输出和非 AI 消息不会触发。主输入框始终保持简洁。

## 界面预览

### 为一段选中文字添加后续要求

<img src="docs/images/add-selection-comment.png" alt="为一段选中文字添加后续要求" width="420">

### 集中查看多条独立要求

<img src="docs/images/multiple-independent-comments.png" alt="在输入框上方集中查看多条独立要求" width="680">

## 功能特点

- 仿 Codex 的选区交互：选中文字后直接填写对该段内容的后续要求。
- 支持连续选择多段内容，每条“所选文本 + 你的要求”彼此独立。
- 侧栏文件预览（文本/差异、Markdown、代码、HTML、图片）、本轮改动差异面板与文件树同样支持划词提问。
- 来自侧栏的引用会自动附上文件路径，AI 能知道这段内容出自哪个文件。
- 侧栏浏览器打开的网页支持 Codex 风格的元素标注：地址栏右侧的聊天气泡图标开启后，鼠标悬停高亮元素、点击选中元素，也可以直接划词。
- 网页标注会带上页面地址、CSS 选择器和标签结构，AI 能定位到页面里的具体位置。
- 主输入框上方只显示紧凑的“N 条选中内容”胶囊，不再堆叠多段引用正文。
- 点击胶囊可查看全部选中内容、逐条删除；点击弹窗外部可收起详情。
- 要求输入框中按 Enter 直接添加到对话，按 Ctrl+Enter 换行。
- “你的要求”为可选项，可以只引用选中内容而不填写要求。
- 即使主输入框为空，只要存在选中内容，也可以直接发送。
- 发送时才将这些要求作为结构化上下文注入本次消息，主消息照常编辑。
- 发送后的聊天记录以右对齐胶囊展示，不直接暴露结构化 XML。
- 仅在 AI 正式输出中触发；Think 思考过程、工具输出、用户消息、输入框、可编辑区域和 steering 消息均不会触发。
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

1. 在 AI 的正式回复中选中一段文字（Think 思考过程和工具输出不支持）；在侧栏文件预览里划词同样会弹出小窗。
2. 在弹窗的“你的要求”中输入对 AI 的后续要求，然后点击“添加到对话”。侧栏引用会额外显示一行“来源：<文件路径>”。
3. 对其他文字重复操作；输入框上方会显示选中内容数量胶囊。
4. 在主输入框中填写你的正文并发送。

### 侧栏网页元素标注

1. 在侧栏用浏览器打开一个网页，地址栏右侧会出现一个聊天气泡图标（仅桌面端）。
2. 点击按钮进入标注模式：鼠标划过页面会高亮元素，点击即可选中该元素；也可以像文档一样直接划词。
3. 弹窗里会显示“来源”（页面地址 + CSS 选择器 + 标签结构）和“所选内容”，填写要求后点“添加到对话”。
4. 标注会进入同一个待发送列表，和会话内划词一起随主消息发送。

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

插件使用 DSH Web 的 `conversation.input.dock` 插槽，并依赖会话 DOM 上的 `data-conversation-scroll` 与 `data-chat-flow-kind` 标记。侧栏划词依赖右侧栏文件预览的 `data-document-preview`、`data-textpreview-body`、`data-document-markdown`、`data-code-preview`、`data-html-preview`、`data-image-preview`，本轮改动差异面板的 `data-changes-review`、`data-review-view`、`data-diff-line`，以及文件树的 `data-files-body` 标记；这些标记缺失时侧栏划词会静默失效，会话内划词不受影响。使用 DSH `0.1.0-rc.6` 客户端包进行类型检查，同时兼容 DSH `0.2.0-rc.2` 的会话选择接口与独立 snapshot store 模块。新版通过 `uiSession.adapter.current` 获取当前会话，旧版保留 `sessions.list.current` 回退。DSH 0.2 的输入框是 Lexical 富文本，Enter 与发送按钮都走包内部的 keyboard 门面（`keyboard.submit(mode, source)`）而不是 `inputActions.submit`，且该门面明确不跨插件边界，因此插件在**捕获阶段**拦截 `keydown`（Enter）与 `click`（发送按钮），在调用方读取草稿之前把结构化上下文写进输入框；发送按钮通过 `[data-composer-card]` 作用域内以 `_primary` 结尾的类名识别。

**侧栏网页标注仅桌面端可用。** DSH 桌面端用 Electron `<webview>` 渲染侧栏网页，插件可通过 `webview.executeJavaScript` 注入选择器脚本（不受页面 CSP 限制），结果经 `console-message` 事件回传，不需要 preload 或 IPC 权限；而纯 `dsh web` 用的是跨域 `<iframe>`，父页面无法访问其 DOM，因此浏览器模式下不会出现标注按钮。侧栏浏览器没有暴露插件插槽，标注按钮通过 DOM 注入到 `[class*="_addressBox"]` 之后，并用节流的 MutationObserver 在重渲染后重新挂载。

## License

[MIT](LICENSE)
