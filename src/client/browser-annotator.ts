import { isChinese } from './locale.ts'

/**
 * Sidebar browser annotation.
 *
 * DSH renders Sidebar web pages in an Electron `<webview>` (the desktop build)
 * or a cross-origin `<iframe>` (a plain `dsh web` browser). Only the webview is
 * reachable from a client plugin, so this module drives it directly:
 *
 * - the browser chrome exposes no plugin slot, so the toggle button is injected
 *   next to the address box and re-attached by a throttled MutationObserver;
 * - the picker itself is injected into the guest page with
 *   `webview.executeJavaScript`, which is not subject to the page's CSP;
 * - captured annotations come back over the webview's `console-message` event,
 *   which needs neither a preload script nor IPC privileges.
 *
 * Anything that cannot be reached (iframe pages, a host without
 * `executeJavaScript`) degrades to "no button" or "button turns itself off".
 */

export const BROWSER_ANNOTATION_MARKER = '__DSH_ANNOT__'
const ANNOTATOR_FLAG = '__dshSelectionComments'
const FRAME_SELECTOR = '[data-sidebar-browser-frame]'
const ADDRESS_SELECTOR = '[class*="_addressBox"]'
const BUTTON_ATTR = 'data-dqt-browser-annotate'
const HOST_STYLE_ID = 'dqt-browser-annotate-style'
const BUTTON_CLASS = 'dqt-browser-annotate'

/** The same chat bubble the transcript comment chip uses. */
const ANNOTATE_ICON = [
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"',
  ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
  '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
  '<path d="M8 9h8M8 13h5"/></svg>',
].join('')

export interface BrowserAnnotationPayload {
  kind: 'element' | 'text'
  selectedText: string
  source: string
  userComment: string
}

interface WebviewLike extends HTMLElement {
  executeJavaScript?: (code: string) => Promise<unknown>
}

interface FrameState {
  button: HTMLButtonElement
  enabled: boolean
  injected: boolean
}

/**
 * Guest-page source. `String.raw` keeps every backslash literal, so regexes and
 * `\n` escapes reach the guest page exactly as written. The body must not use
 * backticks or `${`, which would terminate the template early.
 */
