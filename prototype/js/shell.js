// App shell (Horizon theme): tenant-scoped sidebar with section hubs, top bar with Nova, login, work mode.
window.APP = { lang: 'en', menu: null, collapsed: false, route: '', params: [] };

// Sections → hub route → pages. `later` marks sections scheduled for a later phase.
const NAV = [
  { key: 'command', route: 'command', icon: 'layout-dashboard' },
  { key: 'studio', hub: 'studio', icon: 'pen-tool', items: [['workers', 'workers', 'bot'], ['flows', 'flows', 'workflow'], ['squads', 'squads', 'users-round'], ['playbooks', 'playbooks', 'book-marked'], ['library', 'library', 'library'], ['connectors', 'connectors', 'plug']] },
  { key: 'liveops', hub: 'live-ops', icon: 'radio-tower', later: true, items: [['conversations', 'conversations', 'messages-square'], ['touchpoints', 'touchpoints', 'message-circle'], ['people', 'people', 'contact'], ['automations', 'automations', 'zap'], ['checkpoints', 'checkpoints', 'shield-check'], ['executions', 'executions', 'play-circle'], ['safety', 'safety', 'shield']] },
  { key: 'insights', hub: 'insights', icon: 'chart-line', later: true, items: [['health', 'health', 'activity'], ['cx', 'cx', 'smile'], ['exports', 'exports', 'file-down'], ['consumption', 'consumption', 'gauge']] },
  { key: 'assurance', hub: 'assurance', icon: 'badge-check', later: true, items: [['testSuites', 'test-suites', 'flask-conical'], ['reviewers', 'reviewers', 'eye'], ['learned', 'learned', 'sparkles'], ['recall', 'recall', 'brain'], ['value', 'value', 'trending-up']] },
  { key: 'oversight', hub: 'oversight', icon: 'landmark', later: true, items: [['oversightSummary', 'oversight-summary', 'layout-grid'], ['credentials', 'credentials', 'fingerprint'], ['spend', 'spend', 'wallet'], ['assuranceReport', 'assurance-report', 'file-badge'], ['trail', 'activity-trail', 'scroll-text']] },
  { key: 'tenantAdmin', hub: 'tenant', icon: 'building-2', items: [['orgStructure', 'org-structure', 'network'], ['templates', 'templates', 'layout-template'], ['subscription', 'subscription', 'credit-card'], ['configuration', 'configuration', 'settings']] }
];
window.NAV = NAV;

const sectionFor = r => NAV.find(s => s.route === r || s.hub === r || (s.items || []).some(([, route]) => route === r)) || NAV[0];
const pageLabel = r => { for (const s of NAV) for (const [k, route] of s.items || []) if (route === r) return t(k); return ''; };

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '') || 'command';
  const parts = h.split('?')[0].split('/').filter(Boolean);
  APP.route = parts[0]; APP.params = parts.slice(1);
}

function toggleLang() {
  APP.lang = APP.lang === 'en' ? 'ar' : 'en';
  document.documentElement.lang = APP.lang;
  document.documentElement.dir = APP.lang === 'ar' ? 'rtl' : 'ltr';
  APP.menu = null; APP.render();
}

