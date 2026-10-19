// BUILD › Workers (F-BLD-01 … F-BLD-16)
const AG = { view: 'list', audience: 'all', q: '', status: 'all', mode: 'form', testOpen: false, advOpen: {}, blueprints: {}, saved: true, testMsgs: [] };

function defaultBlueprint(a) {
  return {
    blueprint_version: '1.0',
    identity: { display_name: a.name, display_name_ar: a.name_ar || '', audience: a.audience, tone: 'formal', language: 'bilingual',
      persona: `You are the ${a.name}. Answer only from approved sources, cite every fact, and escalate when unsure.`,
      persona_depth: { role: '', goals: [], constraints: [], style_rules: [] },
      starter_questions: ['How do I renew my licence?', 'What are the fees for a certificate?', 'كيف أقدم شكوى؟'] },
    model: { provider: 'openai', model: a.model, registered_model_id: null, temperature: 0.5, max_output_tokens: 2048, routing: { fallbacks: [], cooldown_seconds: 30 } },
    tools: { builtin: ['kb.search', 'memory.save', 'recall.search', 'skills.search', 'skills.apply'], mcp: [{ integration: 'gov-erp', tools: ['incident.get'] }], remote_agents: [], databases: [], http_credentials: [] },
    knowledge: { bases: ['citizen-services-handbook'], citations: 'required', top_k: 6 },
    memory: { enabled: true, scopes: ['agent', 'user'], graph: { enabled: false, decay: 0.02, min_importance: 0.3, consolidation: 'nightly' } },
    skills: { autonomy: 'propose' },
    user_modeling: { enabled: false },
    checkpoint: { default: 'auto_with_safety_net', rules: [] },
    guardrails: { policy: 'baseline', blocked_topics: [] },
    budget: { max_steps: 20, max_cost_per_run: 1.0, max_tokens_per_run: 50000 },
    risk: { level: 'standard', classification: 'internal' },
    decision_policy: { may_decide: false, escalate_when: ['low_confidence', 'policy_conflict'], escalate_to: 'org_node_manager' },
    voice: { enabled: false, mode: 'push_to_talk', barge_in: false, stt: null, tts: null },
    code_execution: { enabled: false, auto_approve: false, timeout_s: 30 },
    browser: { enabled: false },
    payments: { enabled: false, mandate_required: true },
    a2a: { expose: false, allowed_callers: [], allow_any_caller: false },
    evaluation: { continuous: { enabled: false, sample_rate: 0.1, judge: 'default' }, release_gates: [{ suite: 'answers-with-sources', min_score: 0.9 }] },
    output: { format: 'text', json_schema: null }
  };
}
const blueprintOf = a => AG.blueprints[a.id] || (AG.blueprints[a.id] = defaultBlueprint(a));
const getPath = (o, p) => p.split('.').reduce((x, k) => x?.[k], o);
const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((x, k) => x[k], o)[last] = v; };

