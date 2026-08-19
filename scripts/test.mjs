import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const source = readFileSync(join(process.cwd(), 'src/client/comment-format.ts'), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const module = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

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

console.log('selection comment formatting tests passed')
