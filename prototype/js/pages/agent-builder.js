// BUILD › Workers › Builder (F-BLD-04 / F-BLD-05): outline + form, pickers, checkpoint rules,
// live "Try it live" run, and the draft → release flow with checks and diff.
Object.assign(AG, { test: {}, released: {}, changelog: {}, openSec: {} });

const clone = o => JSON.parse(JSON.stringify(o));
const releasedOf = a => AG.released[a.id] || (AG.released[a.id] = clone(defaultBlueprint(a)));

const TOOL_RISK = { 'incident.get': 'low', 'patrol.list_available': 'low', 'dispatch.commit': 'high', 'query.read': 'medium', 'query.execute': 'critical', 'site.query': 'low', ask: 'medium',
  'kb.search': 'low', 'memory.save': 'low', 'recall.search': 'low', 'skills.search': 'low', 'skills.apply': 'low', 'outcome.record': 'medium', 'code.execute': 'high', 'browser.open': 'high', 'payment.charge': 'critical' };
const riskTone = r => ({ low: 'green', medium: 'amber', high: 'red', critical: 'red' }[r] || 'gray');
const SAFETY_NET = ['code.execute', 'browser.open', 'payment.charge'];
const kbKey = k => k.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
// Which worker already holds a grant (mock): tool → agent ids
const GRANTS = { 'incident.get': ['a1', 'a2', 'a3'], 'patrol.list_available': ['a3', 'a5'], 'dispatch.commit': ['a5'], 'query.read': ['a3'], 'site.query': ['a1'], ask: ['a4'] };

// ---------- Section model ----------
const CORE = [['identity', 'Identity', 'user-round'], ['model', 'Model', 'cpu'], ['tools', 'Tools', 'wrench'], ['knowledge', 'Library collections', 'library'], ['checkpoint', 'Human checkpoints', 'shield-check']];

// Advanced sections rendered from field specs. type: text | number | range | select | bool | lines | checks | json
const ADV = [
  ['persona_depth', 'Character details', 'identity.persona_depth', [['role', 'Role', 'text'], ['goals', 'Goals', 'lines'], ['constraints', 'Constraints', 'lines'], ['style_rules', 'Style rules', 'lines']]],
  ['memory', 'Memory', 'memory', [['enabled', 'Memory enabled', 'bool'], ['scopes', 'Scopes', 'checks', ['agent', 'user', 'crew', 'contact']], ['graph.enabled', 'Linked-facts recall', 'bool'], ['graph.decay', 'Recency decay', 'number', { step: 0.01 }], ['graph.min_importance', 'Min importance', 'range', { min: 0, max: 1, step: 0.05 }], ['graph.consolidation', 'Consolidation', 'select', ['nightly', 'weekly', 'off']]]],
  ['skills', 'Playbook suggestions', 'skills', [['autonomy', 'Autonomy', 'select', [['off', 'Off — never author playbooks'], ['propose', 'Propose — human reviews before activation'], ['auto', 'Auto — activate immediately (reversible)']]]]],
  ['guardrails', 'Safety rules', 'guardrails', [['policy', 'Policy (opt in by key; stricter wins)', 'select', ['workspace-default', 'baseline', 'regulated']], ['blocked_topics', 'Extra blocked topics', 'lines']]],
  ['budget', 'Spending and step limits', 'budget', [['max_steps', 'Max steps per run', 'number'], ['max_cost_per_run', 'Max cost per run ($)', 'number', { step: 0.1 }], ['max_tokens_per_run', 'Max tokens per run', 'number']]],
  ['risk', 'Risk and data class', 'risk', [['level', 'Risk level', 'select', ['low', 'standard', 'high', 'critical']], ['classification', 'Data classification', 'select', ['public', 'internal', 'confidential', 'secret']]]],
  ['decision', 'Decisions and escalation', 'decision_policy', [['may_decide', 'Worker may decide (not only recommend)', 'bool'], ['escalate_when', 'Escalate when', 'checks', ['low_confidence', 'policy_conflict', 'high_value', 'user_request']], ['escalate_to', 'Escalate to', 'select', [['org_node_manager', 'Org-node manager'], ['reports_to_agent', 'Reports-to worker'], ['queue', 'Inbox queue']]]]],
  ['voice', 'Voice', 'voice', [['enabled', 'Voice enabled', 'bool'], ['mode', 'Mode', 'select', [['push_to_talk', 'Push-to-talk'], ['hands_free', 'Hands-free (barge-in)']]], ['barge_in', 'Allow barge-in', 'bool'], ['stt', 'Speech-to-text', 'select', [['', '— default —'], ['whisper-large-v3', 'whisper-large-v3'], ['azure-stt-ar', 'Azure STT (ar-AE)']]], ['tts', 'Text-to-speech', 'select', [['', '— default —'], ['azure-tts-ar', 'Azure TTS (ar-AE)'], ['elevenlabs', 'ElevenLabs']]]]],
  ['code', 'Code execution', 'code_execution', [['enabled', 'Code execution enabled', 'bool'], ['auto_approve', 'Auto-approve code (no per-call approval)', 'bool'], ['timeout_s', 'Timeout (seconds)', 'number']]],
  ['browser', 'Browser use', 'browser', [['enabled', 'Browser use enabled', 'bool']]],
  ['payments', 'Payments', 'payments', [['enabled', 'Payments enabled', 'bool'], ['mandate_required', 'Require an active spend mandate', 'bool']]],
  ['a2a', 'Open to partner workers', 'a2a', [['expose', 'Expose as A2A server', 'bool'], ['allow_any_caller', 'Allow any caller', 'bool'], ['allowed_callers', 'Allowed callers', 'lines']]],
  ['evaluation', 'Ongoing scoring and release targets', 'evaluation', [['continuous.enabled', 'Score a sample of live runs', 'bool'], ['continuous.sample_rate', 'Sample rate', 'range', { min: 0, max: 1, step: 0.05 }], ['continuous.judge', 'Judge', 'select', ['default', 'strict', 'arabic-register']], ['release_gates', 'Release gates', 'gates']]],
  ['user_modeling', 'Personalisation', 'user_modeling', [['enabled', 'Build a per-user profile from conversations', 'bool']]],
  ['output', 'Answer format', 'output', [['format', 'Format', 'select', ['text', 'markdown', 'json']], ['json_schema', 'JSON schema (when format = json)', 'json']]],
  ['routing', 'Backup models', 'model.routing', [['fallbacks', 'Fallback models (in order)', 'checks', ['gpt-4.1', 'gpt-4.1-mini', 'jais-30b-chat']], ['cooldown_seconds', 'Cooldown (seconds)', 'number']]]
];
const EVAL_SCORES = { 'answers-with-sources': 0.94, 'refusals': 1.0, 'arabic-register': 0.82 };