// ---------------- List ----------------
function agentsList() {
  const counts = s => DB.agents.filter(a => s === 'all' || a.audience === s).length;
  let rows = DB.agents.filter(a => (AG.audience === 'all' || a.audience === AG.audience) && (AG.status === 'all' || a.status === AG.status) && (!AG.q || (a.name + a.key).toLowerCase().includes(AG.q.toLowerCase())));

  const view = AG.view === 'list' ? UI.table(['Worker', 'Unit', 'Seniority', 'Supervisor', 'Audience', 'Released', t('status'), ''], rows.map(a => ({
    onclick: () => location.hash = `#/workers/${a.id}/builder`,
    cells: [`<div class="font-medium text-slate-800">${a.name}</div><div class="font-mono text-xs text-slate-500">${a.key}</div>`,
      DB.nodeById(a.node)?.name || '—', `<span class="capitalize">${a.level}</span>`, a.reportsTo ? DB.agentById(a.reportsTo).name : '—',
      UI.audience(a.audience), a.released ? UI.icon('check', 'w-4 h-4 text-emerald-600') : UI.badge('working copy', 'amber'), UI.status(a.status),
      `<div class="flex justify-end gap-0.5" onclick="event.stopPropagation()">${UI.iconBtn('message-square', "location.hash='#/work'", 'Chat')}${UI.iconBtn('trash-2', () => deleteAgent(a), 'Delete')}${UI.iconBtn('chevron-right', `location.hash='#/workers/${a.id}/builder'`, 'Open')}</div>`]
  })), { total: DB.agents.length, empty: UI.emptyState('bot', 'No workers match', 'Try a different filter, or create a new worker.', UI.btn(t('newAgent'), { variant: 'primary', icon: 'plus', onclick: openCreateAgent })) })
    : AG.view === 'map' ? agentsMap(rows) : agentsChart();

  return UI.pageHeader(t('workers'), 'Every digital worker in your organisation: who it serves, where it sits and what state it is in.',
    UI.segmented([{ key: 'list', label: 'List', icon: 'list' }, { key: 'map', label: 'Connections', icon: 'share-2' }, { key: 'chart', label: 'Org chart', icon: 'network' }], AG.view, k => { AG.view = k; APP.render(); }) +
    UI.btn('Credentials', { icon: 'fingerprint', href: '#/credentials' }) + UI.btn(t('newAgent'), { icon: 'plus', variant: 'primary', onclick: openCreateAgent }), UI.specTag('F-BLD-01')) +
  UI.card(`<div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
      <div class="relative w-64">${UI.icon('search', 'w-4 h-4 absolute start-3 top-2.5 text-slate-400')}<input class="${UI.inputCls} ps-9" placeholder="Search workers" value="${UI.esc(AG.q)}" onchange="${UI.fn(e => { AG.q = e.target.value; APP.render(); })}"/></div>
      <div class="w-40">${UI.select([['all', 'All statuses'], ['active', 'Active'], ['suspended', 'Suspended'], ['archived', 'Archived']], AG.status, `onchange="${UI.fn(e => { AG.status = e.target.value; APP.render(); })}"`)}</div>
      ${UI.chips([{ key: 'all', label: t('all'), count: counts('all') }, { key: 'public', label: 'Public', count: counts('public') }, { key: 'staff', label: 'Staff', count: counts('staff') }, { key: 'system', label: 'System', count: counts('system') }], AG.audience, k => { AG.audience = k; APP.render(); })}
    </div>${view}`);
}

function agentsMap(rows) {
  // Workers in the middle, tools/KBs left, flows right.
  const left = ['KB · Handbook', 'KB · Dispatch SOPs', 'MCP · gov-erp', 'DB · registry-db'];
  const right = ['WF · Report to Dispatch', 'WF · Objection Review', 'Squad · Incident Response'];
  const H = Math.max(rows.length, left.length) * 56 + 40;
  const ay = i => 40 + i * 56, ly = i => 50 + i * 70, ry = i => 60 + i * 80;
  const links = [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [3, 0], [4, 2], [4, 3], [5, 0]].filter(([a]) => a < rows.length);
  const wl = [[1, 0], [2, 0], [4, 0], [3, 1], [4, 2], [1, 2]].filter(([a]) => a < rows.length);
  return `<div class="p-4 overflow-x-auto"><svg viewBox="0 0 900 ${H}" class="w-full min-w-[700px]" style="height:${H}px">
    ${links.map(([a, l]) => `<path d="M 200 ${ly(l)} C 290 ${ly(l)}, 290 ${ay(a)}, 360 ${ay(a)}" stroke="#bfe8e1" stroke-width="2" fill="none"/>`).join('')}
    ${wl.map(([a, r]) => `<path d="M 560 ${ay(a)} C 630 ${ay(a)}, 630 ${ry(r)}, 700 ${ry(r)}" stroke="#ddd6fe" stroke-width="2" fill="none"/>`).join('')}
    ${left.map((l, i) => `<g><rect x="20" y="${ly(i) - 16}" width="180" height="32" rx="6" fill="#f1f5f9" stroke="#cbd5e1"/><text x="110" y="${ly(i) + 4}" text-anchor="middle" font-size="12" fill="#334155">${l}</text></g>`).join('')}
    ${rows.map((a, i) => `<g style="cursor:pointer" onclick="location.hash='#/workers/${a.id}/builder'"><rect x="360" y="${ay(i) - 18}" width="200" height="36" rx="8" fill="#e6f6f3" stroke="#0f9d8a"/><text x="460" y="${ay(i) + 4}" text-anchor="middle" font-size="12" font-weight="600" fill="#0b5b52">${a.name}</text></g>`).join('')}
    ${right.map((r, i) => `<g><rect x="700" y="${ry(i) - 16}" width="180" height="32" rx="6" fill="#f5f3ff" stroke="#c4b5fd"/><text x="790" y="${ry(i) + 4}" text-anchor="middle" font-size="12" fill="#5b21b6">${r}</text></g>`).join('')}
  </svg><p class="text-xs text-slate-500">Map view: agents and their connections (knowledge, tools, flows, squads). Click a worker to open it.</p></div>`;
}

