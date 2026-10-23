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
"use strict";var B=Object.defineProperty;var ne=Object.getOwnPropertyDescriptor;var oe=Object.getOwnPropertyNames;var re=Object.prototype.hasOwnProperty;var ae=(e,t)=>{for(var o in t)B(e,o,{get:t[o],enumerable:!0})},ie=(e,t,o,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of oe(t))!re.call(e,n)&&n!==o&&B(e,n,{get:()=>t[n],enumerable:!(i=ne(t,n))||i.enumerable});return e};var se=e=>ie(B({},"__esModule",{value:!0}),e);var qe={};ae(qe,{apply:()=>Ce,commentCountLabel:()=>D,composeSubmission:()=>_,ensureEmptyDraftSentinel:()=>M,inject:()=>fe,name:()=>me,parseSubmission:()=>R,stripEmptyDraftSentinel:()=>T});module.exports=se(qe);var f=require("react"),Z=require("@deepseek-ai/dsh-client-runtime/client");function O(e){let t=e.reflect.get("uiSession");return t?.adapter?t.adapter.current.getSnapshot().key:e.sessions.list.getSnapshot().current}function N(){return typeof document>"u"?!1:document.documentElement.lang.toLowerCase().startsWith("zh")}var K="__DSH_ANNOT__",W="__dshSelectionComments",le="[data-sidebar-browser-frame]",de='[class*="_addressBox"]',V="data-dqt-browser-annotate",$="dqt-browser-annotate-style",P="dqt-browser-annotate",ce=['<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"',' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">','<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>','<path d="M8 9h8M8 13h5"/></svg>'].join(""),Y=String.raw`(function () {
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
})();`;function ue(e){let t=e.parentElement;for(let o=0;t&&o<8;o+=1,t=t.parentElement){let i=t.querySelector(de);if(i)return{anchor:i}}return null}async function z(e,t){let o=e.executeJavaScript;if(typeof o!="function")return!1;try{return await o.call(e,t),!0}catch{return!1}}function G(e,t){if(typeof document>"u")return()=>{};let o=new WeakMap,i=0,n=0,l=!1,u=s=>{let r=N();s.button.innerHTML=ce,s.button.title=s.enabled?r?"\u9000\u51FA\u6807\u6CE8\u6A21\u5F0F":"Stop annotating":r?"\u6807\u6CE8\uFF1A\u9009\u62E9\u9875\u9762\u5143\u7D20\u6216\u6587\u5B57":"Annotate an element or text",s.button.setAttribute("aria-label",s.button.title),s.button.setAttribute("aria-pressed",s.enabled?"true":"false")},x=()=>{if(document.getElementById($))return;let s=document.createElement("style");s.id=$,s.textContent=`
.${P}{display:inline-flex;align-items:center;justify-content:center;line-height:0}
.${P}[aria-pressed="true"]{color:var(--dsw-alias-state-business-primary,#6b8cff);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));border-radius:8px}
`,document.head.append(s)},c=async(s,r)=>{if(r.enabled){r.enabled=!1,u(r),r.injected&&await z(s,`window.${W} && window.${W}.setEnabled(false)`);return}let p=await z(s,Y);r.injected=p,r.enabled=p,u(r),p||(r.button.title=N()?"\u5F53\u524D\u9875\u9762\u4E0D\u652F\u6301\u6807\u6CE8\uFF08\u65E0\u6CD5\u6CE8\u5165\u811A\u672C\uFF09":"This page cannot be annotated (script injection unavailable)",r.button.setAttribute("aria-label",r.button.title))},w=s=>{let r=s,p=typeof r.message=="string"?r.message:typeof r.detail?.message=="string"?r.detail.message:"";if(!p.startsWith(K))return;let d;try{d=JSON.parse(p.slice(K.length))}catch{return}let g=e(),v=typeof d.selectedText=="string"?d.selectedText.trim():"";g===void 0||!v||t(g,v,typeof d.userComment=="string"?d.userComment:"",typeof d.source=="string"?d.source:"")},m=(s,r)=>{r.enabled&&z(s,Y).then(p=>{r.injected=p,p||(r.enabled=!1,u(r))})},h=s=>{let r=o.get(s);if(r&&r.button.isConnected)return;let p=ue(s);if(p===null)return;let d=document.createElement("button");d.type="button",d.setAttribute(V,""),x();let g=p.anchor.parentElement?.querySelector('button[class*="_tool"]');g?d.className=`${g.className} ${P}`:(d.className=P,d.style.cssText="margin-left:6px;width:26px;height:26px;padding:0;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#ddd);background:var(--dsw-specific-input-major,#fff);color:var(--dsw-alias-label-primary,#222);cursor:pointer");let v={button:d,enabled:!1,injected:!1};o.set(s,v),u(v),d.addEventListener("click",E=>{E.preventDefault(),E.stopPropagation(),c(s,v)}),s.addEventListener("console-message",w),s.addEventListener("dom-ready",()=>m(s,v)),p.anchor.insertAdjacentElement("afterend",d)},S=()=>{if(n=Date.now(),!l)for(let s of Array.from(document.querySelectorAll(le)))h(s)},k=()=>{if(l||i!==0)return;let s=Math.max(0,400-(Date.now()-n));i=window.setTimeout(()=>{i=0,S()},s)};S();let b=new MutationObserver(k);return b.observe(document.body,{childList:!0,subtree:!0}),()=>{l=!0,i!==0&&window.clearTimeout(i),b.disconnect();for(let s of Array.from(document.querySelectorAll(`[${V}]`)))s.remove();document.getElementById($)?.remove()}}var C="<selection_comments>",U="</selection_comments>";function M(e){return e.includes("\u2063")?e:`${e}\u2063`}function T(e){return e.replace("\u2063","")}function F(e){return e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}function H(e){return e.replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&amp;","&")}function _(e,t){if(t.length===0)return e;let o=t.map((n,l)=>{let u=n.source?.trim();return[`  <comment index="${l+1}">`,...u?[`    <source>${F(u)}</source>`]:[],`    <selected_text>${F(n.selectedText.trim())}</selected_text>`,`    <user_comment>${F(n.userComment.trim())}</user_comment>`,"  </comment>"].join(`
`)}),i=[C,...o,U].join(`
`);return e.trim()?`${i}

${e.trimEnd()}`:i}function R(e){let t=e.indexOf(C),o=e.indexOf(U,t+C.length);if(t<0||o<0||e.slice(0,t).trim())return null;let i=e.slice(t+C.length,o),n=[],l=/<comment\s+index="(\d+)">\s*(?:<source>([\s\S]*?)<\/source>\s*)?<selected_text>([\s\S]*?)<\/selected_text>\s*<user_comment>([\s\S]*?)<\/user_comment>\s*<\/comment>/g;for(let u of i.matchAll(l)){let x={id:`sent-${u[1]??n.length+1}`,selectedText:H(u[3]??"").trim(),userComment:H(u[4]??"").trim()},c=u[2]===void 0?"":H(u[2]).trim();c&&(x.source=c),n.push(x)}return n.length===0?null:{comments:n,body:e.slice(o+U.length).trimStart()}}function D(e,t){return t?`${e} \u6761\u9009\u4E2D\u5185\u5BB9`:`${e} comment${e===1?"":"s"}`}var a=require("react/jsx-runtime"),me="multi-selection-comments",fe=["sessions","slots"],L="dsh-multi-selection-comments-popup",J="dsh-plugin-multi-selection-comments/style",xe=["[data-document-preview]","[data-textpreview-body]","[data-document-markdown]","[data-code-preview]","[data-html-preview]","[data-image-preview]","[data-files-body]","[data-changes-review]","[data-review-view]","[data-diff-line]"].join(","),A=(0,Z.createSnapshotStore)({bySession:{}});function I(e){return String(e)}function Q(e,t,o,i){let n=i?.trim(),l={id:globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`,selectedText:t.trim(),userComment:o.trim(),...n?{source:n}:{}};A.update(u=>{let x=I(e);u.bySession[x]=[...u.bySession[x]??[],l]})}function ge(e,t){A.update(o=>{let i=I(e);o.bySession[i]=(o.bySession[i]??[]).filter(n=>n.id!==t)})}function X(e){A.update(t=>{delete t.bySession[I(e)]})}function ee(){return(0,a.jsxs)("svg",{width:"17",height:"17",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[(0,a.jsx)("path",{d:"M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"}),(0,a.jsx)("path",{d:"M8 9h8M8 13h5"})]})}function be({attachments:e,loadImage:t}){let[o,i]=(0,f.useState)([]);return(0,f.useEffect)(()=>{let n=!0;return Promise.all(e.map(l=>t(l).catch(()=>""))).then(l=>{n&&i(l)}),()=>{n=!1}},[e,t]),o.length===0?null:(0,a.jsx)("div",{className:"dqt-sent-images",children:o.map((n,l)=>n?(0,a.jsx)("img",{src:n,alt:""},l):null)})}function ve({comments:e}){let[t,o]=(0,f.useState)(!1),i=N();return(0,a.jsxs)("div",{className:"dqt-sent-annotations",onMouseEnter:()=>o(!0),onMouseLeave:()=>o(!1),children:[t?(0,a.jsx)("div",{className:"dqt-sent-card",children:e.map((n,l)=>(0,a.jsxs)("div",{className:"dqt-sent-card-row",children:[(0,a.jsxs)("span",{className:"dqt-detail-index",children:[l+1,"."]}),(0,a.jsxs)("div",{children:[n.source?(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)("div",{className:"dqt-detail-label",children:i?"\u6765\u6E90\uFF1A":"Source:"}),(0,a.jsx)("div",{className:"dqt-detail-text dqt-detail-source",children:n.source})]}):null,(0,a.jsx)("div",{className:"dqt-detail-label",children:i?"\u6240\u9009\u6587\u672C\uFF1A":"Selected text:"}),(0,a.jsx)("div",{className:"dqt-detail-text",children:n.selectedText}),(0,a.jsx)("div",{className:"dqt-detail-label dqt-comment-label",children:i?"\u4F60\u7684\u8981\u6C42\uFF1A":"User comment:"}),(0,a.jsx)("div",{className:"dqt-detail-text",children:n.userComment})]})]},n.id))}):null,(0,a.jsxs)("span",{className:"dqt-sent-chip",tabIndex:0,onFocus:()=>o(!0),onBlur:()=>o(!1),children:[(0,a.jsx)(ee,{}),(0,a.jsx)("span",{children:i?`${e.length} \u6761\u9009\u4E2D\u5185\u5BB9`:`${e.length} annotation${e.length===1?"":"s"}`})]})]})}function te({content:e,loadImage:t}){let o=e,i=o.filter(c=>c.type==="text"&&typeof c.text=="string").map(c=>c.text??"").join(""),n=R(i),l=n?.body??i,u=o.filter(c=>c.type==="image"&&c.attachment!==void 0).map(c=>c.attachment),x=o.filter(c=>c.type!=="text"&&c.type!=="image");return(0,a.jsx)("div",{className:"dqt-sent-user-row",children:(0,a.jsxs)("div",{className:"dqt-sent-user-stack",children:[n?(0,a.jsx)(ve,{comments:n.comments}):null,u.length>0?(0,a.jsx)(be,{attachments:u,loadImage:t}):null,l||x.length>0?(0,a.jsxs)("div",{className:"dqt-sent-user-bubble",children:[l?(0,a.jsx)("span",{children:l}):null,x.map((c,w)=>(0,a.jsx)("pre",{className:"dqt-sent-extra",children:JSON.stringify(c,null,2)},w))]}):null]})})}function he({node:e,loadImage:t}){return(0,a.jsx)(te,{content:e.data.content,loadImage:t})}function we({node:e,loadImage:t}){return(0,a.jsx)(te,{content:e.data.content,loadImage:t})}function ye({sessionId:e,inputActions:t,useInput:o}){let n=(0,f.useSyncExternalStore)(A.subscribe,A.getSnapshot).bySession[I(e)]??[],l=o(r=>r),[u,x]=(0,f.useState)(!1),c=(0,f.useRef)(n),w=(0,f.useRef)(l),m=(0,f.useRef)(null),h=(0,f.useRef)(!1),S=(0,f.useCallback)(()=>{m.current!==null&&(clearTimeout(m.current),m.current=null),x(!0)},[]),k=(0,f.useCallback)(()=>{m.current!==null&&clearTimeout(m.current),m.current=setTimeout(()=>{m.current=null,x(!1)},120)},[]);c.current=n,w.current=l,(0,f.useEffect)(()=>{n.length===0&&x(!1)},[n.length]),(0,f.useEffect)(()=>()=>{m.current!==null&&clearTimeout(m.current)},[]),(0,f.useEffect)(()=>{if(l.phase!=="plain")return;let r=l.draft.includes("\u2063");n.length>0&&l.draft.trim()===""&&!r?t.setDraft(M(l.draft)):n.length===0&&r&&!l.draft.includes(C)&&t.setDraft(T(l.draft))},[n.length,l.draft,l.phase,t]),(0,f.useEffect)(()=>{l.draft.includes(C)||(h.current=!1)},[l.draft]);let b=(0,f.useCallback)(()=>{if(h.current)return!1;let r=c.current,p=w.current;if(r.length===0||p.phase!=="plain")return!1;let d=T(p.draft);return h.current=!0,t.setDraft(_(d,r)),X(e),!0},[t,e]);if((0,f.useEffect)(()=>{let r=t.submit,p=()=>{b()?queueMicrotask(r):r()};return t.submit=p,()=>{t.submit===p&&(t.submit=r)}},[t,b]),(0,f.useEffect)(()=>{let r=d=>{if(d.key!=="Enter"||d.shiftKey||d.isComposing||d.repeat)return;let g=d.target;!(g instanceof Element)||!g.closest("[data-composer-card]")||g.closest(`.${L}`)||b()},p=d=>{let g=d.target;if(!(g instanceof Element))return;let v=g.closest("button");v===null||v.closest("[data-composer-card]")===null||Array.from(v.classList).some(E=>E.endsWith("_primary"))&&b()};return document.addEventListener("keydown",r,!0),document.addEventListener("click",p,!0),()=>{document.removeEventListener("keydown",r,!0),document.removeEventListener("click",p,!0)}},[b]),n.length===0)return null;let s=N();return(0,a.jsx)("div",{className:"dqt-dock",children:(0,a.jsxs)("div",{className:"dqt-pending-annotations",onMouseEnter:S,onMouseLeave:k,onFocus:S,onBlur:r=>{r.currentTarget.contains(r.relatedTarget)||k()},children:[u?(0,a.jsx)("div",{className:"dqt-details",role:"dialog","aria-label":s?"\u5F85\u53D1\u9001\u7684\u9009\u4E2D\u5185\u5BB9":"Pending comments",onMouseEnter:S,onMouseLeave:k,children:n.map((r,p)=>(0,a.jsxs)("div",{className:"dqt-detail-row",children:[(0,a.jsxs)("span",{className:"dqt-detail-index",children:[p+1,"."]}),(0,a.jsxs)("div",{className:"dqt-detail-body",children:[r.source?(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)("div",{className:"dqt-detail-label",children:s?"\u6765\u6E90\uFF1A":"Source:"}),(0,a.jsx)("div",{className:"dqt-detail-text dqt-detail-source",children:r.source})]}):null,(0,a.jsx)("div",{className:"dqt-detail-label",children:s?"\u6240\u9009\u6587\u672C\uFF1A":"Selected text:"}),(0,a.jsx)("div",{className:"dqt-detail-text",children:r.selectedText}),(0,a.jsx)("div",{className:"dqt-detail-label dqt-comment-label",children:s?"\u4F60\u7684\u8981\u6C42\uFF1A":"User comment:"}),(0,a.jsx)("div",{className:"dqt-detail-text",children:r.userComment})]}),(0,a.jsx)("button",{type:"button",className:"dqt-remove-one",onClick:()=>ge(e,r.id),"aria-label":s?"\u5220\u9664\u8FD9\u6761\u9009\u4E2D\u5185\u5BB9":"Remove comment",children:"\xD7"})]},r.id))}):null,(0,a.jsxs)("div",{className:"dqt-chip",children:[(0,a.jsxs)("span",{className:"dqt-chip-main",tabIndex:0,children:[(0,a.jsx)(ee,{}),(0,a.jsx)("span",{children:D(n.length,s)})]}),(0,a.jsx)("button",{type:"button",className:"dqt-chip-clear",onClick:()=>X(e),"aria-label":s?"\u6E05\u7A7A\u9009\u4E2D\u5185\u5BB9":"Clear comments",children:"\xD7"})]})]})})}function Se(){if(document.getElementById(J))return()=>{};let e=document.createElement("style");return e.id=J,e.textContent=`
.${L}{position:fixed;z-index:2147483000;width:330px;box-sizing:border-box;padding:12px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:16px;background:#fff;background:rgb(from var(--dsw-specific-menu,#fff) r g b / 1);box-shadow:var(--dsw-shadow-lv3,0 10px 32px rgba(0,0,0,.18));color:var(--dsw-alias-label-primary,#222);font:14px/20px var(--dsw-font-sans,system-ui,sans-serif)}
.${L} .dqt-popup-label{color:var(--dsw-alias-label-tertiary,#929292);font-weight:600}.dqt-popup-selection{max-height:76px;margin:3px 0 10px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}.dqt-popup-input{box-sizing:border-box;width:100%;min-height:66px;resize:vertical;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:10px;background:var(--dsw-specific-input-major,#fff);color:var(--dsw-alias-label-primary,#222);padding:8px 10px;font:inherit;outline:none}.dqt-popup-input:focus{border-color:var(--dsw-alias-state-business-primary,#6b8cff)}.dqt-popup-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.dqt-popup-actions button{border:0;border-radius:9px;padding:7px 12px;font:inherit;cursor:pointer}.dqt-popup-cancel{background:transparent;color:var(--dsw-alias-label-secondary,#666)}.dqt-popup-add{background:var(--dsw-alias-button-info-fill,#171717);color:#fff}.dqt-popup-add:disabled{opacity:.4;cursor:default}
.dqt-dock{position:relative;box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance,16px) - var(--dsh-composer-side-clearance,16px));max-width:var(--dsh-composer-card-max-width,780px);margin:0 auto;padding:0 16px}.dqt-pending-annotations{position:relative;display:inline-flex}.dqt-chip{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:17px;background:var(--dsw-specific-input-major,#fff);box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;color:var(--dsw-alias-label-primary,#222)}.dqt-chip button{border:0;background:transparent;color:inherit;cursor:pointer}.dqt-chip-main{display:flex;align-items:center;gap:7px;padding:6px 4px 6px 10px;cursor:default;font:600 14px/20px var(--dsw-font-sans,system-ui,sans-serif)}.dqt-chip-clear{display:grid;place-items:center;width:28px;height:28px;margin:2px;border-radius:50%;font-size:22px;line-height:1}.dqt-chip button:hover,.dqt-chip-main:hover,.dqt-chip-main:focus{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));outline:none}.dqt-details{position:absolute;z-index:100;left:16px;bottom:calc(100% + 8px);width:min(380px,calc(100vw - 40px));max-height:300px;overflow:auto;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:15px;background:#fff;background:rgb(from var(--dsw-specific-menu,#fff) r g b / 1);box-shadow:var(--dsw-shadow-lv3,0 10px 32px rgba(0,0,0,.16))}.dqt-detail-row{display:grid;grid-template-columns:22px minmax(0,1fr) 24px;gap:3px;padding:13px 9px 13px 14px}.dqt-detail-row+.dqt-detail-row{border-top:1px solid var(--dsw-alias-border-l1,#eee)}.dqt-detail-index,.dqt-detail-label{color:var(--dsw-alias-label-tertiary,#999)}.dqt-detail-index{font-size:15px}.dqt-detail-label{font-size:13px;font-weight:600}.dqt-detail-text{margin-top:1px;color:var(--dsw-alias-label-primary,#222);font-size:14px;line-height:21px;white-space:pre-wrap;overflow-wrap:anywhere}.dqt-comment-label{margin-top:8px}.dqt-remove-one{border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary,#999);cursor:pointer;font-size:18px}.dqt-remove-one:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.dqt-sent-user-row{display:flex;flex-direction:column;align-items:flex-end;gap:6px}.dqt-sent-user-stack{display:flex;flex-direction:column;align-items:flex-end;gap:8px;min-width:0;max-width:min(620px,92%)}.dqt-sent-user-bubble{box-sizing:border-box;max-width:min(525px,100%);padding:10px 16px;border-radius:22px;background:var(--dsw-specific-bubble,#f3f3f3);color:var(--dsw-alias-label-primary,#222);font-size:16px;line-height:24px;white-space:pre-wrap;overflow-wrap:anywhere}.dqt-sent-annotations{position:relative;display:inline-flex;align-self:flex-end}.dqt-sent-chip{display:flex;align-items:center;gap:7px;padding:7px 12px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:999px;background:var(--dsw-specific-input-major,#fff);box-shadow:0 1px 4px rgba(0,0,0,.05);color:var(--dsw-alias-label-primary,#222);cursor:default;font:600 14px/20px var(--dsw-font-sans,system-ui,sans-serif)}.dqt-sent-chip:hover,.dqt-sent-chip:focus{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));outline:none}.dqt-sent-card{position:absolute;z-index:100;right:0;bottom:calc(100% + 8px);width:min(380px,calc(100vw - 40px));max-height:300px;overflow:auto;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:15px;background:#fff;background:rgb(from var(--dsw-specific-menu,#fff) r g b / 1);box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,.12))}.dqt-sent-card-row{display:grid;grid-template-columns:22px minmax(0,1fr);gap:3px;padding:13px 14px}.dqt-sent-card-row+.dqt-sent-card-row{border-top:1px solid var(--dsw-alias-border-l1,#eee)}.dqt-sent-images{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.dqt-sent-images img{display:block;max-width:260px;max-height:220px;border-radius:12px;object-fit:contain}.dqt-sent-extra{max-width:100%;overflow:auto;font-size:12px;white-space:pre-wrap}
.dqt-detail-source{margin-bottom:8px;color:var(--dsw-alias-label-secondary,#666);font-size:13px}
.dqt-popup-source{max-height:52px;margin:3px 0 8px;color:var(--dsw-alias-label-secondary,#666);font-size:13px}
`,document.head.append(e),()=>e.remove()}function Ee(e){let t=e.closest("[data-changes-review]")?.querySelector("[data-review-file]"),o=t?.getAttribute("data-review-file")?.trim()||t?.getAttribute("title")?.trim();if(o)return o;let i=e.closest("[data-document-preview]")?.querySelector("[data-textpreview-path]"),n=i?.getAttribute("title")?.trim();if(n)return n;let l=i?.textContent?.trim();return l||e.closest("[data-files-path]")?.dataset.filesPath?.trim()||void 0}function ke(e){if(e.isCollapsed||e.rangeCount===0)return null;let t=e.toString().trim();if(!t)return null;let o=e.getRangeAt(0),i=o.commonAncestorContainer,n=i instanceof Element?i:i.parentElement;if(!n||n.closest(`.${L}, input, textarea, [contenteditable="true"]`))return null;let l=!!n.closest("[data-conversation-scroll]"),u;if(l){let c=n.closest("[data-chat-flow-kind]");if(!c||c.dataset.chatFlowKind!=="assistant-step"||[...c.querySelectorAll('[data-variant="think"]')].some(w=>o.intersectsNode(w)))return null}else if(n.closest(xe))u=Ee(n);else return null;let x=o.getBoundingClientRect();return x.width===0&&x.height===0?null:u?{text:t,rect:x,source:u}:{text:t,rect:x}}function Ne(e){if(typeof document>"u")return()=>{};let t=Se(),o=null,i=0,n=()=>{o?.remove(),o=null},l=(m,h,S)=>{n();let k=O(e);if(!k)return;let b=N();o=document.createElement("div"),o.className=L,o.setAttribute("role","dialog");let s=[];if(S){let y=document.createElement("div");y.className="dqt-popup-label",y.textContent=b?"\u6765\u6E90\uFF1A":"Source:";let j=document.createElement("div");j.className="dqt-popup-selection dqt-popup-source",j.textContent=S,s.push(y,j)}let r=document.createElement("div");r.className="dqt-popup-label",r.textContent=b?"\u6240\u9009\u6587\u672C\uFF1A":"Selected text:";let p=document.createElement("div");p.className="dqt-popup-selection",p.textContent=m;let d=document.createElement("div");d.className="dqt-popup-label",d.textContent=b?"\u4F60\u7684\u8981\u6C42\uFF08\u53EF\u9009\uFF09\uFF1A":"User comment (optional):";let g=document.createElement("textarea");g.className="dqt-popup-input",g.placeholder=b?"\u8F93\u5165\u5BF9ai\u7684\u540E\u7EED\u8981\u6C42":"Comment on this selection";let v=document.createElement("div");v.className="dqt-popup-actions";let E=document.createElement("button");E.type="button",E.className="dqt-popup-cancel",E.textContent=b?"\u53D6\u6D88":"Cancel";let q=document.createElement("button");q.type="button",q.className="dqt-popup-add",q.textContent=b?"\u6DFB\u52A0\u5230\u5BF9\u8BDD":"Add to conversation",g.addEventListener("keydown",y=>{y.key==="Escape"&&n(),!(y.key!=="Enter"||y.isComposing)&&(y.ctrlKey||y.metaKey||(y.preventDefault(),y.stopPropagation(),q.click()))}),E.addEventListener("click",n),q.addEventListener("click",()=>{Q(k,m,g.value,S),window.getSelection()?.removeAllRanges(),n()}),v.append(E,q),o.append(...s,r,p,d,g,v),document.body.append(o),o.style.left=`${Math.max(8,Math.min(h.left,window.innerWidth-338))}px`,o.style.top=`${Math.max(8,Math.min(h.bottom+8,window.innerHeight-o.offsetHeight-8))}px`},u=()=>{i=0;let m=window.getSelection(),h=m?ke(m):null;h&&l(h.text,h.rect,h.source)},x=()=>{i||(i=requestAnimationFrame(u))},c=m=>{o&&m.target instanceof Node&&o.contains(m.target)||x()},w=m=>{o&&m.target instanceof Node&&o.contains(m.target)||o&&n()};return document.addEventListener("pointerup",c),document.addEventListener("pointerdown",w,!0),()=>{i&&cancelAnimationFrame(i),document.removeEventListener("pointerup",c),document.removeEventListener("pointerdown",w,!0),n(),t()}}function Ce(e){e.effect(()=>Ne(e),"multi-selection-comments: selection comments"),e.effect(()=>G(()=>O(e),(t,o,i,n)=>{Q(t,o,i,n)}),"multi-selection-comments: sidebar browser annotator"),e.slots.inject("conversation.input.dock",()=>e.slots.register({name:"conversation.input.dock",id:"multi-selection-comments-dock",order:19},ye)),e.slots.inject("conversation.chat.node",()=>e.slots.register({name:"conversation.chat.node",key:"user",priority:-100,locale:"conversation"},he)),e.slots.inject("conversation.chat.node",()=>e.slots.register({name:"conversation.chat.node",key:"steering",priority:-100,locale:"conversation"},we))}

    })(module, module.exports, require);
    return module.exports;
  }
});