function sectionPaths(key) {
  return { identity: ['identity.display_name', 'identity.display_name_ar', 'identity.tone', 'identity.language', 'identity.persona', 'identity.starter_questions'], model: ['model.model', 'model.registered_model_id', 'model.temperature', 'model.max_output_tokens'],
    tools: ['tools'], knowledge: ['knowledge'], checkpoint: ['checkpoint'] }[key] || [ADV.find(s => s[0] === key)[2]];
}
const configured = (m, a, key) => sectionPaths(key).some(p => JSON.stringify(getPath(m, p)) !== JSON.stringify(getPath(defaultBlueprint(a), p)));

// ---------- Checks: schema, two-key capability conflicts, warnings ----------
function checkBlueprint(m) {
  const out = []; // {sec, level: error|warn, msg, fix?}
  const add = (sec, level, msg, fix) => out.push({ sec, level, msg, fix });
  if (!m.identity.display_name) add('identity', 'error', 'Display name is required');
  if (m.identity.starter_questions.length > 6) add('identity', 'error', `Suggested openers: ${m.identity.starter_questions.length} of max 6`);
  if (m.model.temperature < 0 || m.model.temperature > 2) add('model', 'error', 'Temperature must be between 0 and 2');
  const cap = (on, capKey, sec, label) => { if (on && !CAPS[capKey]) add(sec, 'error', `${label} is on, but the workspace forbids it (two-key)`, '#/configuration/general'); };
  cap(m.code_execution.enabled, 'code', 'code', 'Code execution');
  cap(m.code_execution.enabled && m.code_execution.auto_approve, 'autoCode', 'code', 'Auto-approved code');
  cap(m.browser.enabled, 'browser', 'browser', 'Browser use');
  cap(m.payments.enabled, 'payments', 'payments', 'Payments');
  cap(m.voice.enabled && m.voice.mode === 'hands_free', 'voice', 'voice', 'Hands-free voice');
  cap(m.a2a.expose, 'a2a', 'a2a', 'Open to partner workers');
  if (m.payments.enabled && !m.payments.mandate_required) add('payments', 'warn', 'Payments without a mandate requirement — the Action guard will still refuse charges outside an active mandate');
  if (m.a2a.expose && !m.a2a.allow_any_caller && !m.a2a.allowed_callers.length) add('a2a', 'warn', 'Exposed over A2A but no caller is allowed');
  if (m.output.format === 'json' && !m.output.json_schema) add('output', 'warn', 'Format is JSON but no schema is set');
  if (m.tools.builtin.includes('kb.search') && !m.knowledge.bases.length) add('knowledge', 'warn', 'kb.search is enabled but no library collection is attached');
  if (m.knowledge.citations === 'required' && !m.knowledge.bases.length) add('knowledge', 'warn', 'Citations are required but there is nothing to cite');
  if (m.memory.enabled && ['confidential', 'secret'].includes(m.risk.classification)) add('memory', 'warn', `Classified "${m.risk.classification}" — above the memory ceiling (internal). Memory will run off.`);
  m.tools.mcp.forEach(g => g.tools.forEach(tl => { if (!(GRANTS[tl] || []).includes(AG.currentId)) add('tools', 'warn', `${g.integration}/${tl} is declared but not granted to this worker yet`); }));
  m.tools.databases.forEach(d => { if (d.operations.includes('query.execute')) add('tools', 'warn', `${d.connector}: every write (query.execute) pauses for human approval`); });
  return out;
}

// ---------- checkpoint effective behaviour ----------
function agentTools(m) {
  return [...m.tools.builtin, ...m.tools.mcp.flatMap(g => g.tools), ...m.tools.databases.flatMap(d => d.operations), ...m.tools.remote_agents.map(r => 'ask')];
}
const globMatch = (pat, s) => new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(s);
function checkpointAction(m, tool) {
  if (tool === 'query.execute') return ['review', 'database writes always pause'];
  if (m.checkpoint.default === 'review') return ['review', 'preset: review every tool call'];
  if (m.checkpoint.default === 'auto_with_safety_net') return SAFETY_NET.includes(tool) ? ['review', 'safety net'] : ['auto', 'preset: auto with safety net'];
  const r = m.checkpoint.rules.find(r => r.tool && globMatch(r.tool, tool));
  return r ? [r.action, `rule ${r.tool}`] : [m.checkpoint.default_action || 'review', 'default action'];
}

// ---------- Field rendering (data-path binding) ----------
function fieldCtl(m, path, label, type, opt) {
  const v = getPath(m, path);
  const dp = `data-path="${path}" data-type="${type}"`;
  if (type === 'bool') return `<label class="flex items-center justify-between gap-4 py-1"><span class="text-sm text-slate-700">${label}</span><input type="checkbox" role="switch" class="switch" ${v ? 'checked' : ''} ${dp}/></label>`;
  if (type === 'checks') return UI.field(label, `<div class="flex flex-wrap gap-2">${opt.map(o => `<label class="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs"><input type="checkbox" class="rounded text-brand-600" ${(v || []).includes(o) ? 'checked' : ''} ${dp} data-val="${o}"/><span class="font-mono">${o}</span></label>`).join('')}</div>`);
  if (type === 'lines') return UI.field(label, UI.textarea((v || []).join('\n'), dp, 3), 'One per line.');
  if (type === 'select') return UI.field(label, UI.select(opt, v ?? '', dp));
  if (type === 'range') return UI.field(`${label} <span class="font-mono text-slate-500" data-range-out="${path}">${v}</span>`, `<input type="range" min="${opt.min}" max="${opt.max}" step="${opt.step}" value="${v}" class="w-full accent-brand-600" ${dp}/>`);
  if (type === 'number') return UI.field(label, UI.input(v, `type="number" step="${opt?.step || 1}" ${dp}`));
  if (type === 'json') return UI.field(label, UI.textarea(v ? JSON.stringify(v, null, 2) : '', `class="font-mono" placeholder='{ "type": "object", "properties": {} }' ${dp}`, 4));
  if (type === 'gates') return UI.field(label, `<div class="space-y-1.5">${(v || []).map((g, i) => `<div class="flex items-center gap-2"><div class="flex-1">${UI.select(Object.keys(EVAL_SCORES), g.suite, `data-gate="${i}" data-k="suite"`)}</div><span class="text-xs text-slate-500">min</span><div class="w-24">${UI.input(g.min_score, `type="number" step="0.01" min="0" max="1" data-gate="${i}" data-k="min_score"`)}</div>${UI.iconBtn('x', () => { v.splice(i, 1); rerenderBuilder(); })}</div>`).join('') || '<p class="text-xs text-slate-400">No gates — any version can be released.</p>'}
    ${UI.btn('Add gate', { size: 'sm', icon: 'plus', onclick: () => { v.push({ suite: 'refusals', min_score: 0.9 }); rerenderBuilder(); } })}</div>`, 'Releasing is blocked while the latest eval score is below the minimum.');
  return UI.field(label, UI.input(v, dp));
}

