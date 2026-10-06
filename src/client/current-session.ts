/** The selected view moved out of the session catalog in DSH 0.2. */
export interface SessionSelectionContext {
  reflect: { get(name: string): unknown }
  sessions: { list: { getSnapshot(): { current?: string } } }
}

export function currentSessionId(ctx: SessionSelectionContext): string | undefined {
  // uiSession is optional for legacy hosts. Cordis rejects direct ctx.uiSession
  // access without an inject declaration, even when the service is available.
  const uiSession = ctx.reflect.get('uiSession') as {
    adapter?: { current: { getSnapshot(): { key?: string } } }
  } | undefined
  // An absent view is authoritative; never reuse a stale legacy selection.
  if (uiSession?.adapter) return uiSession.adapter.current.getSnapshot().key
  return ctx.sessions.list.getSnapshot().current
}
