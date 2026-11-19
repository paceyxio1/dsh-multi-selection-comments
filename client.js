window.__ModuleLoader__.load({
  id: "dsh-plugin-multi-selection-comments",
  factory: function (require) {
    // DSH 0.2 moved snapshot stores out of client-runtime. Keep 0.1 support.
    var hostRequire = require;
    require = function (id) {
      if (id === '@deepseek-ai/dsh-client-runtime/client') {
        try { return hostRequire('@deepseek-ai/dsh-client-store'); }
        catch (_) { return hostRequire(id); }
      }
      return hostRequire(id);
    };
    var module = { exports: {} };
    var exports = module.exports;
    (function (module, exports, require) {
"use strict";var W=Object.defineProperty;var me=Object.getOwnPropertyDescriptor;var fe=Object.getOwnPropertyNames;var ge=Object.prototype.hasOwnProperty;var ve=(e,o)=>{for(var n in o)W(e,n,{get:o[n],enumerable:!0})},be=(e,o,n,r)=>{if(o&&typeof o=="object"||typeof o=="function")for(let t of fe(o))!ge.call(e,t)&&t!==n&&W(e,t,{get:()=>o[t],enumerable:!(r=me(o,t))||r.enumerable});return e};var xe=e=>be(W({},"__esModule",{value:!0}),e);var We={};ve(We,{apply:()=>Ue,commentCountLabel:()=>M,composeSubmission:()=>H,ensureEmptyDraftSentinel:()=>B,inject:()=>ke,name:()=>Ce,parseSubmission:()=>A,stripEmptyDraftSentinel:()=>L});module.exports=xe(We);var v=require("react"),le=require("@deepseek-ai/dsh-client-runtime/client");function I(e){let o=e.reflect.get("uiSession");return o?.adapter?o.adapter.current.getSnapshot().key:e.sessions.list.getSnapshot().current}function N(){return typeof document>"u"?!1:document.documentElement.lang.toLowerCase().startsWith("zh")}var Q="__DSH_ANNOT__",ee="__dshSelectionComments",he="[data-sidebar-browser-frame]",we='[class*="_addressBox"]',te="data-dqt-browser-annotate",K="dqt-browser-annotate-style",$="dqt-browser-annotate",ye=['<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"',' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">','<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>','<path d="M8 9h8M8 13h5"/></svg>'].join(""),ne=String.raw`(function () {
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
})();`;function Ee(e){let o=e.parentElement;for(let n=0;o&&n<8;n+=1,o=o.parentElement){let r=o.querySelector(we);if(r)return{anchor:r}}return null}async function V(e,o){let n=e.executeJavaScript;if(typeof n!="function")return!1;try{return await n.call(e,o),!0}catch{return!1}}function oe(e,o){if(typeof document>"u")return()=>{};let n=new WeakMap,r=0,t=0,i=!1,d=c=>{let p=N();c.button.innerHTML=ye,c.button.title=c.enabled?p?"\u9000\u51FA\u6807\u6CE8\u6A21\u5F0F":"Stop annotating":p?"\u6807\u6CE8\uFF1A\u9009\u62E9\u9875\u9762\u5143\u7D20\u6216\u6587\u5B57":"Annotate an element or text",c.button.setAttribute("aria-label",c.button.title),c.button.setAttribute("aria-pressed",c.enabled?"true":"false")},m=()=>{if(document.getElementById(K))return;let c=document.createElement("style");c.id=K,c.textContent=`
.${$}{display:inline-flex;align-items:center;justify-content:center;line-height:0}
.${$}[aria-pressed="true"]{color:var(--dsw-alias-state-business-primary,#6b8cff);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));border-radius:8px}
`,document.head.append(c)},l=async(c,p)=>{if(p.enabled){p.enabled=!1,d(p),p.injected&&await V(c,`window.${ee} && window.${ee}.setEnabled(false)`);return}let b=await V(c,ne);p.injected=b,p.enabled=b,d(p),b||(p.button.title=N()?"\u5F53\u524D\u9875\u9762\u4E0D\u652F\u6301\u6807\u6CE8\uFF08\u65E0\u6CD5\u6CE8\u5165\u811A\u672C\uFF09":"This page cannot be annotated (script injection unavailable)",p.button.setAttribute("aria-label",p.button.title))},u=c=>{let p=c,b=typeof p.message=="string"?p.message:typeof p.detail?.message=="string"?p.detail.message:"";if(!b.startsWith(Q))return;let a;try{a=JSON.parse(b.slice(Q.length))}catch{return}let f=e(),x=typeof a.selectedText=="string"?a.selectedText.trim():"";f===void 0||!x||o(f,x,typeof a.userComment=="string"?a.userComment:"",typeof a.source=="string"?a.source:"")},g=(c,p)=>{p.enabled&&V(c,ne).then(b=>{p.injected=b,b||(p.enabled=!1,d(p))})},w=c=>{let p=n.get(c);if(p&&p.button.isConnected)return;let b=Ee(c);if(b===null)return;let a=document.createElement("button");a.type="button",a.setAttribute(te,""),m();let f=b.anchor.parentElement?.querySelector('button[class*="_tool"]');f?a.className=`${f.className} ${$}`:(a.className=$,a.style.cssText="margin-left:6px;width:26px;height:26px;padding:0;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#ddd);background:var(--dsw-specific-input-major,#fff);color:var(--dsw-alias-label-primary,#222);cursor:pointer");let x={button:a,enabled:!1,injected:!1};n.set(c,x),d(x),a.addEventListener("click",S=>{S.preventDefault(),S.stopPropagation(),l(c,x)}),c.addEventListener("console-message",u),c.addEventListener("dom-ready",()=>g(c,x)),b.anchor.insertAdjacentElement("afterend",a)},y=()=>{if(t=Date.now(),!i)for(let c of Array.from(document.querySelectorAll(he)))w(c)},C=()=>{if(i||r!==0)return;let c=Math.max(0,400-(Date.now()-t));r=window.setTimeout(()=>{r=0,y()},c)};y();let h=new MutationObserver(C);return h.observe(document.body,{childList:!0,subtree:!0}),()=>{i=!0,r!==0&&window.clearTimeout(r),h.disconnect();for(let c of Array.from(document.querySelectorAll(`[${te}]`)))c.remove();document.getElementById(K)?.remove()}}var q="<selection_comments>",X="</selection_comments>";function B(e){return e.includes("\u2063")?e:`${e}\u2063`}function L(e){return e.replace("\u2063","")}function Y(e){return e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}function G(e){return e.replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&amp;","&")}function H(e,o){if(o.length===0)return e;let n=o.map((t,i)=>{let d=t.source?.trim();return[`  <comment index="${i+1}">`,...d?[`    <source>${Y(d)}</source>`]:[],`    <selected_text>${Y(t.selectedText.trim())}</selected_text>`,`    <user_comment>${Y(t.userComment.trim())}</user_comment>`,"  </comment>"].join(`
`)}),r=[q,...n,X].join(`
`);return e.trim()?`${r}

${e.trimEnd()}`:r}function A(e){let o=e.indexOf(q),n=e.indexOf(X,o+q.length);if(o<0||n<0||e.slice(0,o).trim())return null;let r=e.slice(o+q.length,n),t=[],i=/<comment\s+index="(\d+)">\s*(?:<source>([\s\S]*?)<\/source>\s*)?<selected_text>([\s\S]*?)<\/selected_text>\s*<user_comment>([\s\S]*?)<\/user_comment>\s*<\/comment>/g;for(let d of r.matchAll(i)){let m={id:`sent-${d[1]??t.length+1}`,selectedText:G(d[3]??"").trim(),userComment:G(d[4]??"").trim()},l=d[2]===void 0?"":G(d[2]).trim();l&&(m.source=l),t.push(m)}return t.length===0?null:{comments:t,body:e.slice(n+X.length).trimStart()}}function M(e,o){return o?`${e} \u6761\u9009\u4E2D\u5185\u5BB9`:`${e} comment${e===1?"":"s"}`}var s=require("react/jsx-runtime"),Ce="multi-selection-comments",ke=["sessions","slots"],_="dsh-multi-selection-comments-popup",re="dsh-plugin-multi-selection-comments/style",Ne=["[data-document-preview]","[data-textpreview-body]","[data-document-markdown]","[data-code-preview]","[data-html-preview]","[data-image-preview]","[data-files-body]","[data-changes-review]","[data-review-view]","[data-diff-line]"].join(","),D=(0,le.createSnapshotStore)({bySession:{}});function de(e){console.info("[multi-selection-comments]",e)}function O(e){return String(e)}function ce(e,o,n,r){let t=r?.trim(),i={id:globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`,selectedText:o.trim(),userComment:n.trim(),...t?{source:t}:{}};D.update(d=>{let m=O(e);d.bySession[m]=[...d.bySession[m]??[],i]})}function qe(e,o){D.update(n=>{let r=O(e);n.bySession[r]=(n.bySession[r]??[]).filter(t=>t.id!==o)})}function ie(e){D.update(o=>{delete o.bySession[O(e)]})}function ue(){return(0,s.jsxs)("svg",{width:"17",height:"17",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[(0,s.jsx)("path",{d:"M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"}),(0,s.jsx)("path",{d:"M8 9h8M8 13h5"})]})}function Te({attachments:e,loadImage:o}){let[n,r]=(0,v.useState)([]);return(0,v.useEffect)(()=>{let t=!0;return Promise.all(e.map(i=>o(i).catch(()=>""))).then(i=>{t&&r(i)}),()=>{t=!1}},[e,o]),n.length===0?null:(0,s.jsx)("div",{className:"dqt-sent-images",children:n.map((t,i)=>t?(0,s.jsx)("img",{src:t,alt:""},i):null)})}function Le({comments:e}){let[o,n]=(0,v.useState)(!1),r=(0,v.useRef)(null),t=(0,v.useRef)(null),i=N(),d=(0,v.useCallback)(()=>{r.current!==null&&(clearTimeout(r.current),r.current=null),n(!0)},[]),m=(0,v.useCallback)(()=>{r.current!==null&&clearTimeout(r.current),r.current=setTimeout(()=>{r.current=null,n(!1)},250)},[]),l=(0,v.useCallback)(u=>{u.relatedTarget instanceof Node&&u.currentTarget.contains(u.relatedTarget)||m()},[m]);return(0,v.useEffect)(()=>{let u=t.current;if(!u)return;let g=()=>d();return u.addEventListener(j,g),()=>u.removeEventListener(j,g)},[d]),(0,v.useEffect)(()=>()=>{r.current!==null&&clearTimeout(r.current)},[]),(0,s.jsxs)("div",{ref:t,className:"dqt-sent-annotations dqt-hover-bridge",onMouseEnter:d,onMouseLeave:l,children:[o?(0,s.jsx)("div",{className:"dqt-sent-card",children:e.map((u,g)=>(0,s.jsxs)("div",{className:"dqt-sent-card-row",children:[(0,s.jsxs)("span",{className:"dqt-detail-index",children:[g+1,"."]}),(0,s.jsxs)("div",{children:[u.source?(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)("div",{className:"dqt-detail-label",children:i?"\u6765\u6E90\uFF1A":"Source:"}),(0,s.jsx)("div",{className:"dqt-detail-text dqt-detail-source",children:u.source})]}):null,(0,s.jsx)("div",{className:"dqt-detail-label",children:i?"\u6240\u9009\u6587\u672C\uFF1A":"Selected text:"}),(0,s.jsx)("div",{className:"dqt-detail-text",children:u.selectedText}),(0,s.jsx)("div",{className:"dqt-detail-label dqt-comment-label",children:i?"\u4F60\u7684\u8981\u6C42\uFF1A":"User comment:"}),(0,s.jsx)("div",{className:"dqt-detail-text",children:u.userComment})]})]},u.id))}):null,(0,s.jsxs)("span",{className:"dqt-sent-chip",tabIndex:0,onFocus:d,onBlur:m,children:[(0,s.jsx)(ue,{}),(0,s.jsx)("span",{children:i?`${e.length} \u6761\u9009\u4E2D\u5185\u5BB9`:`${e.length} annotation${e.length===1?"":"s"}`})]})]})}function pe({content:e,loadImage:o}){let n=Array.isArray(e)?e:[],r=n.filter(l=>l.type==="text"&&typeof l.text=="string").map(l=>l.text??"").join(""),t=null;try{t=A(r)}catch(l){console.error("[multi-selection-comments] failed to parse a sent envelope:",l)}let i=t?.body??r,d=n.filter(l=>l.type==="image"&&l.attachment!==void 0).map(l=>l.attachment),m=n.filter(l=>l.type!=="text"&&l.type!=="image");return(0,s.jsx)("div",{className:"dqt-sent-user-row",children:(0,s.jsxs)("div",{className:"dqt-sent-user-stack",children:[t?(0,s.jsx)(Le,{comments:t.comments}):null,d.length>0?(0,s.jsx)(Te,{attachments:d,loadImage:o}):null,i||m.length>0?(0,s.jsxs)("div",{className:"dqt-sent-user-bubble",children:[i?(0,s.jsx)("span",{children:i}):null,m.map((l,u)=>(0,s.jsx)("pre",{className:"dqt-sent-extra",children:JSON.stringify(l,null,2)},u))]}):null]})})}function ae({node:e,loadImage:o}){return(0,s.jsx)(pe,{content:e?.data?.content??[],loadImage:o})}function se({node:e,loadImage:o}){return(0,s.jsx)(pe,{content:e?.data?.content??[],loadImage:o})}var Ae='[data-chat-flow-kind="user"], [data-chat-flow-kind="steering"]',Me=".dsh-multi-selection-comments-popup, .dqt-sent-user-row, .dqt-sent-annotations, .dqt-details";function Pe(){let e=document.createElementNS("http://www.w3.org/2000/svg","svg");e.setAttribute("width","17"),e.setAttribute("height","17"),e.setAttribute("viewBox","0 0 24 24"),e.setAttribute("fill","none"),e.setAttribute("stroke","currentColor"),e.setAttribute("stroke-width","1.8"),e.setAttribute("stroke-linecap","round"),e.setAttribute("stroke-linejoin","round"),e.setAttribute("aria-hidden","true");for(let o of["M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z","M8 9h8M8 13h5"]){let n=document.createElementNS("http://www.w3.org/2000/svg","path");n.setAttribute("d",o),e.appendChild(n)}return e}var J="dqt-sent-card-layer",j="dqt-hover-keep",Re=".dqt-pending-annotations, .dqt-sent-annotations",T=null,Z=[],R;function F(){R!==void 0&&(clearTimeout(R),R=void 0)}function z(){F(),R=setTimeout(()=>{R=void 0,T&&(T.style.display="none")},250)}function P(){F(),T&&(T.style.display="none")}function _e(){if(T)return T;let e=document.createElement("div");e.className=J,e.setAttribute("role","dialog"),e.addEventListener("mouseenter",F),e.addEventListener("mouseleave",z);let o=t=>{t.target!==e&&P()},n=t=>{t.target instanceof Element&&T?.style.display!=="none"&&(t.target.closest(`.${J}, .dqt-sent-chip`)||P())};window.addEventListener("scroll",o,!0),window.addEventListener("resize",P),document.addEventListener("pointerdown",n,!0);let r=t=>{e.style.display!=="none"&&(t.target instanceof Element&&t.target.closest(`.${J}, .dqt-sent-chip`)||z())};return document.addEventListener("mousemove",r,!0),Z.push(()=>{window.removeEventListener("scroll",o,!0),window.removeEventListener("resize",P),document.removeEventListener("pointerdown",n,!0),document.removeEventListener("mousemove",r,!0),e.remove()}),document.body.appendChild(e),T=e,e}function De(e,o,n){e.textContent="",o.forEach((r,t)=>{let i=document.createElement("div");i.className="dqt-sent-card-row";let d=document.createElement("span");d.className="dqt-detail-index",d.textContent=`${t+1}.`;let m=document.createElement("div");if(r.source){let y=document.createElement("div");y.className="dqt-detail-label",y.textContent=n?"\u6765\u6E90\uFF1A":"Source:";let C=document.createElement("div");C.className="dqt-detail-text dqt-detail-source",C.textContent=r.source,m.append(y,C)}let l=document.createElement("div");l.className="dqt-detail-label",l.textContent=n?"\u6240\u9009\u6587\u672C\uFF1A":"Selected text:";let u=document.createElement("div");u.className="dqt-detail-text",u.textContent=r.selectedText;let g=document.createElement("div");g.className="dqt-detail-label dqt-comment-label",g.textContent=n?"\u4F60\u7684\u8981\u6C42\uFF1A":"User comment:";let w=document.createElement("div");w.className="dqt-detail-text",w.textContent=r.userComment,m.append(l,u,g,w),i.append(d,m),e.appendChild(i)})}function Oe(e,o,n){F();let r=_e();De(r,e,n),r.style.visibility="hidden",r.style.display="block";let t=o.getBoundingClientRect(),i=r.offsetWidth,d=r.offsetHeight,m=Math.max(8,Math.min(t.right-i,window.innerWidth-i-8)),l=t.top-d-8;l<8&&(l=Math.min(t.bottom+8,window.innerHeight-d-8)),r.style.left=`${Math.round(m)}px`,r.style.top=`${Math.round(Math.max(8,l))}px`,r.style.visibility="visible"}function je(e){let o=N(),n=document.createElement("div");n.className="dqt-sent-annotations dqt-hover-bridge",n.style.display="flex",n.style.justifyContent="flex-end",n.style.width="100%";let r=()=>Oe(e,n,o),t=document.createElement("span");return t.className="dqt-sent-chip",t.tabIndex=0,t.append(Pe(),Object.assign(document.createElement("span"),{textContent:M(e.length,o)})),t.addEventListener("mouseenter",r),t.addEventListener("mouseleave",z),t.addEventListener("focus",r),t.addEventListener("blur",z),n.appendChild(t),n}function Ie(){if(typeof document>"u")return()=>{};let e=0,o=()=>{e=0;for(let t of document.querySelectorAll(Ae)){let i=document.createTreeWalker(t,NodeFilter.SHOW_TEXT),d=[];for(;i.nextNode();){let l=i.currentNode;l.data.includes(q)&&(l.parentElement?.closest(Me)||d.push(l))}let m=!1;for(let l of d){let u=null;try{u=A(l.data)}catch{u=null}u&&(l.data=u.body,u.comments.length>0&&!t.querySelector(".dqt-sent-annotations")&&t.insertBefore(je(u.comments),t.firstChild),m=!0)}m&&de("\u53D1\u9001\u5361\u7247\u7684 keyed \u69FD\u4F4D\u672A\u751F\u6548\uFF0C\u5DF2\u7531 DOM \u515C\u5E95\u628A XML \u4FE1\u5C01\u6539\u5199\u4E3A\u80F6\u56CA\uFF08sent envelope repaired by the DOM fallback\uFF09")}},n=()=>{e||(e=requestAnimationFrame(o))},r=new MutationObserver(n);return r.observe(document.body,{childList:!0,characterData:!0,subtree:!0}),n(),()=>{for(e&&cancelAnimationFrame(e),r.disconnect(),P();Z.length;)Z.pop()?.()}}function $e({sessionId:e,inputActions:o,useInput:n}){let r=(0,v.useSyncExternalStore)(D.subscribe,D.getSnapshot),t=r.bySession[O(e)]??[],i=n(a=>a),[d,m]=(0,v.useState)(!1),l=(0,v.useRef)(t),u=(0,v.useRef)(i),g=(0,v.useRef)(null),w=(0,v.useRef)(!1),y=(0,v.useCallback)(()=>{g.current!==null&&(clearTimeout(g.current),g.current=null),m(!0)},[]),C=(0,v.useCallback)(()=>{g.current!==null&&clearTimeout(g.current),g.current=setTimeout(()=>{g.current=null,m(!1)},250)},[]),h=N(),c=(0,v.useRef)(null);l.current=t,u.current=i,(0,v.useEffect)(()=>{let a=c.current;if(!a)return;let f=()=>y();return a.addEventListener(j,f),()=>a.removeEventListener(j,f)},[y]),(0,v.useEffect)(()=>{t.length===0&&m(!1)},[t.length]),(0,v.useEffect)(()=>()=>{g.current!==null&&clearTimeout(g.current)},[]),(0,v.useEffect)(()=>{if(i.phase!=="plain")return;let a=i.draft.includes("\u2063");t.length>0&&i.draft.trim()===""&&!a?o.setDraft(B(i.draft)):t.length===0&&a&&!i.draft.includes(q)&&o.setDraft(L(i.draft))},[t.length,i.draft,i.phase,o]),(0,v.useEffect)(()=>{i.draft.includes(q)||(w.current=!1)},[i.draft]);let p=(0,v.useCallback)(()=>{if(w.current)return!1;let a=l.current,f=u.current;if(a.length===0||f.phase!=="plain")return!1;let x=L(f.draft);return w.current=!0,o.setDraft(H(x,a)),ie(e),!0},[o,e]);(0,v.useEffect)(()=>{let a=o.submit,f=()=>{p()?queueMicrotask(a):a()};return o.submit=f,()=>{o.submit===f&&(o.submit=a)}},[o,p]),(0,v.useEffect)(()=>{let a=x=>{if(x.key!=="Enter"||x.shiftKey||x.isComposing||x.repeat)return;let S=x.target;!(S instanceof Element)||!S.closest("[data-composer-card]")||S.closest(`.${_}`)||p()},f=x=>{let S=x.target;if(!(S instanceof Element))return;let k=S.closest("button");k===null||k.closest("[data-composer-card]")===null||Array.from(k.classList).some(E=>E.endsWith("_primary"))&&p()};return document.addEventListener("keydown",a,!0),document.addEventListener("click",f,!0),()=>{document.removeEventListener("keydown",a,!0),document.removeEventListener("click",f,!0)}},[p]);let b=Object.entries(r.bySession).filter(([a,f])=>a!==O(e)&&(f?.length??0)>0);return t.length===0?null:(0,s.jsxs)("div",{ref:c,className:"dqt-dock",children:[t.length===0&&b.length>0?(0,s.jsx)("div",{className:"dqt-diag",title:b.map(([a,f])=>`${a}: ${f.length}`).join(`
`),children:h?`\u26A0 \u6709 ${b.reduce((a,[,f])=>a+(f?.length??0),0)} \u6761\u5212\u8BCD\u5185\u5BB9\u6302\u5728\u4E86\u5176\u4ED6\u4F1A\u8BDD\u4E0B\uFF0C\u672A\u5728\u5F53\u524D\u8F93\u5165\u6846\u663E\u793A`:`\u26A0 ${b.reduce((a,[,f])=>a+(f?.length??0),0)} pending selection(s) belong to other sessions`}):null,(0,s.jsxs)("div",{className:"dqt-pending-annotations dqt-hover-bridge",onMouseEnter:y,onMouseLeave:a=>{a.relatedTarget instanceof Node&&a.currentTarget.contains(a.relatedTarget)||C()},onFocus:y,onBlur:a=>{a.currentTarget.contains(a.relatedTarget)||C()},children:[d?(0,s.jsx)("div",{className:"dqt-details",role:"dialog","aria-label":h?"\u5F85\u53D1\u9001\u7684\u9009\u4E2D\u5185\u5BB9":"Pending comments",onMouseEnter:y,onMouseLeave:C,children:t.map((a,f)=>(0,s.jsxs)("div",{className:"dqt-detail-row",children:[(0,s.jsxs)("span",{className:"dqt-detail-index",children:[f+1,"."]}),(0,s.jsxs)("div",{className:"dqt-detail-body",children:[a.source?(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)("div",{className:"dqt-detail-label",children:h?"\u6765\u6E90\uFF1A":"Source:"}),(0,s.jsx)("div",{className:"dqt-detail-text dqt-detail-source",children:a.source})]}):null,(0,s.jsx)("div",{className:"dqt-detail-label",children:h?"\u6240\u9009\u6587\u672C\uFF1A":"Selected text:"}),(0,s.jsx)("div",{className:"dqt-detail-text",children:a.selectedText}),(0,s.jsx)("div",{className:"dqt-detail-label dqt-comment-label",children:h?"\u4F60\u7684\u8981\u6C42\uFF1A":"User comment:"}),(0,s.jsx)("div",{className:"dqt-detail-text",children:a.userComment})]}),(0,s.jsx)("button",{type:"button",className:"dqt-remove-one",onClick:()=>qe(e,a.id),"aria-label":h?"\u5220\u9664\u8FD9\u6761\u9009\u4E2D\u5185\u5BB9":"Remove comment",children:"\xD7"})]},a.id))}):null,(0,s.jsxs)("div",{className:"dqt-chip",children:[(0,s.jsxs)("span",{className:"dqt-chip-main",tabIndex:0,children:[(0,s.jsx)(ue,{}),(0,s.jsx)("span",{children:M(t.length,h)})]}),(0,s.jsx)("button",{type:"button",className:"dqt-chip-clear",onClick:()=>ie(e),"aria-label":h?"\u6E05\u7A7A\u9009\u4E2D\u5185\u5BB9":"Clear comments",children:"\xD7"})]})]})]})}function Be(){if(document.getElementById(re))return()=>{};let e=document.createElement("style");return e.id=re,e.textContent=`
.${_}{position:fixed;z-index:2147483000;width:330px;box-sizing:border-box;padding:12px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:16px;background:#fff;background:rgb(from var(--dsw-specific-menu,#fff) r g b / 1);box-shadow:var(--dsw-shadow-lv3,0 10px 32px rgba(0,0,0,.18));color:var(--dsw-alias-label-primary,#222);font:14px/20px var(--dsw-font-sans,system-ui,sans-serif)}
.${_} .dqt-popup-label{color:var(--dsw-alias-label-tertiary,#929292);font-weight:600}.dqt-popup-selection{max-height:76px;margin:3px 0 10px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}.dqt-popup-input{box-sizing:border-box;width:100%;min-height:66px;resize:vertical;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:10px;background:var(--dsw-specific-input-major,#fff);color:var(--dsw-alias-label-primary,#222);padding:8px 10px;font:inherit;outline:none}.dqt-popup-input:focus{border-color:var(--dsw-alias-state-business-primary,#6b8cff)}.dqt-popup-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.dqt-popup-actions button{border:0;border-radius:9px;padding:7px 12px;font:inherit;cursor:pointer}.dqt-popup-cancel{background:transparent;color:var(--dsw-alias-label-secondary,#666)}.dqt-popup-add{background:var(--dsw-alias-button-info-fill,#171717);color:#fff}.dqt-popup-add:disabled{opacity:.4;cursor:default}
.dqt-dock{position:relative;box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance,16px) - var(--dsh-composer-side-clearance,16px));max-width:var(--dsh-composer-card-max-width,780px);margin:0 auto;padding:0 16px}.dqt-diag{margin:0 0 4px;font:500 12px/17px var(--dsw-font-sans,system-ui,sans-serif);color:#c0392b;cursor:help;overflow-wrap:anywhere}.dqt-pending-annotations{position:relative;display:inline-flex}.dqt-hover-bridge::after{content:'';position:absolute;left:-6px;right:-6px;top:-10px;height:12px;pointer-events:none}.dqt-hover-bridge:hover::after{pointer-events:auto}.dqt-chip{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:17px;background:var(--dsw-specific-input-major,#fff);box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;color:var(--dsw-alias-label-primary,#222)}.dqt-chip button{border:0;background:transparent;color:inherit;cursor:pointer}.dqt-chip-main{display:flex;align-items:center;gap:7px;padding:6px 4px 6px 10px;cursor:default;font:600 14px/20px var(--dsw-font-sans,system-ui,sans-serif)}.dqt-chip-clear{display:grid;place-items:center;width:28px;height:28px;margin:2px;border-radius:50%;font-size:22px;line-height:1}.dqt-chip button:hover,.dqt-chip-main:hover,.dqt-chip-main:focus{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));outline:none}.dqt-details{position:absolute;z-index:100;left:16px;bottom:calc(100% + 8px);width:min(380px,calc(100vw - 40px));max-height:300px;overflow:auto;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:15px;background:#fff;background:rgb(from var(--dsw-specific-menu,#fff) r g b / 1);box-shadow:var(--dsw-shadow-lv3,0 10px 32px rgba(0,0,0,.16))}.dqt-detail-row{display:grid;grid-template-columns:22px minmax(0,1fr) 24px;gap:3px;padding:13px 9px 13px 14px}.dqt-detail-row+.dqt-detail-row{border-top:1px solid var(--dsw-alias-border-l1,#eee)}.dqt-detail-index,.dqt-detail-label{color:var(--dsw-alias-label-tertiary,#999)}.dqt-detail-index{font-size:15px}.dqt-detail-label{font-size:13px;font-weight:600}.dqt-detail-text{margin-top:1px;color:var(--dsw-alias-label-primary,#222);font-size:14px;line-height:21px;white-space:pre-wrap;overflow-wrap:anywhere}.dqt-comment-label{margin-top:8px}.dqt-remove-one{border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary,#999);cursor:pointer;font-size:18px}.dqt-remove-one:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.dqt-sent-user-row{display:flex;flex-direction:column;align-items:flex-end;gap:6px}.dqt-sent-user-stack{display:flex;flex-direction:column;align-items:flex-end;gap:8px;min-width:0;max-width:min(620px,92%)}.dqt-sent-user-bubble{box-sizing:border-box;max-width:min(525px,100%);padding:10px 16px;border-radius:22px;background:var(--dsw-specific-bubble,#f3f3f3);color:var(--dsw-alias-label-primary,#222);font-size:16px;line-height:24px;white-space:pre-wrap;overflow-wrap:anywhere}.dqt-sent-annotations{position:relative;display:inline-flex;align-self:flex-end}.dqt-sent-chip{display:flex;align-items:center;gap:7px;padding:7px 12px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:999px;background:var(--dsw-specific-input-major,#fff);box-shadow:0 1px 4px rgba(0,0,0,.05);color:var(--dsw-alias-label-primary,#222);cursor:default;font:600 14px/20px var(--dsw-font-sans,system-ui,sans-serif)}.dqt-sent-chip:hover,.dqt-sent-chip:focus{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));outline:none}.dqt-sent-card-layer{position:fixed;z-index:2147483000;display:none;box-sizing:border-box;width:min(380px,calc(100vw - 40px));max-height:300px;overflow:auto;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:15px;background:#fff;background:rgb(from var(--dsw-specific-menu,#fff) r g b / 1);box-shadow:var(--dsw-shadow-lv3,0 10px 32px rgba(0,0,0,.16))}.dqt-sent-card{position:absolute;z-index:100;right:0;bottom:calc(100% + 8px);width:min(380px,calc(100vw - 40px));max-height:300px;overflow:auto;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:15px;background:#fff;background:rgb(from var(--dsw-specific-menu,#fff) r g b / 1);box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,.12))}.dqt-sent-card-row{display:grid;grid-template-columns:22px minmax(0,1fr);gap:3px;padding:13px 14px}.dqt-sent-card-row+.dqt-sent-card-row{border-top:1px solid var(--dsw-alias-border-l1,#eee)}.dqt-sent-images{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.dqt-sent-images img{display:block;max-width:260px;max-height:220px;border-radius:12px;object-fit:contain}.dqt-sent-extra{max-width:100%;overflow:auto;font-size:12px;white-space:pre-wrap}
.dqt-detail-source{margin-bottom:8px;color:var(--dsw-alias-label-secondary,#666);font-size:13px}
.dqt-popup-source{max-height:52px;margin:3px 0 8px;color:var(--dsw-alias-label-secondary,#666);font-size:13px}
`,document.head.append(e),()=>e.remove()}function He(e){let o=e.closest("[data-changes-review]")?.querySelector("[data-review-file]"),n=o?.getAttribute("data-review-file")?.trim()||o?.getAttribute("title")?.trim();if(n)return n;let r=e.closest("[data-document-preview]")?.querySelector("[data-textpreview-path]"),t=r?.getAttribute("title")?.trim();if(t)return t;let i=r?.textContent?.trim();return i||e.closest("[data-files-path]")?.dataset.filesPath?.trim()||void 0}function ze(e){if(e.isCollapsed||e.rangeCount===0)return null;let o=e.toString().trim();if(!o)return null;let n=e.getRangeAt(0),r=n.commonAncestorContainer,t=r instanceof Element?r:r.parentElement;if(!t||t.closest(`.${_}, input, textarea, [contenteditable="true"]`))return null;let i=!!t.closest("[data-conversation-scroll]"),d;if(i){let l=t.closest("[data-chat-flow-kind]");if(!l||l.dataset.chatFlowKind!=="assistant-step"||[...l.querySelectorAll('[data-variant="think"]')].some(u=>n.intersectsNode(u)))return null}else if(t.closest(Ne))d=He(t);else return null;let m=n.getBoundingClientRect();return m.width===0&&m.height===0?null:d?{text:o,rect:m,source:d}:{text:o,rect:m}}function Fe(e){if(typeof document>"u")return()=>{};let o=Be(),n=null,r=0,t=()=>{n?.remove(),n=null},i=(g,w,y)=>{t();let C=I(e);if(!C)return;let h=N();n=document.createElement("div"),n.className=_,n.setAttribute("role","dialog");let c=[];if(y){let E=document.createElement("div");E.className="dqt-popup-label",E.textContent=h?"\u6765\u6E90\uFF1A":"Source:";let U=document.createElement("div");U.className="dqt-popup-selection dqt-popup-source",U.textContent=y,c.push(E,U)}let p=document.createElement("div");p.className="dqt-popup-label",p.textContent=h?"\u6240\u9009\u6587\u672C\uFF1A":"Selected text:";let b=document.createElement("div");b.className="dqt-popup-selection",b.textContent=g;let a=document.createElement("div");a.className="dqt-popup-label",a.textContent=h?"\u4F60\u7684\u8981\u6C42\uFF08\u53EF\u9009\uFF09\uFF1A":"User comment (optional):";let f=document.createElement("textarea");f.className="dqt-popup-input",f.placeholder=h?"\u8F93\u5165\u5BF9ai\u7684\u540E\u7EED\u8981\u6C42":"Comment on this selection";let x=document.createElement("div");x.className="dqt-popup-actions";let S=document.createElement("button");S.type="button",S.className="dqt-popup-cancel",S.textContent=h?"\u53D6\u6D88":"Cancel";let k=document.createElement("button");k.type="button",k.className="dqt-popup-add",k.textContent=h?"\u6DFB\u52A0\u5230\u5BF9\u8BDD":"Add to conversation",f.addEventListener("keydown",E=>{E.key==="Escape"&&t(),!(E.key!=="Enter"||E.isComposing)&&(E.ctrlKey||E.metaKey||(E.preventDefault(),E.stopPropagation(),k.click()))}),S.addEventListener("click",t),k.addEventListener("click",()=>{let E=I(e)??C;E&&(ce(E,g,f.value,y),window.getSelection()?.removeAllRanges(),t())}),x.append(S,k),n.append(...c,p,b,a,f,x),document.body.append(n),n.style.left=`${Math.max(8,Math.min(w.left,window.innerWidth-338))}px`,n.style.top=`${Math.max(8,Math.min(w.bottom+8,window.innerHeight-n.offsetHeight-8))}px`},d=()=>{r=0;let g=window.getSelection(),w=g?ze(g):null;w&&i(w.text,w.rect,w.source)},m=()=>{r||(r=requestAnimationFrame(d))},l=g=>{n&&g.target instanceof Node&&n.contains(g.target)||m()},u=g=>{n&&g.target instanceof Node&&n.contains(g.target)||n&&t()};return document.addEventListener("pointerup",l),document.addEventListener("pointerdown",u,!0),()=>{r&&cancelAnimationFrame(r),document.removeEventListener("pointerup",l),document.removeEventListener("pointerdown",u,!0),t(),o()}}function Ue(e){e.effect(()=>Fe(e),"multi-selection-comments: selection comments"),e.effect(()=>oe(()=>I(e),(n,r,t,i)=>{ce(n,r,t,i)}),"multi-selection-comments: sidebar browser annotator"),e.slots.inject("conversation.input.dock",()=>e.slots.register({name:"conversation.input.dock",id:"multi-selection-comments-dock",order:19},$e)),e.slots.inject("conversation.chat.node",()=>e.slots.register({name:"conversation.chat.node",key:"user",priority:-100,locale:"conversation"},ae)),e.slots.inject("conversation.chat.node",()=>e.slots.register({name:"conversation.chat.node",key:"steering",priority:-100,locale:"conversation"},se)),e.effect(()=>Ie(),"multi-selection-comments: sent envelope fallback"),e.effect(()=>{if(typeof document>"u")return()=>{};let n=r=>{let t=r.target;if(!(t instanceof Element))return;let i=t.closest(Re);i&&i.dispatchEvent(new CustomEvent(j))};return document.addEventListener("pointerover",n,!0),()=>document.removeEventListener("pointerover",n,!0)},"multi-selection-comments: hover keep-alive");let o=e.slots;e.effect(()=>{if(typeof o.onEntryError!="function")return()=>{};let n=new Set([ae,se]);return o.onEntryError((r,t,i)=>{if(r!=="conversation.chat.node"||!t||!n.has(t.component))return;let d=i instanceof Error?`${i.name}: ${i.message}`:String(i);de(`\u5212\u8BCD\u53D1\u9001\u5361\u7247\u7684 keyed \u6E32\u67D3\u5668\u5D29\u6E83\u5E76\u9000\u4F4D\uFF1A${d}`)})},"multi-selection-comments: chat node supervision")}

    })(module, module.exports, require);
    return module.exports;
  }
});