// ---------- Sidebar ----------
function sidebar() {
  const cur = sectionFor(APP.route); const c = APP.collapsed; const T = DB.tenant;
  const link = (href, ic, label, active, extra = '') => `<a href="${href}" title="${c ? UI.esc(label) : ''}" class="flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition ${active ? 'bg-brand-500/15 text-white' : 'text-navy-200 hover:bg-white/5 hover:text-white'}">
    <span class="flex h-5 w-5 shrink-0 items-center justify-center ${active ? 'text-brand-300' : ''}">${UI.icon(ic, 'w-[18px] h-[18px]')}</span>${c ? '' : `<span class="flex-1 truncate">${label}</span>${extra}`}</a>`;
  const sections = NAV.map(s => {
    if (!s.items) return link('#/' + s.route, s.icon, t(s.key), APP.route === s.route);
    const open = s === cur && !c;
    return `<div>${link('#/' + s.hub, s.icon, t(s.key), APP.route === s.hub || (s === cur && c), s.later ? `<span class="rounded bg-white/10 px-1.5 text-[10px] text-navy-200">${t('parked')}</span>` : UI.icon(open ? 'chevron-down' : 'chevron-right', 'w-3.5 h-3.5 text-navy-300 flip-rtl'))}
      ${open ? `<div class="mb-1 ms-[22px] mt-0.5 border-s border-white/10 ps-2">${s.items.map(([k, r]) => `<a href="#/${r}" class="block truncate rounded-md px-2.5 py-1.5 text-[12.5px] ${APP.route === r ? 'bg-white/10 font-medium text-white' : 'text-navy-200 hover:text-white'}">${t(k)}</a>`).join('')}</div>` : ''}</div>`;
  }).join('');
  return `<aside class="sidebar fixed inset-y-0 start-0 z-40 flex flex-col bg-navy-900 transition-all ${c ? 'w-16' : 'w-64'}">
    <div class="p-3"><button onclick="${UI.fn(() => { APP.menu = APP.menu === 'tenant' ? null : 'tenant'; APP.render(); })}" class="relative flex w-full items-center gap-2.5 rounded-xl bg-white/5 p-2 text-start hover:bg-white/10">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">${T.initials}</span>
      ${c ? '' : `<span class="min-w-0 flex-1"><span class="block truncate text-sm font-semibold text-white">${t('workspace')}</span><span class="block truncate text-[11px] text-navy-300">${T.plan} plan · ${T.region.split(' · ')[0]}</span></span>${UI.icon('chevrons-up-down', 'w-4 h-4 text-navy-300')}`}</button>
      ${APP.menu === 'tenant' ? `<div class="fade-in absolute start-3 top-[64px] z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl">
        <div class="mb-3 flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 font-bold text-white">${T.initials}</span><div><div class="font-semibold text-navy-900">${T.name}</div><div class="font-mono text-xs text-slate-500">${T.key}</div></div></div>
        <dl class="space-y-1.5 text-xs">${[['Plan', T.plan], ['Data region', T.region], ['Isolation', T.isolation], ['Seats', T.seats], ['Tenant since', T.since]].map(([k, v]) => `<div class="flex justify-between"><dt class="text-slate-500">${k}</dt><dd class="text-slate-800">${v}</dd></div>`).join('')}</dl>
        <p class="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">Everything in this console belongs to ${T.name}. Other customers of the platform can't see it.</p>
        <a href="#/tenant" class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700">${t('tenantAdmin')} ${UI.icon('arrow-right', 'w-3 h-3 flip-rtl')}</a></div>` : ''}</div>
    <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3 scrollbar-dark">${sections}</nav>
    <div class="border-t border-white/10 p-3 space-y-1">
      ${link('#/work', 'message-square-text', t('workMode'), false)}
      <button onclick="${UI.fn(() => { APP.collapsed = !APP.collapsed; APP.render(); })}" class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] text-navy-300 hover:bg-white/5 hover:text-white">${UI.icon(c ? 'panel-left-open' : 'panel-left-close', 'w-[18px] h-[18px] flip-rtl')}${c ? '' : t('collapse')}</button>
      ${c ? '' : `<div class="px-2.5 pt-1 text-[10px] text-navy-400">${t('product')} · ${t('prototype')}</div>`}
    </div></aside>`;
}

// ---------- Top bar ----------
function topBar() {
  const s = sectionFor(APP.route); const page = pageLabel(APP.route);
  const crumbs = [s.items ? `<a href="#/${s.hub}" class="hover:text-navy-900">${t(s.key)}</a>` : `<span>${t(s.key)}</span>`, ...(page ? [`<span class="${APP.params.length ? '' : 'text-navy-900 font-medium'}">${APP.params.length ? `<a href="#/${APP.route}" class="hover:text-navy-900">${page}</a>` : page}</span>`] : [])];
  const notif = APP.menu === 'notif' ? `<div class="fade-in absolute end-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span class="text-sm font-semibold text-navy-900">${t('notifications')}</span>${UI.badge('4 new', 'indigo')}</div>
      ${DB.notifications.map(n => `<a href="${n.route}" class="flex gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">${UI.icon(n.icon, 'w-4 h-4 mt-0.5 text-slate-400')}<span class="flex-1">${n.text}</span><span class="text-xs text-slate-400">${n.time}</span></a>`).join('')}</div>` : '';
  const user = APP.menu === 'user' ? `<div class="fade-in absolute end-0 top-11 z-50 w-60 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl">
      <div class="border-b border-slate-100 px-4 py-2.5"><div class="font-medium text-navy-900">${DB.user.name}</div><div class="text-xs text-slate-500">${DB.user.email} · ${DB.user.role}</div></div>
      <a href="#/configuration/general" class="flex items-center gap-2 px-4 py-2 hover:bg-slate-50">${UI.icon('user')}${t('profile')}</a>
      <a href="#/configuration/security" class="flex items-center gap-2 px-4 py-2 hover:bg-slate-50">${UI.icon('shield-check')}${t('myMfa')}</a>
      <button onclick="${UI.fn(toggleLang)}" class="flex w-full items-center gap-2 px-4 py-2 hover:bg-slate-50">${UI.icon('languages')}${t('language')}: ${APP.lang === 'en' ? 'English' : 'العربية'}</button>
      <a href="#/login" class="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50">${UI.icon('log-out')}${t('signOut')}</a></div>` : '';
  return `<header class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200/70 bg-canvas/85 px-6 backdrop-blur">
    <nav class="flex min-w-0 items-center gap-2 text-sm text-slate-500">${crumbs.join(UI.icon('chevron-right', 'w-3.5 h-3.5 text-slate-300 flip-rtl'))}</nav>
    <button onclick="${UI.fn(openPalette)}" class="mx-auto hidden h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-400 shadow-sm hover:border-brand-300 md:flex">
      <span class="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-600">${UI.icon('sparkles', 'w-3.5 h-3.5')}</span><span class="min-w-0 flex-1 truncate whitespace-nowrap text-start">${t('nova')} · ${t('search')}</span><kbd class="rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10px] text-slate-500">Ctrl K</kbd></button>
    <div class="ms-auto flex items-center gap-1 md:ms-0">
      <button onclick="${UI.fn(toggleLang)}" class="h-9 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-white" title="${t('language')}">${APP.lang === 'en' ? 'عربي' : 'EN'}</button>
      <div class="relative">${UI.iconBtn('bell', () => { APP.menu = APP.menu === 'notif' ? null : 'notif'; APP.render(); }, t('notifications'))}<span class="pointer-events-none absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-canvas"></span>${notif}</div>
      <div class="relative"><button onclick="${UI.fn(() => { APP.menu = APP.menu === 'user' ? null : 'user'; APP.render(); })}" class="ms-1 flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">${DB.user.initials}</button>${user}</div>
    </div></header>`;
}

// ---------- Login ----------
function loginPage() {
  return `<div class="flex min-h-screen items-center justify-center bg-navy-900 p-6">
    <div class="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
      <div class="hidden flex-col justify-between bg-navy-800 p-10 text-white md:flex">
        <div class="flex items-center gap-3"><span class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 font-bold">${DB.tenant.initials}</span><div><div class="font-semibold">${t('workspace')}</div><div class="text-xs text-navy-300">${t('product')}</div></div></div>
        <ul class="space-y-5">${['loginV1', 'loginV2', 'loginV3'].map((k, i) => `<li class="flex gap-3"><span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300">${UI.icon(['pen-tool', 'shield-check', 'lock'][i], 'w-4 h-4')}</span><span class="text-[15px] leading-snug text-navy-100">${t(k)}</span></li>`).join('')}</ul>
        <p class="text-[11px] text-navy-400">${t('prototype')} · ${DB.tenant.region}</p>
      </div>
      <div class="p-8 md:p-10">
        <div class="mb-8 flex items-center justify-between"><h1 class="text-2xl font-semibold tracking-tight text-navy-900">${t('signIn')}</h1>
          <button onclick="${UI.fn(toggleLang)}" class="rounded-lg px-2.5 py-1 text-sm text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">${APP.lang === 'en' ? 'العربية' : 'English'}</button></div>
        <div class="space-y-4">
          ${UI.btn(t('signInSso'), { icon: 'key-round', variant: 'primary', cls: 'w-full h-11', href: '#/command' })}
          <div class="relative py-1 text-center text-xs text-slate-400"><span class="relative z-10 bg-white px-2">or</span><div class="absolute inset-x-0 top-1/2 border-t border-slate-200"></div></div>
          ${UI.field(t('email'), UI.input(DB.user.email, 'type="email"'))}
          ${UI.field(t('password'), UI.input('', 'type="password" placeholder="••••••••"'))}
          ${UI.btn(t('signIn'), { cls: 'w-full h-11', href: '#/command' })}
          <p class="text-center text-sm text-slate-500">${t('noAccount')} <a href="#/command" class="font-medium text-brand-700">${t('createOne')}</a></p>
        </div></div></div></div>`;
}

// ---------- Work mode (end-user chat surface) ----------
const WS = { agent: 'a1', messages: [{ who: 'agent', text: 'Hello! I can help with service requests, fees and complaints. What do you need today?' }] };
function workPage() {
  const agents = DB.agents.filter(a => a.released && a.status === 'active');
  const ag = DB.agentById(WS.agent);
  return `<div class="flex h-screen flex-col bg-canvas">
    <header class="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-5">
      <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">${DB.tenant.initials}</span>
      <div><div class="text-sm font-semibold text-navy-900">${t('workspace')}</div><div class="text-[11px] text-slate-500">${t('workMode')}</div></div>
      <div class="ms-auto flex items-center gap-2">${UI.btn(t('studioMode'), { icon: 'pen-tool', href: '#/command' })}
        <button onclick="${UI.fn(toggleLang)}" class="h-9 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">${APP.lang === 'en' ? 'عربي' : 'EN'}</button></div>
    </header>
    <div class="flex min-h-0 flex-1">
      <aside class="hidden w-72 shrink-0 flex-col gap-1 border-e border-slate-200 bg-white p-3 md:flex">
        ${UI.btn('New conversation', { icon: 'plus', cls: 'w-full mb-2', variant: 'primary' })}
        <div class="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Workers you can use</div>
        ${agents.map(a => `<button onclick="${UI.fn(() => { WS.agent = a.id; APP.render(); })}" class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm ${a.id === WS.agent ? 'bg-brand-50 text-brand-800' : 'hover:bg-slate-50'}"><span class="flex h-7 w-7 items-center justify-center rounded-lg ${a.id === WS.agent ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}">${UI.icon('bot', 'w-4 h-4')}</span><span class="truncate">${a.name}</span></button>`).join('')}
        <div class="mt-4 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recent</div>
        ${['Renewal fee question', 'Complaint #4412 status', 'Leave policy'].map(c => `<div class="truncate rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50">${c}</div>`).join('')}
      </aside>
      <main class="flex min-w-0 flex-1 flex-col">
        <div class="border-b border-slate-200 bg-white px-6 py-3"><div class="text-sm font-semibold text-navy-900">${ag.name} <span class="font-normal text-slate-400">${ag.name_ar}</span></div><div class="text-xs text-slate-500">Answers cite their sources</div></div>
        <div class="flex-1 space-y-4 overflow-y-auto p-6 scrollbar-thin" id="ws-thread">
          ${WS.messages.map(m => m.who === 'user'
            ? `<div class="flex justify-end"><div class="max-w-lg rounded-2xl rounded-ee-md bg-navy-800 px-4 py-2.5 text-sm text-white">${UI.esc(m.text)}</div></div>`
            : `<div class="flex gap-3"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">${UI.icon('bot', 'w-4 h-4')}</span><div class="max-w-lg"><div class="rounded-2xl rounded-ss-md bg-white px-4 py-2.5 text-sm ring-1 ring-slate-200">${m.text}</div>
              ${m.cite ? `<div class="mt-1.5 flex flex-wrap gap-1">${m.cite.map(c => UI.badge(UI.icon('file-text', 'w-3 h-3') + c, 'gray')).join('')}</div>` : ''}
              ${m.approval ? `<div class="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">${UI.icon('shield-check', 'w-3.5 h-3.5')} At a human checkpoint: <b>${m.approval}</b></div>` : ''}
              <div class="mt-1 flex gap-1 text-slate-400">${UI.iconBtn('thumbs-up', () => UI.toast('Feedback recorded'))}${UI.iconBtn('thumbs-down', () => UI.toast('Feedback recorded'))}</div></div></div>`).join('')}
        </div>
        <div class="border-t border-slate-200 bg-white p-4">
          ${WS.messages.length < 2 ? `<div class="mb-3 flex flex-wrap gap-2">${['How do I renew my licence?', 'What are the fees for a certificate?', 'Track my complaint', 'كيف أقدم شكوى؟'].map(s => `<button onclick="${UI.fn(() => wsSend(s))}" class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-brand-300 hover:bg-brand-50">${s}</button>`).join('')}</div>` : ''}
          <div class="flex gap-2">${UI.iconBtn('paperclip', () => UI.toast('Attachment picker (mock)'), 'Attach')}${UI.iconBtn('mic', () => UI.toast('Voice: push-to-talk (mock)'), 'Voice')}
            <input id="ws-input" class="${UI.inputCls}" placeholder="Message ${ag.name}…" onkeydown="if(event.key==='Enter'){window.wsSend(this.value)}"/>
            ${UI.btn('', { icon: 'send-horizontal', variant: 'primary', onclick: () => wsSend(document.getElementById('ws-input').value) })}</div>
        </div>
      </main>
    </div></div>`;
}
window.wsSend = function (text) {
  if (!text || !text.trim()) return;
  WS.messages.push({ who: 'user', text });
  WS.messages.push({ who: 'agent', text: 'Licence renewal takes 3 working days and costs 150 AED. You can apply online with your Emirates ID. Shall I open a renewal request for you?', cite: ['01-service-catalogue.pdf #12', 'fees-schedule-2026.xlsx #3'], approval: WS.messages.length > 4 ? 'crm.create_request (medium risk)' : null });
  APP.render();
  const th = document.getElementById('ws-thread'); if (th) th.scrollTop = th.scrollHeight;
};

// ---------- Nova: command bar + assistant ----------
function paletteEntries() {
  const out = [];
  out.push({ group: t('quickActions'), label: t('newAgent'), icon: 'plus', go: () => { location.hash = '#/workers'; setTimeout(() => window.openCreateAgent && openCreateAgent(), 50); } });
  out.push({ group: t('quickActions'), label: t('newWorkflow'), icon: 'plus', go: () => { location.hash = '#/flows'; } });
  out.push({ group: t('quickActions'), label: 'Add connector', icon: 'plug', go: () => { location.hash = '#/connectors'; setTimeout(() => window.openAddIntegration && openAddIntegration(), 50); } });
  NAV.forEach(s => { if (!s.items) out.push({ group: t('pages'), label: t(s.key), icon: s.icon, go: () => location.hash = '#/' + s.route }); else { out.push({ group: t('pages'), label: t(s.key), icon: s.icon, go: () => location.hash = '#/' + s.hub }); s.items.forEach(([k, r, ic]) => out.push({ group: t('pages'), label: `${t(s.key)} › ${t(k)}`, icon: ic, go: () => location.hash = '#/' + r })); } });
  DB.agents.forEach(a => out.push({ group: t('workers'), label: a.name, sub: a.key, icon: 'bot', go: () => location.hash = `#/workers/${a.id}/builder` }));
  DB.workflows.forEach(w => out.push({ group: t('flows'), label: w.name, sub: w.key, icon: 'workflow', go: () => location.hash = `#/flows/${w.id}` }));
  (window.SETTINGS_TABS || []).forEach(([k, l]) => out.push({ group: t('configuration'), label: `${t('configuration')} › ${l}`, icon: 'settings', go: () => location.hash = '#/configuration/' + k }));
  return out;
}
function openPalette() {
  APP.menu = null;
  const all = paletteEntries();
  let sel = 0, mode = 'search';
  const wrap = UI.modal({ title: `<span class="inline-flex items-center gap-2"><span class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">${UI.icon('sparkles', 'w-4 h-4')}</span>Nova</span>`, size: 'md', body: `
    <div class="mb-3" id="pal-seg"></div>
    <input id="pal-input" class="${UI.inputCls}" placeholder="${t('paletteHint')}" autocomplete="off"/>
    <div id="pal-list" class="mt-3 max-h-[50vh] overflow-y-auto scrollbar-thin"></div>` });
  const inp = wrap.querySelector('#pal-input'), list = wrap.querySelector('#pal-list'), seg = wrap.querySelector('#pal-seg');
  const drawSeg = () => { seg.innerHTML = UI.segmented([{ key: 'search', label: 'Go to', icon: 'corner-down-right' }, { key: 'copilot', label: 'Ask Nova', icon: 'sparkles' }], mode, k => { mode = k; drawSeg(); draw(); }); UI.refreshIcons(); };
  const filtered = () => { const q = inp.value.toLowerCase().trim(); return all.filter(e => !q || (e.label + ' ' + (e.sub || '')).toLowerCase().includes(q)).slice(0, 40); };
  function draw() {
    if (mode === 'copilot') {
      inp.placeholder = 'Schedule Report Classifier every weekday at 8am';
      const q = inp.value.trim();
      list.innerHTML = q ? `<div class="rounded-xl border border-brand-200 bg-brand-50/50 p-4 text-sm">
        <div class="mb-2 flex items-center gap-2 font-medium text-brand-800">${UI.icon('sparkles')} Suggested change — not applied yet</div>
        <pre class="json-editor overflow-x-auto rounded-lg bg-white p-3 ring-1 ring-slate-200" dir="ltr">{\n  "target": "worker:report-classifier",\n  "kind": "schedule",\n  "cron": "0 8 * * 1-5",\n  "timezone": "Asia/Dubai",\n  "enabled": true\n}</pre>
        <p class="mt-2 text-xs text-slate-500">Nova only suggests. Nothing changes until you confirm.</p>
        <div class="mt-3 flex gap-2"><button class="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white" onclick="UI.closeOverlay();UI.toast('Change applied (mock)')">Apply</button><button class="rounded-lg bg-white px-3 py-1.5 text-xs ring-1 ring-slate-200" onclick="UI.closeOverlay()">Dismiss</button></div></div>`
        : `<p class="py-6 text-center text-sm text-slate-500">Describe what you want. Nova explains screens and drafts settings for you to confirm.</p>`;
      UI.refreshIcons(); return;
    }
    inp.placeholder = t('paletteHint');
    const items = filtered(); sel = Math.min(sel, Math.max(0, items.length - 1)); let g = '';
    list.innerHTML = items.map((e, i) => { const head = e.group !== g ? `<div class="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">${e.group}</div>` : ''; g = e.group;
      return head + `<div data-i="${i}" class="pal-item flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm ${i === sel ? 'bg-brand-50 text-brand-800' : 'hover:bg-slate-50'}">${UI.icon(e.icon, 'w-4 h-4 text-slate-400')}<span>${e.label}</span>${e.sub ? `<span class="ms-auto font-mono text-xs text-slate-400">${e.sub}</span>` : ''}</div>`; }).join('') || `<p class="py-6 text-center text-sm text-slate-500">No matches</p>`;
    list.querySelectorAll('.pal-item').forEach(el => el.onclick = () => { UI.closeOverlay(); items[+el.dataset.i].go(); });
    UI.refreshIcons();
  }
  inp.addEventListener('input', () => { sel = 0; draw(); });
  inp.addEventListener('keydown', e => {
    if (mode !== 'search') { if (e.key === 'Enter') draw(); return; }
    const items = filtered();
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    if (e.key === 'Enter' && items[sel]) { UI.closeOverlay(); items[sel].go(); }
  });
  drawSeg(); draw(); inp.focus();
}
window.openPalette = openPalette;

