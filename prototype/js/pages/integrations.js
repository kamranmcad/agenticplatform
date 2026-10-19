// BUILD › Connectors (F-INT-01 … F-INT-04): type-specific add wizard, tool discovery, grant matrix,
// health checks, activity, and a Action guard explainer per call.
const INT = { tab: 'all', q: '', status: 'all', x: {} };
const TOOL_DESC = { 'incident.get': ['Fetch an incident by id', '{ "id": "string" }'], 'patrol.list_available': ['List available patrol units near a zone', '{ "zone": "string", "limit": "number?" }'],
  'dispatch.commit': ['Commit a unit to an incident (irreversible)', '{ "incident_id": "string", "unit": "string" }'], 'objection.get': ['Get an objection case', '{ "id": "string" }'], 'objection.decide': ['Record a decision on an objection', '{ "id": "string", "decision": "uphold|cancel" }'],
  'query.read': ['Run a read-only SQL query', '{ "sql": "string", "params": "array?" }'], 'query.execute': ['Run a write statement (always needs approval)', '{ "sql": "string" }'], 'site.query': ['Ask the indexed website a question', '{ "q": "string" }'], ask: ['Send a task to the remote worker', '{ "input": "string" }'], 'incident.update': ['Update incident fields', '{ "id": "string", "patch": "object" }'] };
const GW_STEPS = ['Resolve tool + check worker credential', 'Access check (organisation, unit or worker; a flow can narrow it)', 'Signed pass (scope, expiry, delegation depth)', 'Organisation-wide switches (both must allow)', 'Checkpoint rules (organisation and worker)', 'Safety rules on the request', 'Execute (credential injected, SSRF guard, timeout, retries)', 'Safety rules on the result, size limits, masking', 'Log the step, trail entry and cost'];
const ERRORS = { i5: { code: 'A2A_CARD_UNREACHABLE', msg: 'GET https://partner.example.org/.well-known/agent.json → 503 Service Unavailable (3 retries)', hint: 'The partner endpoint is down. Retry later or contact the partner. Runs that call this worker fail fast and escalate.' } };

// ---------- Per-integration detail (lazy) ----------
function X(i) {
  if (INT.x[i.id]) return INT.x[i.id];
  const grants = {};
  i.tools.forEach(tl => { grants[tl] = new Set(GRANTS[tl] || []); });
  if (i.id === 'i1') grants['incident.get'].add('ws');
  grants['*'] = new Set();
  const acts = i.id === 'i1' ? [
    { at: '14:02:11', tool: 'incident.get', worker: 'a2', status: 'succeeded', ms: 214, run: '7c1a08', stop: null },
    { at: '14:02:13', tool: 'patrol.list_available', worker: 'a3', status: 'succeeded', ms: 388, run: '7c1a08', stop: null, note: { 7: 'PII masked in output: 1 phone number' } },
    { at: '14:02:20', tool: 'dispatch.commit', worker: 'a5', status: 'waiting approval', ms: null, run: '7c1a08', stop: [4, 'wait', 'Matched policy "Dispatch commits" (high) · waiting for Node manager · SLA 30 min'] },
    { at: '13:51:02', tool: 'dispatch.commit', worker: 'a1', status: 'refused', ms: 3, run: '9f3e21', stop: [1, 'fail', 'No grant for Citizen Request Assistant on gov-erp/dispatch.commit'] },
    { at: '13:12:40', tool: 'incident.get', worker: 'a7', status: 'refused', ms: 1, run: '2b77d4', stop: [0, 'fail', 'Worker credential is suspended (kill-switch) — all tool calls refused'] }]
    : i.id === 'i2' ? [{ at: '12:40:05', tool: 'query.read', worker: 'a3', status: 'succeeded', ms: 96, run: '5d0e11', stop: null }, { at: '12:41:10', tool: 'query.execute', worker: 'a3', status: 'refused', ms: 2, run: '5d0e11', stop: [3, 'fail', 'Writes are disabled on connector registry-db'] }]
    : i.tools.length ? [{ at: '09:15:44', tool: i.tools[0], worker: 'a1', status: 'succeeded', ms: 420, run: '81aa02', stop: null }] : [];
  return (INT.x[i.id] = {
    tools: i.tools.map(tl => ({ name: tl, desc: (TOOL_DESC[tl] || ['Tool'])[0], schema: (TOOL_DESC[tl] || [, '{}'])[1], enabled: true, risk: (typeof TOOL_RISK !== 'undefined' && TOOL_RISK[tl]) || 'low' })),
    grants, error: ERRORS[i.id] || null, acts, health: Array.from({ length: 24 }, (_, k) => i.status === 'Error' && k > 19 ? 'err' : i.status === 'Healthy' ? 'ok' : 'none'),
    connections: i.group === 'tools' || i.group === 'agents' ? [{ name: 'prod', cred: `${i.key}.${i.type === 'Database' ? 'password' : 'bearer'}`, status: i.status }, { name: 'staging', cred: `${i.key}.staging`, status: 'Not checked yet' }] : []
  });
}
const rerenderInt = () => { if (APP.route === 'connectors') { const y = scrollY; APP.render(); scrollTo(0, y); } };
const attention = i => ['Error', 'Not checked yet', 'Degraded'].includes(i.status);

function checkNow(i, quiet) {
  i.status = 'Checking…'; rerenderInt();
  return new Promise(res => setTimeout(() => {
    const x = X(i);
    if (i.id === 'i5') { i.status = 'Error'; x.error = ERRORS.i5; }
    else if (i.type === 'HTTP API credential') { i.status = 'Ready (no test)'; x.error = null; }
    else if (/Trigger/.test(i.type) && i.last === '—') i.status = 'Awaiting first event';
    else { i.status = 'Healthy'; x.error = null; }
    i.last = 'just now'; x.health.push(i.status === 'Error' ? 'err' : 'ok'); x.health.shift();
    if (!quiet) UI.toast(i.status === 'Error' ? `${i.name}: ${x.error.code}` : `${i.name}: ${i.status}`, i.status === 'Error' ? 'info' : 'ok');
    rerenderInt(); refreshDrawer(); res();
  }, 900));
}

