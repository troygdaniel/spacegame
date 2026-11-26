// not in the smoke: a stand-in for the page's DOM that the tests of the new screens (tests/scrkeys.mjs, tests/scrsettings.mjs) run in the game's VM (plain Node, no browser)
// The elements remember what the host and the painters put on them (class, text, style, attributes, listeners, children); document.body is the page. __texts(root) is what a person would read on the screen, in order: every text of an element and
// its children, a chip's cap, a pill's tick; __find(root, test) the elements that pass a test; __click(el) calls the click listeners of an element (and a mousedown first, as a press is).
export const SCR_DOM = `
  window.__tags = []; window.__attrs = [];
  const mk = tag => { __tags.push(tag);
    const e = { tag, children: [], parentNode: null, _cls: '', _text: '', title: '', listeners: {}, attrs: {}, style: {}, value: '', placeholder: '', type: '' };
    e.style.setProperty = (k, v) => { e.style[k] = v; };
    Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { e._cls = v; } });
    Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { e._text = v; } });
    e.setAttribute = (k, v) => { __attrs.push(k); e.attrs[k] = String(v); }; e.addEventListener = (t, fn) => { (e.listeners[t] = e.listeners[t] || []).push(fn); };
    e.appendChild = c => { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = e; e.children.push(c); return c; };
    e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); c.parentNode = null; return c; };
    e.remove = () => { if (e.parentNode) e.parentNode.removeChild(e); };
    Object.defineProperty(e, 'firstChild', { get() { return e.children[0] || null; } }); Object.defineProperty(e, 'lastChild', { get() { return e.children[e.children.length - 1] || null; } });
    Object.defineProperty(e, 'isConnected', { get() { let p = e; while (p) { if (p === document.body) return true; p = p.parentNode; } return false; } });
    e.getBoundingClientRect = () => ({ left: 40, top: 60, width: 120, height: 24 }); e.focus = () => { document.activeElement = e; }; e.blur = () => { if (document.activeElement === e) document.activeElement = null; };
    return e; };
  window.document = { createElement: mk, body: mk('body'), activeElement: null };
  window.__texts = el => { const out = []; const walk = e => { if (e._text) out.push(e._text); e.children.forEach(walk); }; walk(el); return out; };
  window.__find = (el, test) => { const out = []; const walk = e => { if (test(e)) out.push(e); e.children.forEach(walk); }; walk(el); return out; };
  window.__click = el => { (el.listeners.mousedown || []).forEach(f => f({ preventDefault() {} })); (el.listeners.click || []).forEach(f => f({ clientX: 40 + 60, preventDefault() {} })); };
  window.__canvasScene = () => ({ game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) } }, events: { fns: {}, once(n, f) { this.fns[n] = f; } } });
`;
