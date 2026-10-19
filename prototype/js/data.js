// Mock data only. Nothing is persisted; a page refresh resets everything.
window.DB = {
  user: { name: 'Layla Hassan', first: 'Layla', initials: 'LH', email: 'layla.h@acme.gov', role: 'owner' },
  // This console is scoped to a single tenant of the SaaS platform.
  tenant: { name: 'Acme Gov', key: 'acme-gov', initials: 'AG', plan: 'Pro', region: 'UAE · me-central-1', isolation: 'Shared (row-level)', seats: '5 of 25', since: '2026-08-01' },

  orgNodes: [
    { id: 'n1', parent: null, type: 'department', name: 'Citizen Services', name_ar: 'خدمات المواطنين', key: 'citizen-services' },
    { id: 'n2', parent: 'n1', type: 'section', name: 'Requests & Complaints', name_ar: 'الطلبات والشكاوى', key: 'requests' },
    { id: 'n3', parent: 'n2', type: 'unit', name: 'Front Desk', name_ar: 'الاستقبال', key: 'front-desk' },
    { id: 'n4', parent: null, type: 'department', name: 'Operations', name_ar: 'العمليات', key: 'operations' },
    { id: 'n5', parent: 'n4', type: 'section', name: 'Dispatch', name_ar: 'الإرسال', key: 'dispatch' },
    { id: 'n6', parent: null, type: 'department', name: 'Corporate Affairs', name_ar: 'الشؤون المؤسسية', key: 'corporate' },
    { id: 'n7', parent: 'n6', type: 'section', name: 'Human Resources', name_ar: 'الموارد البشرية', key: 'hr' }
  ],

  agents: [
    { id: 'a1', key: 'citizen-request-assistant', name: 'Citizen Request Assistant', name_ar: 'مساعد طلبات المواطنين', audience: 'public', node: 'n3', level: 'member', reportsTo: 'a4', released: true, version: 4, status: 'active', model: 'gpt-4.1-mini', runs7d: 312, lastActive: '2 min ago' },
    { id: 'a2', key: 'report-classifier', name: 'Report Classifier', name_ar: 'مصنف البلاغات', audience: 'system', node: 'n5', level: 'member', reportsTo: 'a5', released: true, version: 7, status: 'active', model: 'gpt-4.1-mini', runs7d: 189, lastActive: '14 min ago' },
    { id: 'a3', key: 'incident-enrichment', name: 'Incident Enrichment', name_ar: 'إثراء الحوادث', audience: 'system', node: 'n5', level: 'member', reportsTo: 'a5', released: true, version: 3, status: 'active', model: 'gpt-4.1', runs7d: 175, lastActive: '15 min ago' },
    { id: 'a4', key: 'service-desk-lead', name: 'Service Desk Lead', name_ar: 'قائد مكتب الخدمة', audience: 'staff', node: 'n2', level: 'lead', reportsTo: null, released: true, version: 2, status: 'active', model: 'gpt-4.1', runs7d: 41, lastActive: '1 h ago' },
    { id: 'a5', key: 'dispatch-proposer', name: 'Dispatch Proposer', name_ar: 'مقترح الإرسال', audience: 'staff', node: 'n5', level: 'senior', reportsTo: null, released: true, version: 5, status: 'active', model: 'gpt-4.1', runs7d: 96, lastActive: '15 min ago' },
    { id: 'a6', key: 'hr-policy-assistant', name: 'HR Policy Assistant', name_ar: 'مساعد سياسات الموارد البشرية', audience: 'staff', node: 'n7', level: 'member', reportsTo: null, released: false, version: 1, status: 'active', model: 'gpt-4.1-mini', runs7d: 6, lastActive: 'yesterday' },
    { id: 'a7', key: 'letter-drafter', name: 'Official Letter Drafter', name_ar: 'محرر الخطابات الرسمية', audience: 'staff', node: 'n6', level: 'member', reportsTo: null, released: true, version: 2, status: 'suspended', model: 'gpt-4.1', runs7d: 0, lastActive: '6 days ago' }
  ],

  versions: [
    { v: 4, state: 'active', at: '2026-10-15 10:12', note: 'Added Arabic starter questions; tightened PII guardrail' },
    { v: 3, state: 'archived', at: '2026-10-02 16:40', note: 'Switched to gpt-4.1-mini; added handbook KB' },
    { v: 2, state: 'archived', at: '2026-09-21 09:05', note: 'checkpoint: auto with safety net' },
    { v: 1, state: 'archived', at: '2026-09-18 11:30', note: 'Initial version' }
  ],

  workflows: [
    { id: 'w1', key: 'report-to-dispatch', name: 'Report to Dispatch', released: true, version: 3, status: 'active', nodes: 7, updated: '2026-10-17' },
    { id: 'w2', key: 'objection-review', name: 'Objection Review', released: true, version: 2, status: 'active', nodes: 9, updated: '2026-10-11' },
    { id: 'w3', key: 'api-health-check', name: 'API Health Check', released: false, version: 0, status: 'draft', nodes: 6, updated: '2026-10-18', template: 'api-health-check' }
  ],

  wfTemplates: [
    { name: 'Endpoint Health Probe', key: 'api-health-check', scope: 'Platform', category: 'ops', desc: 'Call an HTTP endpoint, branch on response status, record healthy/degraded in flow variables.' },
    { name: 'Sign-off Checkpoint', key: 'approval-gate', scope: 'Platform', category: 'governance', desc: 'Start → gate (approver: admin) → end. The simplest human-in-the-loop building block.' },
    { name: 'Hand to a Person', key: 'human-triage-task', scope: 'Platform', category: 'support', desc: "Route the run to a human; the assignee's result becomes the node output." },
    { name: 'Pause for Partner Reply', key: 'wait-for-callback', scope: 'Platform', category: 'integration', desc: 'Pause until an external system posts an event, then continue with its payload.' },
    { name: 'Citizen Complaint Intake', key: 'complaint-intake', scope: 'Tenant', category: 'support', desc: 'Classify complaint, enrich from CRM, route to section manager.' }
  ],

  nodeTypes: [
    { type: 'agent', label: 'Worker step', icon: 'bot', color: 'brand' },
    { type: 'gate', label: 'Checkpoint', icon: 'shield-check', color: 'amber' },
    { type: 'branch', label: 'Decision', icon: 'git-fork', color: 'navy' },
    { type: 'http', label: 'API call', icon: 'globe', color: 'sky' },
    { type: 'set', label: 'Set values', icon: 'variable', color: 'slate' },
    { type: 'wait', label: 'Await signal', icon: 'radio', color: 'orange' },
    { type: 'human', label: 'Manual step', icon: 'hand', color: 'rose' },
    { type: 'mcp', label: 'Tool call', icon: 'plug', color: 'brand' },
    { type: 'comm', label: 'Notify', icon: 'send', color: 'sky' },
    { type: 'parallel', label: 'Fan-out', icon: 'split', color: 'navy' },
    { type: 'foreach', label: 'Repeat for each', icon: 'list-restart', color: 'emerald' },
    { type: 'loop', label: 'Repeat until', icon: 'refresh-cw', color: 'emerald' },
    { type: 'sub', label: 'Sub-flow', icon: 'layers', color: 'navy' },
    { type: 'external', label: 'Partner worker', icon: 'radio-tower', color: 'rose' }
  ],

  crews: [
    { id: 'c1', key: 'incident-response', name: 'Incident Response Squad', planner: 'a5', executors: ['a2', 'a3'], audience: 'system', status: 'active', desc: 'Classifies, enriches and proposes dispatch for incoming reports.' },
    { id: 'c2', key: 'correspondence', name: 'Correspondence Squad', planner: null, executors: ['a7', 'a6'], audience: 'staff', status: 'draft', desc: 'Drafts official letters with HR policy checks.' }
  ],

  skills: [
    { key: 'formal-arabic-letter', ver: 3, name: 'Formal Arabic letter', kind: 'procedure', status: 'active', source: 'human', usage: 41, desc: 'Structure an official government letter in formal Arabic with correct honorifics.', triggers: ['draft a letter', 'official correspondence', 'خطاب رسمي'] },
    { key: 'cite-sop', ver: 2, name: 'Cite the SOP', kind: 'instruction', status: 'active', source: 'human', usage: 128, desc: 'Always cite the SOP section that grounds a classification decision.', triggers: ['classify', 'priority'] },
    { key: 'escalate-missing-evidence', ver: 1, name: 'Escalate when evidence is missing', kind: 'instruction', status: 'active', source: 'agent', usage: 17, desc: 'Raise a flag and ask for a human decision if the report lacks location or time.', triggers: ['missing location', 'incomplete report'] },
    { key: 'refund-eligibility', ver: 1, name: 'Fee refund eligibility', kind: 'procedure', status: 'archived', source: 'human', usage: 3, desc: 'Check whether a citizen is eligible for a fee refund.', triggers: ['refund'] }
  ],

  kbs: [
    { id: 'k1', name: 'Citizen Services Handbook', desc: 'Policies and procedures for front-desk staff.', model: 'text-embedding-3-small', dim: 1536, docs: 42, node: 'n1' },
    { id: 'k2', name: 'Dispatch SOPs', desc: 'Standard operating procedures for incident classification and dispatch.', model: 'text-embedding-3-small', dim: 1536, docs: 18, node: 'n5' },
    { id: 'k3', name: 'HR Policies', desc: 'Leave, benefits and conduct policies.', model: 'text-embedding-3-large', dim: 3072, docs: 11, node: 'n7' }
  ],

  kbDocs: [
    { name: '01-service-catalogue.pdf', size: '2.4 MB', status: 'ready', locked: false },
    { name: '50-decisions-register.md', size: '88 KB', status: 'ready', locked: true },
    { name: 'fees-schedule-2026.xlsx', size: '310 KB', status: 'processing', locked: false },
    { name: 'complaints-policy-ar.docx', size: '640 KB', status: 'ready', locked: false },
    { name: 'legacy-scan.pdf', size: '12.1 MB', status: 'failed', locked: false }
  ],

  kbSources: [
    { provider: 'SharePoint', scope: 'sites/citizen-services/Shared Documents', schedule: 'Daily 02:00', lastSync: '2026-10-19 02:00', items: 37, errors: 0 },
    { provider: 'Web crawler', scope: 'https://services.acme.gov/faq (depth 2)', schedule: 'Weekly', lastSync: '2026-10-14 03:10', items: 5, errors: 1 }
  ],

  integrations: [
    { id: 'i1', name: 'Gov ERP', key: 'gov-erp', group: 'tools', type: 'MCP server', transport: 'HTTPS', auth: 'Bearer token', status: 'Healthy', last: '3 min ago', tools: ['incident.get', 'patrol.list_available', 'dispatch.commit'], usedBy: 3 },
    { id: 'i2', name: 'Registry DB', key: 'registry-db', group: 'tools', type: 'Database', transport: 'Postgres', auth: 'User / password', status: 'Healthy', last: '1 h ago', tools: ['query.read', 'query.execute'], usedBy: 1 },
    { id: 'i3', name: 'Payments API credential', key: 'payments-api', group: 'tools', type: 'HTTP API credential', transport: 'HTTPS', auth: 'API key (X-Api-Key)', status: 'Not checked yet', last: '—', tools: [], usedBy: 0 },
    { id: 'i4', name: 'Services FAQ website', key: 'services-faq', group: 'tools', type: 'Website', transport: 'HTTPS', auth: 'None', status: 'Healthy', last: '5 days ago', tools: ['site.query'], usedBy: 1 },
    { id: 'i5', name: 'Partner agency worker', key: 'partner-agent', group: 'agents', type: 'External worker', transport: 'A2A', auth: 'OAuth client', status: 'Error', last: '2 days ago', tools: ['ask'], usedBy: 1 },
    { id: 'i6', name: 'Citizen WhatsApp', key: 'wa-citizen', group: 'channels', type: 'WhatsApp', transport: 'Cloud API', auth: 'Token', status: 'Healthy', last: '1 min ago', tools: [], usedBy: 1 },
    { id: 'i7', name: 'Portal report webhook', key: 'portal-report', group: 'automation', type: 'Trigger (webhook)', transport: 'HTTPS', auth: 'HMAC', status: 'Awaiting first event', last: '—', tools: [], usedBy: 1 },
    { id: 'i8', name: 'SharePoint – Citizen Services', key: 'sp-citizen', group: 'knowledge', type: 'Library source', transport: 'Graph API', auth: 'OAuth', status: 'Healthy', last: '6 h ago', tools: [], usedBy: 0 }
  ],

  integrationCatalog: [
    { group: 'Tools & data', items: [['MCP server', 'plug', 'Endpoint; API key / bearer token / none'], ['Database', 'database', 'Host, database, user, password. Read-only by default'], ['HTTP API credential', 'key-round', 'Secret, header name. No connection test'], ['Website', 'globe', 'URL, permission to use content']] },
    { group: 'Workers elsewhere', items: [['External worker', 'radio-tower', 'Endpoint, auth'], ['Azure AI Foundry project', 'cloud', 'Project endpoint, credentials'], ['Remote worker (A2A) · legacy', 'share-2', 'Worker card URL']] },
    { group: 'Channels', items: [['Web widget', 'message-square', 'Allowed origins'], ['WhatsApp', 'message-circle', 'Phone number id, token'], ['Telegram', 'send', 'Bot token'], ['Email', 'mail', 'Inbound address, SMTP'], ['Slack', 'hash', 'App credentials'], ['Microsoft Teams', 'users', 'App credentials'], ['SMS', 'smartphone', 'Provider number, credentials'], ['Voice', 'phone', 'Number / SIP, STT/TTS']] },
    { group: 'Automation', items: [['Trigger (webhook / cron)', 'zap', 'URL, schedule'], ['Outbound webhook', 'webhook', 'URL, events']] },
    { group: 'Library', items: [['Library source', 'library', 'A collection, provider credentials']] }
  ],

  marketplace: [
    { name: 'Front-desk Receptionist', cat: 'Front desk', langs: ['AR', 'EN'], ver: '1.4.0', vendor: 'Platform', installed: false },
    { name: 'Meeting Summarizer', cat: 'Productivity', langs: ['EN'], ver: '2.1.0', vendor: 'Platform', installed: true },
    { name: 'Translator AR ↔ EN', cat: 'Language', langs: ['AR', 'EN'], ver: '1.0.3', vendor: 'Platform', installed: false },
    { name: 'HR Policy Assistant', cat: 'HR', langs: ['AR', 'EN'], ver: '1.2.0', vendor: 'Platform', installed: false },
    { name: 'Government Correspondence Drafter', cat: 'Government', langs: ['AR'], ver: '0.9.1', vendor: 'Platform', installed: false },
    { name: 'Sales Lead Qualifier', cat: 'Sales', langs: ['EN'], ver: '1.1.0', vendor: 'Platform', installed: false },
    { name: 'Citizen Complaint Triage', cat: 'Government', langs: ['AR', 'EN'], ver: '1.0.0', vendor: 'Platform', installed: false },
    { name: 'IT Helpdesk L1', cat: 'Productivity', langs: ['EN'], ver: '1.3.2', vendor: 'Platform', installed: false },
    { name: 'Procurement Request Checker', cat: 'Government', langs: ['AR', 'EN'], ver: '0.8.0', vendor: 'Platform', installed: false },
    { name: 'Onboarding Buddy', cat: 'HR', langs: ['EN'], ver: '1.0.0', vendor: 'Platform', installed: false }
  ],

  members: [
    { name: 'Layla Hassan', email: 'layla.h@acme.gov', role: 'owner' },
    { name: 'Khalid Saeed', email: 'khalid.s@acme.gov', role: 'admin' },
    { name: 'Omar Khalid', email: 'omar.k@acme.gov', role: 'member', custom: 'Approver' },
    { name: 'Sara Ahmed', email: 'sara.a@acme.gov', role: 'member' },
    { name: 'Yusuf Rahman', email: 'yusuf.r@acme.gov', role: 'member', custom: 'Auditor' }
  ],

  customRoles: [
    { name: 'Approver', base: 'member', perms: ['approvals.view', 'approvals.decide', 'runs.view'] },
    { name: 'Auditor', base: 'member', perms: ['audit.view', 'audit.export', 'trust.view', 'governance.view'] }
  ],

  providers: [
    { name: 'OpenAI (BYOK)', url: 'https://api.openai.com/v1', secret: 'openai.key', status: 'Connected' },
    { name: 'Self-hosted vLLM', url: 'https://vllm.internal:8000/v1', secret: 'vllm.token', status: 'Connected' }
  ],

  models: [
    { display: 'GPT-4.1', id: 'gpt-4.1', provider: 'OpenAI (BYOK)', pin: 2.0, pout: 8.0, ctx: '1M', caps: ['tools', 'vision', 'json'], isDefault: false },
    { display: 'GPT-4.1 mini', id: 'gpt-4.1-mini', provider: 'OpenAI (BYOK)', pin: 0.4, pout: 1.6, ctx: '1M', caps: ['tools', 'json'], isDefault: true },
    { display: 'Jais 30B (on-prem)', id: 'jais-30b-chat', provider: 'Self-hosted vLLM', pin: 0, pout: 0, ctx: '8K', caps: ['json'], isDefault: false }
  ],

  alerts: [
    { metric: 'Cost / day', scope: 'Workspace', threshold: '> $150', window: '1 day', dest: 'Email · admins' },
    { metric: 'Error rate', scope: 'Report Classifier', threshold: '> 5%', window: '1 hour', dest: 'Teams · #ops' },
    { metric: 'Checkpoint backlog', scope: 'Workspace', threshold: '> 20', window: '15 min', dest: 'In-app' }
  ],

  apiKeys: [
    { name: 'Citizen portal', prefix: 'ak_live_7f2c', scopes: 'runs:write, approvals:decide', created: '2026-09-02', last: '4 min ago' },
    { name: 'Reporting export', prefix: 'ak_live_a91d', scopes: 'runs:read, usage:read', created: '2026-08-14', last: 'yesterday' }
  ],

  webhooks: [
    { url: 'https://portal.acme.gov/hooks/agents', events: ['run.completed', 'approval.requested', 'approval.decided'], enabled: true, lastStatus: '200', latency: '182ms' },
    { url: 'https://siem.acme.gov/ingest', events: ['guardrail.blocked', 'agent.released'], enabled: true, lastStatus: '503', latency: '2.1s' }
  ],

  secrets: [
    { name: 'openai.key', created: '2026-08-01', last: '2 min ago' },
    { name: 'vllm.token', created: '2026-08-01', last: '1 h ago' },
    { name: 'gov-erp.bearer', created: '2026-09-10', last: '3 min ago' },
    { name: 'registry-db.password', created: '2026-09-12', last: '1 h ago' }
  ],

  notifications: [
    { icon: 'shield-alert', text: '3 approvals waiting for your decision', time: '5 min', route: '#/checkpoints' },
    { icon: 'x-circle', text: 'Run 7c1a… failed (Incident Enrichment)', time: '22 min', route: '#/executions' },
    { icon: 'sparkles', text: '2 curator events to review', time: '1 h', route: '#/learned' },
    { icon: 'bell-ring', text: 'Alert: error rate > 5% on Report Classifier', time: '3 h', route: '#/configuration/alerts' }
  ]
};

DB.agentById = id => DB.agents.find(a => a.id === id);
DB.nodeById = id => DB.orgNodes.find(n => n.id === id);