const ANNOTATOR_SOURCE = String.raw`(function () {
  var FLAG = '__dshSelectionComments';
  var MARKER = '__DSH_ANNOT__';
  var NS = 'dsc-annot';
  var existing = window[FLAG];
  if (existing) { existing.setEnabled(true); return 'ok'; }

  var enabled = false;
  var box = null, panel = null, preview = null, sourceEl = null, textarea = null, pending = null;

  var CSS =
    '.' + NS + '-box{position:fixed;z-index:2147483000;pointer-events:none;border:2px solid #6b8cff;background:rgba(107,140,255,.16);border-radius:3px;box-sizing:border-box}' +
    '.' + NS + '-panel{position:fixed;z-index:2147483001;width:340px;box-sizing:border-box;padding:12px;border:1px solid rgba(0,0,0,.14);border-radius:14px;background:#fff;box-shadow:0 12px 36px rgba(0,0,0,.26);color:#1f1f1f;font:14px/20px system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '.' + NS + '-label{color:#8a8a8a;font-weight:600;font-size:13px}' +
    '.' + NS + '-value{max-height:70px;overflow:auto;margin:3px 0 9px;white-space:pre-wrap;overflow-wrap:anywhere;color:#1f1f1f}' +
    '.' + NS + '-input{box-sizing:border-box;width:100%;min-height:62px;resize:vertical;border:1px solid rgba(0,0,0,.16);border-radius:10px;padding:8px 10px;font:inherit;outline:none}' +
    '.' + NS + '-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}' +
    '.' + NS + '-actions button{border:0;border-radius:9px;padding:7px 12px;font:inherit;cursor:pointer}' +
    '.' + NS + '-cancel{background:transparent;color:#666}' +
    '.' + NS + '-add{background:#171717;color:#fff}';

  function installCss() {
    try {
      if (typeof CSSStyleSheet === 'function' && document.adoptedStyleSheets) {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS);
        document.adoptedStyleSheets = document.adoptedStyleSheets.concat([sheet]);
        return;
      }
    } catch (e) {}
    var style = document.createElement('style');
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function send(payload) {
    try { console.log(MARKER + JSON.stringify(payload)); } catch (e) {}
  }

  function isOurs(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node === box) return true;
    return !!(node.closest && node.closest('.' + NS + '-panel'));
  }

  function ownClasses(node) {
    var raw = typeof node.className === 'string' ? node.className.split(/\s+/) : [];
    var kept = [];
    for (var i = 0; i < raw.length && kept.length < 2; i++) {
      if (raw[i] && raw[i].indexOf(NS + '-') !== 0) kept.push(raw[i]);
    }
    return kept;
  }

  function describe(node) {
    var text = node.tagName.toLowerCase();
    var id = node.getAttribute ? node.getAttribute('id') : null;
    if (id) text += '#' + id;
    var kept = ownClasses(node);
    if (kept.length) text += '.' + kept.join('.');
    return text;
  }

  function selectorFor(el) {
    var parts = [];
    var node = el;
    var guard = 0;
    while (node && node.nodeType === 1 && guard < 6) {
      guard++;
      var part = node.tagName.toLowerCase();
      var id = node.getAttribute ? node.getAttribute('id') : null;
      if (id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) {
        var unique = false;
        try { unique = document.querySelectorAll('#' + id).length === 1; } catch (e) {}
        if (unique) { parts.unshift('#' + id); break; }
      }
      var kept = ownClasses(node);
      if (kept.length) part += '.' + kept.join('.');
      var parent = node.parentElement;
      if (parent) {
        var same = [];
        for (var j = 0; j < parent.children.length; j++) {
          if (parent.children[j].tagName === node.tagName) same.push(parent.children[j]);
        }
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  function outline(el) {
    var lines = [];
    function walk(node, depth) {
      if (lines.length >= 12 || depth > 2) return;
      var indent = '';
      for (var i = 0; i < depth; i++) indent += '  ';
      lines.push(indent + '<' + describe(node) + '>');
      var kids = node.children;
      for (var j = 0; j < kids.length && j < 8; j++) walk(kids[j], depth + 1);
    }
    walk(el, 0);
    return lines.join('\n');
  }

  function pageLabel() {
    return (location.host || location.protocol) + (location.pathname || '');
  }

  function ensureBox() {
    if (box) return box;
    box = document.createElement('div');
    box.className = NS + '-box';
    box.style.display = 'none';
    document.documentElement.appendChild(box);
    return box;
  }

  function moveBox(rect) {
    var el = ensureBox();
    el.style.display = 'block';
    el.style.left = rect.left + 'px';
    el.style.top = rect.top + 'px';
    el.style.width = rect.width + 'px';
    el.style.height = rect.height + 'px';
  }

  function hideBox() {
    if (box) box.style.display = 'none';
  }

  function closePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null; preview = null; sourceEl = null; textarea = null; pending = null;
    hideBox();
  }

  function label(text) {
    var el = document.createElement('div');
    el.className = NS + '-label';
    el.textContent = text;
    return el;
  }

  function value(text) {
    var el = document.createElement('div');
    el.className = NS + '-value';
    el.textContent = text;
    return el;
  }

  function openPanel(payload, rect) {
    closePanel();
    pending = payload;
    panel = document.createElement('div');
    panel.className = NS + '-panel';
    sourceEl = value(payload.source);
    preview = value(payload.selectedText);
    textarea = document.createElement('textarea');
    textarea.className = NS + '-input';
    textarea.placeholder = '输入对 AI 的后续要求';

    var actions = document.createElement('div');
    actions.className = NS + '-actions';
    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = NS + '-cancel';
    cancel.textContent = '取消';
    var add = document.createElement('button');
    add.type = 'button';
    add.className = NS + '-add';
    add.textContent = '添加到对话';
    actions.appendChild(cancel);
    actions.appendChild(add);

    panel.appendChild(label('来源'));
    panel.appendChild(sourceEl);
    panel.appendChild(label('所选内容'));
    panel.appendChild(preview);
    panel.appendChild(label('你的要求（可选）'));
    panel.appendChild(textarea);
    panel.appendChild(actions);
    document.documentElement.appendChild(panel);

    var left = Math.max(8, Math.min(rect ? rect.left : 16, window.innerWidth - 356));
    var top = Math.max(8, Math.min((rect ? rect.bottom : 16) + 8, window.innerHeight - panel.offsetHeight - 8));
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';

    cancel.addEventListener('click', function (event) {
      event.stopPropagation();
      closePanel();
    });
    add.addEventListener('click', function (event) {
      event.stopPropagation();
      if (!pending) return;
      send({
        kind: pending.kind,
        selectedText: pending.selectedText,
        source: pending.source,
        userComment: textarea ? textarea.value : ''
      });
      closePanel();
    });
    textarea.addEventListener('keydown', function (event) {
      event.stopPropagation();
      if (event.key === 'Escape') { closePanel(); return; }
      if (event.key !== 'Enter' || event.isComposing) return;
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      add.click();
    });
    textarea.focus();
  }

  function elementPayload(el) {
    var text = (el.innerText || el.textContent || '').replace(/^\s+/, '').replace(/\s+$/, '');
    if (text.length > 1200) text = text.slice(0, 1200) + '...';
    return {
      kind: 'element',
      selectedText: text || '<' + describe(el) + '>',
      source: pageLabel() + ' > ' + selectorFor(el) + '\n' + outline(el)
    };
  }

  function textPayload(text, anchor) {
    var el = anchor && anchor.nodeType === 1 ? anchor : document.body;
    return {
      kind: 'text',
      selectedText: text,
      source: pageLabel() + ' > ' + selectorFor(el)
    };
  }

  function onMouseMove(event) {
    if (!enabled) return;
    var el = event.target;
    if (isOurs(el) || !el || el.nodeType !== 1 || el === document.body || el === document.documentElement) {
      hideBox();
      return;
    }
    moveBox(el.getBoundingClientRect());
  }

  function onClick(event) {
    if (!enabled || isOurs(event.target)) return;
    var selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) return;
    var el = event.target;
    if (!el || el.nodeType !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    openPanel(elementPayload(el), el.getBoundingClientRect());
  }

  function onMouseUp(event) {
    if (!enabled || isOurs(event.target)) return;
    var selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    var text = selection.toString().replace(/^\s+/, '').replace(/\s+$/, '');
    if (!text) return;
    var node = selection.anchorNode;
    var anchor = node && node.nodeType === 1 ? node : (node ? node.parentElement : null);
    var rect = null;
    try { rect = selection.getRangeAt(0).getBoundingClientRect(); } catch (e) {}
    openPanel(textPayload(text, anchor), rect);
  }

  function onKeyDown(event) {
    if (!enabled || event.key !== 'Escape') return;
    closePanel();
  }

  function setEnabled(next) {
    enabled = !!next;
    if (!enabled) { closePanel(); }
  }

  installCss();
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('keydown', onKeyDown, true);

  window[FLAG] = { setEnabled: setEnabled, isEnabled: function () { return enabled; } };
  setEnabled(true);
  return 'ok';
})();`