function sectionCard(key, title, icon, inner, m, a, issues, collapsible) {
  const iss = issues.filter(i => i.sec === key);
  const badge = `<span id="cfg-${key}">${configured(m, a, key) ? UI.badge('Changed', 'indigo') : ''}</span>`;
  const issHtml = `<div id="iss-${key}">${issueList(iss)}</div>`;
  if (!collapsible) return `<section id="sec-${key}" class="scroll-mt-24 rounded-lg border border-slate-200 bg-white"><div class="flex items-center gap-2 border-b border-slate-100 px-4 py-3">${UI.icon(icon, 'w-4 h-4 text-slate-400')}<h3 class="text-sm font-semibold">${title}</h3>${badge}</div><div class="p-4">${issHtml}${inner}</div></section>`;
  const open = AG.openSec[key] ?? (configured(m, a, key) || iss.length > 0);
  return `<details id="sec-${key}" ${open ? 'open' : ''} ontoggle="${UI.fn((e, el) => { AG.openSec[key] = el.open; })}" class="group scroll-mt-24 rounded-lg border border-slate-200 bg-white">
    <summary class="flex cursor-pointer list-none items-center gap-2 px-4 py-3">${UI.icon('chevron-right', 'w-4 h-4 text-slate-400 transition group-open:rotate-90 flip-rtl')}<h3 class="text-sm font-semibold">${title}</h3>${badge}<span class="ms-auto font-mono text-[11px] text-slate-400">${ADV.find(s => s[0] === key)[2]}</span></summary>
    <div class="border-t border-slate-100 p-4">${issHtml}${inner}</div></details>`;
}
function issueList(iss) {
  return iss.map(i => `<div class="mb-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs ${i.level === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'}">${UI.icon(i.level === 'error' ? 'octagon-x' : 'alert-triangle', 'w-3.5 h-3.5 mt-0.5 shrink-0')}<span class="flex-1">${UI.esc(i.msg)}</span>${i.fix ? `<a href="${i.fix}" class="font-medium underline">Workspace posture</a>` : ''}</div>`).join('');
}

// ---------- Outline ----------
function outlineItem(key, label, m, a, issues) {
  const iss = issues.filter(i => i.sec === key);
  const mark = iss.some(i => i.level === 'error') ? UI.icon('octagon-x', 'w-3.5 h-3.5 text-rose-500') : iss.length ? UI.icon('alert-triangle', 'w-3.5 h-3.5 text-amber-500') : configured(m, a, key) ? '<span class="h-1.5 w-1.5 rounded-full bg-brand-500" title="Configured"></span>' : '';
  return `<button data-goto="${key}" class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs text-slate-600 hover:bg-slate-100"><span class="flex-1 truncate">${label}</span><span id="ol-${key}" class="flex items-center">${mark}</span></button>`;
}
function outline(m, a, issues) {
  const errs = issues.filter(i => i.level === 'error').length, warns = issues.length - errs;
  return `<aside class="hidden w-56 shrink-0 lg:block"><div class="sticky top-24 max-h-[calc(100vh-200px)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 scrollbar-thin">
    <div id="ol-summary" class="mb-2 rounded-md px-2 py-1.5 text-xs ${errs ? 'bg-rose-50 text-rose-700' : warns ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}">${errs ? `${errs} error${errs > 1 ? 's block' : ' blocks'} release` : warns ? `${warns} warning${warns > 1 ? 's' : ''}` : 'Ready to release'}</div>
    <div class="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Core</div>${CORE.map(([k, l]) => outlineItem(k, l, m, a, issues)).join('')}
    <div class="mt-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Advanced</div>${ADV.map(([k, l]) => outlineItem(k, l, m, a, issues)).join('')}</div></aside>`;
}
function refreshStatus(a) {
  const m = blueprintOf(a); const issues = checkBlueprint(m);
  [...CORE.map(c => c[0]), ...ADV.map(s => s[0])].forEach(k => {
    const ol = document.getElementById('ol-' + k); if (!ol) return;
    const tmp = document.createElement('div'); tmp.innerHTML = outlineItem(k, '', m, a, issues); ol.innerHTML = tmp.querySelector('#ol-' + k).innerHTML;
    const cfg = document.getElementById('cfg-' + k); if (cfg) cfg.innerHTML = configured(m, a, k) ? UI.badge('Changed', 'indigo') : '';
    const iss = document.getElementById('iss-' + k); if (iss) iss.innerHTML = issueList(issues.filter(i => i.sec === k));
  });
  const sum = document.getElementById('ol-summary');
  if (sum) { const tmp = document.createElement('div'); tmp.innerHTML = outline(m, a, issues); sum.replaceWith(tmp.querySelector('#ol-summary')); }
  const dc = document.getElementById('diff-count'); if (dc) dc.textContent = diffBlueprint(releasedOf(a), m).length + ' changes vs v' + a.version;
  UI.refreshIcons();
}