// ---------- Render ----------
APP.render = function () {
  const app = document.getElementById('app');
  if (APP.route === 'login') { app.innerHTML = loginPage(); UI.refreshIcons(); return; }
  if (APP.route === 'work') { app.innerHTML = workPage(); UI.refreshIcons(); return; }
  document.documentElement.style.setProperty('--sbw', window.innerWidth < 1024 ? '4rem' : APP.collapsed ? '4rem' : '16rem');
  if (window.innerWidth < 1024) APP.collapsed = true;
  const page = PAGES[APP.route];
  let html, after;
  if (page) { const r = page(APP.params); if (typeof r === 'string') html = r; else ({ html, after } = r); }
  else html = UI.emptyState('map-pin-off', 'Page not found', `No page for "${UI.esc(APP.route)}".`, UI.btn(t('command'), { href: '#/command' }));
  app.innerHTML = `${sidebar()}<div class="main-col min-h-screen transition-all" style="margin-inline-start:var(--sbw)">${topBar()}<main class="mx-auto max-w-[1360px] px-6 py-7 fade-in">${html}</main></div>`;
  UI.refreshIcons();
  if (after) after();
};

window.addEventListener('hashchange', () => { APP.menu = null; UI.closeAll(); parseHash(); APP.render(); window.scrollTo(0, 0); });
window.addEventListener('resize', () => { const want = window.innerWidth < 1024 ? '4rem' : APP.collapsed ? '4rem' : '16rem'; if (getComputedStyle(document.documentElement).getPropertyValue('--sbw').trim() !== want) APP.render(); });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (APP.route !== 'login') openPalette(); } if (e.key === 'Escape') UI.closeOverlay(); });
document.addEventListener('click', e => { if (APP.menu && !e.target.closest('header .relative, .sidebar .p-3')) { APP.menu = null; APP.render(); } });

parseHash();
APP.render();
