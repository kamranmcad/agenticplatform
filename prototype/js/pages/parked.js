// Later-phase areas (Live ops, Insights, Assurance, Oversight): a preview of each page's purpose and main data.
const LATER = {
  conversations: { key: 'conversations', id: 'F-OPS-01', desc: 'One place for every conversation across touchpoints. Step in, hand back to the worker, or edit a reply the worker drafted.', actions: ['Step in', 'Hand back', 'Assign'],
    cols: ['Person', 'Touchpoint', 'Worker', 'State', 'Last message'], rows: [['Fatima Al-Mansoori', 'WhatsApp', 'Citizen Request Assistant', 'open', '2 min ago'], ['+971 50 *** 4412', 'SMS', 'Citizen Request Assistant', 'queued', '11 min ago'], ['ahmed@mail.acme.gov', 'Email', '—', 'assigned', '1 h ago']] },
  touchpoints: { key: 'touchpoints', id: 'F-OPS-02', desc: 'The places your workers meet people. Each touchpoint has a responding worker and a reply style: worker replies, worker drafts for a person, or person only.', actions: ['Add touchpoint'],
    cols: ['Touchpoint', 'Type', 'Responding worker', 'Reply style', 'State'], rows: [['Citizen WhatsApp', 'WhatsApp', 'Citizen Request Assistant', 'worker replies', 'active'], ['Services website', 'Web chat', 'Citizen Request Assistant', 'worker replies', 'active'], ['Staff Teams', 'Microsoft Teams', 'HR Policy Assistant', 'worker drafts', 'Awaiting first event']] },
  people: { key: 'people', id: 'F-OPS-03', desc: 'Citizens and customers your workers serve. Personal fields carry privacy tags, and recall can be kept per person.', actions: ['Add person'],
    cols: ['Person', 'Identifiers', 'Data region', 'Conversations'], rows: [['Fatima Al-Mansoori', 'phone · email', 'UAE', '4'], ['Rashid Saeed', 'whatsapp', 'UAE', '1']] },
  automations: { key: 'automations', id: 'F-OPS-04', desc: 'Start work on a timetable, once at a set time, or when another system sends a signed event.', actions: ['Ask Nova', 'New automation'],
    kpis: [['On', '4 / 5'], ['Next start', '08:00'], ['Starts · 24h', '212'], ['Success', '98.6%'], ['Failing', '0']],
    cols: ['Automation', 'Starts', 'Kind', 'Next start', 'State'], rows: [['Portal report received', 'Report to Dispatch', 'event', '—', 'active'], ['Weekday digest', 'Service Desk Lead', 'timetable', 'tomorrow 08:00', 'active']] },
  checkpoints: { key: 'checkpoints', id: 'F-OPS-05', desc: 'Sensitive actions wait here for a person. Work resumes as soon as someone decides; high-risk items can need two people.', actions: ['New checkpoint rule'],
    cols: ['Worker', 'Action', 'Risk', 'Sign-offs', 'Time left'], rows: [['Dispatch Proposer', 'dispatch.commit', 'high', '0 of 1', '18 min'], ['Incident Enrichment', 'query.execute', 'critical', '1 of 2', '42 min'], ['Citizen Request Assistant', 'crm.create_request', 'medium', '0 of 1', '2 h']] },
  executions: { key: 'executions', id: 'F-OPS-06', desc: 'A record of every run by a worker or flow. Open one to replay it step by step, with time, tokens and cost.', actions: [],
    cols: ['State', 'Execution', 'Worker / flow', 'Started from', 'Tokens', 'Cost'], rows: [['succeeded', '9f3e21', 'Citizen Request Assistant', 'work mode', '1,204', '$0.0011'], ['waiting_approval', '7c1a08', 'Report to Dispatch', 'automation', '6,880', '$0.031'], ['failed', '2b77d4', 'Incident Enrichment', 'flow', '2,310', '$0.009']] },
  safety: { key: 'safety', id: 'F-OPS-07', desc: 'Rules that screen what workers take in and say: personal data, manipulation attempts, harmful content, unsupported claims and off-limits topics. When two rule sets disagree, the stricter one applies.', actions: ['New rule set'],
    cols: ['Rule set', 'Checks', 'Covers', 'State'], rows: [['Baseline (default)', 'personal data · hide, manipulation · stop', 'All workers', 'active'], ['Regulated', 'personal data · stop, content · stop, claims · review', '2 workers', 'active']] },
  health: { key: 'health', id: 'F-IMP-01', desc: 'Is everything running well right now? Executions, checkpoints, sandboxed code, touchpoint traffic and learning in one view.', kpis: [['Executions', '819'], ['Checkpoints', '27'], ['Code runs', '0'], ['Messages', '1,442'], ['Hand-offs', '96']], chart: true },
  cx: { key: 'cx', id: 'F-IMP-02', desc: 'How people experience your workers: resolution, hand-off rate, repeat contacts, handling time and satisfaction.', kpis: [['Resolved by workers', '78%'], ['Handed to people', '9%'], ['First-time fix', '71%'], ['Handling time', '3m 12s'], ['Satisfaction', '4.4']], chart: true },
  exports: { key: 'exports', id: 'F-IMP-03', desc: 'Save a dataset with filters, download it as CSV, or send it to your data warehouse on a schedule.', actions: ['New export'],
    cols: ['Export', 'Dataset', 'Goes to', 'Schedule'], rows: [['Weekly executions', 'executions', 'CSV', 'Mon 07:00'], ['Value to BigQuery', 'value', 'BigQuery', 'Daily']] },
  consumption: { key: 'consumption', id: 'F-IMP-04', desc: 'Tokens and spend across all executions, broken down by worker and day.', actions: ['Download CSV'], kpis: [['Executions', '819'], ['Tokens in', '3.1M'], ['Tokens out', '1.1M'], ['All tokens', '4.2M'], ['Spend', '$188.40']], chart: true },
  'test-suites': { key: 'testSuites', id: 'F-QLT-01', desc: 'Repeatable checks that show a worker behaves before and after every change. Releases can be blocked below a target score.', actions: ['New suite'],
    cols: ['Suite', 'Checks worker', 'Cases', 'Latest score'], rows: [['answers-with-sources', 'Citizen Request Assistant', '3', '94%'], ['refusals', 'Citizen Request Assistant', '3', '100%'], ['arabic-register', 'Official Letter Drafter', '5', '82%']] },
  reviewers: { key: 'reviewers', id: 'F-QLT-06', desc: 'Reviewer workers score finished work, can hold risky actions for a person, and suggest improvements.', kpis: [['Reviewer rules', '2 on'], ['Reviews', '148'], ['Pass rate', '91%'], ['Held for a person', '1']] },
  learned: { key: 'learned', id: 'F-QLT-07', desc: 'Anything a worker learned by itself shows up here. Each change can be undone with one click.',
    cols: ['Change', 'Worker', 'What', 'When'], rows: [['recall added', 'Citizen Request Assistant', 'Renewal fee is 150 AED (2026)', '1 h ago'], ['playbook added', 'Report Classifier', 'escalate-missing-evidence@1', 'yesterday']] },
  recall: { key: 'recall', id: 'F-QLT-08', desc: 'What workers remember between conversations, as a list or as a timeline of facts.', actions: ['Suggestions', 'Add entry'],
    cols: ['Entry', 'Belongs to', 'Kind', 'Confidence'], rows: [['Prefers Arabic replies', 'person', 'preference', '0.92'], ['Licence renewal fee is 150 AED', 'worker', 'fact', '0.88']] },
  value: { key: 'value', id: 'F-QLT-09', desc: 'What your workers delivered and what it was worth compared with doing it by hand — with a receipt for each result.', kpis: [['Value delivered', '$12,480'], ['Cost of work', '$188'], ['Net value', '$12,292'], ['Return', '66×'], ['Saved vs manual', '$24,900']] },
  'oversight-summary': { key: 'oversightSummary', id: 'F-GOV-01', desc: 'Trail volume, worker credentials, budgets and rule coverage in one view.', kpis: [['Trail entries · 7d', '18,204'], ['Credentials', '6 active'], ['Budgets', '0'], ['Payments · 7d', '0'], ['Rules', '3 · 2 · 2']], chart: true },
  credentials: { key: 'credentials', id: 'F-GOV-02', desc: 'Each worker has its own verifiable identity. Rotate its key, pause it instantly, or retire it for good.',
    cols: ['Worker', 'State', 'Current key', 'Grants · 24h'], rows: DB.agents.map(a => [a.name, a.status === 'suspended' ? 'suspended' : 'active', 'k-ed25519-…', String(a.runs7d * 3)]) },
  spend: { key: 'spend', id: 'F-GOV-03', desc: 'Budgets a worker may spend from, with limits per payment and per period. Charges outside a budget are refused and logged.', actions: ['New budget'] },
  'assurance-report': { key: 'assuranceReport', id: 'F-GOV-04', desc: 'A signed statement about data residency, isolation, model sources and controls, built from the live system. Each claim says how it was checked.', actions: ['Check a report', 'Create report'] },
  'activity-trail': { key: 'trail', id: 'F-GOV-05', desc: 'Every change and action, chained so tampering is detectable.', actions: ['Download', 'Check chain'],
    cols: ['Time', 'By', 'Action', 'On'], rows: [['14:02:11', 'worker · report-classifier', 'tool.called', 'gov-erp/incident.get'], ['14:00:00', 'system', 'trail.checked', 'chain intact'], ['13:58:40', 'user · Layla Hassan', 'worker.released', 'citizen-request-assistant r4']] }
};

