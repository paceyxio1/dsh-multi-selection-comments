import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const source = readFileSync(join(process.cwd(), 'src/client/comment-format.ts'), 'utf8')
const clientSource = readFileSync(join(process.cwd(), 'src/client/index.tsx'), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const module = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

const sessionSource = readFileSync(join(process.cwd(), 'src/client/current-session.ts'), 'utf8')
const sessionJs = ts.transpileModule(sessionSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { currentSessionId } = await import(`data:text/javascript;base64,${Buffer.from(sessionJs).toString('base64')}`)
const legacy = { reflect: { get: () => undefined }, sessions: { list: { getSnapshot: () => ({ current: 'old-session' }) } } }
assert.equal(currentSessionId(legacy), 'old-session')
let selected = 'new-session'
const modern = new Proxy({ ...legacy, reflect: { get: (name) => {
  assert.equal(name, 'uiSession')
  return { adapter: { current: { getSnapshot: () => ({ key: selected }) } } }
} } }, { get(target, key) {
  if (key === 'uiSession') throw new Error('cannot get property "uiSession" without inject')
  return Reflect.get(target, key)
} })
assert.equal(currentSessionId(modern), 'new-session')
selected = 'switched-session'
assert.equal(currentSessionId(modern), 'switched-session')
selected = undefined
assert.equal(currentSessionId(modern), undefined)
assert.equal(currentSessionId({ reflect: legacy.reflect, sessions: { list: { getSnapshot: () => ({}) } } }), undefined)

const comments = [
  { id: '1', selectedText: '包含独立的 []', userComment: '要求1' },
  { id: '2', selectedText: '安装脚本', userComment: '要求2' },
]
const composed = module.composeSubmission('这是主对话', comments)
assert.match(composed, /<selection_comments>/)
assert.match(composed, /<selected_text>包含独立的 \[\]<\/selected_text>/)
assert.match(composed, /<user_comment>要求2<\/user_comment>/)
assert.ok(composed.endsWith('这是主对话'))
assert.equal(module.composeSubmission('main', []), 'main')
assert.match(module.composeSubmission('', [{ id: 'x', selectedText: '<tag>', userComment: 'a & b' }]), /&lt;tag&gt;[\s\S]*a &amp; b/)
assert.equal(module.commentCountLabel(1, true), '1 条选中内容')
assert.equal(module.commentCountLabel(1, false), '1 comment')
assert.equal(module.commentCountLabel(2, false), '2 comments')
assert.deepEqual(module.parseSubmission(composed), {
  comments: [
    { id: 'sent-1', selectedText: '包含独立的 []', userComment: '要求1' },
    { id: 'sent-2', selectedText: '安装脚本', userComment: '要求2' },
  ],
  body: '这是主对话',
})
assert.equal(module.parseSubmission('普通消息'), null)
const escaped = module.composeSubmission('body', [{ id: 'x', selectedText: '<tag>', userComment: 'a & b' }])
assert.equal(module.parseSubmission(escaped).comments[0].selectedText, '<tag>')
assert.equal(module.parseSubmission(escaped).comments[0].userComment, 'a & b')
const activatedEmptyDraft = module.ensureEmptyDraftSentinel('')
assert.equal(module.EMPTY_DRAFT_SENTINEL.length, 1)
assert.notEqual(activatedEmptyDraft.trim(), '')
assert.equal(module.stripEmptyDraftSentinel(activatedEmptyDraft), '')
assert.equal(module.stripEmptyDraftSentinel(module.ensureEmptyDraftSentinel('正文')), '正文')
assert.equal(module.ensureEmptyDraftSentinel(activatedEmptyDraft), activatedEmptyDraft)
const commentOnlySubmission = module.composeSubmission(module.stripEmptyDraftSentinel(activatedEmptyDraft), comments)
assert.equal(commentOnlySubmission.includes(module.EMPTY_DRAFT_SENTINEL), false)
assert.equal(module.parseSubmission(commentOnlySubmission).body, '')
const optionalRequirement = module.composeSubmission('', [{ id: 'optional', selectedText: '只引用这段', userComment: '' }])
assert.match(optionalRequirement, /<user_comment><\/user_comment>/)
assert.deepEqual(module.parseSubmission(optionalRequirement).comments[0], {
  id: 'sent-1',
  selectedText: '只引用这段',
  userComment: '',
})

// Sidebar quotes carry the file they came from; transcript quotes stay unchanged.
const sourced = module.composeSubmission('', [
  { id: 'src', selectedText: 'const a = 1', userComment: '这里为什么改', source: '~/proj/src/a.ts' },
])
assert.match(sourced, /<source>~\/proj\/src\/a\.ts<\/source>/)
assert.deepEqual(module.parseSubmission(sourced).comments[0], {
  id: 'sent-1',
  selectedText: 'const a = 1',
  userComment: '这里为什么改',
  source: '~/proj/src/a.ts',
})
assert.doesNotMatch(module.composeSubmission('', comments), /<source>/)
assert.equal(Object.hasOwn(module.parseSubmission(composed).comments[0], 'source'), false)
assert.equal(module.parseSubmission(module.composeSubmission('', [
  { id: 'x', selectedText: 'a & b', userComment: '', source: 'C:\\a&b\\c.ts' },
])).comments[0].source, 'C:\\a&b\\c.ts')

// The sidebar gate must cover the right Sidebar's previews, change review and file tree.
assert.match(clientSource, /const SIDEBAR_TEXT_SELECTOR = \[/)
for (const marker of [
  'data-document-preview',
  'data-textpreview-body',
  'data-document-markdown',
  'data-code-preview',
  'data-html-preview',
  'data-image-preview',
  'data-files-body',
  'data-changes-review',
  'data-review-view',
  'data-diff-line',
]) {
  assert.ok(clientSource.includes(`'[${marker}]'`), `sidebar selector is missing ${marker}`)
}
assert.match(clientSource, /data-textpreview-path/)
assert.match(clientSource, /data-files-path/)
assert.match(clientSource, /data-review-file/)
assert.match(clientSource, /addPendingComment\(sessionId, text, input\.value, source\)/)
assert.match(clientSource, /show\(context\.text, context\.rect, context\.source\)/)
assert.match(clientSource, /\.dqt-popup-source\{/)
assert.match(clientSource, /\.dqt-detail-source\{/)

// DSH 0.2's composer is a Lexical contenteditable, and both Enter and the
// primary Send button route through the package-internal keyboard facade
// rather than inputActions.submit. The compose therefore has to be
// intercepted in the capture phase, and the old textarea assumption is gone.
assert.match(clientSource, /document\.addEventListener\('keydown', onKeyDown, true\)/)
assert.match(clientSource, /document\.addEventListener\('click', onClick, true\)/)
assert.match(clientSource, /document\.removeEventListener\('click', onClick, true\)/)
assert.match(clientSource, /Array\.from\(button\.classList\)\.some\(\(name\) => name\.endsWith\('_primary'\)\)/)
assert.match(clientSource, /target\.closest\('\[data-composer-card\]'\)/)
assert.doesNotMatch(clientSource, /instanceof HTMLTextAreaElement/)
// The compose is one-shot, and the sentinel sweep must never eat an envelope.
assert.match(clientSource, /if \(preparedRef\.current\) return false/)
assert.match(clientSource, /preparedRef\.current = true/)
assert.match(clientSource, /hasSentinel && !input\.draft\.includes\(START_MARKER\)/)
assert.equal(module.START_MARKER, '<selection_comments>')
assert.match(module.composeSubmission('', [{ id: 'a', selectedText: 'x', userComment: 'y' }]),
  new RegExp(`^${module.START_MARKER}`))

// Every menu-filled surface must force an opaque background. DSH resolves
// --dsw-specific-menu to --dsw-menu-surface-fill (#f8f9fa94, ~58% opaque) and
// pairs that translucent fill with a backdrop blur these panels do not have,
// so inheriting it raw makes the text behind them bleed through.
const opaqueMenuFill = /background:#fff;background:rgb\(from var\(--dsw-specific-menu,#fff\) r g b \/ 1\)/g
assert.equal((clientSource.match(opaqueMenuFill) ?? []).length, 3,
  'the popup, the pending details panel and the sent card must all force an opaque background')
assert.match(clientSource, /\.dqt-details\{[^}]*background:#fff;background:rgb\(/)
assert.match(clientSource, /\.dqt-sent-card\{[^}]*background:#fff;background:rgb\(/)
assert.doesNotMatch(clientSource, /border-radius:15px;background:var\(--dsw-specific-menu/)

assert.match(clientSource, /key: 'user',[\s\S]*?priority: -100/)
assert.match(clientSource, /key: 'steering',[\s\S]*?priority: -100/)
assert.match(clientSource, /dqt-sent-annotations" onMouseEnter/)
assert.doesNotMatch(clientSource, /className="dqt-sent-chip"[^>]*onClick/)
assert.match(clientSource, /\.dqt-sent-card\{position:absolute/)
assert.match(clientSource, /dqt-pending-annotations" onMouseEnter/)
assert.doesNotMatch(clientSource, /className="dqt-chip-main"[^>]*onClick/)
assert.match(clientSource, /\.dqt-pending-annotations\{position:relative/)
assert.match(clientSource, /const hideDetailsSoon = useCallback/)
assert.match(clientSource, /setTimeout\(\(\) => \{[\s\S]*?\}, 120\)/)
assert.match(clientSource, /dqt-details"[^>]*onMouseEnter=\{showDetails\}/)

// Sidebar browser annotation. The guest script is embedded with String.raw, so
// the test also guards the two characters that would end the template early.
const browserSource = readFileSync(join(process.cwd(), 'src/client/browser-annotator.ts'), 'utf8')
assert.match(browserSource, /export const BROWSER_ANNOTATION_MARKER = '__DSH_ANNOT__'/)
assert.match(browserSource, /const ANNOTATOR_SOURCE = String\.raw`/)
assert.match(browserSource, /const FRAME_SELECTOR = '\[data-sidebar-browser-frame\]'/)
assert.match(browserSource, /const ADDRESS_SELECTOR = '\[class\*="_addressBox"\]'/)
assert.match(browserSource, /executeJavaScript/)
assert.match(browserSource, /addEventListener\('console-message', onConsole\)/)
assert.match(browserSource, /addEventListener\('dom-ready'/)
assert.match(browserSource, /new MutationObserver\(schedule\)/)
assert.match(browserSource, /insertAdjacentElement\('afterend', button\)/)
// The injected picker must cover both element picking and text selection.
assert.match(browserSource, /function elementPayload/)
assert.match(browserSource, /function textPayload/)
assert.match(browserSource, /function selectorFor/)
assert.match(browserSource, /function outline/)
assert.match(browserSource, /adoptedStyleSheets/)
// The chrome button is an icon (a chat bubble), not a word: the English label
// was too wide for the address-bar row.
assert.match(browserSource, /const ANNOTATE_ICON = \[/)
assert.match(browserSource, /state\.button\.innerHTML = ANNOTATE_ICON/)
assert.doesNotMatch(browserSource, /state\.button\.textContent = label/)
assert.match(browserSource, /\.\$\{BUTTON_CLASS\}\[aria-pressed="true"\]/)
const guestStart = 'const ANNOTATOR_SOURCE = String.raw`'
const guestBody = browserSource.slice(
  browserSource.indexOf(guestStart) + guestStart.length,
  browserSource.indexOf('})();`'),
)
assert.ok(guestBody.length > 1000, 'the injected guest script must be embedded in full')
assert.ok(!guestBody.includes('\u0060'), 'the guest script must not contain a backtick')
assert.ok(!guestBody.includes('${'), 'the guest script must not contain a template placeholder')

// Shared locale helper, and the dock wiring that feeds page annotations into
// the same pending list as transcript quotes.
const localeSource = readFileSync(join(process.cwd(), 'src/client/locale.ts'), 'utf8')
assert.match(localeSource, /export function isChinese\(\): boolean/)
assert.match(localeSource, /document\.documentElement\.lang/)
assert.match(clientSource, /import \{ isChinese \} from '\.\/locale\.ts'/)
assert.doesNotMatch(clientSource, /function isChinese\(\): boolean \{/)
assert.match(clientSource, /installBrowserAnnotator\(/)
assert.match(clientSource, /addPendingComment\(sessionId as SessionId, selectedText, userComment, source\)/)

console.log('selection comment formatting tests passed')
