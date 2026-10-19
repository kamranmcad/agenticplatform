// Small UI kit: string-template helpers that mimic shadcn-style components.
window.PAGES = {};
window.UI = (function () {
  const cbs = {};
  let seq = 0;

  // Register a callback and return an inline handler string, e.g. onclick="${UI.fn(() => ...)}".
  function fn(f) { const id = 'f' + (++seq); cbs[id] = f; return `UI._call('${id}', event, this)`; }
  function _call(id, ev, el) { if (cbs[id]) return cbs[id](ev, el); }
  function resetCallbacks() { for (const k in cbs) delete cbs[k]; }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = 'w-4 h-4') => `<i data-lucide="${name}" class="${cls}"></i>`;

  const tones = {
    slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', red: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    blue: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', indigo: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
    violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', gray: 'bg-white text-slate-600 ring-1 ring-slate-200'
  };
  const badge = (text, tone = 'slate', extra = '') => `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tones[tone] || tones.slate} ${extra}">${text}</span>`;

  const statusTone = s => ({
    active: 'green', healthy: 'green', ready: 'green', released: 'green', live: 'green', 'working copy': 'amber', connected: 'green', enabled: 'green', succeeded: 'green', executed: 'green',
    draft: 'amber', processing: 'amber', queued: 'amber', pending: 'amber', 'awaiting first event': 'amber', 'not checked yet': 'gray',
    suspended: 'red', failed: 'red', error: 'red', revoked: 'red', archived: 'slate', disabled: 'slate'
  }[String(s).toLowerCase()] || 'slate');
  const status = s => badge(esc(s), statusTone(s));

  const audienceLabel = { public: 'Public', staff: 'Staff', system: 'System' };
  const audience = s => badge((s === 'public' ? icon('globe', 'w-3 h-3') : s === 'staff' ? icon('users', 'w-3 h-3') : icon('cpu', 'w-3 h-3')) + (audienceLabel[s] || s), s === 'public' ? 'blue' : s === 'staff' ? 'violet' : 'gray');

  function btn(label, opts = {}) {
    const v = {
      primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
      secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
      ghost: 'text-slate-600 hover:bg-slate-100',
      danger: 'bg-rose-600 text-white hover:bg-rose-700',
      'danger-ghost': 'text-rose-600 hover:bg-rose-50'
    }[opts.variant || 'secondary'];
    const size = opts.size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-sm';
    const click = opts.onclick ? `onclick="${typeof opts.onclick === 'function' ? fn(opts.onclick) : opts.onclick}"` : '';
    const href = opts.href ? `onclick="location.hash='${opts.href}'"` : '';
    return `<button type="button" ${click || href} ${opts.disabled ? 'disabled' : ''} title="${esc(opts.title || '')}"
      class="inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${size} ${v} ${opts.cls || ''}">
      ${opts.icon ? icon(opts.icon, opts.size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4') : ''}${label ? `<span>${label}</span>` : ''}</button>`;
  }
  const iconBtn = (name, onclick, title = '') => `<button type="button" title="${esc(title)}" onclick="${typeof onclick === 'function' ? fn(onclick) : onclick}" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800">${icon(name)}</button>`;

  function pageHeader(title, desc, actions = '', extra = '') {
    return `<div class="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div class="min-w-0"><div class="flex items-center gap-2"><h1 class="text-[22px] font-semibold tracking-tight text-navy-900">${title}</h1>${extra}</div>
      ${desc ? `<p class="mt-1 text-sm text-slate-500 max-w-3xl">${desc}</p>` : ''}</div>
      <div class="flex flex-wrap items-center gap-2">${actions}</div></div>`;
  }

  const card = (inner, cls = '') => `<div class="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(28,37,65,.04)] ${cls}">${inner}</div>`;
  const cardHeader = (title, right = '', sub = '') => `<div class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5"><div><h3 class="text-sm font-semibold text-navy-900">${title}</h3>${sub ? `<p class="text-xs text-slate-500 mt-0.5">${sub}</p>` : ''}</div><div class="flex items-center gap-2">${right}</div></div>`;

  // Hub tile: icon chip, title, one-line purpose, live metric and optional alert
  const tile = ({ href, icon: ic, title, desc, metric = '', alert = '', tone = 'brand', later = false }) => `<a href="${href}" class="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_8px_24px_rgba(28,37,65,.08)]">
    <div class="flex items-start justify-between"><span class="flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'coral' ? 'bg-orange-50 text-orange-600' : tone === 'navy' ? 'bg-navy-50 text-navy-700' : 'bg-brand-50 text-brand-700'}">${icon(ic, 'w-5 h-5')}</span>
      ${later ? `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">${t('parked')}</span>` : icon('arrow-up-right', 'w-4 h-4 text-slate-300 transition group-hover:text-brand-600 flip-rtl')}</div>
    <div class="mt-4 text-[15px] font-semibold text-navy-900">${title}</div><p class="mt-1 flex-1 text-xs leading-relaxed text-slate-500">${desc}</p>
    <div class="mt-4 flex items-center justify-between gap-2 text-xs"><span class="font-medium text-slate-700">${metric}</span>${alert ? `<span class="rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-700">${alert}</span>` : ''}</div></a>`;

  function table(cols, rows, opts = {}) {
    if (!rows.length) return opts.empty || emptyState('inbox', 'Nothing here yet', '');
    return `<div class="overflow-x-auto scrollbar-thin"><table class="w-full text-sm">
      <thead><tr class="border-b border-slate-200 bg-slate-50/60 text-start text-[11px] uppercase tracking-wide text-slate-500">
      ${cols.map(c => `<th class="px-4 py-2.5 text-start font-medium whitespace-nowrap">${c}</th>`).join('')}</tr></thead>
      <tbody class="divide-y divide-slate-100">${rows.map(r => {
        const cells = Array.isArray(r) ? r : r.cells;
        const click = !Array.isArray(r) && r.onclick ? `onclick="${fn(r.onclick)}" class="cursor-pointer hover:bg-slate-50"` : 'class="hover:bg-slate-50/60"';
        return `<tr ${click}>${cells.map(c => `<td class="px-4 py-3 align-middle">${c}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table></div>
      ${opts.footer !== false ? `<div class="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500"><span>${t('showing')} ${rows.length} ${t('of')} ${opts.total ?? rows.length}</span>
      <div class="flex gap-1">${btn('', { icon: 'chevron-left', size: 'sm', variant: 'ghost', disabled: true, cls: 'flip-rtl' })}${btn('', { icon: 'chevron-right', size: 'sm', variant: 'ghost', disabled: true, cls: 'flip-rtl' })}</div></div>` : ''}`;
  }

  // Filter chips: items = [{key,label,count}]
  const chips = (items, active, onPick) => `<div class="flex flex-wrap gap-1.5">${items.map(i =>
    `<button onclick="${fn(() => onPick(i.key))}" class="rounded-full px-3 py-1 text-xs font-medium transition ${i.key === active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}">${i.label}${i.count != null ? ` <span class="opacity-60">${i.count}</span>` : ''}</button>`).join('')}</div>`;

  // Underline tabs (in-page): items = [{key,label,count?}]
  const tabs = (items, active, onPick) => `<div class="flex gap-4 border-b border-slate-200 overflow-x-auto scrollbar-thin">${items.map(i =>
    `<button onclick="${fn(() => onPick(i.key))}" class="tab-link -mb-px border-b-2 border-transparent px-1 pb-2.5 text-sm font-medium whitespace-nowrap text-slate-500 hover:text-slate-800 ${i.key === active ? 'active' : ''}">${i.label}${i.count != null ? ` <span class="ms-1 rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-600">${i.count}</span>` : ''}</button>`).join('')}</div>`;

  const segmented = (items, active, onPick) => `<div class="inline-flex rounded-md bg-slate-100 p-0.5">${items.map(i =>
    `<button onclick="${fn(() => onPick(i.key))}" class="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${i.key === active ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'}">${i.icon ? icon(i.icon, 'w-3.5 h-3.5') : ''}${i.label}</button>`).join('')}</div>`;

  const kpi = (label, value, sub = '', ic = '', tone = '') => `<div class="rounded-xl border border-slate-200/80 bg-white p-4">
    <div class="flex items-center gap-2 text-xs font-medium text-slate-500">${ic ? `<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">${icon(ic, 'w-3.5 h-3.5')}</span>` : ''}<span>${label}</span></div>
    <div class="mt-3 text-[26px] font-semibold leading-none tracking-tight text-navy-900">${value}</div>
    ${sub ? `<div class="mt-1 text-xs ${tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-rose-600' : 'text-slate-500'}">${sub}</div>` : ''}</div>`;

  const emptyState = (ic, title, desc, action = '') => `<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div class="mb-3 rounded-full bg-slate-100 p-3">${icon(ic, 'w-6 h-6 text-slate-400')}</div>
    <p class="text-sm font-medium text-slate-800">${title}</p>${desc ? `<p class="mt-1 max-w-md text-sm text-slate-500">${desc}</p>` : ''}
    ${action ? `<div class="mt-4">${action}</div>` : ''}</div>`;

  // Form helpers
  const field = (label, control, hint = '') => `<label class="block"><span class="mb-1 block text-xs font-medium text-slate-700">${label}</span>${control}${hint ? `<span class="mt-1 block text-[11px] text-slate-500">${hint}</span>` : ''}</label>`;
  const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
  const input = (value = '', attrs = '') => `<input class="${inputCls}" value="${esc(value)}" ${attrs} />`;
  const textarea = (value = '', attrs = '', rows = 3) => `<textarea rows="${rows}" class="${inputCls}" ${attrs}>${esc(value)}</textarea>`;
  const select = (options, value = '', attrs = '') => `<select class="${inputCls}" ${attrs}>${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  const toggle = (on, onchange, label = '') => `<button type="button" role="switch" aria-checked="${on}" onclick="${fn(onchange)}" class="inline-flex items-center gap-2">
    <span class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-brand-600' : 'bg-slate-300'}"><span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'start-[18px]' : 'start-0.5'}"></span></span>
    ${label ? `<span class="text-sm text-slate-700">${label}</span>` : ''}</button>`;
  const checkbox = (checked, label, attrs = '') => `<label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600" ${checked ? 'checked' : ''} ${attrs}/>${label}</label>`;
  const radioCard = (name, value, checked, title, desc, onpick) => `<label onclick="${fn(onpick || (() => {}))}" class="flex cursor-pointer gap-3 rounded-lg border p-3 ${checked ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50'}">
    <input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} class="mt-0.5 text-brand-600"/><span><span class="block text-sm font-medium text-slate-800">${title}</span><span class="block text-xs text-slate-500 mt-0.5">${desc}</span></span></label>`;

  // Overlays
  function openOverlay(html) {
    const root = document.getElementById('overlay-root');
    const wrap = document.createElement('div');
    wrap.className = 'overlay';
    wrap.innerHTML = html;
    root.appendChild(wrap);
    refreshIcons();
    return wrap;
  }
  function closeOverlay() { const root = document.getElementById('overlay-root'); if (root.lastElementChild) root.lastElementChild.remove(); }
  function closeAll() { document.getElementById('overlay-root').innerHTML = ''; }

  function modal({ title, body, footer = '', size = 'md', sub = '' }) {
    const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
    return openOverlay(`<div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[8vh]" onclick="if(event.target===this)UI.closeOverlay()">
      <div class="fade-in w-full ${w} rounded-xl bg-white shadow-xl">
        <div class="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 class="text-base font-semibold text-slate-900">${title}</h2>${sub ? `<p class="text-xs text-slate-500 mt-0.5">${sub}</p>` : ''}</div>${iconBtn('x', 'UI.closeOverlay()')}</div>
        <div class="modal-body max-h-[70vh] overflow-y-auto px-5 py-4 scrollbar-thin">${body}</div>
        ${footer ? `<div class="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 rounded-b-xl">${footer}</div>` : ''}
      </div></div>`);
  }

  function drawer({ title, body, footer = '', sub = '', width = 'max-w-2xl' }) {
    return openOverlay(`<div class="fixed inset-0 z-50 flex justify-end bg-slate-900/30" onclick="if(event.target===this)UI.closeOverlay()">
      <div class="drawer-panel flex h-full w-full ${width} flex-col bg-white shadow-2xl">
        <div class="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div class="min-w-0">${title}${sub ? `<p class="text-xs text-slate-500 mt-0.5">${sub}</p>` : ''}</div>${iconBtn('x', 'UI.closeOverlay()')}</div>
        <div class="drawer-body flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">${body}</div>
        ${footer ? `<div class="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">${footer}</div>` : ''}
      </div></div>`);
  }

  function confirm(title, text, onOk, okLabel = 'Confirm', danger = true) {
    modal({ title, size: 'sm', body: `<p class="text-sm text-slate-600">${text}</p>`,
      footer: btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + btn(okLabel, { variant: danger ? 'danger' : 'primary', onclick: () => { closeOverlay(); onOk && onOk(); } }) });
  }

  function toast(msg, tone = 'ok') {
    const el = document.createElement('div');
    el.className = 'fade-in flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg';
    el.innerHTML = icon(tone === 'ok' ? 'check-circle-2' : 'info', 'w-4 h-4 text-emerald-400') + `<span>${msg}</span>`;
    document.getElementById('toast-root').appendChild(el);
    refreshIcons();
    setTimeout(() => el.remove(), 2800);
  }

  const parkedBanner = (featureIds = '') => `<div class="mb-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
    ${icon('calendar-clock', 'w-5 h-5 shrink-0 text-navy-700')}<div><span class="font-semibold text-navy-900">${t('parked')}.</span> ${t('parkedNote')}${featureIds ? ` <span class="font-mono text-xs text-slate-400">${featureIds}</span>` : ''}</div></div>`;

  const specTag = id => `<span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500" title="Spec feature ID">${id}</span>`;

  // Simple CSS bar chart for prototype dashboards
  const bars = (values, tone = 'bg-brand-500', h = 'h-24') => {
    const max = Math.max(...values, 1);
    return `<div class="flex items-end gap-1 ${h}">${values.map(v => `<div class="flex-1 rounded-t ${tone} opacity-80 hover:opacity-100" style="height:${Math.max(4, (v / max) * 100)}%" title="${v}"></div>`).join('')}</div>`;
  };

  function refreshIcons() { if (window.lucide) lucide.createIcons(); }

  return { fn, _call, resetCallbacks, esc, icon, badge, status, audience, audienceLabel, btn, iconBtn, pageHeader, card, cardHeader, tile, table, chips, tabs, segmented, kpi, emptyState,
    field, input, textarea, select, toggle, checkbox, radioCard, modal, drawer, confirm, toast, closeOverlay, closeAll, parkedBanner, specTag, bars, refreshIcons, inputCls };
})();