// ---------- Core sections ----------
function chip(label, tone, onRemove, extra = '') {
  return `<span class="inline-flex items-center gap-1 rounded-full py-0.5 ps-2 pe-1 text-xs font-medium ${tone}">${label}${extra}<button onclick="${UI.fn(onRemove)}" class="rounded-full p-0.5 hover:bg-black/10">${UI.icon('x', 'w-3 h-3')}</button></span>`;
}
function toolsSection(m, a) {
  const grantBadge = tl => (GRANTS[tl] || []).includes(a.id) ? '' : `<span class="ms-1 text-[10px] text-rose-600">(not granted)</span>`;
  const block = (title, desc, chips, cta, onAdd) => `<div class="rounded-md border border-slate-200 p-3"><div class="flex items-center justify-between gap-3"><div><div class="text-sm font-medium">${title}</div><div class="text-xs text-slate-500">${desc}</div></div>${UI.btn(cta, { size: 'sm', icon: 'plus', onclick: onAdd })}</div>
    <div class="mt-2 flex flex-wrap gap-1.5">${chips || '<span class="text-xs text-slate-400">None</span>'}</div></div>`;
  return `<div class="space-y-3">
    <div><div class="mb-2 text-xs font-medium text-slate-700">Built-in tools</div><div class="flex flex-wrap gap-2">${['kb.search', 'memory.save', 'recall.search', 'skills.search', 'skills.apply', 'outcome.record', 'code.execute', 'browser.open'].map(x => `<label class="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 font-mono text-xs"><input type="checkbox" class="rounded text-brand-600" ${m.tools.builtin.includes(x) ? 'checked' : ''} data-path="tools.builtin" data-type="checks" data-val="${x}"/>${x}${['code.execute', 'browser.open'].includes(x) ? UI.badge('high', 'red', 'ms-1') : ''}</label>`).join('')}</div></div>
    ${block('MCP tools', 'Pick tools from a connected server.', m.tools.mcp.flatMap((g, gi) => g.tools.map(tl => chip(`<span class="font-mono">${g.integration}/${tl}</span>`, 'bg-brand-50 text-brand-700', () => { g.tools = g.tools.filter(x => x !== tl); if (!g.tools.length) m.tools.mcp.splice(gi, 1); rerenderBuilder(); }, grantBadge(tl)))).join(''), 'Add MCP tool', () => mcpPicker(a))}
    ${block('Remote A2A agents', 'Registered under Connectors › Workers elsewhere, referenced by key.', m.tools.remote_agents.map((r, i) => chip(`<span class="font-mono">${r.key}</span>`, 'bg-sky-50 text-sky-700', () => { m.tools.remote_agents.splice(i, 1); rerenderBuilder(); })).join(''), 'Add remote worker', () => remotePicker(a))}
    ${block('Database connectors', 'The connector itself must also be granted. query.execute needs writes enabled on the connector, and every write pauses for approval.', m.tools.databases.map((d, i) => chip(`<span class="font-mono">${d.connector}: ${d.operations.join(', ')}</span>`, 'bg-violet-50 text-violet-700', () => { m.tools.databases.splice(i, 1); rerenderBuilder(); })).join(''), 'Add database', () => dbPicker(a))}
  </div>`;
}
function knowledgeSection(m) {
  return `<div class="flex flex-wrap items-center gap-1.5">${m.knowledge.bases.map((b, i) => chip(UI.icon('library', 'w-3 h-3') + (DB.kbs.find(k => kbKey(k) === b)?.name || b), 'bg-emerald-50 text-emerald-700', () => { m.knowledge.bases.splice(i, 1); rerenderBuilder(); })).join('') || '<span class="text-xs text-slate-400">No library collection attached</span>'}
      ${UI.btn('Attach library collection', { size: 'sm', icon: 'plus', onclick: () => kbPicker(m) })}</div>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">${fieldCtl(m, 'knowledge.citations', 'Citations', 'select', ['required', 'preferred', 'off'])}${fieldCtl(m, 'knowledge.top_k', 'Top-k passages', 'number')}</div>`;
}
function checkpointSection(m) {
  const pick = v => () => { m.checkpoint.default = v; if (v === 'custom' && !m.checkpoint.rules.length) m.checkpoint.rules = [{ tool: 'crm.*', action: 'review', risk: 'high' }, { tool: 'kb.search', action: 'auto', risk: 'low' }]; rerenderBuilder(); };
  const tools = [...new Set(agentTools(m))];
  return `<div class="grid gap-3">
    ${UI.radioCard('checkpoint', 'review', m.checkpoint.default === 'review', 'Ask before every action', 'Every tool call pauses for approval — safest default.', pick('review'))}
    ${UI.radioCard('checkpoint', 'auto_with_safety_net', m.checkpoint.default === 'auto_with_safety_net', 'Act freely, ask for risky actions', 'Autonomous; payments, code execution and browser use still require approval.', pick('auto_with_safety_net'))}
    ${UI.radioCard('checkpoint', 'custom', m.checkpoint.default === 'custom', 'Rules per tool', 'A default action plus per-tool rules. The first matching rule wins.', pick('custom'))}
    ${m.checkpoint.default === 'custom' ? `<div class="rounded-md border border-slate-200 p-3"><div class="mb-2 flex items-center gap-3"><span class="text-xs font-medium">Default action</span><div class="w-40">${UI.select(['review', 'auto', 'block'], m.checkpoint.default_action || 'review', 'data-path="checkpoint.default_action" data-type="text"')}</div></div>
      <table class="w-full text-sm"><thead><tr class="text-start text-[11px] uppercase text-slate-500"><th class="py-1 text-start">Tool pattern</th><th class="text-start">Action</th><th class="text-start">Risk</th><th></th></tr></thead><tbody>
      ${m.checkpoint.rules.map((r, i) => `<tr class="border-t border-slate-100"><td class="py-1.5 pe-2">${UI.input(r.tool, `class="font-mono" data-rule="${i}" data-k="tool" placeholder="crm.* or *"`)}</td><td class="pe-2">${UI.select(['review', 'auto', 'block'], r.action, `data-rule="${i}" data-k="action"`)}</td><td class="pe-2">${UI.select(['low', 'medium', 'high', 'critical'], r.risk, `data-rule="${i}" data-k="risk"`)}</td><td>${UI.iconBtn('trash-2', () => { m.checkpoint.rules.splice(i, 1); rerenderBuilder(); })}</td></tr>`).join('')}</tbody></table>
      <div class="mt-2">${UI.btn('Add rule', { size: 'sm', icon: 'plus', onclick: () => { m.checkpoint.rules.push({ tool: '', action: 'review', risk: 'medium' }); rerenderBuilder(); } })}</div></div>` : ''}
    <div class="rounded-md bg-slate-50 p-3"><div class="mb-2 text-xs font-medium text-slate-700">What happens to each tool this worker can call</div>
      <div id="checkpoint-preview" class="grid gap-1 sm:grid-cols-2">${checkpointPreview(m, tools)}</div>
      <p class="mt-2 text-[11px] text-slate-500">Organisation checkpoint rules (Live ops › Checkpoints queue) can add a review or a second approver on top of this.</p></div></div>`;
}
function checkpointPreview(m, tools) {
  return tools.map(tl => { const [act, why] = checkpointAction(m, tl); return `<div class="flex items-center gap-2 text-xs"><span class="w-32 truncate font-mono">${tl}</span>${UI.badge(act === 'auto' ? 'runs automatically' : act === 'block' ? 'blocked' : 'pauses for approval', act === 'auto' ? 'green' : act === 'block' ? 'red' : 'amber')}<span class="truncate text-slate-400">${why}</span></div>`; }).join('');
}

