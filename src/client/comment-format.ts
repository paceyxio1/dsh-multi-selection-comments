export interface SelectionComment {
  id: string
  selectedText: string
  userComment: string
}

const START_MARKER = '<selection_comments>'
const END_MARKER = '</selection_comments>'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** Serialize pending UI comments only at submit time, leaving the visible draft clean. */
export function composeSubmission(draft: string, comments: readonly SelectionComment[]): string {
  if (comments.length === 0) return draft
  const rows = comments.map((comment, index) => [
    `  <comment index="${index + 1}">`,
    `    <selected_text>${escapeXml(comment.selectedText.trim())}</selected_text>`,
    `    <user_comment>${escapeXml(comment.userComment.trim())}</user_comment>`,
    '  </comment>',
  ].join('\n'))
  const context = [START_MARKER, ...rows, END_MARKER].join('\n')
  return draft.trim() ? `${context}\n\n${draft.trimEnd()}` : context
}

export function commentCountLabel(count: number, chinese: boolean): string {
  if (chinese) return `${count} 条评论`
  return `${count} comment${count === 1 ? '' : 's'}`
}