// ---------- List ----------
PAGES.connectors = function () {
  const groups = [['all', 'All'], ['tools', 'Tools & data'], ['agents', 'Workers elsewhere'], ['channels', 'Channels'], ['automation', 'Automation'], ['knowledge', 'Library']];
  const rows = DB.integrations.filter(i => (INT.tab === 'all' || i.group === INT.tab) && (INT.status === 'all' || (INT.status === 'attention' ? attention(i) : i.status === INT.status)) && (!INT.q || (i.name + i.key + i.type).toLowerCase().includes(INT.q.toLowerCase())));
  const bad = DB.integrations.filter(attention);
  const rec = { 'MCP servers': DB.integrations.filter(i => i.type === 'MCP server').map(i => `${i.key} · https://${i.key}.acme.gov/mcp`), Connections: DB.integrations.flatMap(i => X(i).connections.map(c => `${i.key}/${c.name}`)),
    Grants: DB.integrations.flatMap(i => Object.entries(X(i).grants).flatMap(([tl, s]) => [...s].map(g => `${i.key}/${tl} → ${g === 'ws' ? 'Workspace' : DB.nodeById(g)?.name || DB.agentById(g)?.name || g}`))), Credentials: DB.secrets.map(s => s.name) };
  return UI.pageHeader(t('connectors'), 'Link your business systems, partner workers and touchpoints. A worker can only use a tool once you give it access.',
    UI.btn('API reference', { icon: 'book-open', onclick: () => UI.toast('Opens API docs (mock)') }) + UI.btn('Check all', { icon: 'activity', onclick: async () => { for (const i of DB.integrations.filter(x => x.group !== 'automation')) await checkNow(i, true); UI.toast('All connectors checked'); } }) + UI.btn('Add connector', { icon: 'plus', variant: 'primary', onclick: openAddIntegration }), UI.specTag('F-INT-01…04')) +
    `<div class="mb-4 flex flex-wrap items-center gap-2 rounded-lg border ${bad.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'} px-4 py-2.5 text-sm">${UI.icon(bad.length ? 'alert-triangle' : 'check-circle-2')}
      ${bad.length ? `${bad.length} need attention: ${bad.map(i => `<button class="underline" onclick="${UI.fn(() => integrationDrawer(i))}">${i.name}</button>`).join(', ')}` : 'All connectors are healthy'}</div>` +
    `<div class="mb-4">${UI.tabs(groups.map(([k, l]) => ({ key: k, label: l, count: DB.integrations.filter(i => k === 'all' || i.group === k).length })), INT.tab, k => { INT.tab = k; rerenderInt(); })}</div>` +
    UI.card(`<div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3"><div class="relative w-64">${UI.icon('search', 'w-4 h-4 absolute start-3 top-2.5 text-slate-400')}<input class="${UI.inputCls} ps-9" placeholder="Search connectors" value="${UI.esc(INT.q)}" onchange="${UI.fn(e => { INT.q = e.target.value; rerenderInt(); })}"/></div>
      <div class="w-48">${UI.select([['all', 'All statuses'], ['attention', 'Needs attention'], ['Healthy', 'Healthy'], ['Error', 'Error'], ['Awaiting first event', 'Awaiting first event']], INT.status, `onchange="${UI.fn(e => { INT.status = e.target.value; rerenderInt(); })}"`)}</div></div>` +
    UI.table(['Connector', 'Type', t('status'), 'Tools', 'Used by', 'Last activity', ''], rows.map(i => ({ onclick: () => integrationDrawer(i), cells: [
      `<div class="font-medium">${i.name}</div><div class="font-mono text-xs text-slate-500">${i.key}</div>`, `<div>${i.type}</div><div class="text-[11px] text-slate-500">${i.transport} · ${i.auth}</div>`,
      i.status === 'Checking…' ? UI.badge(UI.icon('loader-2', 'w-3 h-3 animate-spin') + 'checking', 'blue') : UI.status(i.status) + (X(i).error ? `<div class="mt-1 font-mono text-[10px] text-rose-600">${X(i).error.code}</div>` : ''),
      X(i).tools.length ? `${X(i).tools.filter(x => x.enabled).length} / ${X(i).tools.length}` : '—', i.usedBy ? `${i.usedBy} agent${i.usedBy > 1 ? 's' : ''}` : '—', i.last,
      `<div class="flex justify-end gap-1" onclick="event.stopPropagation()">${UI.btn(t('test'), { size: 'sm', variant: 'ghost', disabled: i.status === 'Checking…', onclick: () => checkNow(i) })}${UI.btn(t('open'), { size: 'sm', onclick: () => integrationDrawer(i) })}</div>`] })), { total: DB.integrations.length })) +
    `<details class="mt-4 rounded-lg border border-slate-200 bg-white"><summary class="cursor-pointer px-4 py-3 text-sm font-medium">Raw records</summary><div class="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-2">
      ${Object.entries(rec).map(([h, l]) => `<div><div class="mb-1 text-xs font-semibold uppercase text-slate-400">${h} <span class="font-normal">(${l.length})</span></div><ul class="max-h-48 space-y-1 overflow-y-auto font-mono text-xs scrollbar-thin">${l.map(x => `<li>${UI.esc(x)}</li>`).join('')}</ul></div>`).join('')}</div></details>`;
};

