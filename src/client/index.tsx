import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { commentCountLabel, composeSubmission, type SelectionComment } from './comment-format.ts'

export const name = 'quote-to-chat'
export const inject = ['sessions', 'slots']

const POPUP_CLASS = 'dsh-quote-to-chat-popup'
const STYLE_ID = 'dsh-plugin-quote-to-chat/style'

interface PendingState {
  bySession: Record<string, SelectionComment[]>
}

const pendingStore = createSnapshotStore<PendingState>({ bySession: {} })

function sessionKey(sessionId: SessionId): string {
  return String(sessionId)
}

function addPendingComment(sessionId: SessionId, selectedText: string, userComment: string): void {
  const comment: SelectionComment = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    selectedText: selectedText.trim(),
    userComment: userComment.trim(),
  }
  pendingStore.update((state) => {
    const key = sessionKey(sessionId)
    state.bySession[key] = [...(state.bySession[key] ?? []), comment]
  })
}

function removePendingComment(sessionId: SessionId, id: string): void {
  pendingStore.update((state) => {
    const key = sessionKey(sessionId)
    state.bySession[key] = (state.bySession[key] ?? []).filter((comment) => comment.id !== id)
  })
}

function clearPendingComments(sessionId: SessionId): void {
  pendingStore.update((state) => {
    delete state.bySession[sessionKey(sessionId)]
  })
}

function isChinese(): boolean {
  return document.documentElement.lang.toLowerCase().startsWith('zh')
}

function CommentIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  )
}

type PendingCommentsDockProps = PropsRuntime<'conversation.input.dock'>