function agentsChart() {
  const roots = DB.agents.filter(a => !a.reportsTo);
  const node = a => `<div class="flex flex-col items-center">
    <a href="#/workers/${a.id}/hierarchy" class="w-48 rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm hover:border-brand-400">
      <div class="text-sm font-medium text-slate-800 truncate">${a.name}</div><div class="mt-0.5 text-[11px] text-slate-500 capitalize">${a.level} · ${DB.nodeById(a.node)?.name}</div></a>
    ${(() => { const kids = DB.agents.filter(k => k.reportsTo === a.id); return kids.length ? `<div class="h-5 w-px bg-slate-300"></div><div class="flex gap-4 border-t border-slate-300 pt-5">${kids.map(node).join('')}</div>` : ''; })()}</div>`;
  return `<div class="overflow-x-auto p-6 scrollbar-thin"><div class="flex min-w-max items-start gap-8">${roots.map(node).join('')}</div>
    <p class="mt-4 text-xs text-slate-500">Chart view: org chart of workers by "reports to" hierarchy.</p></div>`;
}

function deleteAgent(a) {
  const refs = DB.workflows.filter(w => w.released && ['a2', 'a3', 'a5'].includes(a.id));
  if (refs.length) {
    UI.modal({ title: 'Cannot delete worker', size: 'sm', body: `<p class="text-sm text-slate-600 mb-3"><b>${a.name}</b> is used by released flows. Remove it from these flows first:</p>
      <ul class="space-y-1">${refs.map(w => `<li><a class="text-sm text-brand-600" href="#/flows/${w.id}">${w.name}</a> <span class="text-xs text-slate-400">v${w.version}</span></li>`).join('')}</ul>`, footer: UI.btn(t('close'), { onclick: 'UI.closeOverlay()' }) });
    return;
  }
  UI.confirm('Delete worker?', `This permanently deletes <b>${a.name}</b> and all its versions. Runs stay in the ledger.`, () => { DB.agents = DB.agents.filter(x => x !== a); APP.render(); UI.toast('Worker deleted'); }, t('delete'));
}

// ---------------- Create (F-BLD-02) ----------------
window.openCreateAgent = function () {
  const st = { start: 'blank', name: '', key: '', audience: 'staff', node: 'n3', brief: '', template: 'Front-desk Receptionist' };
  const keyify = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const wrap = UI.modal({ title: t('newAgent'), size: 'lg', sub: 'Creates the worker and a v1 draft. Nothing is released until you release.', body: '<div id="ca"></div>',
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn(t('create'), { variant: 'primary', icon: 'check', onclick: () => {
      if (!st.name) { UI.toast('Display name is required', 'info'); return; }
      const id = 'a' + Date.now();
      DB.agents.unshift({ id, key: st.key || keyify(st.name), name: st.name, name_ar: '', audience: st.audience, node: st.node, level: 'member', reportsTo: null, released: false, version: 1, status: 'active', model: 'gpt-4.1-mini', runs7d: 0, lastActive: 'just now' });
      if (st.start === 'ai') { const m = blueprintOf(DB.agentById(id)); m.identity.persona = `Drafted by copilot from brief: "${st.brief}"`; }
      UI.closeOverlay(); location.hash = `#/workers/${id}/builder`; UI.toast(st.start === 'ai' ? 'Nova drafted a blueprint — review before releasing' : 'Worker created as draft v1');
    } }) });
  const el = wrap.querySelector('#ca');
  function draw() {
    el.innerHTML = `<div class="grid gap-3 sm:grid-cols-3 mb-5">
      ${[['template', 'layout-template', 'Template', 'Start from a platform, tenant or gallery template'], ['ai', 'sparkles', 'Describe it to Nova', 'Write a brief; the copilot drafts a full blueprint for review'], ['blank', 'file', 'Start empty', 'Start with defaults and configure everything yourself']]
        .map(([k, ic, ti, d]) => `<button data-start="${k}" class="rounded-lg border p-4 text-start ${st.start === k ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/40' : 'border-slate-200 hover:bg-slate-50'}">${UI.icon(ic, 'w-5 h-5 text-brand-600')}<div class="mt-2 text-sm font-semibold">${ti}</div><div class="mt-1 text-xs text-slate-500">${d}</div></button>`).join('')}</div>
      ${st.start === 'template' ? `<div class="mb-4">${UI.field('Template', UI.select(DB.marketplace.map(m => m.name), st.template, 'data-k="template"'))}</div>` : ''}
      ${st.start === 'ai' ? `<div class="mb-4">${UI.field('Brief', UI.textarea(st.brief, 'data-k="brief" placeholder="e.g. A bilingual assistant that answers citizen questions about licence renewals from the handbook and opens a CRM request when asked."', 3))}</div>` : ''}
      <div class="grid gap-4 sm:grid-cols-2">
        ${UI.field('Display name *', UI.input(st.name, 'data-k="name" placeholder="Citizen Request Assistant"'))}
        ${UI.field('Key *', UI.input(st.key || keyify(st.name), 'data-k="key" class="font-mono"'), 'Auto-generated from the name; unique in this workspace.')}
        ${UI.field('Audience *', UI.select([['public', 'Public'], ['staff', 'Staff (works alongside your team)'], ['system', 'System (runs behind the scenes)']], st.audience, 'data-k="audience"'))}
        ${UI.field('Unit *', UI.select(DB.orgNodes.map(n => [n.id, `${n.name} (${n.type})`]), st.node, 'data-k="node"'))}
      </div>`;
    el.querySelectorAll('[data-start]').forEach(b => b.onclick = () => { st.start = b.dataset.start; draw(); });
    el.querySelectorAll('[data-k]').forEach(i => i.oninput = () => { st[i.dataset.k] = i.value; if (i.dataset.k === 'name') { const s = el.querySelector('[data-k="key"]'); s.value = keyify(i.value); st.key = s.value; } });
    UI.refreshIcons();
  }
  draw();
};