// ---------- Grant matrix ----------
const GRANT_COLS = () => [['ws', 'Organisation'], ...DB.orgNodes.filter(n => n.type === 'department').map(n => [n.id, n.name]), ...DB.agents.map(a => [a.id, a.name])];
function grantMatrixHtml(x, tools, editable = true) {
  const cols = GRANT_COLS();
  return `<div class="overflow-x-auto rounded-md border border-slate-200 scrollbar-thin"><table class="text-xs"><thead class="bg-slate-50"><tr><th class="sticky start-0 bg-slate-50 px-3 py-2 text-start">Tool</th>${cols.map(([k, l], ci) => `<th class="px-2 py-2 font-medium ${ci === 0 ? 'text-brand-700' : ci <= 3 ? 'text-violet-700' : ''}" title="${l}"><div class="w-16 truncate">${l}</div><div class="text-[9px] font-normal text-slate-400">${ci === 0 ? 'all workers' : ci <= 3 ? 'unit' : 'agent'}</div></th>`).join('')}</tr></thead>
    <tbody>${['*', ...tools].map(tl => `<tr class="border-t border-slate-100"><td class="sticky start-0 bg-white px-3 py-2 font-mono">${tl === '*' ? '* <span class="font-sans text-[10px] text-slate-400">every tool</span>' : tl}</td>${cols.map(([k]) => `<td class="px-2 py-2 text-center"><input type="checkbox" data-g="${tl}|${k}" ${x.grants[tl]?.has(k) ? 'checked' : ''} ${editable ? '' : 'disabled'} class="rounded text-brand-600"/></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function readMatrix(root, x) {
  root.querySelectorAll('[data-g]').forEach(c => { const [tl, k] = c.dataset.g.split('|'); (x.grants[tl] = x.grants[tl] || new Set())[c.checked ? 'add' : 'delete'](k); });
  Object.entries(x.grants).forEach(([tl, s]) => { if (tl !== '*') GRANTS[tl] = [...s].filter(k => DB.agentById(k)); });
}

// ---------- Drawer ----------
let DRAWER = null;
function refreshDrawer() { if (DRAWER && document.getElementById('idr')) DRAWER(); }
function integrationDrawer(i) {
  const st = { tab: 'overview', act: null };
  const wrap = UI.drawer({ title: `<div class="flex items-center gap-2"><h2 class="text-base font-semibold">${i.name}</h2><span id="idr-status"></span></div>`, sub: `${i.type} · ${i.transport} · ${i.auth}`, width: 'max-w-4xl', body: '<div id="idr"></div>',
    footer: UI.btn('Disable', { variant: 'ghost', onclick: () => { i.status = 'Disabled'; UI.closeOverlay(); rerenderInt(); UI.toast('Connector disabled — its tools are refused at the gateway'); } }) + UI.btn(t('delete'), { variant: 'danger-ghost', onclick: () => UI.confirm('Delete connector?', `Removes ${i.name}, its connections and ${Object.values(X(i).grants).reduce((s, g) => s + g.size, 0)} grants. Workers that declare its tools will fail those calls.`, () => { DB.integrations = DB.integrations.filter(z => z !== i); UI.closeAll(); rerenderInt(); UI.toast('Connector deleted'); }, t('delete')) }) + UI.btn('Check now', { icon: 'refresh-cw', variant: 'primary', onclick: () => checkNow(i) }) });
  const el = wrap.querySelector('#idr'); const x = X(i);
  const tabs = [['overview', 'Overview'], ...(x.tools.length ? [['tools', 'Tools']] : []), ...(x.tools.length ? [['grants', 'Access']] : []), ['connections', 'Connections'], ['automation', 'Automation'], ['activity', 'Activity']];
  function draw() {
    wrap.querySelector('#idr-status').innerHTML = i.status === 'Checking…' ? UI.badge('checking…', 'blue') : UI.status(i.status);
    const users = DB.agents.filter(a => i.tools.some(tl => (GRANTS[tl] || []).includes(a.id)));
    let body = '';
    if (st.tab === 'overview') body = `${x.error ? `<div class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm"><div class="flex items-center gap-2 font-semibold text-rose-800">${UI.icon('octagon-x')} <span class="font-mono">${x.error.code}</span></div><div class="mt-1 font-mono text-xs text-rose-700">${UI.esc(x.error.msg)}</div><div class="mt-2 flex items-start gap-1.5 text-xs text-rose-800">${UI.icon('lightbulb', 'w-3.5 h-3.5 mt-0.5')}${UI.esc(x.error.hint)}</div></div>` : ''}
      <dl class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">${[['Endpoint', `<span class="font-mono text-xs">https://${i.key}.acme.gov${i.type === 'MCP server' ? '/mcp' : ''}</span>`], ['Transport', i.transport], ['Authentication', i.auth], ['Last check', i.last], ['Used by', users.length ? users.map(a => a.name).join(', ') : '—'], ['Credential', `<span class="font-mono text-xs">${x.connections[0]?.cred || '—'}</span> <span class="text-[11px] text-slate-400">(write-only)</span>`]].map(([k, v]) => `<div><dt class="text-xs text-slate-500">${k}</dt><dd class="mt-0.5">${v}</dd></div>`).join('')}</dl>
      <div class="mt-5"><div class="mb-1 flex justify-between text-xs text-slate-500"><span>Health · last 24 checks</span><span>${x.health.filter(h => h === 'ok').length}/24 ok</span></div><div class="flex gap-0.5">${x.health.map(h => `<span class="h-6 flex-1 rounded-sm ${h === 'ok' ? 'bg-emerald-400' : h === 'err' ? 'bg-rose-400' : 'bg-slate-200'}"></span>`).join('')}</div></div>`;
    if (st.tab === 'tools') body = `<div class="mb-3 flex items-center justify-between"><p class="text-xs text-slate-500">Tools discovered from the server. Disabled tools are refused at the gateway even when granted.</p>${UI.btn('Refresh tools', { size: 'sm', icon: 'refresh-cw', onclick: () => { if (i.type === 'MCP server' && !x.tools.some(t2 => t2.name === 'incident.update')) { x.tools.push({ name: 'incident.update', desc: TOOL_DESC['incident.update'][0], schema: TOOL_DESC['incident.update'][1], enabled: false, risk: 'high', isNew: true }); i.tools.push('incident.update'); x.grants['incident.update'] = new Set(); UI.toast('1 new tool discovered — disabled until you review it'); } else UI.toast('No changes'); draw(); } })}</div>
      <div class="divide-y divide-slate-100 rounded-md border border-slate-200">${x.tools.map((tl, k) => `<div class="p-3"><div class="flex flex-wrap items-center gap-2"><span class="font-mono text-sm">${tl.name}</span>${tl.isNew ? UI.badge('new', 'blue') : ''}<span class="text-xs text-slate-500">${tl.desc}</span>
        <span class="ms-auto flex items-center gap-2"><select data-risk="${k}" class="rounded border border-slate-300 px-1.5 py-0.5 text-xs">${['low', 'medium', 'high', 'critical'].map(r => `<option ${tl.risk === r ? 'selected' : ''}>${r}</option>`).join('')}</select><input type="checkbox" role="switch" class="switch" data-en="${k}" ${tl.enabled ? 'checked' : ''}/></span></div>
        <details class="mt-1"><summary class="cursor-pointer text-[11px] text-brand-600">Input schema</summary><pre class="json-editor mt-1 rounded bg-slate-50 p-2 text-[11px]" dir="ltr">${UI.esc(tl.schema)}</pre></details></div>`).join('')}</div>`;
    if (st.tab === 'grants') body = `<p class="mb-3 text-xs text-slate-500">Rows are tools; columns are the workspace, units (apply to every worker beneath) and individual workers. A worker also has to declare the tool in its blueprint. Flows can narrow these grants per step, never widen them.</p>
      <div id="gm">${grantMatrixHtml(x, x.tools.map(z => z.name))}</div><div class="mt-3 flex gap-2">${UI.btn('Save access', { variant: 'primary', size: 'sm', onclick: () => { readMatrix(el.querySelector('#gm'), x); i.usedBy = DB.agents.filter(a => i.tools.some(tl => (GRANTS[tl] || []).includes(a.id))).length; rerenderInt(); draw(); UI.toast('Grants saved · audited'); } })}${UI.btn('Revoke all', { variant: 'danger-ghost', size: 'sm', onclick: () => UI.confirm('Remove all access?', 'Every worker loses access to these tools immediately.', () => { el.querySelectorAll('[data-g]').forEach(c => c.checked = false); readMatrix(el, x); i.usedBy = 0; rerenderInt(); draw(); }, 'Revoke') })}</div>`;
    if (st.tab === 'connections') body = `<div class="mb-3 flex justify-end">${UI.btn('Add connection', { size: 'sm', icon: 'plus', onclick: () => { x.connections.push({ name: 'env-' + (x.connections.length + 1), cred: `${i.key}.env${x.connections.length + 1}`, status: 'Not checked yet' }); draw(); } })}</div>` + UI.table(['Connection', 'Credential ref', t('status')], x.connections.map(c => [c.name, `<span class="font-mono text-xs">${c.cred}</span>`, UI.status(c.status)]), { footer: false, empty: UI.emptyState('link', 'No connections', 'This type has no per-environment connections.') });
    if (st.tab === 'automation') body = i.id === 'i1' ? UI.table(['Bound to', 'Kind', 'Target'], [['incident.created event', 'Trigger (webhook)', 'Flow · Report to Dispatch']], { footer: false }) : UI.emptyState('zap', 'No triggers or webhooks bound', 'Bind a trigger to start runs from this integration\'s events.');
    if (st.tab === 'activity') body = (x.acts.length ? `<p class="mb-3 text-xs text-slate-500">Every call passes the Action guard. Click a call to see each enforcement step.</p>` + UI.table(['Time', 'Tool', 'Worker', t('status'), 'Latency', 'Run'], x.acts.map((a, k) => ({ onclick: () => { st.act = st.act === k ? null : k; draw(); }, cells: [a.at, `<span class="font-mono text-xs">${a.tool}</span>`, DB.agentById(a.agent)?.name || a.agent, UI.badge(a.status, a.status === 'succeeded' ? 'green' : a.status === 'refused' ? 'red' : 'amber'), a.ms != null ? a.ms + 'ms' : '—', `<a href="#/executions" onclick="event.stopPropagation()" class="font-mono text-xs text-brand-600">${a.run}</a>`] })), { footer: false }) + (st.act != null ? gatewayTrace(x.acts[st.act]) : '') : UI.emptyState('activity', 'No calls yet', ''));
    el.innerHTML = `<div class="mb-4" id="idr-tabs"></div>${body}`;
    el.querySelector('#idr-tabs').innerHTML = UI.tabs(tabs.map(([k, l]) => ({ key: k, label: l, count: k === 'tools' ? x.tools.length : k === 'activity' ? x.acts.length : undefined })), st.tab, k => { st.tab = k; st.act = null; draw(); });
    el.querySelectorAll('[data-en]').forEach(c => c.onchange = () => { x.tools[+c.dataset.en].enabled = c.checked; x.tools[+c.dataset.en].isNew = false; rerenderInt(); UI.toast(`${x.tools[+c.dataset.en].name} ${c.checked ? 'enabled' : 'disabled'}`); });
    el.querySelectorAll('[data-risk]').forEach(s => s.onchange = () => { x.tools[+s.dataset.risk].risk = s.value; if (typeof TOOL_RISK !== 'undefined') TOOL_RISK[x.tools[+s.dataset.risk].name] = s.value; UI.toast('Risk tier updated — approval policies match on it'); });
    UI.refreshIcons();
  }
  DRAWER = draw; draw();
}
function gatewayTrace(a) {
  const [at, how, why] = a.stop || [99];
  const notes = { 0: `Worker ${DB.agentById(a.agent)?.name} · identity active`, 1: `Access found for ${a.tool}`, 2: 'Token kid_ed25519_7Hq2 · scope covers tool · expires in 4m', 3: 'No capability switch needed', 4: 'No policy matched · checkpoint: auto with safety net', 5: 'No PII or injection in arguments', 6: `${a.ms}ms · credential gov-erp.bearer injected · egress allowed`, 7: 'Output within limits', 8: `Step recorded on run ${a.run} · audit row written`, ...(a.note || {}) };
  return `<div class="mt-4 rounded-lg border border-slate-200 p-4"><div class="mb-3 flex items-center gap-2 text-sm font-semibold">${UI.icon('shield-check', 'w-4 h-4 text-brand-600')} Action guard trace · <span class="font-mono text-xs font-normal">${a.tool}</span></div>
    <ol class="space-y-1.5">${GW_STEPS.map((s, k) => { const state = k < at ? 'pass' : k === at ? how : k === 8 ? 'pass' : 'skip';
      const ic = { pass: ['check-circle-2', 'text-emerald-500'], fail: ['x-circle', 'text-rose-500'], wait: ['hourglass', 'text-amber-500'], skip: ['circle-dashed', 'text-slate-300'] }[state];
      return `<li class="flex items-start gap-2 text-xs ${state === 'skip' ? 'text-slate-400' : ''}">${UI.icon(ic[0], `w-4 h-4 shrink-0 ${ic[1]}`)}<div class="flex-1"><span class="font-medium">${k + 1}. ${s}</span>${state !== 'skip' ? `<div class="${state === 'fail' ? 'text-rose-700' : state === 'wait' ? 'text-amber-700' : 'text-slate-500'}">${UI.esc(k === at ? why : k === 8 && at < 8 ? `Refusal/wait recorded on run ${a.run} · audit row written` : notes[k])}</div>` : ''}</div></li>`; }).join('')}</ol></div>`;
}

// ---------- Add connector wizard (type-specific) ----------
const SSRF_RX = /(localhost|127\.0\.0\.1|169\.254\.|\/\/10\.|\/\/192\.168\.|\/\/172\.(1[6-9]|2\d|3[01])\.)/;
const CH = (fields, extra = {}) => ({ group: 'channels', steps: [1, 2, 3, 5], verify: 'channel', fields: [...fields, ['agent', 'Handling worker', 'agent'], ['reply', 'Reply mode', 'select', [['autopilot', 'Autopilot — agent replies'], ['assist', 'Assist — agent drafts, human sends'], ['human', 'Human — agent off']]]], ...extra });
const WIZ = {
  'MCP server': { group: 'tools', verify: 'mcp', fields: [['transport', 'Transport', 'select', ['HTTPS', 'Local command (stdio, on-prem)']], ['endpoint', 'Endpoint *', 'text', 'https://erp.acme.gov/mcp', v => v.transport !== 'Local command (stdio, on-prem)'], ['command', 'Command *', 'text', 'npx @agency/erp-mcp --readonly', v => v.transport === 'Local command (stdio, on-prem)'], ['auth', 'Authentication', 'select', ['Bearer token', 'API key', 'None']], ['secret', 'Token / key', 'secret', '', v => v.auth !== 'None']], tools: ['case.get', 'case.search', 'case.update'] },
  Database: { group: 'tools', verify: 'db', fields: [['driver', 'Driver', 'select', ['Postgres', 'SQL Server', 'Oracle']], ['host', 'Host *', 'text', 'db.registry.internal'], ['port', 'Port', 'text', '5432'], ['database', 'Database *', 'text', 'registry'], ['user', 'User *', 'text', 'agent_ro'], ['secret', 'Password *', 'secret'], ['writes', 'Enable writes (query.execute). Every write still pauses for human approval.', 'bool']], tools: ['query.read'] },
  'HTTP API credential': { group: 'tools', steps: [1, 2, 5], fields: [['authType', 'Type', 'select', ['Bearer token', 'API key (header)', 'Basic login']], ['header', 'Header name', 'text', 'X-Api-Key', v => v.authType === 'API key (header)'], ['username', 'Username', 'text', '', v => v.authType === 'Basic login'], ['secret', 'Secret *', 'secret']], note: 'No connection test — this credential is used by flow HTTP request nodes and decrypted only inside the Action guard.' },
  Website: { group: 'tools', verify: 'web', fields: [['url', 'URL *', 'text', 'https://services.acme.gov/faq'], ['depth', 'Crawl depth', 'select', ['0 (this page)', '1', '2', '3']], ['refresh', 'Refresh', 'select', ['Weekly', 'Daily', 'Manual']], ['permission', 'I have permission to use this content *', 'bool']], tools: ['site.query'] },
  'External worker': { group: 'agents', verify: 'agent', fields: [['endpoint', 'Endpoint *', 'text', 'https://partner.example.org/agent'], ['protocol', 'Protocol', 'select', ['A2A', 'OpenAI-compatible', 'Custom HTTP']], ['auth', 'Authentication', 'select', ['OAuth client credentials', 'Bearer token', 'None']], ['secret', 'Secret', 'secret', '', v => v.auth !== 'None']], tools: ['ask'] },
  'Azure AI Foundry project': { group: 'agents', verify: 'foundry', fields: [['endpoint', 'Project endpoint *', 'text', 'https://myproj.services.ai.azure.com/api/projects/ops'], ['tenant', 'Tenant ID *', 'text'], ['client', 'Client ID *', 'text'], ['secret', 'Client secret *', 'secret']], tools: ['ask'] },
  'Remote worker (A2A) · legacy': { group: 'agents', verify: 'agent', legacy: true, fields: [['endpoint', 'Worker card URL *', 'text', 'https://partner.example.org/.well-known/agent.json']], tools: ['ask'] },
  'Web widget': CH([['origins', 'Allowed origins *', 'textarea', 'https://services.acme.gov']]),
  WhatsApp: CH([['phoneId', 'Phone number ID *', 'text'], ['waba', 'Business account ID', 'text'], ['secret', 'Access token *', 'secret'], ['verify', 'Webhook verify token', 'readonly', 'wa_vt_' + Math.random().toString(36).slice(2, 10)]]),
  Telegram: CH([['secret', 'Bot token *', 'secret']]),
  Email: CH([['inbound', 'Inbound address *', 'text', 'help@services.acme.gov'], ['smtp', 'SMTP host', 'text', 'smtp.acme.gov'], ['user', 'SMTP user', 'text'], ['secret', 'SMTP password', 'secret']]),
  Slack: CH([['appId', 'App ID *', 'text'], ['secret', 'Bot token *', 'secret'], ['signing', 'Signing secret', 'secret']]),
  'Microsoft Teams': CH([['appId', 'App ID *', 'text'], ['secret', 'App password *', 'secret']]),
  SMS: CH([['provider', 'Provider', 'select', ['Twilio', 'Vonage']], ['number', 'Number *', 'text', '+971…'], ['secret', 'Auth token *', 'secret']]),
  Voice: CH([['number', 'Phone number or SIP URI *', 'text'], ['stt', 'Speech-to-text', 'select', ['whisper-large-v3', 'Azure STT (ar-AE)']], ['tts', 'Text-to-speech', 'select', ['Azure TTS (ar-AE)', 'ElevenLabs']], ['mode', 'Mode', 'select', ['Push-to-talk', 'Hands-free (needs workspace switch)']]]),
  'Trigger (webhook / cron)': { group: 'automation', steps: [1, 2, 5], fields: [['target', 'Target', 'select', () => [...DB.agents.map(a => 'Worker · ' + a.name), ...DB.workflows.map(w => 'Flow · ' + w.name)]], ['ttype', 'Type', 'select', ['Webhook', 'Schedule']], ['cron', 'Cron', 'text', '0 8 * * 1-5', v => v.ttype === 'Schedule']] },
  'Outbound webhook': { group: 'automation', steps: [1, 2, 3, 5], verify: 'ping', fields: [['endpoint', 'URL *', 'text', 'https://portal.acme.gov/hooks'], ['events', 'Events', 'checks', ['run.completed', 'run.failed', 'approval.requested', 'approval.decided', 'agent.released', 'guardrail.blocked']]] },
  'Library source': { group: 'knowledge', steps: [1, 2, 5], fields: [['kb', 'Library collection', 'select', () => DB.kbs.map(k => [k.id, k.name])], ['provider', 'Provider', 'select', ['SharePoint', 'Confluence', 'Google Drive', 'S3', 'Web crawler']]], note: 'Continue in Library › Sources to set credentials, scope and schedule.' }
};
const CATALOG_ICONS = Object.fromEntries(DB.integrationCatalog.flatMap(g => g.items.map(([n, ic]) => [n, ic])));

function verifyChecks(kind, v) {
  const host = v.endpoint || v.url || v.host || '';
  const ssrf = ['Resolve address & SSRF guard', () => SSRF_RX.test(host) || /^(localhost|127\.|10\.|192\.168\.)/.test(host) ? [false, 'Blocked by SSRF guard: private or metadata address. If this is intended, add it to the egress allow-list in Settings › Residency and isolation.'] : [true, 'public address · egress allowed']];
  const auth = ['Authenticate', () => v.auth === 'None' || v.secret ? [true, v.auth === 'None' ? 'no auth' : 'credential accepted'] : [false, '401 Unauthorized — add the token / key on the previous step']];
  return {
    mcp: [ssrf, ['TLS handshake', () => [true, 'TLS 1.3 · certificate valid']], auth, ['MCP initialize', () => [true, 'protocol 2025-06-18 · server "agency-erp" v1.4']], ['List tools', () => [true, '3 tools discovered']]],
    db: [ssrf, ['Connect', () => v.secret ? [true, `${v.driver} ${v.host}:${v.port}/${v.database}`] : [false, 'password authentication failed for user "' + v.user + '"']], ['Role privileges', () => [true, v.writes ? 'role can write — writes still pause for approval' : 'read-only role confirmed']], ['Introspect schema', () => [true, '2 schemas · 14 tables']]],
    web: [ssrf, ['Permission', () => v.permission ? [true, 'confirmed'] : [false, 'Confirm you have permission to use this content']], ['robots.txt', () => [true, 'crawling allowed']], ['Fetch & extract', () => [true, '12 pages · 31 passages indexed']]],
    agent: [ssrf, ['Fetch worker card', () => [true, 'Partner Case Worker · skills: case.lookup, case.status']], auth],
    foundry: [ssrf, ['Entra token', () => v.secret ? [true, 'token issued'] : [false, 'AADSTS7000215: invalid client secret']], ['List project workers', () => [true, '3 agents found']]],
    channel: [['Register webhook', () => [true, 'POST /channels/<id>/webhook registered']], ['Provider handshake', () => v.secret || !('secret' in v) ? [true, 'ok'] : [false, 'Token rejected by provider']], ['Status', () => [true, 'Awaiting first event']]],
    ping: [ssrf, ['Send signed test event', () => [true, '200 OK in 182ms · HMAC-SHA256 verified by receiver']]]
  }[kind] || [];
}

window.openAddIntegration = function () {
  const st = { step: 1, type: null, v: {}, checks: null, ok: false, tools: [], created: null };
  const wrap = UI.modal({ title: 'Add connector', size: 'xl', body: '<div id="wiz"></div>' });
  const el = wrap.querySelector('#wiz');
  const spec = () => WIZ[st.type] || { steps: [1, 2, 5], fields: [] };
  const stepsOf = () => spec().steps || [1, 2, 3, 4, 5];
  const NAMES = ['Choose type', 'Details', 'Check', 'Access', 'Finish'];
  const keyify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const go = dir => { const s = stepsOf(); st.step = s[s.indexOf(st.step) + dir]; draw(); if (st.step === 3) runVerify(); };
  function fieldHtml([k, label, type, opt, when]) {
    if (when && !when(st.v)) return '';
    // Seed a default the first time a field is shown (first option for selects, the example for text)
    if (st.v[k] === undefined && !['secret', 'bool', 'checks'].includes(type)) {
      if (type === 'select') { const o = typeof opt === 'function' ? opt() : opt; st.v[k] = Array.isArray(o[0]) ? o[0][0] : o[0]; }
      else if (type === 'agent') st.v[k] = DB.agents.find(a => a.released)?.id;
      else st.v[k] = opt || '';
    }
    const d = `data-f="${k}" data-t="${type}"`;
    if (type === 'select') return UI.field(label, UI.select(typeof opt === 'function' ? opt() : opt, st.v[k], d));
    if (type === 'secret') return UI.field(label, UI.input('', `type="password" ${d} placeholder="${st.v[k] ? '•••••••• (set)' : ''}"`), 'Stored write-only in the vault. Never shown again.');
    if (type === 'bool') return `<label class="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" class="mt-0.5 rounded text-brand-600" ${st.v[k] ? 'checked' : ''} ${d}/><span>${label}</span></label>`;
    if (type === 'textarea') return UI.field(label, UI.textarea(st.v[k], d, 2), 'One per line.');
    if (type === 'readonly') return UI.field(label, UI.input(st.v[k], `readonly class="font-mono" ${d}`));
    if (type === 'agent') return UI.field(label, UI.select(DB.agents.filter(a => a.released).map(a => [a.id, a.name]), st.v[k], d));
    if (type === 'checks') return `<div class="sm:col-span-2">${UI.field(label, `<div class="flex flex-wrap gap-2">${opt.map(o => `<label class="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 font-mono text-xs"><input type="checkbox" ${(st.v[k] || []).includes(o) ? 'checked' : ''} ${d} data-o="${o}" class="rounded text-brand-600"/>${o}</label>`).join('')}</div>`)}</div>`;
    return UI.field(label, UI.input(st.v[k], `${d} class="font-mono"`));
  }
  function missing() {
    return [['name', 'Name *', 'text'], ...spec().fields].filter(([k, l, ty, , when]) => l.includes('*') && (!when || when(st.v)) && (ty === 'bool' ? !st.v[k] : !st.v[k] || !String(st.v[k]).trim())).map(f => f[1].replace(' *', ''));
  }
  function draw() {
    const steps = stepsOf();
    const stepper = `<ol class="mb-5 flex flex-wrap items-center gap-2 text-xs">${NAMES.map((n, i) => { const sn = i + 1, skip = st.type && !steps.includes(sn), done = sn < st.step && !skip, cur = sn === st.step;
      return `<li class="flex items-center gap-2 ${skip ? 'opacity-40' : ''}"><span class="flex h-6 w-6 items-center justify-center rounded-full ${done ? 'bg-emerald-500 text-white' : cur ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'}">${done ? '✓' : sn}</span><span class="${cur ? 'font-semibold' : 'text-slate-500'} ${skip ? 'line-through' : ''}">${n}</span>${skip ? '<span class="text-[10px] text-slate-400">(not needed)</span>' : ''}${i < 4 ? '<span class="text-slate-300">—</span>' : ''}</li>`; }).join('')}</ol>`;
    let body = '', next = '';
    if (st.step === 1) {
      body = DB.integrationCatalog.map(g => `<div class="mb-4"><div class="mb-2 text-xs font-semibold uppercase text-slate-400">${g.group}</div><div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">${g.items.map(([n, ic, need]) =>
        `<button data-type="${n}" class="rounded-lg border p-3 text-start ${st.type === n ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50'}"><div class="flex items-center gap-2 text-sm font-medium">${UI.icon(ic, 'w-4 h-4 text-brand-600')}${n}</div><div class="mt-1 text-[11px] text-slate-500">You'll need: ${need}</div></button>`).join('')}</div></div>`).join('');
      next = UI.btn(t('next'), { variant: 'primary', disabled: !st.type, onclick: () => { st.v.name = st.v.name || st.type.replace(' · legacy', ''); go(1); } });
    }
    if (st.step === 2) {
      body = `${spec().legacy ? `<div class="mb-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">Remote worker (A2A) is legacy — prefer <b>External worker</b> with protocol A2A.</div>` : ''}
        <div class="grid max-w-3xl gap-4 sm:grid-cols-2">${UI.field('Name *', UI.input(st.v.name || '', 'data-f="name" data-t="text"'))}${UI.field('Key', UI.input(st.v.key || keyify(st.v.name || ''), 'data-f="key" data-t="text" class="font-mono"'), 'Workers reference the connector by key.')}
        ${spec().fields.map(fieldHtml).join('')}</div>${spec().note ? `<p class="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600">${spec().note}</p>` : ''}<div id="wiz-miss" class="mt-3 text-xs text-rose-600"></div>`;
      next = UI.btn(steps.includes(3) ? 'Connect & verify' : t('next'), { variant: 'primary', onclick: () => { const m = missing(); if (m.length) { el.querySelector('#wiz-miss').textContent = 'Required: ' + m.join(', '); return; } if (!steps.includes(3)) create(); go(1); } });
    }
    if (st.step === 3) {
      const c = st.checks || [];
      body = `<ol class="max-w-2xl space-y-2">${c.map(([label, res]) => `<li class="flex items-start gap-2 rounded-md px-3 py-2 text-sm ${res == null ? 'bg-slate-50' : res[0] ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}">${UI.icon(res == null ? 'loader-2' : res[0] ? 'check-circle-2' : 'x-circle', `w-4 h-4 mt-0.5 shrink-0 ${res == null ? 'animate-spin text-brand-500' : ''}`)}<div><div class="font-medium">${label}</div>${res ? `<div class="text-xs">${UI.esc(res[1])}</div>` : ''}</div></li>`).join('')}</ol>
        ${st.ok && st.type === 'MCP server' ? `<div class="mt-4 max-w-2xl"><div class="mb-2 text-xs font-semibold uppercase text-slate-500">Discovered tools — enable the ones workers may use</div>${spec().tools.map(tl => `<label class="flex items-center gap-2 border-b border-slate-100 py-1.5 text-sm"><input type="checkbox" data-tool="${tl}" ${st.tools.includes(tl) ? 'checked' : ''} class="rounded text-brand-600"/><span class="font-mono">${tl}</span><span class="text-xs text-slate-500">${tl.endsWith('update') ? 'writes data' : 'read'}</span>${UI.badge(tl.endsWith('update') ? 'high' : 'low', tl.endsWith('update') ? 'red' : 'green')}</label>`).join('')}</div>` : ''}`;
      next = st.ok ? UI.btn(t('next'), { variant: 'primary', onclick: () => { el.querySelectorAll('[data-tool]').forEach(c2 => { if (!c2.checked) st.tools = st.tools.filter(x => x !== c2.dataset.tool); }); if (!steps.includes(4)) create(); go(1); } }) : (st.checks && st.checks.every(c2 => c2[1]) ? UI.btn('Retry', { icon: 'refresh-cw', onclick: runVerify }) : '');
    }
    if (st.step === 4) {
      const x = { grants: Object.fromEntries(['*', ...st.tools].map(tl => [tl, new Set()])) };
      body = `<p class="mb-3 text-sm text-slate-500">Choose who may call each tool. You can change this later under Access.</p><div id="wg">${grantMatrixHtml(x, st.tools)}</div>`;
      next = UI.btn('Give access and finish', { variant: 'primary', onclick: () => { st.grantRoot = el.querySelector('#wg').cloneNode(true); create(); go(1); } });
    }
    if (st.step === 5) {
      const i = st.created;
      body = `<div class="flex flex-col items-center py-6 text-center"><div class="rounded-full bg-emerald-50 p-3">${UI.icon('check-circle-2', 'w-8 h-8 text-emerald-600')}</div><h3 class="mt-3 font-semibold">${UI.esc(i.name)} added</h3><p class="mt-1 text-sm text-slate-500">Status: ${i.status}${i.tools.length ? ` · ${i.tools.length} tool${i.tools.length > 1 ? 's' : ''} · ${i.usedBy} agent grant${i.usedBy === 1 ? '' : 's'}` : ''}</p>
        ${st.type === 'HTTP API credential' ? `<p class="mt-3 text-xs text-slate-500">Pick <span class="font-mono">${i.key}</span> as the credential on a flow HTTP request node.</p>` : ''}
        ${st.type === 'Trigger (webhook / cron)' && st.v.ttype === 'Webhook' ? `<div class="mt-3 w-full max-w-lg rounded-md bg-slate-900 p-3 text-start font-mono text-xs text-slate-100" dir="ltr">POST https://api.agents.example/v1/hooks/${i.key}<br/>X-Signature: HMAC-SHA256(secret, timestamp.body)</div>` : ''}
        ${WIZ[st.type]?.group === 'channels' ? '<p class="mt-3 text-xs text-slate-500">Further channel settings live under Operate › Channels (parked in this prototype).</p>' : ''}</div>`;
      next = (st.type === 'Library source' ? UI.btn('Continue in Library', { onclick: () => { UI.closeAll(); KB.sel = st.v.kb; KB.tab = 'sources'; location.hash = '#/library'; setTimeout(() => sourceWizard(kbOf()), 100); } }) : '') + UI.btn('Open connector', { onclick: () => { UI.closeAll(); integrationDrawer(i); } }) + UI.btn(t('done'), { variant: 'primary', onclick: 'UI.closeOverlay()' });
    }
    const back = st.step > 1 && st.step < 5 ? UI.btn(t('back'), { onclick: () => go(-1) }) : '<span></span>';
    el.innerHTML = stepper + `<div class="min-h-[260px]">${body}</div><div class="mt-6 flex justify-between border-t border-slate-100 pt-4">${back}<div class="flex gap-2">${next}</div></div>`;
    el.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { if (st.type !== b.dataset.type) st.v = {}; st.type = b.dataset.type; draw(); });
    el.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' || inp.type === 'checkbox' ? 'change' : 'input', () => {
      const k = inp.dataset.f, ty = inp.dataset.t;
      if (ty === 'bool') st.v[k] = inp.checked; else if (ty === 'checks') st.v[k] = [...el.querySelectorAll(`[data-f="${k}"]:checked`)].map(c2 => c2.dataset.o); else st.v[k] = inp.value;
      if (k === 'name') { const s = el.querySelector('[data-f="key"]'); if (s) { s.value = keyify(inp.value); st.v.key = s.value; } }
      if (inp.tagName === 'SELECT' || ty === 'bool') draw();
    }));
    UI.refreshIcons();
  }
  function runVerify() {
    const list = verifyChecks(spec().verify, st.v); st.checks = list.map(([l]) => [l, null]); st.ok = false; draw();
    let k = 0;
    const tick = () => { if (!document.getElementById('wiz')) return; const res = list[k][1](); st.checks[k][1] = res;
      if (!res[0]) { st.checks = st.checks.slice(0, k + 1); draw(); return; }
      k++; if (k >= list.length) { st.ok = true; st.tools = [...(spec().tools || [])].filter(tl => !(st.type === 'Database' && tl === 'query.execute')); if (st.type === 'Database' && st.v.writes) st.tools.push('query.execute'); draw(); return; }
      draw(); setTimeout(tick, 450); };
    setTimeout(tick, 450);
  }
  function create() {
    if (st.created) return;
    const sp = spec(); const id = 'i' + Date.now();
    const status = sp.group === 'channels' ? 'Awaiting first event' : st.type === 'HTTP API credential' ? 'Ready (no test)' : st.type.startsWith('Trigger') ? 'Awaiting first event' : st.type === 'Library source' ? 'Not checked yet' : 'Healthy';
    const i = { id, name: st.v.name, key: st.v.key || keyify(st.v.name), group: sp.group, type: st.type.replace(' · legacy', ''), transport: st.v.transport || st.v.protocol || st.v.driver || (sp.group === 'channels' ? 'Webhook' : 'HTTPS'), auth: st.v.auth || st.v.authType || (st.v.secret !== undefined ? 'Secret' : 'None'), status, last: 'just now', tools: [...st.tools], usedBy: 0 };
    if (st.v.secret) DB.secrets.push({ name: `${i.key}.secret`, created: 'today', last: '—' });
    DB.integrations.unshift(i);
    const x = X(i); x.health = x.health.map(() => 'none'); x.health[23] = status === 'Healthy' ? 'ok' : 'none'; x.acts = [];
    x.connections = sp.group === 'tools' || sp.group === 'agents' ? [{ name: 'prod', cred: `${i.key}.secret`, status }] : [];
    if (st.grantRoot) { readMatrix(st.grantRoot, x); i.usedBy = DB.agents.filter(a => i.tools.some(tl => (GRANTS[tl] || []).includes(a.id))).length; }
    st.created = i; rerenderInt();
  }
  draw();
};