Object.entries(LATER).forEach(([route, p]) => {
  PAGES[route] = function () {
    const actions = (p.actions || []).map((a, i) => UI.btn(a, { variant: i === p.actions.length - 1 ? 'primary' : 'secondary', disabled: true, title: t('parked') })).join('');
    let body = '';
    if (p.kpis) body += `<div class="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">${p.kpis.map(([l, v]) => UI.kpi(l, v)).join('')}</div>`;
    if (p.chart) body += UI.card(UI.cardHeader('Trend', UI.segmented([{ key: '7', label: '7d' }, { key: '30', label: '30d' }], '7', () => {})) + `<div class="p-5">${UI.bars([12, 18, 15, 22, 19, 25, 21, 17, 24, 28, 26, 30, 27, 33])}</div>`, 'mb-5');
    if (p.cols) body += UI.card(UI.table(p.cols, p.rows.map(r => r.map((c, i) => /^(active|open|queued|assigned|succeeded|failed|suspended|waiting_approval|Awaiting first event)$/.test(c) ? UI.status(c.replace('_', ' ')) : i === 0 ? `<span class="font-medium text-navy-900">${c}</span>` : c)), { footer: false }));
    if (!body) body = UI.card(UI.emptyState('calendar-clock', 'Designed in a later phase', 'The purpose is described above; screens come when this area is picked up.'));
    return UI.parkedBanner(p.id) + UI.pageHeader(t(p.key), p.desc, actions, UI.specTag(p.id)) + body;
  };
});
