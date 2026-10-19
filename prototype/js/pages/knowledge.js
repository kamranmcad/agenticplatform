// BUILD › Knowledge (F-KB-01 … F-KB-04): bases, upload + ingestion pipeline, document detail & access,
// hybrid test search with diagnostics, and source sync wizard.
const KB = { sel: 'k1', tab: 'documents', q: '', topk: 4, as: 'admin', diag: true, results: null, query: '', docs: {}, sources: {}, timers: {} };
const PIPE = ['queued', 'extracting', 'chunking', 'embedding', 'ready'];
const ACCEPT = ['pdf', 'docx', 'md', 'txt', 'html', 'csv', 'xlsx'];

// ---------- Mock corpus ----------
const CORPUS = {
  '01-service-catalogue.pdf': [['Licences › Trade licence › Renewal', 'Trade licence renewal costs 150 AED and is processed within 3 working days. Apply online with the current licence, an Emirates ID copy and the tenancy contract.', 'en'],
    ['Licences › Trade licence › New', 'A new trade licence requires initial approval, a trade name reservation and a fee of 600 AED.', 'en'],
    ['Certificates › Good conduct', 'A good-conduct certificate is issued within 2 working days for a fee of 100 AED.', 'en', true]],
  '50-decisions-register.md': [['Decision 2026/14', 'Renewal fees are waived for registered SMEs during their first year of operation.', 'en'], ['Decision 2026/21', 'Complaints must be acknowledged within 1 working day and resolved within 10 working days.', 'en']],
  'fees-schedule-2026.xlsx': [['Fees › Row 14', 'Licence renewal (trade) | 150 | AED | effective 2026-01-01', 'en', true], ['Fees › Row 22', 'Certificate of good conduct | 100 | AED', 'en', true]],
  'complaints-policy-ar.docx': [['الشكاوى › تقديم شكوى', 'يمكن للمتعامل تقديم شكوى عبر الموقع الإلكتروني أو تطبيق واتساب، ويتم الرد خلال يوم عمل واحد.', 'ar'], ['الرسوم › تجديد الرخصة', 'رسوم تجديد الرخصة التجارية 150 درهماً وتتم المعالجة خلال 3 أيام عمل.', 'ar']],
  'leave-policy.pdf': [['Leave › Annual leave', 'Employees are entitled to 30 calendar days of annual leave per year after probation.', 'en'], ['Leave › Sick leave', 'Sick leave up to 15 days per year is fully paid with a medical certificate.', 'en']],
  'dispatch-sop-v3.pdf': [['SOP › Classification › Theft', 'Theft above 10,000 AED or with suspects present is classified theft_major and very_urgent.', 'en'], ['SOP › Dispatch lane', 'very_urgent incidents route to the dispatch lane; the nearest available patrol is proposed.', 'en']]
};
const SYN = { fee: ['fees', 'cost', 'costs', 'price', 'رسوم'], fees: ['fee', 'cost', 'رسوم'], cost: ['fee', 'fees', 'رسوم'], renew: ['renewal', 'تجديد'], renewal: ['renew', 'تجديد'], licence: ['license', 'رخصة', 'الرخصة', 'licences'], license: ['licence'],
  complaint: ['complaints', 'شكوى', 'الشكاوى'], leave: ['vacation', 'holiday'], 'رسوم': ['fee', 'fees', 'cost'], 'تجديد': ['renewal', 'renew'], 'الرخصة': ['licence'], 'رخصة': ['licence'], 'شكوى': ['complaint', 'complaints'], theft: ['robbery', 'stolen'] };
