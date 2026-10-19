// Section hubs: each sidebar section opens a tile board of its pages with a live metric and alert.
window.HUBS = {
  studio: { desc: 'Design the workers, flows and knowledge your organisation runs on.', tiles: {
    workers: ['Shape each digital worker from a blueprint: persona, model, tools and checkpoints.', () => `${DB.agents.length} workers · ${DB.agents.filter(a => a.released).length} released`, () => DB.agents.some(a => a.status === 'suspended') ? '1 paused' : ''],
    flows: ['Chain workers, checkpoints and decisions into end-to-end processes.', () => `${DB.workflows.length} flows`, () => DB.workflows.some(w => !w.released) ? '1 unreleased' : ''],
    squads: ['Group workers under a lead that splits a job and merges the result.', () => `${DB.crews.length} squads`, () => DB.crews.some(c => !c.planner) ? 'needs a lead' : ''],
    playbooks: ['Reusable, versioned how-tos that workers look up while they work.', () => `${DB.skills.filter(s => s.status === 'active').length} active`, () => ''],
    library: ['Documents and synced sources workers search and cite.', () => `${DB.kbs.length} collections · ${DB.kbs.reduce((s, k) => s + k.docs, 0)} docs`, () => '1 sync error'],
    connectors: ['Links to your business systems, partner workers and touchpoints.', () => `${DB.integrations.length} connectors`, () => { const n = DB.integrations.filter(i => ['Error', 'Not checked yet'].includes(i.status)).length; return n ? `${n} need attention` : ''; }]
  } },
  'live-ops': { desc: 'Watch and steer the work as it happens.', tiles: {
    conversations: ['Every customer and staff conversation, with hand-over to a person.', () => '38 open', () => '6 in queue'],
    touchpoints: ['Where workers meet people: web, WhatsApp, email, Teams and more.', () => '3 touchpoints', () => ''],
    people: ['The citizens and customers your workers serve, with privacy tags.', () => '2,410 people', () => ''],
    automations: ['Schedules and incoming events that start work automatically.', () => '4 of 5 on', () => ''],
    checkpoints: ['Actions paused for a human decision, oldest first.', () => '3 waiting', () => '1 near deadline'],
    executions: ['A replayable record of every run, step by step.', () => '819 this week', () => '3 failed'],
    safety: ['Filters on what workers read and say: privacy, injection, topics.', () => '2 rule sets', () => '']
  } },
  insights: { desc: 'Understand performance, experience and cost.', tiles: {
    health: ['Live status of executions, checkpoints and touchpoints.', () => '98.6% success', () => ''],
    cx: ['Resolution, hand-off and satisfaction across touchpoints.', () => '78% resolved by workers', () => ''],
    exports: ['Saved datasets, scheduled files and warehouse syncs.', () => '2 scheduled', () => ''],
    consumption: ['Tokens and spend by worker, flow and day.', () => '$188 this week', () => '']
  } },
  assurance: { desc: 'Prove quality before and after every release.', tiles: {
    'test-suites': ['Repeatable checks that gate a release.', () => '3 suites', () => '1 below target'],
    reviewers: ['Workers that score other workers and raise coaching notes.', () => '2 reviewers', () => ''],
    learned: ['Everything workers picked up on their own — undo in one click.', () => '14 this week', () => '2 to confirm'],
    recall: ['What workers remember between conversations.', () => '126 entries', () => ''],
    value: ['Results delivered, what they were worth, and receipts.', () => '$12.5k value', () => '']
  } },
  oversight: { desc: 'Who did what, under which rules.', tiles: {
    'oversight-summary': ['Trail volume, credentials, spend and rule coverage at a glance.', () => '7-day view', () => ''],
    credentials: ['Each worker\'s verifiable identity, keys and kill-switch.', () => `${DB.agents.filter(a => a.status === 'active').length} active`, () => '1 paused'],
    spend: ['Pre-approved budgets workers may spend within.', () => 'No budgets yet', () => ''],
    'assurance-report': ['A signed report on residency, isolation and controls.', () => 'Last: 30 days ago', () => ''],
    'activity-trail': ['Tamper-evident log of every change and action.', () => 'Chain verified', () => '']
  } },
  tenant: { desc: `Settings that belong to ${DB.tenant.name} only.`, tiles: {
    'org-structure': ['Departments, sections and units — settings flow down the tree.', () => `${DB.orgNodes.length} units`, () => ''],
    templates: ['Ready-made workers you can install and adapt.', () => `${DB.marketplace.length} templates`, () => ''],
    subscription: ['Your plan, limits and usage this period.', () => `${DB.tenant.plan} · ${DB.tenant.seats} seats`, () => ''],
    configuration: ['Profile, models, users, sign-in, data and developer settings.', () => '14 areas', () => '']
  } }
};

Object.keys(HUBS).forEach(hub => {
  PAGES[hub] = function () {
    const s = NAV.find(x => x.hub === hub); const h = HUBS[hub];
    return `${s.later ? UI.parkedBanner() : ''}
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4"><div class="flex items-center gap-4">
        <span class="flex h-12 w-12 items-center justify-center rounded-2xl ${s.later ? 'bg-navy-50 text-navy-700' : 'bg-brand-500 text-white'}">${UI.icon(s.icon, 'w-6 h-6')}</span>
        <div><h1 class="text-[22px] font-semibold tracking-tight text-navy-900">${t(s.key)}</h1><p class="text-sm text-slate-500">${h.desc}</p></div></div></div>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${s.items.map(([k, r, ic]) => { const [desc, metric, alert] = h.tiles[r];
        return UI.tile({ href: '#/' + r, icon: ic, title: t(k), desc, metric: metric(), alert: alert(), tone: s.later ? 'navy' : 'brand' }); }).join('')}</div>`;
  };
});
