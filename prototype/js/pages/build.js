// BUILD › Flows, Squads, Playbooks, Knowledge, Connectors

// Flow designer, versions and release flow live in flows.js
function workflowsList() {
  const rows = DB.workflows.filter(w => (WF.chip === 'all' || (WF.chip === 'pub' ? w.released : !w.released)) && (!WF.q || w.name.toLowerCase().includes(WF.q.toLowerCase())));
  return UI.pageHeader(t('flows'), 'Map out a process step by step: hand work between workers, stop for a person where needed, and branch on the outcome.',
    UI.btn('Start from template', { icon: 'layout-template', onclick: templatesModal }) + UI.btn('Import BPMN', { icon: 'file-up', onclick: bpmnModal }) + UI.btn(t('newWorkflow'), { icon: 'plus', variant: 'primary', onclick: () => newWorkflowDialog() }), UI.specTag('F-WF-01')) +
    UI.card(`<div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
      <div class="relative w-64">${UI.icon('search', 'w-4 h-4 absolute start-3 top-2.5 text-slate-400')}<input class="${UI.inputCls} ps-9" placeholder="Search flows" value="${UI.esc(WF.q)}" onchange="${UI.fn(e => { WF.q = e.target.value; APP.render(); })}"/></div>
      ${UI.chips([{ key: 'all', label: t('all'), count: DB.workflows.length }, { key: 'pub', label: 'Released', count: DB.workflows.filter(w => w.released).length }, { key: 'draft', label: 'Working copy', count: DB.workflows.filter(w => !w.released).length }], WF.chip, k => { WF.chip = k; APP.render(); })}</div>` +
    UI.table(['Flow', 'Released', t('status'), 'Nodes', 'Last update'], rows.map(w => ({ onclick: () => location.hash = '#/flows/' + w.id,
      cells: [`<div class="font-medium">${w.name}</div><div class="font-mono text-xs text-slate-500">${w.key}</div>`, w.released ? UI.badge('v' + w.version, 'green') : UI.badge('working copy', 'amber'), UI.status(w.status), w.nodes, w.updated] })),
      { empty: UI.emptyState('workflow', 'No flows yet', 'A workflow chains workers with hand-offs, human gates, and branches. Create one, then run a test to see the node-by-node timeline.', UI.btn(t('newWorkflow'), { variant: 'primary', icon: 'plus', onclick: () => newWorkflowDialog() })) }));
}

function newWorkflowDialog(tpl) {
  const name = tpl ? tpl.name : '';
  UI.modal({ title: tpl ? `Use template · ${tpl.name}` : t('newWorkflow'), size: 'sm', body: `<div class="space-y-4">${UI.field('Name', UI.input(name, 'id="wf-name"'))}${UI.field('Key', UI.input(tpl ? tpl.key + '-copy' : '', 'id="wf-key" class="font-mono"'))}</div>`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn(t('create'), { variant: 'primary', onclick: () => {
      const n = document.getElementById('wf-name').value || 'Untitled flow';
      const id = 'w' + Date.now();
      DB.workflows.unshift({ id, key: document.getElementById('wf-key').value || n.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: n, released: false, version: 0, status: 'draft', nodes: 2, updated: 'today', template: tpl?.key });
      UI.closeAll(); location.hash = '#/flows/' + id; UI.toast(tpl ? 'Flow created from template' : 'Flow created');
    } }) });
}

function templatesModal() {
  UI.modal({ title: 'Start from a template', size: 'xl', body: `<div class="mb-4 flex flex-wrap gap-3"><div class="relative flex-1 min-w-[200px]">${UI.icon('search', 'w-4 h-4 absolute start-3 top-2.5 text-slate-400')}<input class="${UI.inputCls} ps-9" placeholder="Search templates"/></div>
    <div class="w-44">${UI.select(['All categories', 'ops', 'governance', 'support', 'integration'])}</div>${UI.btn('Save as template', { icon: 'bookmark-plus' })}</div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${DB.wfTemplates.map((tp, i) => `<div class="flex flex-col rounded-lg border border-slate-200 p-4">
      <div class="flex items-center gap-2"><span class="font-medium text-sm">${tp.name}</span>${UI.badge(tp.scope, tp.scope === 'Platform' ? 'indigo' : 'violet')}</div>
      <div class="mt-1 flex gap-2 text-xs text-slate-500">${UI.badge(tp.category, 'gray')}<span class="font-mono">${tp.key}</span></div>
      <p class="mt-2 flex-1 text-xs text-slate-600">${tp.desc}</p><div class="mt-3">${UI.btn('Use', { size: 'sm', variant: 'primary', onclick: () => newWorkflowDialog(DB.wfTemplates[i]) })}</div></div>`).join('')}</div>` });
}