const tok = s => (s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(w => w.length > 2 && !['the', 'and', 'for', 'how', 'what', 'with', 'are', 'من', 'كم', 'في'].includes(w));
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function docsOf(kb) {
  if (KB.docs[kb.id]) return KB.docs[kb.id];
  const base = kb.id === 'k1' ? DB.kbDocs.map(d => d.name) : kb.id === 'k2' ? ['dispatch-sop-v3.pdf', '50-decisions-register.md'] : ['leave-policy.pdf'];
  return (KB.docs[kb.id] = base.map((name, i) => {
    const src = DB.kbDocs.find(d => d.name === name) || { size: ['1.1 MB', '420 KB'][i % 2], status: 'ready', locked: false };
    const chunks = (CORPUS[name] || [['Section 1', 'Scanned pages without a text layer.', 'en']]).map(([heading, text, lang, table], j) => ({ i: j + 1, heading, text, lang, table: !!table, tokens: 40 + (hash(text) % 400) }));
    return { id: kb.id + '-' + i, name, size: src.size, mime: name.split('.').pop(), status: src.status, step: src.status === 'ready' ? 4 : src.status === 'processing' ? 2 : 1, chunks: src.status === 'ready' ? chunks : [], allChunks: chunks,
      lang: chunks.some(c => c.lang === 'ar') ? (chunks.every(c => c.lang === 'ar') ? 'ar' : 'en + ar') : 'en', error: src.status === 'failed' ? 'No text layer found — enable OCR and retry' : null,
      access: src.locked ? { mode: 'restricted', roles: ['owner', 'admin'], nodes: ['n1'] } : { mode: 'everyone', roles: [], nodes: [] }, source: i === 3 ? 'SharePoint' : 'Upload', indexed: '2026-10-18 02:00' };
  }));
}
function sourcesOf(kb) {
  if (KB.sources[kb.id]) return KB.sources[kb.id];
  return (KB.sources[kb.id] = kb.id === 'k1' ? DB.kbSources.map((s, i) => ({ ...s, id: 's' + i, status: s.errors ? 'Error' : 'Healthy', paused: false, history: [
    { at: s.lastSync, added: i ? 1 : 3, updated: i ? 0 : 5, removed: 0, errors: s.errors, detail: s.errors ? 'https://services.acme.gov/faq/old-fees → 404 Not Found' : '' },
    { at: '2026-10-18 02:00', added: 0, updated: 2, removed: 1, errors: 0, detail: '' }] })) : []);
}
const kbOf = () => DB.kbs.find(k => k.id === KB.sel) || DB.kbs[0];
const rerenderKB = () => { if (APP.route === 'library') { const y = scrollY; APP.render(); scrollTo(0, y); } };

// ---------- Ingestion pipeline simulation ----------
function ingest(kb, d) {
  clearInterval(KB.timers[d.id]); d.status = 'queued'; d.step = 0; d.error = null; d.chunks = [];
  KB.timers[d.id] = setInterval(() => {
    if (/scan/i.test(d.name) && d.step === 1 && !d.ocr) { d.status = 'failed'; d.error = 'No text layer found — enable OCR and retry'; clearInterval(KB.timers[d.id]); rerenderKB(); return; }
    d.step++; d.status = PIPE[d.step];
    if (d.status === 'ready') { d.chunks = d.allChunks; d.indexed = new Date().toISOString().slice(0, 16).replace('T', ' '); kb.docs = docsOf(kb).filter(x => x.status === 'ready').length; clearInterval(KB.timers[d.id]); }
    rerenderKB();
  }, 900);
}
function pipeCell(d) {
  if (d.status === 'failed') return `<div>${UI.badge('failed', 'red')}<div class="mt-1 max-w-[220px] text-[11px] text-rose-600">${UI.esc(d.error)}</div></div>`;
  if (d.status === 'ready') return UI.badge('ready', 'green');
  return `<div class="flex items-center gap-1">${PIPE.slice(0, 4).map((p, i) => `<span title="${p}" class="h-1.5 w-6 rounded-full ${i < d.step ? 'bg-brand-500' : i === d.step ? 'animate-pulse bg-brand-300' : 'bg-slate-200'}"></span>`).join('')}<span class="ms-1 text-xs capitalize text-brand-700">${d.status}…</span></div>`;
}

function uploadDialog(kb) {
  const files = [];
  const wrap = UI.modal({ title: `Upload to ${kb.name}`, size: 'lg', body: `<label id="drop" class="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand-400 hover:bg-brand-50/30">
      ${UI.icon('upload-cloud', 'w-8 h-8 mx-auto text-slate-400')}<p class="mt-2 text-sm">Drop files here or <span class="text-brand-600">browse</span></p><p class="mt-1 text-xs text-slate-500">${ACCEPT.map(a => a.toUpperCase()).join(', ')} · up to 50 MB each · Arabic-aware extraction</p>
      <input type="file" multiple class="hidden" id="up-input"/></label>
    <div class="mt-2 text-end">${UI.btn('Add sample files', { size: 'sm', variant: 'ghost', icon: 'files', onclick: () => { ['renewal-faq-2026.pdf', 'نموذج-شكوى.docx', 'old-archive-scan.pdf', 'setup.exe'].forEach(n => files.push({ name: n, size: (hash(n) % 900 + 80) + ' KB' })); draw(); } })}</div>
    <div id="up-list" class="mt-3"></div>
    <p class="mt-3 text-xs text-slate-500">Pipeline: extract text (Arabic-aware, OCR optional) → structure-aware chunks of ~500–800 tokens with overlap, headings and tables kept → embeddings + full-text index.</p>`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn('Upload & index', { variant: 'primary', icon: 'upload', onclick: () => {
      const ok = files.filter(f => ACCEPT.includes(f.name.split('.').pop().toLowerCase()));
      if (!ok.length) { UI.toast('Add at least one supported file', 'info'); return; }
      ok.forEach(f => { const d = { id: kb.id + '-' + Date.now() + Math.random().toString(36).slice(2, 5), name: f.name, size: f.size, mime: f.name.split('.').pop(), status: 'queued', step: 0, chunks: [], lang: /[؀-ۿ]/.test(f.name) ? 'ar' : 'en',
        allChunks: [{ i: 1, heading: 'Overview', text: `Content extracted from ${f.name}.`, lang: 'en', tokens: 512 }, { i: 2, heading: 'Details', text: 'Second section with a table of values.', lang: 'en', table: true, tokens: 640 }], access: { mode: 'everyone', roles: [], nodes: [] }, source: 'Upload', indexed: '—' };
        docsOf(kb).unshift(d); ingest(kb, d); });
      UI.closeOverlay(); KB.tab = 'documents'; rerenderKB(); UI.toast(`${ok.length} file${ok.length > 1 ? 's' : ''} queued for ingestion`);
    } }) });
  const list = wrap.querySelector('#up-list');
  function draw() {
    list.innerHTML = files.map((f, i) => { const ext = f.name.split('.').pop().toLowerCase(); const bad = !ACCEPT.includes(ext);
      return `<div class="flex items-center gap-3 border-b border-slate-100 py-2 text-sm">${UI.icon(bad ? 'file-x' : 'file-text', `w-4 h-4 ${bad ? 'text-rose-500' : 'text-slate-400'}`)}<span class="flex-1 truncate">${UI.esc(f.name)}</span><span class="text-xs text-slate-500">${f.size}</span>
        ${bad ? UI.badge('unsupported type — skipped', 'red') : /scan/i.test(f.name) ? UI.badge('may need OCR', 'amber') : UI.badge('ok', 'green')}<button data-rm="${i}" class="text-slate-400 hover:text-rose-600">${UI.icon('x', 'w-4 h-4')}</button></div>`; }).join('');
    list.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { files.splice(+b.dataset.rm, 1); draw(); });
    UI.refreshIcons();
  }
  wrap.querySelector('#up-input').onchange = e => { [...e.target.files].forEach(f => files.push({ name: f.name, size: Math.max(1, Math.round(f.size / 1024)) + ' KB' })); draw(); };
  const drop = wrap.querySelector('#drop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('border-brand-500'); };
  drop.ondrop = e => { e.preventDefault(); [...e.dataTransfer.files].forEach(f => files.push({ name: f.name, size: Math.max(1, Math.round(f.size / 1024)) + ' KB' })); draw(); };
}

// ---------- Document drawer ----------
function docDrawer(kb, d) {
  const st = { tab: 'overview' };
  const wrap = UI.drawer({ title: `<div class="flex items-center gap-2">${UI.icon('file-text', 'w-5 h-5 text-slate-400')}<h2 class="text-base font-semibold">${UI.esc(d.name)}</h2>${d.access.mode === 'restricted' ? UI.badge(UI.icon('lock', 'w-3 h-3') + 'Restricted', 'amber') : ''}</div>`, sub: `${kb.name} · ${d.size} · ${d.mime.toUpperCase()}`, width: 'max-w-3xl', body: '<div id="dd"></div>',
    footer: UI.btn('Re-index', { icon: 'refresh-cw', onclick: () => { UI.closeOverlay(); ingest(kb, d); rerenderKB(); UI.toast('Re-indexing started'); } }) + UI.btn(t('close'), { variant: 'primary', onclick: 'UI.closeOverlay()' }) });
  const el = wrap.querySelector('#dd');
  function draw() {
    const body = {
      overview: `<dl class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">${[['Status', d.status === 'ready' ? UI.badge('ready', 'green') : pipeCell(d)], ['Language', d.lang], ['Chunks', d.chunks.length], ['Tokens', d.chunks.reduce((s, c) => s + c.tokens, 0).toLocaleString()], ['Embedding model', `${kb.model} · dim ${kb.dim}`], ['Last indexed', d.indexed], ['Source', d.source], ['Access', d.access.mode === 'everyone' ? 'Everyone with access to the KB' : 'Restricted'], ['Release', 'v2 (re-indexed on change)']]
        .map(([k, v]) => `<div><dt class="text-xs text-slate-500">${k}</dt><dd class="mt-0.5">${v}</dd></div>`).join('')}</dl>
        ${d.error ? `<div class="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">${UI.esc(d.error)}<div class="mt-2">${UI.btn('Retry with OCR', { size: 'sm', onclick: () => { d.ocr = true; UI.closeOverlay(); ingest(kb, d); rerenderKB(); } })}</div></div>` : ''}
        <div class="mt-5"><div class="mb-2 text-xs font-semibold uppercase text-slate-500">Ingestion pipeline</div><ol class="flex flex-wrap items-center gap-2 text-xs">${['Extract text', 'Chunk (structure-aware)', 'Embed', 'Index (vector + full-text)'].map((s, i) => `<li class="flex items-center gap-1.5 rounded-full px-2.5 py-1 ${d.step > i + 1 || d.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : d.status === 'failed' && i === 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}">${UI.icon(d.step > i + 1 || d.status === 'ready' ? 'check' : 'circle', 'w-3 h-3')}${s}</li>`).join('')}</ol></div>`,
      chunks: d.chunks.length ? `<div class="space-y-2">${d.chunks.map(c => `<div class="rounded-md border border-slate-200 p-3" ${c.lang === 'ar' ? 'dir="rtl"' : ''}><div class="mb-1 flex items-center gap-2 text-xs text-slate-500" dir="ltr"><span class="font-mono">#${c.i}</span><span class="truncate">${UI.esc(c.heading)}</span>${c.table ? UI.badge('table', 'violet') : ''}${UI.badge(c.lang, 'gray')}<span class="ms-auto">${c.tokens} tok</span></div><p class="text-sm">${UI.esc(c.text)}</p></div>`).join('')}</div>`
        : UI.emptyState('layers', 'No chunks yet', d.status === 'failed' ? 'Ingestion failed — fix the error and retry.' : 'Chunks appear when ingestion finishes.'),
      access: `<p class="mb-4 text-sm text-slate-600">Restrict which users' conversations may retrieve this document. Workers only receive passages the person they're serving is allowed to see. <span class="text-xs text-amber-700">(Exact rules to be defined.)</span></p>
        <div class="grid gap-3 sm:grid-cols-2">${UI.radioCard('acc', 'everyone', d.access.mode === 'everyone', 'Everyone', 'Anyone who can use a worker attached to this KB.', () => { d.access.mode = 'everyone'; draw(); })}${UI.radioCard('acc', 'restricted', d.access.mode === 'restricted', 'Restricted', 'Only the roles and units below.', () => { d.access.mode = 'restricted'; draw(); })}</div>
        ${d.access.mode === 'restricted' ? `<div class="mt-4 grid gap-4 sm:grid-cols-2"><div><div class="mb-2 text-xs font-medium">Roles</div>${['owner', 'admin', 'member', ...DB.customRoles.map(r => r.name)].map(r => `<label class="flex items-center gap-2 py-0.5 text-sm"><input type="checkbox" data-role="${r}" ${d.access.roles.includes(r) ? 'checked' : ''} class="rounded text-brand-600"/>${r}</label>`).join('')}</div>
          <div><div class="mb-2 text-xs font-medium">Units (includes subtree)</div>${DB.orgNodes.map(n => `<label class="flex items-center gap-2 py-0.5 text-sm"><input type="checkbox" data-node="${n.id}" ${d.access.nodes.includes(n.id) ? 'checked' : ''} class="rounded text-brand-600"/>${n.name} <span class="text-xs text-slate-400">${n.type}</span></label>`).join('')}</div></div>` : ''}
        <div class="mt-4">${UI.btn('Save access', { variant: 'primary', size: 'sm', onclick: () => { d.access.roles = [...el.querySelectorAll('[data-role]:checked')].map(x => x.dataset.role); d.access.nodes = [...el.querySelectorAll('[data-node]:checked')].map(x => x.dataset.node); rerenderKB(); UI.toast('Access saved · audited'); } })}</div>`
    }[st.tab];
    el.innerHTML = `<div class="mb-4" id="dd-tabs"></div>${body}`;
    el.querySelector('#dd-tabs').innerHTML = UI.tabs([{ key: 'overview', label: 'Overview' }, { key: 'chunks', label: 'Chunks', count: d.chunks.length }, { key: 'access', label: 'Access' }], st.tab, k => { st.tab = k; draw(); });
    UI.refreshIcons();
  }
  draw();
}

// ---------- Hybrid retrieval (F-KB-04) ----------
function search(kb, q) {
  const qt = tok(q); const expanded = new Set(qt.flatMap(w => [w, ...(SYN[w] || [])]));
  const qLang = /[؀-ۿ]/.test(q) ? 'ar' : 'en';
  const pool = docsOf(kb).filter(d => d.status === 'ready' && (KB.as === 'admin' || d.access.mode === 'everyone' || d.access.roles.includes('member')))
    .flatMap(d => d.chunks.map(c => ({ doc: d.name, ...c })));
  const scored = pool.map(c => {
    const ct = tok(c.heading + ' ' + c.text);
    const lexHits = qt.filter(w => ct.includes(w)).length;
    const lex = qt.length ? lexHits / qt.length : 0;
    const semHits = [...expanded].filter(w => ct.includes(w)).length;
    const vec = Math.min(0.97, 0.35 + semHits * 0.12 + (hash(c.text + q) % 10) / 100);
    const rerank = Math.min(0.99, 0.55 * vec + 0.45 * lex + (c.lang === qLang ? 0.05 : 0));
    return { ...c, vec: +vec.toFixed(2), lex: +lex.toFixed(2), rerank: +rerank.toFixed(2), hits: [...expanded].filter(w => ct.includes(w)) };
  });
  const rank = key => [...scored].sort((a, b) => b[key] - a[key]).map(x => x.doc + x.i);
  const rv = rank('vec'), rl = rank('lex'), rr = rank('rerank');
  scored.forEach(s => { const id = s.doc + s.i; s.rv = rv.indexOf(id) + 1; s.rl = rl.indexOf(id) + 1; s.rr = rr.indexOf(id) + 1; s.rrf = +(1 / (60 + s.rv) + 1 / (60 + s.rl) + 1 / (60 + s.rr)).toFixed(4); });
  return { qLang, excluded: docsOf(kb).filter(d => d.status === 'ready').length - new Set(pool.map(p => p.doc)).size, pool: pool.length, hits: scored.filter(s => s.vec > 0.45 || s.lex > 0).sort((a, b) => b.rrf - a.rrf).slice(0, KB.topk) };
}
const highlight = (text, words) => words.reduce((s, w) => s.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark class="rounded bg-amber-100 px-0.5">$1</mark>'), UI.esc(text));
function searchPanel(kb) {
  const R = KB.results;
  const bar = (v, c) => `<div class="h-1.5 w-full rounded-full bg-slate-100"><div class="h-1.5 rounded-full ${c}" style="width:${Math.round(v * 100)}%"></div></div>`;
  return UI.card(`<div class="p-4"><p class="mb-3 text-sm text-slate-500">Query the base the way a worker would and inspect what comes back. Retrieval = dense vectors + full-text + cross-encoder rerank, fused with Reciprocal Rank Fusion.</p>
    <div class="flex flex-wrap gap-2"><input id="kb-q" class="${UI.inputCls} min-w-[240px] flex-1" value="${UI.esc(KB.query)}" placeholder="Ask in English or Arabic…" onkeydown="if(event.key==='Enter')window.kbSearch()"/>${UI.btn('Search', { icon: 'search', variant: 'primary', onclick: () => kbSearch() })}</div>
    <div class="mt-2 flex flex-wrap gap-1.5">${['renewal fee for a trade licence', 'كم رسوم تجديد الرخصة؟', 'how do I file a complaint', 'annual leave days'].map(s => `<button onclick="${UI.fn(() => kbSearch(s))}" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs hover:bg-slate-200">${s}</button>`).join('')}</div>
    <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600"><label class="flex items-center gap-2">Top-k <input type="range" min="1" max="8" value="${KB.topk}" class="accent-brand-600" oninput="this.nextElementSibling.textContent=this.value" onchange="${UI.fn(e => { KB.topk = +e.target.value; if (KB.query) kbSearch(KB.query); })}"/><span class="font-mono">${KB.topk}</span></label>
      <label class="flex items-center gap-2">Search as <select class="rounded border border-slate-300 px-1.5 py-1" onchange="${UI.fn(e => { KB.as = e.target.value; if (KB.query) kbSearch(KB.query); })}"><option value="admin" ${KB.as === 'admin' ? 'selected' : ''}>Admin</option><option value="member" ${KB.as === 'member' ? 'selected' : ''}>Member (front desk)</option></select></label>
      <label class="flex items-center gap-2"><input type="checkbox" ${KB.diag ? 'checked' : ''} class="rounded text-brand-600" onchange="${UI.fn(e => { KB.diag = e.target.checked; rerenderKB(); })}"/>Score breakdown</label></div></div>
    ${R ? `<div class="border-t border-slate-100 p-4"><div class="mb-3 flex flex-wrap gap-2 text-xs text-slate-500">${UI.badge('query language: ' + R.qLang, 'gray')}${UI.badge(`${R.pool} chunks searched`, 'gray')}${R.excluded ? UI.badge(`${R.excluded} restricted doc${R.excluded > 1 ? 's' : ''} hidden for this user`, 'amber') : ''}</div>
      ${R.hits.length ? `<div class="space-y-3">${R.hits.map((h, i) => `<div class="rounded-md border border-slate-200 p-3"><div class="flex flex-wrap items-center gap-2"><span class="font-mono text-xs text-slate-400">${i + 1}</span>${UI.badge(UI.icon('file-text', 'w-3 h-3') + `${h.doc} #${h.i}`, 'indigo')}<span class="truncate text-xs text-slate-500">${UI.esc(h.heading)}</span>${h.table ? UI.badge('table', 'violet') : ''}<span class="ms-auto font-mono text-xs text-slate-500">RRF ${h.rrf}</span></div>
        <p class="mt-2 text-sm" ${h.lang === 'ar' ? 'dir="rtl"' : ''}>${highlight(h.text, h.hits)}</p>
        ${KB.diag ? `<div class="mt-3 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">${[['vec', h.vec, h.rv, 'bg-brand-500'], ['lex', h.lex, h.rl, 'bg-sky-500'], ['rerank', h.rerank, h.rr, 'bg-violet-500']].map(([k, v, r, c]) => `<div><div class="mb-1 flex justify-between"><span class="text-slate-500">${k}</span><span class="font-mono">${v} · #${r}</span></div>${bar(v, c)}</div>`).join('')}
          <div><div class="mb-1 flex justify-between"><span class="text-slate-500">fused</span><span class="font-mono">${h.rrf}</span></div><div class="font-mono text-[10px] text-slate-400">1/(60+${h.rv}) + 1/(60+${h.rl}) + 1/(60+${h.rr})</div></div></div>` : ''}</div>`).join('')}</div>
        ${KB.diag ? `<div class="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600"><b>vec</b> = cosine similarity of embeddings (finds meaning, works across Arabic and English) · <b>lex</b> = full-text match of the exact words · <b>rerank</b> = cross-encoder relevance of the pair · <b>RRF</b> = each list's rank combined as Σ 1/(60 + rank), so a passage that ranks well in several lists wins.</div>` : ''}`
      : UI.emptyState('search-x', 'No passages found', 'A worker would say it does not know. Consider adding a document — this query will appear under Unanswered questions.')}</div>` : ''}`);
}
// q given (suggestion chip / re-run) wins; otherwise read the input box
window.kbSearch = function (q) { if (typeof q === 'string') KB.query = q; else { const i = document.getElementById('kb-q'); if (i) KB.query = i.value; } if (!KB.query.trim()) return; KB.results = search(kbOf(), KB.query); rerenderKB(); };

// ---------- Sources (F-KB-03) ----------
const PROVIDERS = [['SharePoint', 'share-2', 'OAuth (Microsoft Entra)'], ['Confluence', 'book-open', 'API token'], ['Google Drive', 'hard-drive', 'OAuth (Google)'], ['S3', 'database', 'Access key / IAM role'], ['Web crawler', 'globe', 'None (public pages)']];
function sourceWizard(kb) {
  const st = { step: 1, provider: null, secret: '', newSecret: false, oauth: false, scope: {}, schedule: 'Daily 02:00', onDelete: 'remove', sync: null };
  const steps = ['Provider', 'Credentials', 'Scope', 'Schedule', 'First sync'];
  const wrap = UI.modal({ title: `Add source · ${kb.name}`, size: 'lg', body: '<div id="sw"></div>' });
  const el = wrap.querySelector('#sw');
  const scopeFields = { SharePoint: [['site', 'Site URL', 'https://example.sharepoint.com/sites/citizen-services'], ['library', 'Library / folder', 'Shared Documents/Policies']], Confluence: [['base', 'Base URL', 'https://wiki.acme.gov'], ['space', 'Space key', 'CS']],
    'Google Drive': [['folder', 'Folder ID or URL', 'https://drive.google.com/drive/folders/…']], S3: [['bucket', 'Bucket', 'kb-citizen-docs'], ['prefix', 'Prefix', 'policies/'], ['region', 'Region', 'me-central-1']],
    'Web crawler': [['url', 'Start URL', 'https://services.acme.gov/faq'], ['depth', 'Depth', '2'], ['include', 'Include pattern', '/faq/*'], ['exclude', 'Exclude pattern', '/faq/archive/*']] };
  function draw() {
    const stepper = `<ol class="mb-5 flex flex-wrap items-center gap-2 text-xs">${steps.map((s, i) => `<li class="flex items-center gap-2"><span class="flex h-6 w-6 items-center justify-center rounded-full ${i + 1 < st.step ? 'bg-emerald-500 text-white' : i + 1 === st.step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'}">${i + 1 < st.step ? '✓' : i + 1}</span><span class="${i + 1 === st.step ? 'font-semibold' : 'text-slate-500'}">${s}</span>${i < 4 ? '<span class="text-slate-300">—</span>' : ''}</li>`).join('')}</ol>`;
    let body = '', can = true;
    if (st.step === 1) { body = `<div class="grid gap-2 sm:grid-cols-3">${PROVIDERS.map(([p, ic, auth]) => `<button data-p="${p}" class="rounded-lg border p-3 text-start ${st.provider === p ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50'}"><div class="flex items-center gap-2 text-sm font-medium">${UI.icon(ic, 'w-4 h-4 text-brand-600')}${p}</div><div class="mt-1 text-[11px] text-slate-500">${auth}</div></button>`).join('')}</div>`; can = !!st.provider; }
    if (st.step === 2) {
      if (st.provider === 'Web crawler') body = `<div class="rounded-md bg-slate-50 p-3 text-sm text-slate-600">Public pages need no credentials. Requests go through the SSRF guard and the egress allow-list.</div>`;
      else if (['SharePoint', 'Google Drive'].includes(st.provider)) { body = `<p class="mb-3 text-sm text-slate-600">Sign in with an account that can read the content. The token is stored write-only in the vault.</p>${st.oauth ? `<div class="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">${UI.icon('check-circle-2')} Connected as svc-knowledge@acme.gov · token saved as <span class="font-mono">${st.provider === 'SharePoint' ? 'sp' : 'gdrive'}-${kb.id}.oauth</span></div>` : UI.btn(`Connect ${st.provider}`, { variant: 'primary', icon: 'log-in', onclick: () => { st.oauth = true; draw(); } })}`; can = st.oauth; }
      else { body = `${UI.field('Credential from the vault', `<select id="sw-secret" class="${UI.inputCls}"><option value="">— pick —</option>${DB.secrets.map(s => `<option ${st.secret === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}<option value="__new" ${st.newSecret ? 'selected' : ''}>+ Add new secret…</option></select>`)}
        ${st.newSecret ? `<div class="mt-3 grid grid-cols-2 gap-3">${UI.field('Secret name', UI.input(`${st.provider.toLowerCase()}.token`, 'id="sw-sn" class="font-mono"'))}${UI.field('Value', UI.input('', 'type="password" id="sw-sv"'), 'Write-only. Never shown again.')}</div>` : ''}`; can = !!st.secret || st.newSecret; }
    }
    if (st.step === 3) body = `<div class="grid gap-4 sm:grid-cols-2">${scopeFields[st.provider].map(([k, l, ph]) => UI.field(l, UI.input(st.scope[k] ?? ph, `data-scope="${k}" class="font-mono"`))).join('')}</div>${st.provider === 'Web crawler' ? `<div class="mt-3 space-y-2">${UI.checkbox(true, 'Respect robots.txt')}${UI.checkbox(false, 'I have permission to use this content *')}</div>` : ''}`;
    if (st.step === 4) body = `<div class="grid gap-4 sm:grid-cols-2">${UI.field('Schedule', UI.select(['Manual only', 'Hourly', 'Daily 02:00', 'Weekly (Sun 03:00)'], st.schedule, 'id="sw-sched"'))}${UI.field('When a file is deleted at the source', UI.select([['remove', 'Remove it from the KB'], ['keep', 'Keep the last indexed copy']], st.onDelete, 'id="sw-del"'))}</div>
      <p class="mt-3 text-xs text-slate-500">Changed files are re-indexed; unchanged files are skipped by checksum.</p>`;
    if (st.step === 5) {
      const s = st.sync; body = s ? `<div class="space-y-3"><div class="grid grid-cols-4 gap-3 text-center">${[['Discovered', s.found], ['Fetched', s.fetched], ['Indexed', s.indexed], ['Errors', s.errors]].map(([k, v]) => `<div class="rounded-md bg-slate-50 p-3"><div class="text-xl font-semibold ${k === 'Errors' && v ? 'text-rose-600' : ''}">${v}</div><div class="text-[11px] text-slate-500">${k}</div></div>`).join('')}</div>
        <div class="h-2 rounded-full bg-slate-100"><div class="h-2 rounded-full bg-brand-500 transition-all" style="width:${Math.round(s.indexed / s.found * 100)}%"></div></div>
        ${s.done ? `<div class="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">${UI.icon('check-circle-2', 'w-4 h-4 inline')} First sync complete. ${s.errors ? `${s.errors} item skipped (unsupported type).` : ''}</div>` : `<p class="text-xs text-slate-500">${UI.icon('loader-2', 'w-3 h-3 inline animate-spin')} Syncing…</p>`}</div>` : '';
    }
    el.innerHTML = stepper + `<div class="min-h-[180px]">${body}</div><div class="mt-6 flex justify-between border-t border-slate-100 pt-4">${st.step > 1 && st.step < 5 ? UI.btn(t('back'), { onclick: () => { st.step--; draw(); } }) : '<span></span>'}
      ${st.step < 4 ? UI.btn(t('next'), { variant: 'primary', disabled: !can, onclick: () => { collect(); st.step++; draw(); } }) : st.step === 4 ? UI.btn('Save & run first sync', { variant: 'primary', icon: 'refresh-cw', onclick: () => { collect(); st.step = 5; runFirst(); } }) : UI.btn(t('done'), { variant: 'primary', disabled: !st.sync?.done, onclick: () => { UI.closeOverlay(); rerenderKB(); } })}</div>`;
    el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { st.provider = b.dataset.p; draw(); });
    const sec = el.querySelector('#sw-secret'); if (sec) sec.onchange = () => { st.newSecret = sec.value === '__new'; st.secret = st.newSecret ? '' : sec.value; draw(); };
    UI.refreshIcons();
  }
  function collect() {
    el.querySelectorAll('[data-scope]').forEach(i => st.scope[i.dataset.scope] = i.value);
    const sc = el.querySelector('#sw-sched'); if (sc) st.schedule = sc.value; const dl = el.querySelector('#sw-del'); if (dl) st.onDelete = dl.value;
    const sn = el.querySelector('#sw-sn'); if (sn) { st.secret = sn.value; DB.secrets.push({ name: sn.value, created: 'today', last: '—' }); st.newSecret = false; }
  }
  function runFirst() {
    const found = 6 + hash(st.provider) % 20; st.sync = { found, fetched: 0, indexed: 0, errors: 0, done: false }; draw();
    const iv = setInterval(() => { const s = st.sync; s.fetched = Math.min(found, s.fetched + 4); s.indexed = Math.min(s.fetched, s.indexed + 3); if (s.indexed >= found - 1) { s.errors = 1; s.indexed = found - 1; s.done = true; clearInterval(iv);
      sourcesOf(kb).push({ id: 's' + Date.now(), provider: st.provider, scope: Object.values(st.scope).filter(Boolean).join(' · ') || '—', schedule: st.schedule, lastSync: 'just now', items: found - 1, errors: 1, status: 'Healthy', paused: false, history: [{ at: 'just now', added: found - 1, updated: 0, removed: 0, errors: 1, detail: 'setup-guide.exe — unsupported file type' }] });
      kb.docs += found - 1; } if (document.getElementById('sw')) draw(); }, 600);
  }
  draw();
}
function syncNow(kb, s) {
  s.status = 'Syncing'; rerenderKB(); UI.toast(`Sync started · ${s.provider}`);
  setTimeout(() => { const err = s.provider === 'Web crawler' ? 1 : 0; s.status = err ? 'Error' : 'Healthy'; s.errors = err; s.lastSync = 'just now'; s.history.unshift({ at: 'just now', added: 0, updated: 2, removed: 0, errors: err, detail: err ? 'https://services.acme.gov/faq/old-fees → 404 Not Found' : '' }); rerenderKB(); }, 1800);
}
function historyDrawer(s) {
  UI.drawer({ title: `<h2 class="text-base font-semibold">Sync history · ${s.provider}</h2>`, sub: s.scope, body: UI.table(['When', 'Added', 'Updated', 'Removed', 'Errors'], s.history.map(h => [h.at, h.added, h.updated, h.removed, h.errors ? `${UI.badge(h.errors, 'red')}<div class="mt-1 font-mono text-[11px] text-rose-600">${UI.esc(h.detail)}</div>` : '0']), { footer: false }) });
}

// ---------- Page ----------
PAGES.library = function () {
  const kb = kbOf(); const docs = docsOf(kb); const srcs = sourcesOf(kb);
  const users = DB.agents.filter(a => (typeof blueprintOf === 'function' ? blueprintOf(a) : { knowledge: { bases: [] } }).knowledge.bases.includes(kbKey(kb)));
  const busy = docs.filter(d => !['ready', 'failed'].includes(d.status)).length;
  const body = {
    documents: () => `<div class="mb-3 flex flex-wrap items-center justify-between gap-2"><div class="relative w-60">${UI.icon('search', 'w-4 h-4 absolute start-3 top-2.5 text-slate-400')}<input class="${UI.inputCls} ps-9" placeholder="Filter documents" value="${UI.esc(KB.q)}" onchange="${UI.fn(e => { KB.q = e.target.value; rerenderKB(); })}"/></div>
        <div class="flex items-center gap-2">${busy ? `<span class="text-xs text-brand-700">${UI.icon('loader-2', 'w-3 h-3 inline animate-spin')} ${busy} in pipeline</span>` : ''}${UI.btn('Upload', { icon: 'upload', variant: 'primary', size: 'sm', onclick: () => uploadDialog(kb) })}</div></div>` +
      UI.card(UI.table(['Document', 'Size', 'Status', 'Chunks', 'Access', ''], docs.filter(d => !KB.q || d.name.toLowerCase().includes(KB.q.toLowerCase())).map(d => ({ onclick: () => docDrawer(kb, d), cells: [
        `<div class="flex items-center gap-2">${UI.icon('file-text', 'w-4 h-4 text-slate-400')}<div><div class="font-medium">${UI.esc(d.name)}</div><div class="text-[11px] text-slate-500">${d.source} · ${d.lang}</div></div></div>`, d.size, pipeCell(d), d.chunks.length || '—',
        d.access.mode === 'restricted' ? UI.badge(UI.icon('lock', 'w-3 h-3') + 'Restricted', 'amber') : UI.badge('Everyone', 'gray'),
        `<div class="flex justify-end gap-0.5" onclick="event.stopPropagation()">${d.status === 'failed' ? UI.btn('Retry', { size: 'sm', onclick: () => { d.ocr = true; ingest(kb, d); rerenderKB(); } }) : ''}${UI.iconBtn('refresh-cw', () => { ingest(kb, d); rerenderKB(); UI.toast('Re-indexing ' + d.name); }, 'Re-index')}${UI.iconBtn('trash-2', () => UI.confirm('Delete document?', `Removes ${UI.esc(d.name)} and its ${d.chunks.length} chunks from the index.`, () => { KB.docs[kb.id] = docs.filter(x => x !== d); rerenderKB(); UI.toast('Document deleted'); }, t('delete')), 'Delete')}</div>`] })), { total: docs.length })),
    sources: () => `<div class="mb-3 flex items-center justify-between"><p class="text-xs text-slate-500">Sync documents into this library collection from SharePoint, Confluence, Google Drive, S3, or a web crawler.</p>${UI.btn('Add source', { icon: 'plus', size: 'sm', variant: 'primary', onclick: () => sourceWizard(kb) })}</div>` +
      UI.card(UI.table(['Provider', 'Scope', 'Schedule', 'Last sync', 'Items', 'Status', ''], srcs.map(s => [s.provider, `<span class="font-mono text-xs">${UI.esc(s.scope)}</span>`, s.paused ? UI.badge('paused', 'gray') : s.schedule, s.lastSync, s.items,
        s.status === 'Syncing' ? UI.badge(UI.icon('loader-2', 'w-3 h-3 animate-spin') + 'syncing', 'blue') : s.status === 'Error' ? `<button onclick="${UI.fn(() => historyDrawer(s))}">${UI.badge(`${s.errors} error${s.errors > 1 ? 's' : ''}`, 'red')}</button>` : UI.status('Healthy'),
        `<div class="flex justify-end gap-1">${UI.btn('Sync now', { size: 'sm', variant: 'ghost', disabled: s.status === 'Syncing', onclick: () => syncNow(kb, s) })}${UI.btn(s.paused ? 'Resume' : 'Pause', { size: 'sm', variant: 'ghost', onclick: () => { s.paused = !s.paused; rerenderKB(); } })}${UI.btn('History', { size: 'sm', variant: 'ghost', onclick: () => historyDrawer(s) })}${UI.iconBtn('trash-2', () => UI.confirm('Remove source?', 'Stops syncing. Already-indexed documents stay unless you delete them.', () => { KB.sources[kb.id] = srcs.filter(x => x !== s); rerenderKB(); }, 'Remove'))}</div>`]), { footer: false, empty: UI.emptyState('refresh-cw', 'No sources yet', 'Connect SharePoint, Confluence, Google Drive, S3 or a website to keep this base in sync.', UI.btn('Add source', { icon: 'plus', variant: 'primary', onclick: () => sourceWizard(kb) })) })),
    search: () => searchPanel(kb),
    agents: () => UI.card(UI.table(['Worker', 'Audience', 'Citations', ''], users.map(a => [a.name, UI.audience(a.audience), blueprintOf(a).knowledge.citations, UI.btn('Open builder', { size: 'sm', variant: 'ghost', href: `#/workers/${a.id}/builder` })]), { footer: false, empty: UI.emptyState('bot', 'No worker uses this base yet', 'Attach it from an agent\'s Builder › Library collections.') }))
  }[KB.tab]();
  return UI.pageHeader(t('library'), 'Collections of documents your workers search and quote from. Answers link back to the passage they came from.', UI.btn('New library collection', { icon: 'plus', variant: 'primary', onclick: newKbModal }), UI.specTag('F-KB-01…04')) +
    `<div class="grid gap-5 lg:grid-cols-4"><div>${UI.card(`<div class="p-2">${DB.kbs.map(k => `<button onclick="${UI.fn(() => { KB.sel = k.id; KB.results = null; KB.q = ''; rerenderKB(); })}" class="block w-full rounded-md px-3 py-2 text-start ${k.id === KB.sel ? 'bg-brand-50' : 'hover:bg-slate-50'}"><div class="text-sm font-medium ${k.id === KB.sel ? 'text-brand-700' : ''}">${k.name}</div><div class="text-xs text-slate-500">${docsOf(k).length} docs · ${DB.nodeById(k.node)?.name || 'workspace'}</div></button>`).join('')}</div>`)}</div>
    <div class="lg:col-span-3">${UI.card(`<div class="flex items-start justify-between p-4"><div><h2 class="font-semibold">${kb.name}</h2><p class="text-sm text-slate-500">${kb.desc}</p><p class="mt-1 font-mono text-xs text-slate-500">${kb.model} · dim ${kb.dim} · ${DB.nodeById(kb.node)?.name || 'workspace'}</p></div>
      <div class="flex gap-1">${UI.iconBtn('pencil', () => newKbModal(kb), 'Edit')}${UI.iconBtn('trash-2', () => UI.confirm('Delete library collection?', `${users.length} agent(s) lose grounding from these documents.`, () => { DB.kbs = DB.kbs.filter(x => x !== kb); KB.sel = DB.kbs[0]?.id; rerenderKB(); UI.toast('Deleted'); }, t('delete')), 'Delete')}</div></div>`, 'mb-4')}
      <div class="mb-4">${UI.tabs([{ key: 'documents', label: 'Documents', count: docs.length }, { key: 'sources', label: 'Sources', count: srcs.length }, { key: 'search', label: 'Try a search' }, { key: 'agents', label: 'Used by', count: users.length }], KB.tab, k => { KB.tab = k; rerenderKB(); })}</div>${body}</div></div>`;
};
function newKbModal(kb) {
  UI.modal({ title: kb ? 'Edit library collection' : 'New library collection', body: `<div class="space-y-4">${UI.field('Name', UI.input(kb?.name || '', 'id="kb-name"'))}${UI.field('Description', UI.textarea(kb?.desc || '', 'id="kb-desc"', 2))}
    <div class="grid grid-cols-2 gap-3">${UI.field('Embedding model', UI.select([['text-embedding-3-small|1536', 'text-embedding-3-small · dim 1536'], ['text-embedding-3-large|3072', 'text-embedding-3-large · dim 3072'], ['bge-m3|1024', 'bge-m3 (on-prem) · dim 1024']], kb ? `${kb.model}|${kb.dim}` : '', `id="kb-model" ${kb ? 'disabled' : ''}`), kb ? 'Changing the model requires a full re-index.' : '')}${UI.field('Unit (optional)', UI.select([['', '— workspace —'], ...DB.orgNodes.map(n => [n.id, n.name])], kb?.node || '', 'id="kb-node"'))}</div></div>`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn(kb ? t('save') : t('create'), { variant: 'primary', onclick: () => {
      const name = document.getElementById('kb-name').value.trim(); if (!name) { UI.toast('Name is required', 'info'); return; }
      const [model, dim] = document.getElementById('kb-model').value.split('|');
      if (kb) Object.assign(kb, { name, desc: document.getElementById('kb-desc').value, node: document.getElementById('kb-node').value || null });
      else { const id = 'k' + Date.now(); DB.kbs.push({ id, name, desc: document.getElementById('kb-desc').value, model, dim: +dim, docs: 0, node: document.getElementById('kb-node').value || null }); KB.docs[id] = []; KB.sources[id] = []; KB.sel = id; }
      UI.closeOverlay(); rerenderKB(); UI.toast(kb ? 'Saved' : 'Library collection created');
    } }) });
}