// ---------- Pickers ----------
function pickerDrawer(title, sub, rows, onSave) {
  UI.drawer({ title: `<h2 class="text-base font-semibold">${title}</h2>`, sub, body: `<div id="pick">${rows}</div>`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn('Add selected', { variant: 'primary', onclick: () => { const sel = [...document.querySelectorAll('#pick input[type=checkbox]:checked')].map(i => i.value); onSave(sel); UI.closeOverlay(); rerenderBuilder(); } }) });
}
function mcpPicker(a) {
  const m = blueprintOf(a);
  const has = (s, tl) => m.tools.mcp.some(g => g.integration === s && g.tools.includes(tl));
  const servers = DB.integrations.filter(i => i.type === 'MCP server' || i.type === 'Website');
  pickerDrawer('Add MCP tools', 'Only tools from connected servers. A declared tool is callable only after a grant.', servers.map(s => `<div class="mb-4 rounded-lg border border-slate-200">
    <div class="flex items-center justify-between border-b border-slate-100 px-3 py-2"><div><div class="text-sm font-medium">${s.name}</div><div class="font-mono text-xs text-slate-500">${s.key} · ${s.transport}</div></div>${UI.status(s.status)}</div>
    ${s.tools.map(tl => `<label class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50"><input type="checkbox" value="${s.key}|${tl}" ${has(s.key, tl) ? 'checked disabled' : ''} class="rounded text-brand-600"/><span class="font-mono">${tl}</span>${UI.badge(TOOL_RISK[tl] || 'low', riskTone(TOOL_RISK[tl]))}
      <span class="ms-auto text-xs ${(GRANTS[tl] || []).includes(a.id) ? 'text-emerald-600' : 'text-slate-400'}">${(GRANTS[tl] || []).includes(a.id) ? 'granted' : 'needs grant'}</span></label>`).join('')}</div>`).join(''),
    sel => sel.forEach(v => { const [s, tl] = v.split('|'); let g = m.tools.mcp.find(g => g.integration === s); if (!g) m.tools.mcp.push(g = { integration: s, tools: [] }); if (!g.tools.includes(tl)) g.tools.push(tl); }));
}
function remotePicker(a) {
  const m = blueprintOf(a);
  pickerDrawer('Add remote workers', 'External / A2A agents registered under Connectors.', DB.integrations.filter(i => i.group === 'agents').map(r => `<label class="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" value="${r.key}" ${m.tools.remote_agents.some(x => x.key === r.key) ? 'checked disabled' : ''} class="rounded text-brand-600"/><div><div class="font-medium">${r.name}</div><div class="font-mono text-xs text-slate-500">${r.key} · ${r.transport}</div></div><span class="ms-auto">${UI.status(r.status)}</span></label>`).join('') +
    `<p class="mt-3 text-xs text-slate-500">Need another? ${UI.btn('Add connector', { size: 'sm', variant: 'ghost', onclick: () => { UI.closeAll(); openAddIntegration(); } })}</p>`,
    sel => sel.forEach(s => m.tools.remote_agents.push({ key: s })));
}
function dbPicker(a) {
  const m = blueprintOf(a);
  pickerDrawer('Add database connector', 'Read-only by default.', DB.integrations.filter(i => i.type === 'Database').map(d => `<div class="rounded-lg border border-slate-200 p-3"><div class="flex justify-between"><div><div class="text-sm font-medium">${d.name}</div><div class="font-mono text-xs text-slate-500">${d.key} · ${d.transport}</div></div>${UI.badge('writes disabled', 'gray')}</div>
    <label class="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" value="${d.key}|query.read" class="rounded text-brand-600"/><span class="font-mono">query.read</span>${UI.badge('medium', 'amber')}</label>
    <label class="mt-1 flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" disabled class="rounded"/><span class="font-mono">query.execute</span>${UI.badge('critical', 'red')}<span class="text-xs">enable writes on the connector first</span></label></div>`).join(''),
    sel => sel.forEach(v => { const [c, op] = v.split('|'); let d = m.tools.databases.find(x => x.connector === c); if (!d) m.tools.databases.push(d = { connector: c, operations: [] }); if (!d.operations.includes(op)) d.operations.push(op); }));
}
function kbPicker(m) {
  pickerDrawer('Attach library collections', 'Attached bases are searched with kb.search and cited in answers.', DB.kbs.map(k => `<label class="mb-2 flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" value="${kbKey(k)}" ${m.knowledge.bases.includes(kbKey(k)) ? 'checked disabled' : ''} class="rounded text-brand-600"/>
    <div><div class="font-medium">${k.name}</div><div class="text-xs text-slate-500">${k.docs} docs · ${k.model} · ${DB.nodeById(k.node)?.name}</div></div></label>`).join(''),
    sel => { sel.forEach(s => { if (!m.knowledge.bases.includes(s)) m.knowledge.bases.push(s); }); if (sel.length && !m.tools.builtin.includes('kb.search')) m.tools.builtin.push('kb.search'); });
}

// ---------- Try it live (live run) ----------
const testState = a => AG.test[a.id] || (AG.test[a.id] = { msgs: [], busy: false });
function testPanel(a) {
  const m = blueprintOf(a);
  return `<aside class="w-full shrink-0 xl:w-96"><div class="sticky top-24 flex h-[calc(100vh-200px)] flex-col rounded-lg border border-slate-200 bg-white">
    <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><div class="text-sm font-semibold">Try it live</div><div class="text-xs text-slate-500">Real, metered run · origin <span class="font-mono">draft_test</span> · checkpoint: ${m.checkpoint.default.replace(/_/g, ' ')}</div></div>
      <div class="flex">${UI.iconBtn('rotate-ccw', () => { AG.test[a.id] = { msgs: [], busy: false }; drawTest(a); }, 'New conversation')}${UI.iconBtn('x', () => { AG.testOpen = false; APP.render(); }, t('close'))}</div></div>
    <div id="test-body" class="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">${testBody(a)}</div>
    <div class="flex gap-2 border-t border-slate-100 p-3"><input id="test-input" class="${UI.inputCls}" placeholder="Message the draft…" onkeydown="if(event.key==='Enter'){window.testSend('${a.id}', this.value); this.value='';}"/>${UI.btn('', { icon: 'send-horizontal', variant: 'primary', onclick: () => { const i = document.getElementById('test-input'); testSend(a.id, i.value); i.value = ''; } })}</div></div></aside>`;
}
function testBody(a) {
  const st = testState(a), m = blueprintOf(a);
  if (!st.msgs.length) return `<p class="text-xs text-slate-500">Suggested openers from the draft:</p><div class="flex flex-wrap gap-2">${m.identity.starter_questions.slice(0, 6).map(q => `<button onclick="${UI.fn(() => testSend(a.id, q))}" class="rounded-full bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200">${UI.esc(q)}</button>`).join('') || '<span class="text-xs text-slate-400">None configured — no chips.</span>'}</div>`;
  return st.msgs.map((x, mi) => x.u ? `<div class="ms-8 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white">${UI.esc(x.u)}</div>` : `<div class="me-4 space-y-2">
    <details ${x.done ? '' : 'open'} class="rounded-md border border-slate-200 text-xs"><summary class="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-slate-600">${x.done ? UI.icon('check-circle-2', 'w-3.5 h-3.5 text-emerald-500') : UI.icon('loader-2', 'w-3.5 h-3.5 animate-spin text-brand-500')} Run <span class="font-mono">${x.run}</span> · ${x.steps.length} steps</summary>
      <ol class="space-y-1 border-t border-slate-100 p-2">${x.steps.map(s => `<li class="flex items-center gap-2">${UI.icon(s.icon, 'w-3.5 h-3.5 ' + (s.status === 'waiting' ? 'text-amber-500' : s.status === 'rejected' ? 'text-rose-500' : 'text-slate-400'))}<span class="flex-1 truncate font-mono">${s.name}</span><span class="${s.status === 'waiting' ? 'text-amber-600' : s.status === 'rejected' ? 'text-rose-600' : 'text-slate-400'}">${s.meta}</span></li>`).join('')}</ol></details>
    ${x.approval ? `<div class="rounded-md bg-amber-50 p-2.5 text-xs text-amber-900 ring-1 ring-amber-200"><div class="flex items-center gap-1.5 font-medium">${UI.icon('hourglass', 'w-3.5 h-3.5')} Waiting for approval · <span class="font-mono">${x.approval.tool}</span> ${UI.badge(x.approval.risk, riskTone(x.approval.risk))}</div>
      <div class="mt-1 text-amber-800">${x.approval.why}. Args: <span class="font-mono">${x.approval.args}</span></div>
      <div class="mt-2 flex gap-2">${UI.btn('Approve', { size: 'sm', variant: 'primary', onclick: () => decide(a, mi, true) })}${UI.btn('Reject', { size: 'sm', onclick: () => decide(a, mi, false) })}</div></div>` : ''}
    ${x.text ? `<div class="rounded-lg bg-slate-100 px-3 py-2 text-sm">${x.text}${x.cites?.length ? `<div class="mt-2 flex flex-wrap gap-1">${x.cites.map(c => UI.badge(UI.icon('file-text', 'w-3 h-3') + c, 'gray')).join('')}</div>` : ''}</div>
      <div class="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500"><span>${x.tokens.toLocaleString()} tokens</span><span>$${x.cost.toFixed(4)}</span><span>${x.latency}s</span><a href="#/executions" class="text-brand-600">Open run ›</a></div>` : ''}</div>`).join('');
}
function drawTest(a) { const b = document.getElementById('test-body'); if (!b) return; b.innerHTML = testBody(a); UI.refreshIcons(); b.scrollTop = b.scrollHeight; }