// ---------------- Detail ----------------
const AGENT_TABS = [
  ['Design', [['builder', 'Blueprint'], ['playground', 'Sandbox'], ['versions', 'Releases'], ['effective', 'Resolved settings']]],
  ['Quality', [['experiments', 'Trials'], ['simulations', 'Rehearsals'], ['quality', 'Scores']]],
  ['Reach', [['triggers', 'Automations'], ['systems', 'Systems used'], ['embed', 'Web chat'], ['a2a', 'Partner access'], ['map', 'Relations']]],
  ['Control', [['identity', 'Credential'], ['hierarchy', 'Reporting line']]]
];

function agentDetail(id, tab = 'builder') {
  const a = DB.agentById(id);
  if (!a) return UI.emptyState('bot', 'Worker not found', '', UI.btn(t('workers'), { href: '#/workers' }));
  const tabsHtml = `<div class="mb-5 flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-200">${AGENT_TABS.map(([grp, items]) =>
    `<div class="flex items-end gap-3"><span class="pb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">${grp}</span>${items.map(([k, l]) =>
      `<a href="#/workers/${a.id}/${k}" class="tab-link -mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium whitespace-nowrap text-slate-500 hover:text-slate-800 ${k === tab ? 'active' : ''}">${l}</a>`).join('')}</div>`).join('')}</div>`;

  const header = `<div class="mb-1 text-xs text-slate-500"><a href="#/workers" class="hover:text-slate-800">${t('studio')} › ${t('workers')}</a> › ${a.name}</div>
    <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div><div class="flex flex-wrap items-center gap-2"><h1 class="text-xl font-semibold text-slate-900">${a.name}</h1>${a.name_ar ? `<span class="text-slate-400">${a.name_ar}</span>` : ''}${UI.status(a.status)}${UI.audience(a.audience)}</div>
        <p class="mt-1 font-mono text-xs text-slate-500">${a.key} · v${a.version} · ${a.released ? 'released' : 'draft'}</p></div>
      <div class="flex flex-wrap gap-2">
        ${UI.btn('Chat', { icon: 'message-square', href: '#/work' })}
        <div class="relative">${UI.btn('Recall', { icon: 'brain', onclick: () => UI.modal({ title: 'Memory · ' + a.name, body: `<div class="space-y-2">${['Prefers Arabic replies for complaint follow-ups (user)', 'Licence renewal fee is 150 AED as of 2026 (agent)', 'Escalate fee waivers to section manager (agent)'].map(m => `<div class="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">${m}${UI.iconBtn('trash-2', () => UI.toast('Memory deleted'))}</div>`).join('')}</div>`, footer: UI.btn('Clear scope…', { variant: 'danger-ghost' }) + UI.btn('Add memory', { icon: 'plus', variant: 'primary', onclick: () => UI.toast('Memory added (mock)') }) }) })}</div>
        ${UI.btn('Run once', { icon: 'play', onclick: () => UI.modal({ title: 'Run once · ' + a.name, body: UI.field('Input', UI.textarea('', 'placeholder="Plain text or JSON input for a manual run"', 5)), footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn('Start run', { variant: 'primary', icon: 'play', onclick: () => { UI.closeOverlay(); UI.toast('Run started · origin manual'); } }) }) })}
        ${UI.btn(t('release'), { icon: 'upload-cloud', variant: 'primary', onclick: () => releaseDialog(a) })}
        ${UI.btn('', { icon: 'more-horizontal', onclick: () => UI.modal({ title: 'More actions', size: 'sm', body: `<div class="flex flex-col gap-1">${[['copy', 'Duplicate'], ['download', 'Export blueprint JSON'], ['archive', 'Archive'], ['trash-2', 'Delete']].map(([ic, l]) => `<button class="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50 ${l === 'Delete' ? 'text-rose-600' : ''}" onclick="UI.closeOverlay();UI.toast('${l} (mock)')">${UI.icon(ic)}${l}</button>`).join('')}</div>` }) })}
      </div></div>`;

  const body = { builder: builderTab, playground: playgroundTab, versions: versionsTab, effective: effectiveTab, experiments: evalParked, simulations: evalParked, quality: evalParked,
    triggers: agentTriggersTab, systems: systemsTab, embed: embedTab, a2a: a2aTab, map: agentMapTab, identity: identityTab, hierarchy: hierarchyTab }[tab] || builderTab;
  const r = body(a, tab);
  return typeof r === 'string' ? header + tabsHtml + r : { html: header + tabsHtml + r.html, after: r.after };
}