function PendingCommentsDock({ sessionId, inputActions, useInput }: PendingCommentsDockProps) {
  const state = useSyncExternalStore(pendingStore.subscribe, pendingStore.getSnapshot)
  const comments = state.bySession[sessionKey(sessionId)] ?? []
  const input = useInput((snapshot) => snapshot)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const dockRef = useRef<HTMLDivElement>(null)
  const commentsRef = useRef(comments)
  const inputRef = useRef(input)
  commentsRef.current = comments
  inputRef.current = input

  useEffect(() => {
    if (comments.length === 0) setDetailsOpen(false)
  }, [comments.length])

  useEffect(() => {
    if (!detailsOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && dockRef.current?.contains(target)) return
      setDetailsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer, true)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true)
  }, [detailsOpen])

  const prepareSubmission = useCallback((): boolean => {
    const currentComments = commentsRef.current
    const currentInput = inputRef.current
    if (currentComments.length === 0 || currentInput.phase !== 'plain') return false
    inputActions.setDraft(composeSubmission(currentInput.draft, currentComments))
    clearPendingComments(sessionId)
    return true
  }, [inputActions, sessionId])

  // The primary Send button calls this public action. Wrap it so the hidden
  // structured context is inserted only for the submission transaction.
  useEffect(() => {
    const originalSubmit = inputActions.submit
    const wrappedSubmit = () => {
      if (prepareSubmission()) queueMicrotask(originalSubmit)
      else originalSubmit()
    }
    inputActions.submit = wrappedSubmit
    return () => {
      if (inputActions.submit === wrappedSubmit) inputActions.submit = originalSubmit
    }
  }, [inputActions, prepareSubmission])

  // Enter is handled by DSH's private keyboard facade rather than
  // inputActions.submit, so prepare the same transaction during capture.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.repeat) return
      const target = event.target
      if (!(target instanceof HTMLTextAreaElement) || !target.closest('[data-composer-card]')) return
      if (target.closest(`.${POPUP_CLASS}`)) return
      prepareSubmission()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [prepareSubmission])

  if (comments.length === 0) return null
  const chinese = isChinese()

  return (
    <div ref={dockRef} className="dqt-dock">
      {detailsOpen ? (
        <div className="dqt-details" role="dialog" aria-label={chinese ? '待发送评论' : 'Pending comments'}>
          {comments.map((comment, index) => (
            <div className="dqt-detail-row" key={comment.id}>
              <span className="dqt-detail-index">{index + 1}.</span>
              <div className="dqt-detail-body">
                <div className="dqt-detail-label">{chinese ? '所选文本：' : 'Selected text:'}</div>
                <div className="dqt-detail-text">{comment.selectedText}</div>
                <div className="dqt-detail-label dqt-comment-label">{chinese ? '用户评论：' : 'User comment:'}</div>
                <div className="dqt-detail-text">{comment.userComment}</div>
              </div>
              <button type="button" className="dqt-remove-one" onClick={() => removePendingComment(sessionId, comment.id)} aria-label={chinese ? '删除这条评论' : 'Remove comment'}>×</button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="dqt-chip">
        <button type="button" className="dqt-chip-main" onClick={() => setDetailsOpen((open) => !open)} aria-expanded={detailsOpen}>
          <CommentIcon />
          <span>{commentCountLabel(comments.length, chinese)}</span>
        </button>
        <button type="button" className="dqt-chip-clear" onClick={() => clearPendingComments(sessionId)} aria-label={chinese ? '清空评论' : 'Clear comments'}>×</button>
      </div>
    </div>
  )
}

function installStyle(): () => void {
  if (document.getElementById(STYLE_ID)) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.${POPUP_CLASS}{position:fixed;z-index:2147483000;width:330px;box-sizing:border-box;padding:12px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:16px;background:var(--dsw-specific-menu,#fff);box-shadow:var(--dsw-shadow-lv3,0 10px 32px rgba(0,0,0,.18));color:var(--dsw-alias-label-primary,#222);font:14px/20px var(--dsw-font-sans,system-ui,sans-serif)}
.${POPUP_CLASS} .dqt-popup-label{color:var(--dsw-alias-label-tertiary,#929292);font-weight:600}.dqt-popup-selection{max-height:76px;margin:3px 0 10px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}.dqt-popup-input{box-sizing:border-box;width:100%;min-height:66px;resize:vertical;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:10px;background:var(--dsw-specific-input-major,#fff);color:var(--dsw-alias-label-primary,#222);padding:8px 10px;font:inherit;outline:none}.dqt-popup-input:focus{border-color:var(--dsw-alias-state-business-primary,#6b8cff)}.dqt-popup-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.dqt-popup-actions button{border:0;border-radius:9px;padding:7px 12px;font:inherit;cursor:pointer}.dqt-popup-cancel{background:transparent;color:var(--dsw-alias-label-secondary,#666)}.dqt-popup-add{background:var(--dsw-alias-button-info-fill,#171717);color:#fff}.dqt-popup-add:disabled{opacity:.4;cursor:default}
.dqt-dock{position:relative;box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance,16px) - var(--dsh-composer-side-clearance,16px));max-width:var(--dsh-composer-card-max-width,780px);margin:0 auto;padding:0 16px}.dqt-chip{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:17px;background:var(--dsw-specific-input-major,#fff);box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;color:var(--dsw-alias-label-primary,#222)}.dqt-chip button{border:0;background:transparent;color:inherit;cursor:pointer}.dqt-chip-main{display:flex;align-items:center;gap:7px;padding:6px 4px 6px 10px;font:600 14px/20px var(--dsw-font-sans,system-ui,sans-serif)}.dqt-chip-clear{display:grid;place-items:center;width:28px;height:28px;margin:2px;border-radius:50%;font-size:22px;line-height:1}.dqt-chip button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}.dqt-details{position:absolute;z-index:100;left:16px;bottom:calc(100% + 8px);width:min(430px,calc(100vw - 40px));max-height:380px;overflow:auto;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:18px;background:var(--dsw-specific-menu,#fff);box-shadow:var(--dsw-shadow-lv3,0 10px 32px rgba(0,0,0,.16))}.dqt-detail-row{display:grid;grid-template-columns:28px minmax(0,1fr) 28px;gap:4px;padding:18px 12px 18px 18px}.dqt-detail-row+.dqt-detail-row{border-top:1px solid var(--dsw-alias-border-l1,#eee)}.dqt-detail-index,.dqt-detail-label{color:var(--dsw-alias-label-tertiary,#999)}.dqt-detail-index{font-size:18px}.dqt-detail-label{font-size:15px;font-weight:600}.dqt-detail-text{margin-top:2px;color:var(--dsw-alias-label-primary,#222);font-size:16px;line-height:24px;white-space:pre-wrap;overflow-wrap:anywhere}.dqt-comment-label{margin-top:12px}.dqt-remove-one{border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary,#999);cursor:pointer;font-size:20px}.dqt-remove-one:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
`
  document.head.append(style)
  return () => style.remove()
}

function selectionContext(selection: Selection): { text: string; rect: DOMRect } | null {
  if (selection.isCollapsed || selection.rangeCount === 0) return null
  const text = selection.toString().trim()
  if (!text) return null
  const range = selection.getRangeAt(0)
  const anchor = range.commonAncestorContainer
  const element = anchor instanceof Element ? anchor : anchor.parentElement
  const row = element?.closest<HTMLElement>('[data-chat-flow-kind]')
  const inConversation = Boolean(element?.closest('[data-conversation-scroll]'))
  const kind = row?.dataset.chatFlowKind
  if (!element || !row || !inConversation || kind === 'user' || kind === 'steering') return null
  if (element.closest(`.${POPUP_CLASS}, input, textarea, [contenteditable="true"]`)) return null
  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  return { text, rect }
}

function installSelectionAction(ctx: ClientContext): () => void {
  if (typeof document === 'undefined') return () => {}
  const removeStyle = installStyle()
  let popup: HTMLDivElement | null = null
  let frame = 0

  const dismiss = () => {
    popup?.remove()
    popup = null
  }

  const show = (text: string, rect: DOMRect) => {
    dismiss()
    const sessionId = ctx.sessions.list.getSnapshot().current
    if (!sessionId) return
    const chinese = isChinese()
    popup = document.createElement('div')
    popup.className = POPUP_CLASS
    popup.setAttribute('role', 'dialog')

    const selectedLabel = document.createElement('div')
    selectedLabel.className = 'dqt-popup-label'
    selectedLabel.textContent = chinese ? '所选文本：' : 'Selected text:'
    const selected = document.createElement('div')
    selected.className = 'dqt-popup-selection'
    selected.textContent = text
    const commentLabel = document.createElement('div')
    commentLabel.className = 'dqt-popup-label'
    commentLabel.textContent = chinese ? '用户评论：' : 'User comment:'
    const input = document.createElement('textarea')
    input.className = 'dqt-popup-input'
    input.placeholder = chinese ? '输入针对这段文字的评论' : 'Comment on this selection'
    const actions = document.createElement('div')
    actions.className = 'dqt-popup-actions'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'dqt-popup-cancel'
    cancel.textContent = chinese ? '取消' : 'Cancel'
    const add = document.createElement('button')
    add.type = 'button'
    add.className = 'dqt-popup-add'
    add.textContent = chinese ? '添加到对话' : 'Add to conversation'
    add.disabled = true
    input.addEventListener('input', () => { add.disabled = !input.value.trim() })
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') dismiss()
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && input.value.trim()) add.click()
    })
    cancel.addEventListener('click', dismiss)
    add.addEventListener('click', () => {
      if (!input.value.trim()) return
      addPendingComment(sessionId, text, input.value)
      window.getSelection()?.removeAllRanges()
      dismiss()
    })
    actions.append(cancel, add)
    popup.append(selectedLabel, selected, commentLabel, input, actions)
    document.body.append(popup)
    popup.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 338))}px`
    popup.style.top = `${Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - popup.offsetHeight - 8))}px`
  }

  const update = () => {
    frame = 0
    const selection = window.getSelection()
    const context = selection ? selectionContext(selection) : null
    if (context) show(context.text, context.rect)
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }
  const onPointerUp = (event: PointerEvent) => {
    if (popup && event.target instanceof Node && popup.contains(event.target)) return
    schedule()
  }
  const outside = (event: PointerEvent) => {
    if (popup && event.target instanceof Node && popup.contains(event.target)) return
    if (popup) dismiss()
  }

  document.addEventListener('pointerup', onPointerUp)
  document.addEventListener('pointerdown', outside, true)
  return () => {
    if (frame) cancelAnimationFrame(frame)
    document.removeEventListener('pointerup', onPointerUp)
    document.removeEventListener('pointerdown', outside, true)
    dismiss()
    removeStyle()
  }
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => installSelectionAction(ctx), 'quote-to-chat: selection comments')
  ctx.slots.inject('conversation.input.dock', () =>
    ctx.slots.register(
      {
        name: 'conversation.input.dock',
        id: 'quote-to-chat-comments-dock',
        order: 19,
      },
      PendingCommentsDock,
    ),
  )
}

export { commentCountLabel, composeSubmission } from './comment-format.ts'