window.testSend = function (aid, q) {
  const a = DB.agentById(aid); if (!q || !q.trim() || !a) return;
  const m = blueprintOf(a), st = testState(a);
  if (st.busy) { UI.toast('Wait for the current run to finish', 'info'); return; }
  st.busy = true;
  const reply = { run: Math.random().toString(16).slice(2, 8), steps: [], tokens: 0, cost: 0, latency: 0 };
  st.msgs.push({ u: q }, reply);
  const wantsAction = /request|renew|open|create|book|طلب/i.test(q);
  const kb = m.knowledge.bases.length && m.tools.builtin.includes('kb.search');
  const plan = [
    { icon: 'shield', name: `guardrail.input · ${m.guardrails.policy}`, meta: 'pass · 4ms' },
    ...(m.memory.enabled && !['confidential', 'secret'].includes(m.risk.classification) ? [{ icon: 'brain', name: 'recall.search', meta: '2 memories · 38ms' }] : []),
    { icon: 'sparkles', name: `llm · ${m.model.model}`, meta: '612 tok · 0.9s', tok: 612 },
    ...(kb ? [{ icon: 'wrench', name: 'tool · kb.search', meta: '3 passages · 340ms', tool: 'kb.search' }] : []),
    ...(wantsAction ? [{ icon: 'wrench', name: 'tool · crm.create_request', meta: '210ms', tool: 'crm.create_request', args: '{ type: "licence_renewal" }' }] : []),
    { icon: 'sparkles', name: `llm · ${m.model.model}`, meta: '588 tok · 0.8s', tok: 588 },
    { icon: 'shield-check', name: 'guardrail.output · grounding', meta: kb ? 'grounded · 12ms' : 'flag: no sources · 12ms' }
  ];
  let i = 0;
  const finish = (rejected) => {
    reply.done = true; st.busy = false; reply.latency = +(1.4 + reply.steps.length * 0.3).toFixed(1);
    reply.text = rejected ? 'I could not create the request because it was not approved. I can explain the renewal steps instead, or hand you to a staff member.'
      : wantsAction ? `I've opened renewal request <b>REQ-20431</b>. Renewal takes 3 working days and costs 150 AED.` : kb ? 'Trade-licence renewal takes 3 working days and costs 150 AED. You need the current licence, an Emirates ID copy and the tenancy contract.' : 'I do not have an approved source for that, so I cannot answer reliably. Attach a library collection or ask a staff member.';
    reply.cites = kb && !rejected ? ['01-service-catalogue.pdf #12', 'fees-schedule-2026.xlsx #3'] : [];
    drawTest(a);
  };
  const next = () => {
    if (i >= plan.length) return finish(false);
    const s = plan[i++];
    if (s.tool) {
      const [act, why] = checkpointAction(m, s.tool);
      if (act === 'block') { reply.steps.push({ ...s, status: 'rejected', meta: 'blocked by rule' }); drawTest(a); return setTimeout(next, 400); }
      if (act === 'review') {
        reply.steps.push({ ...s, icon: 'hourglass', status: 'waiting', meta: 'waiting approval' });
        reply.approval = { tool: s.tool, risk: TOOL_RISK[s.tool] || 'medium', why: why[0].toUpperCase() + why.slice(1), args: s.args || `{ query: "${q.slice(0, 30)}" }`, resume: next, finish };
        drawTest(a); return;
      }
    }
    reply.steps.push(s); reply.tokens += s.tok || 40; reply.cost += (s.tok || 40) * 0.0000016; drawTest(a); setTimeout(next, 450);
  };
  drawTest(a); setTimeout(next, 300);
};
function decide(a, mi, ok) {
  const x = testState(a).msgs[mi]; const ap = x.approval; if (!ap) return;
  const s = x.steps[x.steps.length - 1]; x.approval = null;
  if (ok) { s.icon = 'wrench'; s.status = 'done'; s.meta = 'approved · 210ms'; drawTest(a); setTimeout(ap.resume, 400); }
  else { s.icon = 'x-circle'; s.status = 'rejected'; s.meta = 'rejected → refusal to model'; drawTest(a); setTimeout(() => ap.finish(true), 500); }
}