// Builder, test panel and release flow live in agent-builder.js

// ---- Sandbox (F-BLD-06)
function playgroundTab(a) {
  const variants = [['Variant A', 'gpt-4.1-mini', '0.5'], ['Variant B', 'gpt-4.1', '0.2']];
  return `${UI.card(`<div class="p-4"><p class="mb-3 text-sm text-slate-500">Compare prompt and model variants on one sample input before you release. Runs are single-turn and ephemeral — nothing is saved except metering.</p>
    ${UI.field('Sample input', UI.textarea('What documents do I need to renew a trade licence?', '', 2))}</div>`)}
    <div class="mt-4 grid gap-4 md:grid-cols-2" id="pg">${variants.map(([n, mo, te]) => UI.card(`<div class="space-y-3 p-4">
      ${UI.field('Name', UI.input(n))}${UI.field('System prompt override', UI.textarea('', 'placeholder="Blank = agent\'s resolved prompt"', 3))}
      <div class="grid grid-cols-2 gap-3">${UI.field('Model', UI.select(DB.models.map(x => x.id), mo))}${UI.field('Temperature', UI.input(te, 'type="number" step="0.1"'))}</div>
      <div class="pg-out hidden rounded-md bg-slate-50 p-3 text-sm"><p>You need: (1) the current licence, (2) Emirates ID copy, (3) tenancy contract. Fee: 150 AED. <span class="text-brand-600">[01-service-catalogue.pdf #12]</span></p>
        <div class="mt-2 flex gap-3 text-[11px] text-slate-500"><span>${mo === 'gpt-4.1' ? '1,512' : '1,104'} tokens</span><span>${mo === 'gpt-4.1' ? '2.31s' : '1.12s'}</span><span>$${mo === 'gpt-4.1' ? '0.0094' : '0.0012'}</span></div></div></div>`)).join('')}</div>
    <div class="mt-4 flex gap-2">${UI.btn('Add variant', { icon: 'plus' })}${UI.btn('Run all', { icon: 'play', variant: 'primary', onclick: () => document.querySelectorAll('.pg-out').forEach(e => e.classList.remove('hidden')) })}</div>`;
}

// ---- Releases (F-BLD-07)
function versionsTab(a) {
  return UI.card(UI.table(['Release', 'State', 'Released at', 'Changelog', ''], [
    [`<span class="font-mono">v${a.version + 1}</span>`, UI.badge('working copy', 'amber'), '—', '<span class="text-slate-400">Unreleased changes</span>', ''],
    ...DB.versions.map(v => [`<span class="font-mono">v${v.v}</span>`, UI.status(v.state), v.at, v.note,
      `<div class="flex justify-end gap-1">${UI.btn('View', { size: 'sm', variant: 'ghost', onclick: () => diffModal(v) })}${UI.btn('Restore as working copy', { size: 'sm', variant: 'ghost', onclick: () => UI.toast(`v${v.v} restored as draft`) })}${v.state !== 'active' ? UI.btn('Release this version', { size: 'sm', onclick: () => UI.confirm('Roll back?', `Release v${v.v} as the new active version. This is audited.`, () => UI.toast(`Rolled back to v${v.v}`), 'Release', false) }) : ''}</div>`])
  ], { footer: false }));
}
function diffModal(v) {
  const lines = [[' ', '"model": {'], ['-', '  "model": "gpt-4.1",'], ['+', '  "model": "gpt-4.1-mini",'], [' ', '  "temperature": 0.5,'], [' ', '},'], [' ', '"knowledge": {'], ['-', '  "bases": [],'], ['+', '  "bases": ["citizen-services-handbook"],'], [' ', '  "citations": "required"'], [' ', '}']];
  UI.modal({ title: `v${v.v} · read-only blueprint`, sub: 'Diff vs previous version', size: 'lg', body: `<pre class="json-editor overflow-x-auto rounded-md bg-slate-50 p-3" dir="ltr">${lines.map(([s, l]) => `<div class="${s === '+' ? 'bg-emerald-50 text-emerald-800' : s === '-' ? 'bg-rose-50 text-rose-800' : ''}">${s} ${UI.esc(l)}</div>`).join('')}</pre>` });
}

// ---- Resolved settings (F-BLD-08)
function effectiveTab(a) {
  const rows = [['model.model', a.model, 'blueprint'], ['model.temperature', '0.5', 'blueprint'], ['guardrails.policy', 'baseline', `unit · ${DB.nodeById(a.node)?.name}`],
    ['knowledge.bases', 'citizen-services-handbook', 'blueprint'], ['budget.max_cost_per_run', '$1.00', 'workspace default'], ['risk.classification', 'internal', 'unit · Citizen Services'],
    ['memory.enabled', 'true', 'blueprint'], ['code_execution.enabled', 'false', 'workspace capability (off)'], ['tools.builtin', 'memory.save, recall.search, playbooks.search, playbooks.apply, kb.search', 'platform default']];
  const tone = s => s.startsWith('blueprint') ? 'indigo' : s.startsWith('org') ? 'violet' : s.startsWith('workspace') ? 'blue' : 'gray';
  return `<p class="mb-3 text-sm text-slate-500">Fully resolved configuration: workspace defaults → org tree (root → node) → released blueprint. The source of each value is shown.</p>` +
    UI.card(UI.table(['Key', 'Effective value', 'Source'], rows.map(([k, v, s]) => [`<span class="font-mono text-xs">${k}</span>`, `<span class="font-mono text-xs">${v}</span>`, UI.badge(s, tone(s))]), { footer: false }));
}

function evalParked(a, tab) {
  return UI.parkedBanner('F-BLD-16 · F-QLT-03/04/05') + UI.card(UI.emptyState(tab === 'experiments' ? 'split' : tab === 'simulations' ? 'users' : 'line-chart', `${tab[0].toUpperCase() + tab.slice(1)} for ${a.name}`,
    tab === 'experiments' ? 'Roll a new version out to a percentage of traffic. You need at least two released versions (a control and a variant).' : tab === 'simulations' ? 'Define a synthetic-user persona that drives a multi-turn conversation, then score the transcript.' : 'Eval scores, sampled live scores and supervisor reviews by version.',
    UI.btn('Create an test suite for this worker', { href: '#/test-suites' })));
}

// ---- Connect tabs
function agentTriggersTab(a) {
  return `<div class="mb-3 flex items-center justify-between"><div class="flex items-center gap-3">${UI.tabs([{ key: 'all', label: 'All', count: 2 }, { key: 'wh', label: 'Webhook', count: 1 }, { key: 'sc', label: 'Schedule', count: 1 }], 'all', () => {})}</div>${UI.btn('New trigger', { icon: 'plus', variant: 'primary', onclick: newTriggerModal })}</div>
    <p class="mb-3 text-xs text-slate-500">Webhook URLs accept POST with the tenant secret.</p>` +
    UI.card(UI.table(['Trigger', 'Type', 'Last fire', 'Next fire', 'Recent', 'Enabled'], [
      ['Portal report filed', UI.badge('webhook', 'blue'), '12 min ago', '—', '<span class="text-emerald-600">●●●●</span><span class="text-rose-500">●</span>', UI.toggle(true, () => UI.toast('Trigger paused'))],
      ['Weekday morning digest', UI.badge('schedule', 'violet'), 'today 08:00', 'tomorrow 08:00 · Asia/Dubai', '<span class="text-emerald-600">●●●●●</span>', UI.toggle(true, () => UI.toast('Trigger paused'))]
    ], { footer: false }));
}
function newTriggerModal() {
  UI.modal({ title: 'New trigger', body: `<div class="grid gap-4">${UI.field('Target', UI.select(['Worker · this worker', ...DB.workflows.map(w => 'Flow · ' + w.name)]))}
    ${UI.field('Type', UI.select([['webhook', 'Webhook — generated URL + HMAC secret'], ['schedule', 'Schedule — cron + timezone'], ['once', 'One-off — date/time']]))}
    <div class="grid grid-cols-2 gap-3">${UI.field('Cron', UI.input('0 8 * * 1-5', 'class="font-mono"'))}${UI.field('Timezone', UI.select(['Asia/Dubai', 'UTC', 'Europe/London']))}</div>
    ${UI.field('Input template', UI.textarea('{ "report": "{{payload.text}}" }', 'class="font-mono"', 3), 'Maps the webhook payload to run input.')}
    ${UI.toggle(true, () => {}, 'Enabled')}</div>`, footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn(t('create'), { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Trigger created'); } }) });
}
function systemsTab(a) {
  return UI.card(UI.table(['System', 'Kind', 'Access', 'Last activity', ''], [
    ['Gov ERP · incident.get', UI.badge('MCP tool', 'indigo'), UI.badge('granted', 'green'), '3 min ago', ''],
    ['Gov ERP · dispatch.commit', UI.badge('MCP tool', 'indigo'), UI.badge('no access', 'red'), '—', UI.btn('Give access', { size: 'sm', onclick: () => UI.toast('Access given') })],
    ['Citizen Services Handbook', UI.badge('Library collection', 'violet'), UI.badge('attached', 'green'), '2 min ago', ''],
    ['Partner agency worker', UI.badge('Remote worker', 'blue'), UI.badge('granted', 'green'), '2 days ago', '']
  ], { footer: false }));
}
function embedTab(a) {
  return `<div class="grid gap-5 lg:grid-cols-2">${UI.card(UI.cardHeader('Widget keys', UI.btn('Create key', { size: 'sm', icon: 'plus', variant: 'primary' }), 'Origin-bound public keys') + UI.table(['Key', 'Allowed origins', ''], [
    ['<span class="font-mono text-xs">pk_live_4b9e…21ac</span>', 'https://services.acme.gov', `<div class="flex gap-1">${UI.btn('Rotate', { size: 'sm', variant: 'ghost' })}${UI.btn('Revoke', { size: 'sm', variant: 'danger-ghost' })}</div>`]], { footer: false }))}
    ${UI.card(UI.cardHeader('Embed snippet') + `<div class="p-4 space-y-3"><pre class="json-editor overflow-x-auto rounded-md bg-slate-900 p-3 text-slate-100" dir="ltr">&lt;script src="https://cdn.agents.example/widget.js"
  data-key="pk_live_4b9e…21ac"
  data-agent="${a.key}"
  data-lang="ar" data-theme="light"&gt;&lt;/script&gt;</pre>
    <div class="grid grid-cols-2 gap-3">${UI.field('Theme', UI.select(['light', 'dark', 'auto']))}${UI.field('Language', UI.select(['ar', 'en', 'auto']))}</div></div>`)}</div>`;
}
function a2aTab(a) {
  return UI.card(`<div class="space-y-4 p-4">${UI.toggle(false, () => UI.toast('Open to partner workers updated'), 'Expose this worker as an A2A server')}
    ${UI.field('Worker Card URL', UI.input(`https://api.agents.example/a2a/${a.key}/.well-known/agent.json`, 'readonly class="font-mono"'))}
    ${UI.field('Allowed callers', UI.textarea('partner-agent\nministry-of-interior/case-bot', '', 3), 'One remote worker or tenant per line.')}
    ${UI.checkbox(false, 'Allow any caller')}<p class="text-xs text-slate-500">Calls received are runs with origin <span class="font-mono">a2a</span>.</p></div>`);
}
function agentMapTab(a) {
  const rel = [['Unit', DB.nodeById(a.node)?.name], ['Supervisor', a.reportsTo ? DB.agentById(a.reportsTo).name : '—'], ['Tools', 'gov-erp · kb.search'], ['KBs', 'Handbook'], ['Flows', 'Report to Dispatch'], ['Squads', 'Incident Response'], ['Channels', 'Citizen WhatsApp'], ['A2A callers', 'partner-agent']];
  const cx = 450, cy = 190, R = 150;
  return UI.card(`<svg viewBox="0 0 900 380" class="w-full" style="height:380px">${rel.map(([k, v], i) => { const ang = (i / rel.length) * Math.PI * 2; const x = cx + Math.cos(ang) * R * 1.9, y = cy + Math.sin(ang) * R;
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#cbd5e1"/><rect x="${x - 80}" y="${y - 20}" width="160" height="40" rx="8" fill="#fff" stroke="#cbd5e1"/><text x="${x}" y="${y - 3}" text-anchor="middle" font-size="10" fill="#64748b">${k}</text><text x="${x}" y="${y + 12}" text-anchor="middle" font-size="12" fill="#0f172a">${v}</text>`; }).join('')}
    <rect x="${cx - 100}" y="${cy - 22}" width="200" height="44" rx="10" fill="#0d8a79"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="13" font-weight="600" fill="#fff">${a.name}</text></svg>`);
}

// ---- Access tabs
function identityTab(a) {
  return `<div class="grid gap-5 lg:grid-cols-3">${UI.card(`<div class="p-4"><div class="flex items-center justify-between"><h3 class="text-sm font-semibold">Worker credential</h3>${UI.status(a.status === 'suspended' ? 'suspended' : 'active')}</div>
    <p class="mt-2 text-xs text-slate-500">This worker's verifiable ID — what proves who it is and what it may do. Technically: capability tokens signed by the active signing key, required by the Action guard when enforcement is on.</p>
    <dl class="mt-4 space-y-2 text-sm">${[['Active key id', '<span class="font-mono text-xs">kid_ed25519_7Hq2…</span>'], ['Keys (incl. retired)', '3'], ['Created', '2026-09-18']].map(([k, v]) => `<div class="flex justify-between"><dt class="text-slate-500">${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <div class="mt-4 flex flex-wrap gap-2">${UI.btn('Rotate key', { size: 'sm', icon: 'rotate-cw', onclick: () => UI.toast('Key rotated') })}${UI.btn('Suspend', { size: 'sm', icon: 'pause-circle', onclick: () => UI.confirm('Suspend worker credential?', 'Kill-switch: all tool calls are refused immediately and running runs are paused safely.', () => { a.status = 'suspended'; APP.render(); UI.toast('Identity suspended'); }, 'Suspend') })}${UI.btn('Revoke', { size: 'sm', variant: 'danger-ghost', onclick: () => UI.confirm('Revoke identity?', 'Revocation is permanent.', () => UI.toast('Identity revoked'), 'Revoke') })}</div></div>`)}
    <div class="lg:col-span-2 space-y-5">${UI.card(UI.cardHeader('Issued capabilities', UI.btn('Refresh', { size: 'sm', icon: 'refresh-cw', variant: 'ghost' })) + UI.table(['Scope', 'Depth', 'Issued', 'Expires', t('status')], [
      ['<span class="font-mono text-xs">tool:gov-erp/incident.get</span>', '0', '14:02:11', '14:07:11', UI.badge('active', 'green')],
      ['<span class="font-mono text-xs">tool:kb.search</span>', '0', '14:02:10', '14:07:10', UI.badge('active', 'green')],
      ['<span class="font-mono text-xs">delegate:incident-enrichment</span>', '1', '13:41:55', '13:46:55', UI.badge('expired', 'gray')]], { footer: false }))}
      ${UI.card(UI.cardHeader('Spend mandates', UI.btn('Open payments', { size: 'sm', href: '#/spend' })) + UI.emptyState('wallet', 'No mandates', 'This worker cannot move money. Payments require the workspace capability and the blueprint switch.'))}</div></div>`;
}
function hierarchyTab(a) {
  const others = DB.agents.filter(x => x.id !== a.id);
  return { html: UI.card(`<div class="max-w-lg space-y-4 p-4">
    ${UI.field('Seniority', UI.select(['member', 'senior', 'lead', 'executive'], a.level, 'id="h-level"'))}
    ${UI.field('Supervisor', UI.select([['', '— none —'], ...others.map(x => [x.id, x.name])], a.reportsTo || '', 'id="h-reports"'), 'The hierarchy must be acyclic. Used by Chart view, delegation and escalation.')}
    <div id="h-err" class="hidden rounded-md bg-rose-50 p-2 text-sm text-rose-700"></div>
    ${UI.btn(t('save'), { variant: 'primary', onclick: () => {
      const to = document.getElementById('h-reports').value || null;
      let cur = to, cyc = false; while (cur) { if (cur === a.id) { cyc = true; break; } cur = DB.agentById(cur)?.reportsTo; }
      const err = document.getElementById('h-err');
      if (cyc) { err.textContent = 'This would create a cycle in the hierarchy.'; err.classList.remove('hidden'); return; }
      a.reportsTo = to; a.level = document.getElementById('h-level').value; UI.toast('Hierarchy saved');
    } })}</div>`) };
}

PAGES.workers = function (params) {
  if (params[0]) return agentDetail(params[0], params[1]);
  return agentsList();
};