function bpmnModal() {
  UI.modal({ title: 'Import BPMN 2.0', body: `<div class="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">${UI.icon('file-up', 'w-8 h-8 mx-auto text-slate-400')}<p class="mt-2 text-sm">Drop a <span class="font-mono">.bpmn</span> XML file or <span class="text-brand-600">browse</span></p></div>
    <div class="mt-4 text-xs text-slate-500"><div class="mb-1 font-medium text-slate-700">Mapping</div>userTask → Manual step · serviceTask → API call / Tool call / Worker step · exclusiveGateway → Decision · parallelGateway → Fan-out · intermediateCatchEvent → Await signal · subProcess → Sub-flow</div>
    <div class="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">Sample import report: 11 elements mapped, 1 unmapped (<span class="font-mono">boundaryTimerEvent_3</span>). Result is a draft.</div>`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn('Import as draft', { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Imported as draft flow (mock)'); } }) });
}


// =============== Squads (F-CRW-01) ===============
PAGES.squads = function () {
  return UI.pageHeader(t('squads'), 'A squad is a lead worker plus helpers. The lead splits the job, helpers work on a shared notepad, and the lead pulls it together.', UI.btn('New squad', { icon: 'plus', variant: 'primary', onclick: crewDrawer }), UI.specTag('F-CRW-01')) +
    UI.card(UI.table(['Squad', 'Lead', 'Helpers', 'Audience', t('status')], DB.crews.map(c => ({ onclick: () => crewDrawer(c), cells: [
      `<div class="font-medium">${c.name}</div><div class="font-mono text-xs text-slate-500">${c.key}</div>`,
      c.planner ? DB.agentById(c.planner).name : `<span class="flex items-center gap-1 text-amber-600">${UI.icon('alert-triangle', 'w-3.5 h-3.5')}No lead chosen</span>`,
      `<div class="flex flex-wrap gap-1">${c.executors.map(e => UI.badge(DB.agentById(e).name, 'gray')).join('')}</div>`, UI.audience(c.audience), UI.status(c.status)] }))));
};
function crewDrawer(c) {
  c = c && c.id ? c : { name: '', key: '', planner: null, executors: [], desc: '' };
  const members = [...(c.planner ? [[c.planner, 'planner']] : []), ...c.executors.map(e => [e, 'executor'])];
  UI.drawer({ title: `<h2 class="text-base font-semibold">${c.name || 'New squad'}</h2>`, body: `<div class="space-y-4">
    <div class="grid grid-cols-2 gap-3">${UI.field('Name', UI.input(c.name))}${UI.field('Key', UI.input(c.key, 'class="font-mono"'))}</div>
    ${UI.field('Lead worker', UI.select([['', '— none —'], ...DB.agents.map(a => [a.id, a.name])], c.planner || ''))}
    ${!c.planner ? `<div class="rounded-md bg-amber-50 p-2 text-xs text-amber-800">${UI.icon('alert-triangle', 'w-3.5 h-3.5 inline')} No lead chosen</div>` : ''}
    <div><div class="mb-1 flex items-center justify-between"><span class="text-xs font-medium">Members</span>${UI.btn('Add worker', { size: 'sm', icon: 'plus' })}</div>
      <div class="space-y-1.5">${members.map(([id, role]) => `<div class="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">${UI.icon('bot', 'w-4 h-4 text-slate-400')}${DB.agentById(id).name}<span class="ms-auto w-32">${UI.select(['lead', 'helper'], role)}</span></div>`).join('') || '<p class="text-xs text-slate-400">No members yet.</p>'}</div>
      <p class="mt-1 text-xs text-slate-500">Everyone in the squad writes to one shared notepad. ${members.length} added.</p></div>
    ${UI.field('Description', UI.textarea(c.desc, '', 3))}</div>`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn(t('save'), { variant: 'primary', onclick: () => { UI.closeOverlay(); UI.toast('Squad saved'); } }) });
}

// =============== Playbooks (F-SKL-01/02) ===============
const SK = { status: 'all', source: 'all', q: '' };
PAGES.playbooks = function () {
  const c = s => DB.skills.filter(x => s === 'all' || x.status === s).length;
  const rows = DB.skills.filter(s => (SK.status === 'all' || s.status === SK.status) && (SK.source === 'all' || s.source === SK.source) &&
    (!SK.q || (s.name + s.desc + s.triggers.join(' ')).toLowerCase().includes(SK.q.toLowerCase())));
  return UI.pageHeader(t('playbooks'), 'Step-by-step know-how that workers look up mid-task. Every change makes a new numbered edition, and workers can suggest new playbooks from experience.', UI.btn('New playbook', { icon: 'plus', variant: 'primary', onclick: () => skillDialog() }), UI.specTag('F-SKL-01')) +
    UI.card(`<div class="space-y-3 border-b border-slate-100 p-3"><div class="relative">${UI.icon('sparkles', 'w-4 h-4 absolute start-3 top-2.5 text-brand-400')}<input class="${UI.inputCls} ps-9" placeholder="Describe the job and matching playbooks appear" value="${UI.esc(SK.q)}" onchange="${UI.fn(e => { SK.q = e.target.value; APP.render(); })}"/></div>
      <div class="flex flex-wrap items-center gap-3">${UI.chips([{ key: 'all', label: t('all'), count: c('all') }, { key: 'active', label: 'Active', count: c('active') }, { key: 'archived', label: 'Archived', count: c('archived') }], SK.status, k => { SK.status = k; APP.render(); })}
      <div class="w-40">${UI.select([['all', 'Source: All'], ['agent', 'Source: agent'], ['human', 'Source: human']], SK.source, `onchange="${UI.fn(e => { SK.source = e.target.value; APP.render(); })}"`)}</div></div></div>` +
    UI.table(['Playbook', 'Ref', t('status'), 'Source', 'Usage', ''], rows.map(s => [`<div class="font-medium">${s.name}</div><div class="max-w-md text-xs text-slate-500">${s.desc}</div>`, `<span class="font-mono text-xs">${s.key}@${s.ver}</span>`, UI.status(s.status),
      UI.badge(s.source, s.source === 'agent' ? 'violet' : 'gray'), s.usage,
      `<div class="flex justify-end gap-1">${UI.btn('Used by', { size: 'sm', variant: 'ghost', onclick: () => UI.modal({ title: 'Who uses ' + s.key, size: 'sm', body: DB.agents.slice(0, 3).map(a => `<div class="py-1 text-sm">${a.name}</div>`).join('') }) })}${UI.btn(s.status === 'active' ? 'Disable' : 'Enable', { size: 'sm', variant: 'ghost', onclick: () => { s.status = s.status === 'active' ? 'disabled' : 'active'; APP.render(); } })}${UI.btn(t('edit'), { size: 'sm', onclick: () => skillDialog(s) })}</div>`]))) +
    `<p class="mt-2 text-xs text-slate-500">Older editions can still be referenced as key@edition.</p>`;
};
function skillDialog(s) {
  UI.modal({ title: s ? `Edit · ${s.key}@${s.ver}` : 'New playbook', size: 'lg', body: `${s ? `<div class="mb-4 rounded-md bg-sky-50 p-3 text-xs text-sky-800">${UI.icon('info', 'w-3.5 h-3.5 inline')} Saving releasees <b class="font-mono">${s.key}@${s.ver + 1}</b> and archives <span class="font-mono">${s.key}@${s.ver}</span>. Releases are immutable.</div>` : ''}
    <div class="grid gap-4 sm:grid-cols-2">${UI.field('Name', UI.input(s?.name || ''))}${UI.field('Kind', UI.select(['instruction', 'procedure'], s?.kind))}
    <div class="sm:col-span-2">${UI.field('Description', UI.textarea(s?.desc || '', '', 2), 'Used for semantic recall and shown in search.')}</div>
    <div class="sm:col-span-2">${UI.field('Triggers', UI.textarea((s?.triggers || []).join('\n'), '', 3), 'One per line — when-to-use phrases.')}</div>
    <div class="sm:col-span-2">${UI.field('Prompt (body)', UI.textarea('1. Open with the formal salutation…\n2. State the subject…', 'class="font-mono"', 6))}</div></div>`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn(s ? `Release @${s.ver + 1}` : t('create'), { variant: 'primary', onclick: () => { if (s) s.ver++; UI.closeOverlay(); APP.render(); UI.toast(s ? `Released ${s.key}@${s.ver}` : 'Playbook created'); } }) });
}

// Knowledge lives in knowledge.js; Connectors in connectors.js