// ---------- Diff + release flow ----------
function flatten(o, p = '', out = {}) {
  if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).forEach(k => flatten(o[k], p ? `${p}.${k}` : k, out)); else out[p] = JSON.stringify(o);
  return out;
}
function diffBlueprint(oldM, newM) {
  const A = flatten(oldM), B = flatten(newM);
  return [...new Set([...Object.keys(A), ...Object.keys(B)])].filter(k => A[k] !== B[k]).map(k => ({ path: k, from: A[k], to: B[k] }));
}
window.releaseDialog = function (a) {
  const m = blueprintOf(a); AG.currentId = a.id;
  const issues = checkBlueprint(m), errors = issues.filter(i => i.level === 'error'), warns = issues.filter(i => i.level === 'warn');
  const gates = m.evaluation.release_gates.map(g => ({ ...g, score: EVAL_SCORES[g.suite] ?? 0 }));
  const gateFail = gates.filter(g => g.score < g.min_score);
  const diff = diffBlueprint(releasedOf(a), m);
  const blocked = errors.length || gateFail.length || !diff.length;
  const row = (ok, text, tone) => `<div class="flex items-start gap-2 text-sm ${tone}">${UI.icon(ok === true ? 'check-circle-2' : ok === 'warn' ? 'alert-triangle' : 'octagon-x', 'w-4 h-4 mt-0.5 shrink-0')}<span>${text}</span></div>`;
  UI.modal({ title: `Release v${a.version + 1}`, sub: `${a.name} · replaces active v${a.version}`, size: 'lg', body: `
    <div class="grid gap-5 md:grid-cols-2"><div class="space-y-4">
      ${UI.field('What changed in this release?', UI.textarea(AG.changelog[a.id] || '', 'id="pub-note" placeholder="Changelog note (recommended)"', 3), 'Stored with the version and shown in Releases.')}
      <div class="rounded-md border border-slate-200 p-3"><div class="mb-2 text-xs font-semibold uppercase text-slate-500">Checks</div><div class="space-y-1.5">
        ${row(true, 'Blueprint matches schema 1.0', 'text-emerald-700')}
        ${errors.length ? errors.map(e => row(false, UI.esc(e.msg), 'text-rose-700')).join('') : row(true, 'No two-key capability conflicts', 'text-emerald-700')}
        ${gates.length ? gates.map(g => row(g.score >= g.min_score, `Target <span class="font-mono">${g.suite}</span>: ${g.score.toFixed(2)} ${g.score >= g.min_score ? '≥' : '<'} ${g.min_score}`, g.score >= g.min_score ? 'text-emerald-700' : 'text-rose-700')).join('') : row('warn', 'No release gates configured', 'text-amber-700')}
        ${warns.map(w => row('warn', UI.esc(w.msg), 'text-amber-700')).join('')}
        ${!diff.length ? row(false, 'No changes since the active version', 'text-rose-700') : ''}
      </div></div></div>
      <div><div class="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-slate-500"><span>Changes vs v${a.version}</span><span>${diff.length}</span></div>
        <div class="max-h-80 overflow-y-auto rounded-md border border-slate-200 scrollbar-thin" dir="ltr">${diff.length ? diff.map(d => `<div class="border-b border-slate-100 px-3 py-2 font-mono text-[11px]"><div class="text-slate-500">${d.path}</div><div class="bg-rose-50 text-rose-800">- ${UI.esc(d.from ?? '∅')}</div><div class="bg-emerald-50 text-emerald-800">+ ${UI.esc(d.to ?? '∅')}</div></div>`).join('') : '<p class="p-4 text-center text-sm text-slate-400">Nothing changed.</p>'}</div></div></div>
    ${blocked ? `<p class="mt-4 rounded-md bg-rose-50 p-2.5 text-xs text-rose-800">${UI.icon('lock', 'w-3.5 h-3.5 inline')} Releasing is blocked until the red checks pass.</p>` : `<p class="mt-4 text-xs text-slate-500">Released versions are immutable. New runs use v${a.version + 1}; in-flight runs keep v${a.version}. This action is audited.</p>`}`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn(`Release v${a.version + 1}`, { variant: 'primary', icon: 'upload-cloud', disabled: blocked, onclick: () => {
      const note = document.getElementById('pub-note').value || 'No changelog note';
      a.version++; a.released = true; AG.released[a.id] = clone(m); AG.changelog[a.id] = '';
      DB.versions.forEach(v => { if (v.state === 'active') v.state = 'archived'; });
      DB.versions.unshift({ v: a.version, state: 'active', at: new Date().toISOString().slice(0, 16).replace('T', ' '), note });
      UI.closeOverlay(); APP.render(); UI.toast(`Released v${a.version} — new runs use this version`);
    } }) });
};

// ---------- Builder tab ----------
function rerenderBuilder() { const y = window.scrollY; APP.render(); window.scrollTo(0, y); }

