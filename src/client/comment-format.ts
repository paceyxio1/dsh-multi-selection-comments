export interface SelectionComment {
  id: string
  selectedText: string
  userComment: string
  /** Workspace file a sidebar quote came from, when the selection had one. */
  source?: string
}

const START_MARKER = '<selection_comments>'
const END_MARKER = '</selection_comments>'
export const EMPTY_DRAFT_SENTINEL = '\u2063'

export interface ParsedSubmission {
  comments: SelectionComment[]
  body: string
}

/** Keep DSH's native Send control active while the visible main draft is empty. */
export function ensureEmptyDraftSentinel(draft: string): string {
  return draft.includes(EMPTY_DRAFT_SENTINEL) ? draft : `${draft}${EMPTY_DRAFT_SENTINEL}`
}

/** Never expose the UI-only sentinel to the serialized message or model. */
export function stripEmptyDraftSentinel(draft: string): string {
  return draft.replace(EMPTY_DRAFT_SENTINEL, '')
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function unescapeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

/** Serialize pending UI comments only at submit time, leaving the visible draft clean. */
export function composeSubmission(draft: string, comments: readonly SelectionComment[]): string {
  if (comments.length === 0) return draft
  const rows = comments.map((comment, index) => {
    const source = comment.source?.trim()
    return [
      `  <comment index="${index + 1}">`,
      ...(source ? [`    <source>${escapeXml(source)}</source>`] : []),
      `    <selected_text>${escapeXml(comment.selectedText.trim())}</selected_text>`,
      `    <user_comment>${escapeXml(comment.userComment.trim())}</user_comment>`,
      '  </comment>',
    ].join('\n')
  })
  const context = [START_MARKER, ...rows, END_MARKER].join('\n')
  return draft.trim() ? `${context}\n\n${draft.trimEnd()}` : context
}

/** Parse this plugin's model-facing envelope back into presentation data. */
export function parseSubmission(value: string): ParsedSubmission | null {
  const start = value.indexOf(START_MARKER)
  const end = value.indexOf(END_MARKER, start + START_MARKER.length)
  if (start < 0 || end < 0 || value.slice(0, start).trim()) return null
  const envelope = value.slice(start + START_MARKER.length, end)
  const comments: SelectionComment[] = []
  // The source element is optional so envelopes written by older versions, and
  // quotes taken from the transcript, keep parsing exactly as before.
  const pattern = /<comment\s+index="(\d+)">\s*(?:<source>([\s\S]*?)<\/source>\s*)?<selected_text>([\s\S]*?)<\/selected_text>\s*<user_comment>([\s\S]*?)<\/user_comment>\s*<\/comment>/g
  for (const match of envelope.matchAll(pattern)) {
    const comment: SelectionComment = {
      id: `sent-${match[1] ?? comments.length + 1}`,
      selectedText: unescapeXml(match[3] ?? '').trim(),
      userComment: unescapeXml(match[4] ?? '').trim(),
    }
    const source = match[2] === undefined ? '' : unescapeXml(match[2]).trim()
    if (source) comment.source = source
    comments.push(comment)
  }
  if (comments.length === 0) return null
  return {
    comments,
    body: value.slice(end + END_MARKER.length).trimStart(),
  }
}

export function commentCountLabel(count: number, chinese: boolean): string {
  if (chinese) return `${count} 条选中内容`
  return `${count} comment${count === 1 ? '' : 's'}`
}