/** Nearest ancestor of the page frame that also owns the browser chrome. */
function browserChromeFor(frame: Element): { anchor: Element } | null {
  let node: Element | null = frame.parentElement
  for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
    const address = node.querySelector(ADDRESS_SELECTOR)
    if (address) return { anchor: address }
  }
  return null
}

async function callGuest(frame: WebviewLike, code: string): Promise<boolean> {
  const run = frame.executeJavaScript
  if (typeof run !== 'function') return false
  try {
    await run.call(frame, code)
    return true
  } catch {
    return false
  }
}

export function installBrowserAnnotator(
  currentSession: () => string | undefined,
  addComment: (sessionId: string, selectedText: string, userComment: string, source: string) => void,
): () => void {
  if (typeof document === 'undefined') return () => {}

  const states = new WeakMap<Element, FrameState>()
  let timer = 0
  let lastScan = 0
  let disposed = false

  const reflect = (state: FrameState) => {
    const chinese = isChinese()
    state.button.innerHTML = ANNOTATE_ICON
    state.button.title = state.enabled
      ? (chinese ? '退出标注模式' : 'Stop annotating')
      : (chinese ? '标注：选择页面元素或文字' : 'Annotate an element or text')
    state.button.setAttribute('aria-label', state.button.title)
    state.button.setAttribute('aria-pressed', state.enabled ? 'true' : 'false')
  }

  // Only the active state is styled here; the idle look stays whatever the
  // chrome's own tool button provides, so hover and focus keep working.
  const installHostStyle = () => {
    if (document.getElementById(HOST_STYLE_ID)) return
    const style = document.createElement('style')
    style.id = HOST_STYLE_ID
    style.textContent = `
.${BUTTON_CLASS}{display:inline-flex;align-items:center;justify-content:center;line-height:0}
.${BUTTON_CLASS}[aria-pressed="true"]{color:var(--dsw-alias-state-business-primary,#6b8cff);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));border-radius:8px}
`
    document.head.append(style)
  }

  const toggle = async (frame: WebviewLike, state: FrameState) => {
    if (state.enabled) {
      state.enabled = false
      reflect(state)
      if (state.injected) {
        await callGuest(frame, `window.${ANNOTATOR_FLAG} && window.${ANNOTATOR_FLAG}.setEnabled(false)`)
      }
      return
    }
    const injected = await callGuest(frame, ANNOTATOR_SOURCE)
    state.injected = injected
    state.enabled = injected
    reflect(state)
    if (!injected) {
      state.button.title = isChinese()
        ? '当前页面不支持标注（无法注入脚本）'
        : 'This page cannot be annotated (script injection unavailable)'
      state.button.setAttribute('aria-label', state.button.title)
    }
  }

  const onConsole = (event: Event) => {
    const carrier = event as Event & { message?: unknown; detail?: { message?: unknown } }
    const raw = typeof carrier.message === 'string'
      ? carrier.message
      : typeof carrier.detail?.message === 'string' ? carrier.detail.message : ''
    if (!raw.startsWith(BROWSER_ANNOTATION_MARKER)) return
    let payload: { selectedText?: unknown; userComment?: unknown; source?: unknown }
    try {
      payload = JSON.parse(raw.slice(BROWSER_ANNOTATION_MARKER.length))
    } catch {
      return
    }
    const sessionId = currentSession()
    const selectedText = typeof payload.selectedText === 'string' ? payload.selectedText.trim() : ''
    if (sessionId === undefined || !selectedText) return
    addComment(
      sessionId,
      selectedText,
      typeof payload.userComment === 'string' ? payload.userComment : '',
      typeof payload.source === 'string' ? payload.source : '',
    )
  }

  const onDomReady = (frame: WebviewLike, state: FrameState) => {
    if (!state.enabled) return
    void callGuest(frame, ANNOTATOR_SOURCE).then((ok) => {
      state.injected = ok
      if (!ok) {
        state.enabled = false
        reflect(state)
      }
    })
  }

  const ensureButton = (frame: WebviewLike) => {
    const known = states.get(frame)
    if (known && known.button.isConnected) return
    const chrome = browserChromeFor(frame)
    if (chrome === null) return

    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute(BUTTON_ATTR, '')
    installHostStyle()
    // Reuse the chrome's own tool styling when the toolbar exposes one.
    const sample = chrome.anchor.parentElement?.querySelector('button[class*="_tool"]')
    if (sample) {
      button.className = `${sample.className} ${BUTTON_CLASS}`
    } else {
      button.className = BUTTON_CLASS
      button.style.cssText = 'margin-left:6px;width:26px;height:26px;padding:0;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#ddd);background:var(--dsw-specific-input-major,#fff);color:var(--dsw-alias-label-primary,#222);cursor:pointer'
    }

    const state: FrameState = { button, enabled: false, injected: false }
    states.set(frame, state)
    reflect(state)

    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      void toggle(frame, state)
    })
    frame.addEventListener('console-message', onConsole)
    frame.addEventListener('dom-ready', () => onDomReady(frame, state))

    chrome.anchor.insertAdjacentElement('afterend', button)
  }

  const scan = () => {
    lastScan = Date.now()
    if (disposed) return
    for (const frame of Array.from(document.querySelectorAll<WebviewLike>(FRAME_SELECTOR))) {
      ensureButton(frame)
    }
  }

  // The toolbar belongs to another plugin, so the button is re-asserted after
  // its re-renders. Throttled: the observer fires on every transcript mutation.
  const schedule = () => {
    if (disposed || timer !== 0) return
    const wait = Math.max(0, 400 - (Date.now() - lastScan))
    timer = window.setTimeout(() => {
      timer = 0
      scan()
    }, wait)
  }

  scan()
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    disposed = true
    if (timer !== 0) window.clearTimeout(timer)
    observer.disconnect()
    for (const button of Array.from(document.querySelectorAll<HTMLElement>(`[${BUTTON_ATTR}]`))) {
      button.remove()
    }
    document.getElementById(HOST_STYLE_ID)?.remove()
  }
}
