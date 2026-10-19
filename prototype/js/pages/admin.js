// ADMIN › Organization, Marketplace, Billing, Settings (F-ADM-01 … F-ADM-14)

// =============== Organization (F-ADM-01) ===============
const ORG = { sel: 'n1', open: { n1: true, n2: true, n4: true, n6: true } };
PAGES['org-structure'] = function () {
  const kids = id => DB.orgNodes.filter(n => n.parent === id);
  const cnt = ty => DB.orgNodes.filter(n => n.type === ty).length;
  const typeIcon = { department: 'building-2', section: 'folder', unit: 'users' };
  const row = (n, depth) => `<div>
    <div onclick="${UI.fn(() => { ORG.sel = n.id; APP.render(); })}" class="group flex cursor-pointer items-center gap-2 rounded-md py-1.5 pe-2 ${n.id === ORG.sel ? 'bg-brand-50' : 'hover:bg-slate-50'}" style="padding-inline-start:${depth * 20 + 8}px">
      ${kids(n.id).length ? `<button onclick="${UI.fn(e => { e.stopPropagation(); ORG.open[n.id] = !ORG.open[n.id]; APP.render(); })}">${UI.icon(ORG.open[n.id] ? 'chevron-down' : 'chevron-right', 'w-4 h-4 text-slate-400 flip-rtl')}</button>` : '<span class="w-4"></span>'}
      ${UI.icon(typeIcon[n.type], 'w-4 h-4 text-slate-500')}<span class="text-sm font-medium">${n.name}</span><span class="text-sm text-slate-400">${n.name_ar}</span>
      ${UI.badge(n.type, n.type === 'department' ? 'indigo' : n.type === 'section' ? 'violet' : 'gray')}<span class="font-mono text-[11px] text-slate-400">${n.key}</span>
      <span class="ms-auto text-xs text-slate-400">${kids(n.id).length || ''}</span></div>
    ${ORG.open[n.id] ? kids(n.id).map(k => row(k, depth + 1)).join('') : ''}</div>`;
  const n = DB.nodeById(ORG.sel);
  const desc = (id => { let c = 0; const w = i => kids(i).forEach(k => { c++; w(k.id); }); w(id); return c; })(n.id);
  return UI.pageHeader(t('orgStructure'), 'Your departments, sections and units. Defaults set on a unit flow down to every worker beneath it.', UI.btn('Add step', { icon: 'plus', variant: 'primary', onclick: () => nodeModal() }), UI.specTag('F-ADM-01')) +
    `<div class="grid gap-5 lg:grid-cols-5"><div class="lg:col-span-3">${UI.card(`<div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
      <input class="${UI.inputCls} max-w-xs" placeholder="Search nodes"/><span class="text-xs text-slate-500">${cnt('department')} departments · ${cnt('section')} sections · ${cnt('unit')} units</span>
      <div class="ms-auto flex gap-1">${UI.btn('Expand all', { size: 'sm', variant: 'ghost', onclick: () => { DB.orgNodes.forEach(x => ORG.open[x.id] = true); APP.render(); } })}${UI.btn('Collapse all', { size: 'sm', variant: 'ghost', onclick: () => { ORG.open = {}; APP.render(); } })}</div></div>
      <div class="p-2">${kids(null).map(r => row(r, 0)).join('')}</div>`)}</div>
    <div class="lg:col-span-2 space-y-4">${UI.card(`<div class="p-4"><div class="flex items-start justify-between"><div><h2 class="font-semibold">${n.name}</h2><p class="text-sm text-slate-500">${n.name_ar}</p><p class="mt-1 font-mono text-xs text-slate-500">${n.key} · ${n.parent ? 'child of ' + DB.nodeById(n.parent).name : 'root'}</p></div>
        <div class="flex gap-1">${UI.btn(t('edit'), { size: 'sm', icon: 'pencil', onclick: () => nodeModal(n) })}${UI.btn('Add child', { size: 'sm', icon: 'plus', onclick: () => nodeModal(null, n) })}</div></div>
      <div class="mt-4 grid grid-cols-5 gap-2 text-center">${[['Children', kids(n.id).length], ['Descendants', desc], ['Workers', DB.agents.filter(a => a.node === n.id).length], ['KBs', DB.kbs.filter(k => k.node === n.id).length], ['Grants', 2]].map(([k, v]) => `<div class="rounded-md bg-slate-50 p-2"><div class="text-lg font-semibold">${v}</div><div class="text-[10px] text-slate-500">${k}</div></div>`).join('')}</div></div>`)}
      ${UI.card(UI.cardHeader('People & roles', UI.btn('Assign', { size: 'sm', icon: 'user-plus', onclick: () => UI.modal({ title: 'Assign member', size: 'sm', body: `<div class="space-y-3">${UI.field('Member', UI.select(DB.members.map(m => m.name)))}${UI.field('Role', UI.select(['manager', 'operator (reserved)', 'viewer (reserved)']))}</div>`, footer: UI.btn('Assign', { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Role assigned'); } }) }) }), 'A manager can decide approvals routed to this node and its subtree. Operator and viewer are reserved for future use.') +
        UI.table(['Member', 'Role', ''], [['Layla Hassan', UI.badge('manager', 'indigo'), UI.iconBtn('x', () => UI.toast('Removed'))], ['Omar Khalid', UI.badge('manager', 'indigo'), UI.iconBtn('x', () => UI.toast('Removed'))]], { footer: false }))}
      ${UI.card(UI.cardHeader('Node defaults (inherited)', UI.badge('to define', 'amber')) + `<div class="space-y-3 p-4">${UI.field('Default model', UI.select(['— inherit —', ...DB.models.map(m => m.display)]))}${UI.field('Safety rule set', UI.select(['— inherit —', 'baseline', 'regulated']))}${UI.field('Library collections', UI.select(['— inherit —', ...DB.kbs.map(k => k.name)]))}<p class="text-[11px] text-slate-500">Changing a default here changes the resolved settings of workers beneath this node without touching their blueprints.</p></div>`)}
    </div></div>`;
};
function nodeModal(n, parent) {
  UI.modal({ title: n ? 'Edit node' : parent ? `Add child to ${parent.name}` : 'Add step', body: `<div class="grid gap-4 sm:grid-cols-2">${UI.field('Name (English)', UI.input(n?.name || ''))}${UI.field('Name (Arabic)', UI.input(n?.name_ar || '', 'dir="rtl"'))}
    ${UI.field('Type', UI.select(['department', 'section', 'unit'], n?.type || (parent ? (parent.type === 'department' ? 'section' : 'unit') : 'department')))}${UI.field('Key', UI.input(n?.key || '', 'class="font-mono"'))}</div>`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn(t('save'), { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Node saved'); } }) });
}

// =============== Marketplace (F-ADM-02) ===============
const MK = { tab: 'browse', cat: 'All' };
PAGES.templates = function () {
  const cats = ['All', ...new Set(DB.marketplace.map(m => m.cat))];
  const list = DB.marketplace.filter(m => (MK.cat === 'All' || m.cat === MK.cat) && (MK.tab !== 'mine' || m.installed));
  const browse = `<div class="mb-4 flex flex-wrap gap-3"><input class="${UI.inputCls} max-w-xs" placeholder="Search listings"/>${UI.chips(cats.map(c => ({ key: c, label: c })), MK.cat, k => { MK.cat = k; APP.render(); })}</div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">${list.map(m => UI.card(`<div class="flex h-full flex-col p-4"><div class="flex items-start justify-between"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">${UI.icon('package', 'w-5 h-5')}</span>${UI.badge('Free', 'green')}</div>
      <h3 class="mt-3 text-sm font-semibold">${m.name}</h3><p class="text-xs text-slate-500">${m.vendor} · v${m.ver}</p>
      <div class="mt-2 flex flex-wrap gap-1">${UI.badge(m.cat, 'violet')}${m.langs.map(l => UI.badge(l, 'gray')).join('')}</div>
      <p class="mt-2 flex items-center gap-1 text-[11px] text-slate-400">${UI.icon('shield-check', 'w-3 h-3')} checksum verified</p>
      <div class="mt-auto pt-3">${m.installed ? UI.btn('Installed', { size: 'sm', icon: 'check', disabled: true, cls: 'w-full' }) : UI.btn('Install', { size: 'sm', variant: 'primary', cls: 'w-full', onclick: () => installListing(m) })}</div></div>`)).join('')}</div>`;
  const release = UI.card(`<div class="max-w-xl space-y-4 p-4">${UI.field('Worker to package', UI.select(DB.agents.filter(a => a.released).map(a => a.name)))}
    ${UI.field('Includes', `<div class="flex flex-wrap gap-3">${UI.checkbox(true, 'Blueprint')}${UI.checkbox(true, 'Playbooks')}${UI.checkbox(true, 'Test suite')}${UI.checkbox(true, 'Required connectors list')}</div>`)}
    <div class="grid grid-cols-2 gap-3">${UI.field('Release', UI.input('1.0.0'))}${UI.field('Category', UI.select(cats.slice(1)))}</div>
    ${UI.field('Checksum', UI.input('sha256:9c1f…e27a (computed on release)', 'readonly class="font-mono"'))}${UI.btn('Release listing', { variant: 'primary', icon: 'upload-cloud', onclick: () => UI.toast('Listing released (mock)') })}</div>`);
  return UI.pageHeader(t('templates'), 'Ready-made workers you can install and adapt. Each template bundles a blueprint, playbooks and tests, and is integrity-checked.', '', UI.specTag('F-ADM-02')) +
    `<div class="mb-4">${UI.tabs([{ key: 'browse', label: 'Browse' }, { key: 'mine', label: 'Installed' }, { key: 'release', label: 'Release a worker' }], MK.tab, k => { MK.tab = k; APP.render(); })}</div>${MK.tab === 'release' ? release : browse}`;
}
function installListing(m) {
  UI.modal({ title: `Install · ${m.name}`, body: `<p class="text-sm text-slate-600">Creates a <b>draft worker</b> from this package. Review and grant the required connectors before releasing.</p>
    <div class="mt-4 space-y-2">${['Gov ERP (MCP server) — incident.get', 'Library collection — any'].map(x => `<div class="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">${UI.icon('plug', 'w-4 h-4 text-slate-400')}${x}</div>`).join('')}</div>`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn('Install as draft', { variant: 'primary', onclick: () => { m.installed = true; UI.closeOverlay(); APP.render(); UI.toast('Installed — draft worker created'); } }) });
}

// =============== Billing (F-ADM-03) ===============
PAGES.subscription = function () {
  const meter = (label, used, max, unit = '') => { const p = Math.round(used / max * 100); return `<div><div class="flex justify-between text-sm"><span class="text-slate-600">${label}</span><span class="font-medium">${used.toLocaleString()}${unit} / ${max.toLocaleString()}${unit}</span></div>
    <div class="mt-1.5 h-2 rounded-full bg-slate-100"><div class="h-2 rounded-full ${p >= 80 ? 'bg-amber-500' : 'bg-brand-500'}" style="width:${p}%"></div></div></div>`; };
  const plans = [['Free', '$0', '1,000 runs/day · $5/day cap · 3 seats · 10 agents'], ['Personal Pro', '$19/seat/mo', 'For individual builders'], ['Pro', '$49/seat/mo', '50k runs/day · $200/day cap · 25 seats'], ['Enterprise', 'Custom', 'Dedicated isolation, SSO/SCIM, sovereign deployment']];
  return UI.pageHeader(t('subscription'), 'What your organisation pays for and how much is used. Admins hear about it at 80% and 100% of a limit.', UI.btn('Invoices', { icon: 'receipt' }), UI.specTag('F-ADM-03')) +
    `<div class="grid gap-5 lg:grid-cols-3">${UI.card(`<div class="p-5"><div class="flex items-center justify-between"><div><p class="text-xs uppercase text-slate-500">Current plan</p><h2 class="text-xl font-semibold">Pro</h2></div>${UI.badge('Active', 'green')}</div>
      <div class="mt-5 space-y-4">${meter('Runs today', 819, 50000)}${meter('Cost today', 41, 200, '$')}${meter('Seats', 5, 25)}${meter('Workers', DB.agents.length, 1000)}</div></div>`)}
    <div class="lg:col-span-2 grid gap-4 sm:grid-cols-2">${plans.map(([n, p, d]) => UI.card(`<div class="p-4 ${n === 'Pro' ? 'ring-2 ring-brand-500 rounded-lg' : ''}"><div class="flex justify-between"><h3 class="font-semibold">${n}</h3>${n === 'Pro' ? UI.badge('Current', 'indigo') : ''}</div><p class="mt-1 text-lg font-semibold">${p}</p><p class="mt-1 text-xs text-slate-500">${d}</p>
      <div class="mt-3">${n === 'Pro' ? '' : UI.btn(n === 'Enterprise' ? 'Contact sales' : n === 'Free' ? 'Downgrade' : 'Switch', { size: 'sm', onclick: () => UI.toast('Plan change via Stripe (mock)') })}</div></div>`)).join('')}</div></div>
    <div class="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">${UI.toggle(false, () => UI.toast('Catalog-only mode toggled'), 'Catalog-only mode (no payment processing — for on-prem deployments)')}</div>`;
};

// =============== Settings (F-ADM-04 … 14) ===============
window.SETTINGS_TABS = [
  ['general', 'General', 'Organisation'], ['branding', 'Branding', 'Organisation'], ['models', 'AI models', 'Organisation'], ['alerts', 'Alert rules', 'Organisation'],
  ['members', 'Users', 'People'], ['roles', 'Roles', 'People'],
  ['sso', 'SSO', 'Security and data'], ['saml', 'SAML SSO', 'Security and data'], ['scim', 'SCIM provisioning', 'Security and data'], ['security', 'Sign-in security', 'Security and data'], ['compliance', 'Retention and keys', 'Security and data'], ['data', 'Residency and isolation', 'Security and data'],
  ['apikeys', 'API keys', 'Developer'], ['webhooks', 'Event webhooks', 'Developer']
];
const CAPS = { code: false, autoCode: false, browser: false, voice: true, payments: false, uploads: true, web: true, a2a: false };
const SEC = { mfa: true, allow: '' };

const section = (title, desc, inner, right = '') => UI.card(UI.cardHeader(title, right, desc) + `<div class="p-4">${inner}</div>`, 'mb-5');

const SETTINGS = {
  general: () => section('Workspace', '', `<div class="grid max-w-2xl gap-4 sm:grid-cols-2">${UI.field('Workspace name', UI.input(t('workspace')))}${UI.field('Key', UI.input('ministry-of-services', 'class="font-mono"'))}
      ${UI.field('Default language', UI.select([['en', 'English'], ['ar', 'Arabic']]))}${UI.field('Timezone', UI.select(['Asia/Dubai', 'UTC', 'Asia/Riyadh']))}
      ${UI.field('Logo', `<div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">${UI.icon('boxes')}</span>${UI.btn('Upload', { size: 'sm' })}</div>`)}</div><div class="mt-4">${UI.btn(t('save'), { variant: 'primary', onclick: () => UI.toast('Settings saved') })}</div>`) +
    section('What workers are allowed to do', 'Tenant-wide switches. Each worker must also opt in through its blueprint ("two-key"). A capability works only if both allow it.',
      `<div class="mb-4">${UI.segmented([{ key: 'cons', label: 'Conservative' }, { key: 'std', label: 'Standard' }, { key: 'custom', label: 'Custom' }], 'custom', k => { const on = k === 'std'; Object.assign(CAPS, { code: on, browser: on, voice: true, payments: false, autoCode: false }); APP.render(); })}</div>
      <div class="divide-y divide-slate-100">${[['code', 'Code execution', 'Workers may run code in a sandbox'], ['autoCode', 'Auto-approved code', 'Code runs without per-call approval'], ['browser', 'Browser use', 'Workers may drive a headless browser'], ['voice', 'Hands-free voice', 'Barge-in voice conversations'], ['payments', 'Worker payments', 'Spend under signed mandates'], ['uploads', 'File uploads', 'Users may attach files in chat'], ['web', 'Web access', 'Workers may fetch public web pages'], ['a2a', 'Open to partner workers', 'Workers may be exposed as A2A servers']]
        .map(([k, l, d]) => `<div class="flex items-center justify-between py-3"><div><div class="text-sm font-medium">${l}</div><div class="text-xs text-slate-500">${d}</div></div>${UI.toggle(CAPS[k], () => { CAPS[k] = !CAPS[k]; APP.render(); })}</div>`).join('')}</div>`),

  branding: () => section('Branding', 'Applied to the console, the widget and emails.', `<div class="grid max-w-2xl gap-4 sm:grid-cols-2">${UI.field('Product name', UI.input(t('product')))}${UI.field('Email sender name', UI.input('Ministry of Services Assistant'))}
    ${UI.field('Logo (light)', UI.btn('Upload', { size: 'sm', icon: 'upload' }))}${UI.field('Logo (dark)', UI.btn('Upload', { size: 'sm', icon: 'upload' }))}${UI.field('Favicon', UI.btn('Upload', { size: 'sm', icon: 'upload' }))}
    ${UI.field('Primary colour', `<div class="flex gap-2"><input type="color" value="#0d8a79" class="h-9 w-12 rounded border border-slate-300"/>${UI.input('#0d8a79', 'class="font-mono"')}</div>`)}
    ${UI.field('Custom domain', UI.input('agents.services.acme.gov'), 'Requires DNS verification (to define).')}${UI.field('Widget default theme', UI.select(['light', 'dark', 'auto']))}</div><div class="mt-4">${UI.btn(t('save'), { variant: 'primary', onclick: () => UI.toast('Branding saved') })}</div>`),

  models: () => section('Model providers', 'Endpoints and keys your models resolve through.', UI.table(['Provider', 'Base URL', 'Secret', t('status'), ''], DB.providers.map(p => [p.name, `<span class="font-mono text-xs">${p.url}</span>`, `<span class="font-mono text-xs">${p.secret}</span>`, UI.status(p.status), UI.btn('Test connection', { size: 'sm', variant: 'ghost', onclick: () => UI.toast('Connection OK') })]), { footer: false }),
      UI.btn('Add provider', { size: 'sm', icon: 'plus', variant: 'primary', onclick: () => UI.modal({ title: 'Add model provider', body: `<div class="space-y-4">${UI.field('Type', UI.select(['OpenAI-compatible endpoint', 'Anthropic', 'Azure OpenAI', 'Self-hosted vLLM']))}${UI.field('Name', UI.input(''))}${UI.field('Base URL', UI.input('https://', 'class="font-mono"'))}${UI.field('API key (BYOK, optional)', UI.input('', 'type="password"'), 'Stored write-only in the vault.')}</div>`, footer: UI.btn('Test connection', {}) + UI.btn(t('add'), { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Provider added'); } }) }) })) +
    section('Registered models', 'Models workers can pick, with pricing and routing.', UI.table(['Model', 'Provider', 'Price / 1M (in · out)', 'Context', 'Capabilities', 'Default'], DB.models.map(m => [`<div class="font-medium">${m.display}</div><div class="font-mono text-xs text-slate-500">${m.id}</div>`, m.provider, `$${m.pin.toFixed(2)} · $${m.pout.toFixed(2)}`, m.ctx, m.caps.map(c => UI.badge(c, 'gray')).join(' '),
      `<input type="radio" name="defmodel" ${m.isDefault ? 'checked' : ''} onchange="${UI.fn(() => { DB.models.forEach(x => x.isDefault = x === m); UI.toast('Deployment default: ' + m.display); })}" class="text-brand-600"/>`]), { footer: false }), UI.btn('Register model', { size: 'sm', icon: 'plus', variant: 'primary' })),

  alerts: () => section('Alert rules', 'Rules that escalate when a metric crosses a line.', UI.table(['Metric', 'Scope', 'Threshold', 'Window', 'Destination', ''], DB.alerts.map(a => [a.metric, a.scope, `<span class="font-mono text-xs">${a.threshold}</span>`, a.window, a.dest, UI.iconBtn('trash-2', () => UI.toast('Rule deleted'))]), { footer: false }),
    UI.btn('Run sweep now', { size: 'sm', icon: 'radar', onclick: () => UI.toast('Sweep complete · 1 rule breached') }) + UI.btn('New rule', { size: 'sm', icon: 'plus', variant: 'primary', onclick: () => UI.modal({ title: 'New alert rule', body: `<div class="grid gap-4 sm:grid-cols-2">${UI.field('Metric', UI.select(['Cost', 'Error rate', 'Latency', 'Quality drift', 'Checkpoint backlog', 'Safety rule hits']))}${UI.field('Scope', UI.select(['Workspace', ...DB.agents.map(a => a.name)]))}${UI.field('Threshold', UI.input('> 5%'))}${UI.field('Window', UI.select(['15 min', '1 hour', '1 day']))}<div class="sm:col-span-2">${UI.field('Destination', UI.select(['In-app', 'Email', 'Webhook', 'Teams', 'Slack']))}</div></div>`, footer: UI.btn(t('create'), { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Rule created'); } }) }) })),

  members: () => section('Users', 'Owners can change any role; the last owner cannot be removed.', UI.table(['Member', 'Role', 'Custom role', ''], DB.members.map(m => [`<div class="font-medium">${m.name}</div><div class="text-xs text-slate-500">${m.email}</div>`, UI.badge(m.role, m.role === 'owner' ? 'indigo' : m.role === 'admin' ? 'violet' : 'gray'), m.custom ? UI.badge(m.custom, 'blue') : '—',
      UI.btn('Change role', { size: 'sm', variant: 'ghost', onclick: () => changeRole(m) })])),
    `<div class="w-36">${UI.select(['All roles', 'owner', 'admin', 'member'])}</div>` + UI.btn('Invite', { size: 'sm', icon: 'user-plus', variant: 'primary', onclick: () => UI.modal({ title: 'Invite member', body: `<div class="space-y-4">${UI.field('Emails', UI.textarea('', 'placeholder="one per line"', 3))}${UI.field('Role', UI.select(['member', 'admin', 'owner']))}${UI.field('Custom role (optional)', UI.select(['— none —', ...DB.customRoles.map(r => r.name)]))}</div>`, footer: UI.btn('Send invites', { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Invitations sent'); } }) }) })),

  roles: () => section('Built-in roles', '', `<div class="grid gap-3 sm:grid-cols-3">${[['owner', 'Everything, including billing and changing any role'], ['admin', 'Manage build, operate and settings; not billing ownership'], ['member', 'Use workers granted to them; act on approvals routed to them']].map(([r, d]) => `<div class="rounded-md border border-slate-200 p-3"><div class="text-sm font-semibold capitalize">${r}</div><div class="mt-1 text-xs text-slate-500">${d}</div></div>`).join('')}</div>`) +
    section('Custom roles', 'Extra permissions on top of the built-in roles.', UI.table(['Role', 'Based on', 'Permissions', ''], DB.customRoles.map(r => [r.name, r.base, r.perms.map(p => UI.badge(p, 'gray')).join(' '), UI.btn(t('edit'), { size: 'sm', variant: 'ghost', onclick: () => roleEditor(r) })]), { footer: false }), UI.btn('New role', { size: 'sm', icon: 'plus', variant: 'primary', onclick: () => roleEditor() })),

  sso: () => section('Single sign-on (OIDC)', 'Entra ID, Google, Okta or any OIDC provider.', `<div class="grid max-w-2xl gap-4 sm:grid-cols-2">${UI.field('Provider', UI.select(['Microsoft Entra ID', 'Google Workspace', 'Okta', 'Generic OIDC']))}${UI.field('Issuer URL', UI.input('https://login.microsoftonline.com/…/v2.0', 'class="font-mono"'))}
    ${UI.field('Client ID', UI.input('', 'class="font-mono"'))}${UI.field('Client secret', UI.input('', 'type="password"'), 'Write-only.')}<div class="sm:col-span-2">${UI.field('Redirect URI', UI.input('https://agents.example/auth/callback', 'readonly class="font-mono"'))}</div></div>
    <div class="mt-4 flex gap-2">${UI.btn('Test sign-in', {})}${UI.btn(t('save'), { variant: 'primary', onclick: () => UI.toast('SSO saved') })}</div>`),

  saml: () => section('SAML SSO', '', `<div class="grid max-w-2xl gap-4">${UI.field('IdP metadata', `<div class="flex gap-2">${UI.input('', 'placeholder="Metadata URL" class="font-mono"')}${UI.btn('Upload XML', { icon: 'upload' })}</div>`)}
    <div class="grid grid-cols-3 gap-3">${UI.field('Email attribute', UI.input('email'))}${UI.field('Name attribute', UI.input('displayName'))}${UI.field('Groups attribute', UI.input('groups'))}</div>
    ${UI.field('Verified domains', `<div class="flex items-center gap-2">${UI.badge('acme.gov · verified', 'green')}${UI.btn('Add domain', { size: 'sm' })}</div>`)}
    ${UI.toggle(false, () => UI.toast('Enforcement updated'), 'Enforce SSO for verified domains')}</div>`),

  scim: () => section('SCIM provisioning', 'Users and groups are created, updated and removed automatically by your identity provider.', `<div class="grid max-w-2xl gap-4">${UI.field('SCIM endpoint', UI.input('https://api.agents.example/scim/v2', 'readonly class="font-mono"'))}
    ${UI.field('Bearer token', `<div class="flex gap-2">${UI.input('scim_••••••••••••', 'readonly class="font-mono"')}${UI.btn('Regenerate', {})}</div>`, 'Shown once on generation.')}
    <div><div class="mb-2 text-xs font-medium">Group → role mapping</div>${UI.table(['IdP group', 'Workspace role', 'Custom role'], [['AGT-Admins', 'admin', '—'], ['AGT-Approvers', 'member', 'Approver'], ['AGT-Audit', 'member', 'Auditor']], { footer: false })}</div></div>`),

  security: () => section('Organization security policy', '', `<div class="max-w-2xl space-y-4">${UI.toggle(SEC.mfa, () => { SEC.mfa = !SEC.mfa; APP.render(); }, 'Require MFA for all members')}
    <div class="grid grid-cols-2 gap-3">${UI.field('Idle timeout (minutes, 0 = off)', UI.input('30', 'type="number"'))}${UI.field('Absolute session timeout (hours)', UI.input('12', 'type="number"'))}</div>
    ${UI.field('IP allow-list', UI.textarea(SEC.allow, 'placeholder="10.0.0.0/8\n203.0.113.4"', 4), 'One IP or CIDR per line. Empty = no restriction.')}
    <div class="rounded-md bg-amber-50 p-3 text-xs text-amber-800">${UI.icon('alert-triangle', 'w-3.5 h-3.5 inline')} Enabling the allow-list or MFA affects your own session immediately.</div>
    ${UI.btn('Save security policy', { variant: 'primary', onclick: () => UI.toast('Security policy saved') })}</div>`) +
    section('My multi-factor authentication', '', `<div class="flex flex-wrap items-center gap-3">${UI.badge('Enrolled · verified', 'green')}${UI.badge('This session verified', 'blue')}<div class="ms-auto flex gap-2">${UI.btn('Recovery codes', { icon: 'key' })}${UI.btn('Enable MFA', { variant: 'primary', icon: 'smartphone', onclick: () => UI.modal({ title: 'Enable MFA (TOTP)', size: 'sm', body: `<div class="text-center"><div class="mx-auto grid h-40 w-40 grid-cols-8 gap-0.5 rounded bg-white p-2 ring-1 ring-slate-200">${Array.from({ length: 64 }, (_, i) => `<div class="${(i * 7 + (i >> 3)) % 3 ? 'bg-slate-900' : ''}"></div>`).join('')}</div><p class="mt-3 text-sm">Scan with your authenticator app, then enter the 6-digit code.</p><div class="mt-3">${UI.input('', 'placeholder="123456" class="text-center tracking-widest"')}</div></div>`, footer: UI.btn('Verify', { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('MFA enabled'); } }) }) })}</div></div>`),

  compliance: () => section('Retention', 'No retention schedule = kept until deleted.', `${UI.table(['Data class', 'TTL'], [['runs', UI.select(['90 days', '180 days', '1 year', 'Keep'], '1 year')], ['messages', UI.select(['90 days', '180 days', '1 year', 'Keep'], '180 days')], ['agent_memory', UI.select(['90 days', '180 days', '1 year', 'Keep'], '1 year')], ['audit', '<span class="text-sm text-slate-500">7 years (minimum, fixed)</span>']], { footer: false })}`,
      UI.btn('Run purge now', { size: 'sm', icon: 'trash', onclick: () => UI.confirm('Run purge now?', 'Deletes data older than its TTL. Audit rows are kept.', () => UI.toast('Purge job started'), 'Run purge') })) +
    section('Encryption keys (CMK)', '', `<dl class="grid gap-4 text-sm sm:grid-cols-5">${[['Status', UI.badge('Active', 'green')], ['Provider', 'HashiCorp Vault (Transit)'], ['Active version', 'v4'], ['Secrets', DB.secrets.length], ['Last rotated', '2026-09-30']].map(([k, v]) => `<div><dt class="text-xs text-slate-500">${k}</dt><dd class="mt-0.5">${v}</dd></div>`).join('')}</dl>`, UI.btn('Rotate keys', { size: 'sm', icon: 'rotate-cw', onclick: () => UI.toast('Key rotation started') })) +
    section('Secret vault', 'A safe place to keep the passwords and API keys your connections and tools need. Secrets are envelope-encrypted and write-only — they are never shown again.',
      `<div class="mb-4 flex flex-wrap gap-2"><div class="w-56">${UI.input('', 'placeholder="name (a-z 0-9 . _ -)" class="font-mono" id="sec-name"')}</div><div class="w-64">${UI.input('', 'type="password" placeholder="value" id="sec-val"')}</div>${UI.btn('Add secret', { icon: 'plus', variant: 'primary', onclick: () => { const n = document.getElementById('sec-name').value; if (!/^[A-Za-z0-9._-]+$/.test(n)) { UI.toast('Name: letters, numbers, dot, underscore, hyphen', 'info'); return; } DB.secrets.push({ name: n, created: 'today', last: '—' }); APP.render(); UI.toast('Secret stored'); } })}</div>` +
      UI.table(['Name', 'Created', 'Last used', ''], DB.secrets.map(s => [`<span class="font-mono text-xs">${s.name}</span>`, s.created, s.last, UI.iconBtn('trash-2', () => UI.toast('Secret deleted'))]), { footer: false })) +
    section('Data rights', '', `<div class="flex items-center justify-between"><p class="text-sm text-slate-600">Export everything this workspace holds.</p>${UI.btn('Export tenant data', { icon: 'download', onclick: () => UI.toast('Export job started — you will be notified') })}</div>`),

  data: () => section('Residency and isolation', 'Read-only explanations of how each setting is enforced. These feed the Assurance report.', `<div class="grid max-w-3xl gap-5">
    ${UI.field('Residency region', UI.select(['UAE (me-central-1)', 'KSA (me-south-1)', 'EU (eu-central-1)']), 'Advisory in v1; enforced by deployment cell later.')}
    ${UI.field('Isolation tier', `<div class="grid gap-2 sm:grid-cols-2">${UI.radioCard('iso', 'shared', true, 'Shared (RLS)', 'Pooled database; every row is tenant-scoped by Postgres row-level security.')}${UI.radioCard('iso', 'dedicated', false, 'Dedicated', 'Own database / namespace. Enterprise plan.')}</div>`)}
    ${UI.field('Egress allow-list', UI.textarea('*.acme.gov\napi.openai.com\n10.20.0.0/16', 'class="font-mono"', 4), 'Domains or CIDRs. All outbound HTTP is SSRF-guarded.')}
    ${UI.toggle(true, () => UI.toast('Egress enforcement toggled'), 'Enforce egress allow-list')}</div>`),

  apikeys: () => section('API keys', 'Keys that call the API on behalf of this workspace.', UI.table(['Name', 'Prefix', 'Scopes', 'Created', 'Last used', ''], DB.apiKeys.map(k => [k.name, `<span class="font-mono text-xs">${k.prefix}…</span>`, `<span class="text-xs">${k.scopes}</span>`, k.created, k.last, UI.btn('Revoke', { size: 'sm', variant: 'danger-ghost', onclick: () => UI.confirm('Revoke key?', `Calls using ${k.prefix}… will fail immediately.`, () => UI.toast('Key revoked'), 'Revoke') })]), { footer: false }),
    UI.btn('Create key', { size: 'sm', icon: 'plus', variant: 'primary', onclick: () => UI.modal({ title: 'Create API key', body: `<div class="space-y-4">${UI.field('Name', UI.input(''))}${UI.field('Scopes', `<div class="grid grid-cols-2 gap-2">${['agents:read', 'agents:write', 'runs:read', 'runs:write', 'approvals:decide', 'knowledge:write', 'usage:read', 'audit:read'].map(s => UI.checkbox(false, `<span class="font-mono text-xs">${s}</span>`)).join('')}</div>`)}${UI.field('Expiry', UI.select(['30 days', '90 days', '1 year', 'Never']))}</div>`,
      footer: UI.btn(t('create'), { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.modal({ title: 'Copy your key now', size: 'sm', body: `<p class="text-sm text-slate-600 mb-3">This is the only time the key is shown.</p><pre class="json-editor rounded bg-slate-900 p-3 text-slate-100 overflow-x-auto" dir="ltr">ak_live_3d8b0f2c9e…EXAMPLE</pre>`, footer: UI.btn(t('done'), { variant: 'primary', onclick: 'UI.closeOverlay()' }) }); } }) }) })),

  webhooks: () => section('Event webhooks', 'Signed event deliveries to your endpoints (HMAC-SHA256 header with timestamp). Automatic retries with backoff; disabled after repeated failure.',
    UI.table(['Endpoint', 'Events', 'Last delivery', 'Enabled', ''], DB.webhooks.map(w => [`<span class="font-mono text-xs">${w.url}</span>`, w.events.map(e => UI.badge(e, 'gray')).join(' '), `${UI.badge(w.lastStatus, w.lastStatus === '200' ? 'green' : 'red')} <span class="text-xs text-slate-500">${w.latency}</span>`, UI.toggle(w.enabled, () => { w.enabled = !w.enabled; APP.render(); }),
      `<div class="flex gap-1">${UI.btn(t('test'), { size: 'sm', variant: 'ghost', onclick: () => UI.toast('Test event delivered · 200') })}${UI.btn('Deliveries', { size: 'sm', variant: 'ghost', onclick: () => deliveries(w) })}</div>`]), { footer: false }),
    UI.btn('Add endpoint', { size: 'sm', icon: 'plus', variant: 'primary', onclick: () => UI.modal({ title: 'Add webhook endpoint', body: `<div class="space-y-4">${UI.field('URL', UI.input('https://', 'class="font-mono"'))}${UI.field('Events', `<div class="grid grid-cols-2 gap-2">${['run.completed', 'run.failed', 'approval.requested', 'approval.decided', 'conversation.created', 'outcome.recorded', 'eval.completed', 'agent.released', 'guardrail.blocked'].map(e => UI.checkbox(false, `<span class="font-mono text-xs">${e}</span>`)).join('')}</div>`)}${UI.toggle(true, () => {}, 'Enabled')}</div>`, footer: UI.btn(t('add'), { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Endpoint added · signing secret generated'); } }) }) }))
};

function changeRole(m) {
  const owners = DB.members.filter(x => x.role === 'owner').length;
  const last = m.role === 'owner' && owners === 1;
  UI.modal({ title: `Change role · ${m.name}`, size: 'sm', body: `${UI.field('Role', UI.select(['owner', 'admin', 'member'], m.role, last ? 'disabled' : ''))}
    ${last ? `<p class="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">This is the last owner. Make someone else an owner first.</p>` : ''}`,
    footer: (last ? '' : UI.btn('Remove from workspace', { variant: 'danger-ghost', onclick: () => { DB.members = DB.members.filter(x => x !== m); UI.closeOverlay(); APP.render(); UI.toast('Member removed'); } })) + UI.btn(t('save'), { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Role updated'); } }) });
}
function roleEditor(r) {
  const groups = { Build: ['agents', 'workflows', 'skills', 'knowledge', 'integrations'], Operate: ['approvals', 'runs', 'inbox', 'guardrails'], Governance: ['audit', 'trust', 'governance'], Admin: ['settings', 'members', 'billing'] };
  const has = p => r?.perms.includes(p);
  UI.modal({ title: r ? `Edit role · ${r.name}` : 'New custom role', size: 'lg', body: `<div class="grid grid-cols-2 gap-3 mb-4">${UI.field('Name', UI.input(r?.name || ''))}${UI.field('Based on', UI.select(['member', 'admin'], r?.base))}</div>
    ${Object.entries(groups).map(([g, items]) => `<div class="mb-3"><div class="mb-1 text-xs font-semibold uppercase text-slate-400">${g}</div><table class="w-full text-sm"><tbody>${items.map(it => `<tr class="border-t border-slate-100"><td class="py-1.5 capitalize">${it}</td>${['view', 'edit', 'release', 'approve', 'admin'].map(a => `<td class="py-1.5"><label class="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" ${has(it + '.' + a) || (a === 'view' && has(it + '.view')) ? 'checked' : ''} class="rounded text-brand-600"/>${a}</label></td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn(t('save'), { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Role saved'); } }) });
}
function deliveries(w) {
  UI.drawer({ title: `<h2 class="text-base font-semibold">Deliveries</h2>`, sub: w.url, body: UI.table(['Event', 'Status', 'Latency', 'Attempts', 'When'], [['run.completed', UI.badge(w.lastStatus, w.lastStatus === '200' ? 'green' : 'red'), w.latency, '1', '2 min ago'], ['approval.requested', UI.badge('200', 'green'), '201ms', '1', '9 min ago'], ['run.completed', UI.badge('500', 'red'), '1.2s', '3 (retrying)', '1 h ago']], { footer: false }) });
}

PAGES.configuration = function (params) {
  const tab = params[0] || 'general';
  let grp = '';
  const nav = SETTINGS_TABS.map(([k, l, g]) => { const h = g !== grp ? `<div class="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 first:mt-0">${g}</div>` : ''; grp = g;
    return h + `<a href="#/configuration/${k}" class="nav-link block rounded-md px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 ${k === tab ? 'active' : ''}">${l}</a>`; }).join('');
  const label = (SETTINGS_TABS.find(x => x[0] === tab) || [, 'General'])[1];
  return UI.pageHeader(t('configuration'), '', '', UI.specTag('F-ADM-04…14')) +
    `<div class="flex flex-col gap-6 md:flex-row"><aside class="w-full shrink-0 md:w-56">${UI.card(`<nav class="p-2">${nav}</nav>`)}</aside>
    <div class="min-w-0 flex-1"><h2 class="mb-4 text-lg font-semibold">${label}</h2>${(SETTINGS[tab] || SETTINGS.general)()}</div></div>`;
};