function builderTab(a) {
  AG.currentId = a.id;
  const m = blueprintOf(a); releasedOf(a);
  const issues = checkBlueprint(m);
  const diffN = diffBlueprint(releasedOf(a), m).length;

  const identity = `<div class="grid gap-4 sm:grid-cols-2">${fieldCtl(m, 'identity.display_name', 'Display name', 'text')}
    ${UI.field('Display name (Arabic)', UI.input(m.identity.display_name_ar, 'dir="rtl" data-path="identity.display_name_ar" data-type="text"'))}
    ${fieldCtl(m, 'identity.tone', 'Tone', 'select', ['formal', 'friendly', 'concise', 'empathetic'])}${fieldCtl(m, 'identity.language', 'Language', 'select', [['en', 'English'], ['ar', 'Arabic'], ['bilingual', 'Bilingual']])}
    <div class="sm:col-span-2">${UI.field('Instructions', UI.textarea(m.identity.persona, 'data-path="identity.persona" data-type="text"', 5))}</div>
    <div class="sm:col-span-2">${UI.field('Suggested openers', UI.textarea(m.identity.starter_questions.join('\n'), 'data-path="identity.starter_questions" data-type="lines"', 4), 'One per line, max 6. Shown as chat chips. None = no chips.')}</div></div>`;
  const model = `<div class="grid gap-4 sm:grid-cols-2">${fieldCtl(m, 'model.registered_model_id', 'Registered model (BYOK)', 'select', [['', '— deployment default —'], ...DB.models.map(x => [x.id, `${x.display} · ${x.provider}`])])}
    ${fieldCtl(m, 'model.model', 'Model', 'select', DB.models.map(x => x.id))}${fieldCtl(m, 'model.temperature', 'Temperature', 'range', { min: 0, max: 2, step: 0.1 })}${fieldCtl(m, 'model.max_output_tokens', 'Max output tokens', 'number')}</div>
    <p class="mt-3 text-xs text-slate-500">Fallbacks and cooldown live under Advanced › Backup models.</p>`;

  const formView = `<div class="space-y-4">
    ${sectionCard('identity', '1 · Identity', 'user-round', identity, m, a, issues)}
    ${sectionCard('model', '2 · Model', 'cpu', model, m, a, issues)}
    ${sectionCard('tools', '3 · Tools', 'wrench', toolsSection(m, a), m, a, issues)}
    ${sectionCard('knowledge', '4 · Library collections', 'library', knowledgeSection(m), m, a, issues)}
    ${sectionCard('checkpoint', '5 · Human checkpoints', 'shield-check', checkpointSection(m), m, a, issues)}
    <div class="pt-2"><h3 class="text-sm font-semibold">Advanced</h3><p class="text-xs text-slate-500">Sections holding non-default values show a "Configured" badge — nothing active is ever hidden.</p></div>
    ${ADV.map(([k, l, base, fields]) => sectionCard(k, l, '', `<div class="grid gap-4 sm:grid-cols-2">${fields.map(([p, lab, ty, opt]) => `<div class="${['lines', 'json', 'gates', 'checks', 'bool'].includes(ty) ? 'sm:col-span-2' : ''}">${fieldCtl(m, `${base}.${p}`, lab, ty, opt)}</div>`).join('')}</div>`, m, a, issues, true)).join('')}
  </div>`;

  const jsonView = `<div class="rounded-lg border border-slate-200 bg-white"><div class="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500"><span>blueprint.json · blueprint_version ${m.blueprint_version}</span><span id="json-status" class="text-emerald-600">✓ Valid</span></div>
    <textarea id="json-editor" spellcheck="false" class="json-editor h-[640px] w-full resize-y rounded-b-lg p-4 focus:outline-none" dir="ltr">${UI.esc(JSON.stringify(m, null, 2))}</textarea></div>`;

  const errs = issues.filter(i => i.level === 'error').length;
  const html = `<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      ${UI.segmented([{ key: 'form', label: 'Form', icon: 'layout-list' }, { key: 'json', label: 'JSON', icon: 'braces' }], AG.mode, k => { AG.mode = k; APP.render(); })}
      <div class="flex items-center gap-2">${UI.specTag('F-BLD-04')}${UI.btn('Try it live', { icon: 'flask-conical', variant: AG.testOpen ? 'primary' : 'secondary', onclick: () => { AG.testOpen = !AG.testOpen; APP.render(); } })}</div></div>
    <div class="flex flex-col gap-5 xl:flex-row">${AG.mode === 'form' ? outline(m, a, issues) : ''}<div class="min-w-0 flex-1 pb-24">${AG.mode === 'form' ? formView : jsonView}</div>${AG.testOpen ? testPanel(a) : ''}</div>
    <div class="dock-bottom border-t border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-6 py-3">
        <span class="flex items-center gap-2 text-sm">${UI.badge('Working copy v' + (a.version + 1), 'amber')}<span id="diff-count" class="text-xs text-slate-600">${diffN} changes vs v${a.version}</span><span class="text-slate-300">·</span><span id="save-state" class="text-xs text-slate-500">all changes saved</span></span>
        <input id="draft-note" class="${UI.inputCls} max-w-md flex-1" placeholder="What changed in this release?" value="${UI.esc(AG.changelog[a.id] || '')}"/>
        <div class="ms-auto flex gap-2">${UI.btn(t('discard'), { disabled: !diffN, onclick: () => UI.confirm('Discard working copy?', `Revert ${diffN} change(s) back to the active v${a.version}.`, () => { AG.blueprints[a.id] = clone(releasedOf(a)); APP.render(); UI.toast('Working copy discarded'); }, t('discard')) })}
          ${UI.btn(t('saveDraft'), { icon: 'save', onclick: () => UI.toast('Working copy saved') })}${UI.btn('Review & release', { variant: 'primary', icon: errs ? 'lock' : 'upload-cloud', onclick: () => releaseDialog(a) })}</div>
      </div></div>`;

  const after = () => {
    const root = document.getElementById('app');
    document.getElementById('draft-note')?.addEventListener('input', e => { AG.changelog[a.id] = e.target.value; });
    root.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const k = b.dataset.goto; const el = document.getElementById('sec-' + k); if (!el) return; if (el.tagName === 'DETAILS') { el.open = true; AG.openSec[k] = true; } el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const onField = el => {
      const p = el.dataset.path, ty = el.dataset.type; let v;
      if (ty === 'bool') v = el.checked;
      else if (ty === 'checks') v = [...root.querySelectorAll(`[data-path="${p}"][data-type="checks"]:checked`)].map(x => x.dataset.val);
      else if (ty === 'lines') v = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      else if (ty === 'number' || ty === 'range') { v = Number(el.value); const o = root.querySelector(`[data-range-out="${p}"]`); if (o) o.textContent = v; }
      else if (ty === 'json') { if (!el.value.trim()) v = null; else { try { v = JSON.parse(el.value); el.classList.remove('border-rose-500'); } catch { el.classList.add('border-rose-500'); return; } } }
      else v = el.value === '' && el.tagName === 'SELECT' ? null : el.value;
      setPath(m, p, v); markDirty(); refreshStatus(a);
      if (p.startsWith('tools.') || p.startsWith('checkpoint.')) { const hp = document.getElementById('checkpoint-preview'); if (hp) hp.innerHTML = checkpointPreview(m, [...new Set(agentTools(m))]); UI.refreshIcons(); }
    };
    root.querySelectorAll('[data-path]').forEach(el => el.addEventListener(['checkbox', 'range'].includes(el.type) || el.tagName === 'SELECT' ? 'change' : 'input', () => onField(el)));
    root.querySelectorAll('input[type=range][data-path]').forEach(el => el.addEventListener('input', () => onField(el)));
    root.querySelectorAll('[data-rule]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { m.checkpoint.rules[+el.dataset.rule][el.dataset.k] = el.value; markDirty(); refreshStatus(a); const hp = document.getElementById('checkpoint-preview'); if (hp) { hp.innerHTML = checkpointPreview(m, [...new Set(agentTools(m))]); UI.refreshIcons(); } }));
    root.querySelectorAll('[data-gate]').forEach(el => el.addEventListener('change', () => { const g = m.evaluation.release_gates[+el.dataset.gate]; g[el.dataset.k] = el.dataset.k === 'min_score' ? Number(el.value) : el.value; markDirty(); refreshStatus(a); }));
    const je = document.getElementById('json-editor');
    if (je) je.addEventListener('input', () => {
      const s = document.getElementById('json-status');
      try { const parsed = JSON.parse(je.value); if (!parsed.identity || !parsed.model) throw new Error('missing required key "identity" or "model"'); AG.blueprints[a.id] = parsed; s.className = 'text-emerald-600'; s.textContent = '✓ Valid'; markDirty(); }
      catch (e) { s.className = 'text-rose-600'; s.textContent = '✕ ' + e.message + ' — save blocked'; }
    });
  };
  return { html, after };
}
function markDirty() {
  const s = document.getElementById('save-state'); if (!s) return;
  s.textContent = 'saving…'; clearTimeout(markDirty.t); markDirty.t = setTimeout(() => { s.textContent = 'all changes saved'; }, 600);
}
