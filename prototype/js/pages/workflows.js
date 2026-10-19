// BUILD › Flows › Designer (F-WF-04 … F-WF-07): canvas editing, node properties, live validation,
// interactive test run, versions and the draft → release flow. List/templates/BPMN live in build.js.
const WF = { chip: 'all', q: '', graphs: {}, versions: {}, changelog: {}, cur: null, sel: null, selEdge: null, panel: 'properties', tab: 'designer', zoom: 1, run: null, failAt: '' };
const NW = 170, NH = 52; // node size on the canvas

// ---------- Graph model ----------
const mkN = (id, type, label, x, y, props = {}) => ({ id, type, label, x, y, props });
const mkE = (from, to, extra = {}) => ({ id: 'e' + Math.random().toString(36).slice(2, 8), from, to, kind: 'normal', ...extra });

function defaultGraph(w) {
  const tpl = w.template || w.key;
  if (w.id === 'w1') return { nodes: [mkN('start', 'start', 'Start', 40, 200), mkN('classify', 'agent', 'Report classifier', 240, 200, { agent: 'a2', inputSource: 'run input', requireTool: true }),
    mkN('enrich', 'agent', 'Incident enrichment', 460, 200, { agent: 'a3', inputSource: 'prior node output', narrowing: ['incident.get', 'patrol.list_available'] }), mkN('propose', 'agent', 'Dispatch proposer', 680, 200, { agent: 'a5', inputSource: 'prior node output' }),
    mkN('decision', 'wait', 'Dispatcher decision', 900, 200, { event: 'dispatcher.decision', correlation: '{{input.report_id}}', timeout: '30m' }),
    mkN('gate', 'gate', 'Commit approval', 1120, 200, { role: 'Node manager', reasoning: 'Confirm the proposed unit and ETA before commit.', sla: 30, approvers: '1', onExpire: 'expired path' }),
    mkN('commit', 'mcp', 'dispatch.commit', 1340, 120, { integration: 'gov-erp', tool: 'dispatch.commit', args: '{ "unit": "{{outputs.propose.text}}" }' }),
    mkN('notify', 'comm', 'Notify citizen', 1560, 120, { channel: 'WhatsApp', recipient: '{{input.contact.phone}}', template: 'report_received', language: 'bilingual' }),
    mkN('triage', 'human', 'Dispatcher triage', 1340, 300, { assignee: 'Role: Dispatcher', instructions: 'Review the report and decide manually.', fields: ['outcome:select', 'notes:text'] }),
    mkN('end', 'end', 'End', 1780, 200, { output: '{{outputs.commit}}' })],
    edges: [mkE('start', 'classify'), mkE('classify', 'enrich'), mkE('enrich', 'propose'), mkE('propose', 'decision'), mkE('decision', 'gate', { label: 'event' }), mkE('decision', 'triage', { label: 'timeout' }),
      mkE('gate', 'commit', { label: 'approved' }), mkE('gate', 'triage', { label: 'rejected' }), mkE('commit', 'notify'), mkE('notify', 'end'), mkE('triage', 'end'), mkE('commit', 'triage', { kind: 'error' })] };
  if (w.id === 'w2') return { nodes: [mkN('start', 'start', 'Start', 40, 200), mkN('review', 'agent', 'Objection reviewer', 240, 200, { agent: 'a4', inputSource: 'run input' }),
    mkN('committee', 'wait', 'Committee decision', 460, 200, { event: 'committee.decision', correlation: '{{input.objection_id}}', timeout: '72h' }),
    mkN('gate1', 'gate', 'Decide objection', 680, 200, { role: 'Node manager', sla: 240, approvers: '2', reasoning: 'Worker recommendation is advisory.' }),
    mkN('decide', 'mcp', 'objection.decide', 900, 200, { integration: 'gov-erp', tool: 'objection.decide', args: '{ "decision": "{{outputs.committee.payload.decision}}" }' }),
    mkN('uphold', 'branch', 'Upheld?', 1120, 200, { conditions: [{ label: 'uphold', expr: 'outputs.committee.payload.decision == "uphold"' }] }),
    mkN('gate2', 'gate', 'Court referral', 1340, 120, { role: 'Admin', sla: 1440, approvers: '1' }), mkN('refer', 'mcp', 'court.file_referral', 1560, 120, { integration: 'gov-erp', tool: 'court.file_referral' }),
    mkN('end', 'end', 'End', 1780, 200)],
    edges: [mkE('start', 'review'), mkE('review', 'committee'), mkE('committee', 'gate1', { label: 'event' }), mkE('gate1', 'decide', { label: 'approved' }), mkE('decide', 'uphold'),
      mkE('uphold', 'gate2', { label: 'uphold' }), mkE('uphold', 'end', { label: 'default' }), mkE('gate2', 'refer', { label: 'approved' }), mkE('refer', 'end')] };
  if (tpl === 'api-health-check') return { nodes: [mkN('start', 'start', 'Start', 40, 200), mkN('call', 'http', 'Call endpoint', 240, 200, { method: 'GET', url: '', failOn: ['5xx'] }),
    mkN('ok', 'branch', 'Status OK?', 460, 200, { conditions: [{ label: 'healthy', expr: 'outputs.call.status == 200' }] }),
    mkN('healthy', 'set', 'Mark healthy', 680, 110, { vars: [['health', '"healthy"']] }), mkN('degraded', 'set', 'Mark degraded', 680, 290, { vars: [['health', '"degraded"']] }), mkN('end', 'end', 'End', 900, 200)],
    edges: [mkE('start', 'call'), mkE('call', 'ok'), mkE('ok', 'healthy', { label: 'healthy' }), mkE('ok', 'degraded', { label: 'default' }), mkE('healthy', 'end'), mkE('degraded', 'end'), mkE('call', 'degraded', { kind: 'error' })] };
  const mid = { 'approval-gate': mkN('gate', 'gate', 'Sign-off', 260, 200, { role: 'Admin', sla: 60, approvers: '1' }), 'human-triage-task': mkN('task', 'human', 'Triage task', 260, 200, {}), 'wait-for-callback': mkN('cb', 'wait', 'External callback', 260, 200, { event: 'external.callback', timeout: '24h' }) }[tpl];
  const nodes = [mkN('start', 'start', 'Start', 40, 200), ...(mid ? [mid] : []), mkN('end', 'end', 'End', mid ? 500 : 300, 200)];
  return { nodes, edges: mid ? [mkE('start', mid.id), mkE(mid.id, 'end', mid.type === 'gate' ? { label: 'approved' } : mid.type === 'wait' ? { label: 'event' } : {})] : [mkE('start', 'end')] };
}
const cloneG = g => JSON.parse(JSON.stringify(g));
const graphOf = w => WF.graphs[w.id] || (WF.graphs[w.id] = defaultGraph(w));
function versionsOf(w) {
  if (WF.versions[w.id]) return WF.versions[w.id];
  const list = [];
  if (w.released) {
    const g = defaultGraph(w);
    for (let v = w.version; v >= 1; v--) {
      const snap = cloneG(g); const drop = w.version - v; // older versions: fewer nodes
      for (let i = 0; i < drop; i++) { const victim = snap.nodes.filter(n => !['start', 'end'].includes(n.type)).slice(-1)[0]; if (!victim) break; snap.nodes = snap.nodes.filter(n => n !== victim); snap.edges = snap.edges.filter(e => e.from !== victim.id && e.to !== victim.id); }
      list.push({ v, state: v === w.version ? 'active' : 'archived', at: `2026-10-${String(17 - (w.version - v) * 6).padStart(2, '0')} 10:00`, note: ['Initial version', 'Added enrichment step', 'Added commit gate SLA and citizen notification'][v - 1] || 'Update', graph: snap });
    }
  }
  return (WF.versions[w.id] = list);
}
const activeGraph = w => versionsOf(w).find(v => v.state === 'active')?.graph || null;
const meta = type => DB.nodeTypes.find(n => n.type === type) || (type === 'start' ? { label: 'Start', icon: 'circle-play', color: 'emerald' } : { label: 'End', icon: 'circle-stop', color: 'slate' });

// Outgoing edge labels that certain nodes use
function portLabels(n) {
  if (n.type === 'branch') return [...(n.props.conditions || []).map(c => c.label), 'default'];
  if (n.type === 'gate') return ['approved', 'rejected', 'expired'];
  if (n.type === 'wait') return ['event', 'timeout'];
  return null;
}

// ---------- Expressions & templating ----------
function resolvePath(path, ctx) { return path.replace(/^\{\{|\}\}$/g, '').trim().split('.').reduce((o, k) => o == null ? undefined : o[k], ctx); }
function literal(s) { s = s.trim(); if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s); if (/^".*"$|^'.*'$/.test(s)) return s.slice(1, -1); if (s === 'true') return true; if (s === 'false') return false; if (s === 'null') return null; return s; }
function evalExpr(expr, ctx) {
  if (!expr || !expr.trim()) return false;
  return expr.split(/\s+or\s+/).some(part => part.split(/\s+and\s+/).every(atom => {
    atom = atom.trim(); let neg = false; if (atom.startsWith('not ')) { neg = true; atom = atom.slice(4); }
    let r; let m;
    if ((m = atom.match(/^(\S+)\s+exists$/))) r = resolvePath(m[1], ctx) !== undefined;
    else if ((m = atom.match(/^(\S+)\s+in\s+\[(.*)\]$/))) r = m[2].split(',').map(literal).includes(resolvePath(m[1], ctx));
    else if ((m = atom.match(/^(\S+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/))) { const a = resolvePath(m[1], ctx), b = literal(m[3]); r = { '==': a == b, '!=': a != b, '>': a > b, '<': a < b, '>=': a >= b, '<=': a <= b }[m[2]]; }
    else r = !!resolvePath(atom, ctx);
    return neg ? !r : r;
  }));
}
const fillTemplate = (s, ctx) => String(s || '').replace(/\{\{([^}]+)\}\}/g, (_, p) => { const v = resolvePath(p, ctx); return v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : v; });
const refsIn = s => [...String(s || '').matchAll(/\{\{\s*outputs\.([\w-]+)/g)].map(m => m[1]);

// ---------- Validation (F-WF-04) ----------
function upstream(g, id) { const seen = new Set(); const st = [id]; while (st.length) { const c = st.pop(); g.edges.filter(e => e.to === c).forEach(e => { if (!seen.has(e.from)) { seen.add(e.from); st.push(e.from); } }); } return seen; }
const REQUIRED = { agent: [['agent', 'Pick a released worker']], http: [['url', 'Set a request URL']], mcp: [['tool', 'Pick a tool']], wait: [['event', 'Set an event name']], sub: [['workflow', 'Pick a released flow']],
  gate: [['role', 'Pick an approver role']], comm: [['recipient', 'Set a recipient']], foreach: [['items', 'Set the items expression']], loop: [['condition', 'Set the loop condition']], human: [['assignee', 'Pick an assignee']], external: [['agentRef', 'Pick an external worker']] };
function validate(g) {
  const out = []; const add = (id, level, msg) => out.push({ id, level, msg });
  const starts = g.nodes.filter(n => n.type === 'start');
  if (starts.length !== 1) add(null, 'error', `Flow needs exactly one Start node (found ${starts.length})`);
  if (!g.nodes.some(n => n.type === 'end')) add(null, 'error', 'Flow needs at least one End node');
  const reach = new Set(['start']); let grow = true; while (grow) { grow = false; g.edges.forEach(e => { if (reach.has(e.from) && !reach.has(e.to)) { reach.add(e.to); grow = true; } }); }
  g.nodes.forEach(n => {
    const outs = g.edges.filter(e => e.from === n.id && e.kind === 'normal');
    if (n.type !== 'end' && !outs.length) add(n.id, 'error', `"${n.label}" has no outgoing edge`);
    if (n.type !== 'start' && !reach.has(n.id)) add(n.id, 'error', `"${n.label}" is unreachable from Start`);
    (REQUIRED[n.type] || []).forEach(([k, msg]) => { const v = n.props[k]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) add(n.id, 'error', `"${n.label}": ${msg}`); });
    if (n.type === 'agent' && n.props.agent && !DB.agentById(n.props.agent)?.released) add(n.id, 'error', `"${n.label}": agent is not released`);
    if (n.type === 'loop' && Number(n.props.max || 0) > 1000) add(n.id, 'error', `"${n.label}": max iterations is capped at 1000`);
    if (n.type === 'branch') {
      if (!outs.some(e => e.label === 'default')) add(n.id, 'error', `"${n.label}": needs a default edge`);
      (n.props.conditions || []).forEach(c => { if (!c.expr) add(n.id, 'error', `"${n.label}": condition "${c.label}" is empty`); else if (!outs.some(e => e.label === c.label)) add(n.id, 'warn', `"${n.label}": condition "${c.label}" has no edge`); });
    }
    if (n.type === 'gate') { if (!outs.some(e => e.label === 'approved')) add(n.id, 'error', `"${n.label}": needs an "approved" edge`); if (!outs.some(e => e.label === 'rejected')) add(n.id, 'warn', `"${n.label}": no "rejected" edge — a rejection fails the run`); }
    if (n.type === 'wait' && !outs.some(e => e.label === 'timeout')) add(n.id, 'warn', `"${n.label}": no "timeout" edge — a timeout fails the run`);
    const errs = g.edges.filter(e => e.from === n.id && e.kind === 'error');
    if (errs.length > 1) add(n.id, 'error', `"${n.label}": at most one error handler`);
    if (errs.some(e => g.nodes.find(x => x.id === e.to)?.type === 'start')) add(n.id, 'error', `"${n.label}": error handler cannot route to Start`);
    const up = upstream(g, n.id);
    Object.values(n.props).flat().forEach(v => refsIn(typeof v === 'object' ? JSON.stringify(v) : v).forEach(r => { if (!up.has(r)) add(n.id, 'error', `"${n.label}": {{outputs.${r}}} is not an upstream node`); }));
  });
  // cycles not driven by a Loop node
  const color = {}; let cyc = false;
  const dfs = id => { color[id] = 1; g.edges.filter(e => e.from === id && e.kind === 'normal').forEach(e => { if (color[e.to] === 1 && g.nodes.find(n => n.id === e.to)?.type !== 'loop') cyc = true; else if (!color[e.to]) dfs(e.to); }); color[id] = 2; };
  dfs('start'); if (cyc) add(null, 'warn', 'Cycle found — use a Loop node to repeat steps');
  return out;
}

// ---------- Canvas ----------
function edgePath(g, e) {
  const A = g.nodes.find(n => n.id === e.from), B = g.nodes.find(n => n.id === e.to); if (!A || !B) return null;
  const [x1, y1] = e.kind === 'error' ? [A.x + NW / 2, A.y + NH] : [A.x + NW, A.y + NH / 2];
  const [x2, y2] = [B.x, B.y + NH / 2];
  const d = e.kind === 'error' ? `M${x1} ${y1} C ${x1} ${y1 + 60}, ${x2 - 60} ${y2}, ${x2} ${y2}` : `M${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`;
  return { d, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 + (e.kind === 'error' ? 20 : 0) };
}
function canvasSize(g) { return [Math.max(1200, ...g.nodes.map(n => n.x + NW + 300)), Math.max(560, ...g.nodes.map(n => n.y + NH + 200))]; }

function canvasHtml(w, g, issues) {
  const [W, H] = canvasSize(g);
  const runSt = id => WF.run && WF.run.wid === w.id ? (WF.run.nodeState[id] || '') : '';
  const edges = g.edges.map(e => { const p = edgePath(g, e); if (!p) return ''; const sel = WF.selEdge === e.id; const col = e.kind === 'error' ? '#f43f5e' : sel ? '#0f9d8a' : '#94a3b8';
    return `<g><path d="${p.d}" stroke="transparent" stroke-width="14" fill="none" style="pointer-events:stroke;cursor:pointer" onclick="${UI.fn(ev => { ev.stopPropagation(); WF.selEdge = e.id; WF.sel = null; WF.panel = 'properties'; wfRender(); })}"/>
      <path d="${p.d}" stroke="${col}" stroke-width="${sel ? 2.5 : 1.5}" ${e.kind === 'error' ? 'stroke-dasharray="5 4"' : ''} fill="none" marker-end="url(#arr-${e.kind === 'error' ? 'err' : sel ? 'sel' : 'n'})" style="pointer-events:none"/>
      ${e.label || e.kind === 'error' ? `<g style="pointer-events:none"><rect x="${p.mx - 30}" y="${p.my - 9}" width="60" height="18" rx="9" fill="#fff" stroke="${col}"/><text x="${p.mx}" y="${p.my + 4}" text-anchor="middle" font-size="10" fill="${e.kind === 'error' ? '#e11d48' : '#475569'}">${e.kind === 'error' ? 'on error' : UI.esc(e.label)}</text></g>` : ''}</g>`; }).join('');
  const nodes = g.nodes.map(n => { const m = meta(n.type); const ni = issues.filter(i => i.id === n.id && i.level === 'error').length; const st = runSt(n.id);
    return `<div data-node="${n.id}" class="wf-node absolute flex items-center gap-2 rounded-lg border bg-white px-2.5 shadow-sm ${n.id === WF.sel ? 'selected' : ''} ${st} ${st === 'failed' ? 'border-rose-400' : st === 'waiting' ? 'border-amber-400' : 'border-slate-200'}" style="left:${n.x}px;top:${n.y}px;width:${NW}px;height:${NH}px">
      ${n.type !== 'start' ? `<span class="absolute -start-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-slate-400"></span>` : ''}
      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-${m.color}-100 text-${m.color}-700">${UI.icon(m.icon, 'w-4 h-4')}</span>
      <div class="min-w-0 flex-1"><div class="truncate text-xs font-medium">${UI.esc(n.label)}</div><div class="truncate text-[10px] text-slate-400">${m.label}${st ? ' · ' + st : ''}</div></div>
      <span id="nerr-${n.id}" class="absolute -end-1.5 -top-1.5">${ni ? `<span class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">${ni}</span>` : ''}</span>
      ${n.type !== 'end' ? `<span data-handle="${n.id}" title="Drag to connect" class="absolute -end-2 top-1/2 h-4 w-4 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-brand-500 hover:scale-125"></span>` : ''}
      ${!['start', 'end'].includes(n.type) ? `<span data-errhandle="${n.id}" title="Drag to add an error handler" class="absolute -bottom-2 start-1/2 h-3.5 w-3.5 -translate-x-1/2 cursor-crosshair rounded-full border-2 border-white bg-rose-400 hover:scale-125"></span>` : ''}
    </div>`; }).join('');
  const mmS = Math.min(180 / W, 110 / H);
  return `<div class="relative min-w-0 flex-1 rounded-lg border border-slate-200">
    <div id="wf-canvas" class="canvas-bg h-full overflow-auto rounded-lg scrollbar-thin" dir="ltr" onclick="if(event.target===this||event.target.id==='wf-inner'){window.wfDeselect()}">
      <div style="width:${W * WF.zoom}px;height:${H * WF.zoom}px"><div id="wf-inner" class="relative origin-top-left" style="width:${W}px;height:${H}px;transform:scale(${WF.zoom})">
        <svg class="absolute inset-0" width="${W}" height="${H}" style="pointer-events:none"><defs>${[['n', '#94a3b8'], ['sel', '#0f9d8a'], ['err', '#f43f5e']].map(([k, c]) => `<marker id="arr-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="${c}"/></marker>`).join('')}</defs>${edges}<path id="wf-temp" d="" stroke="#0f9d8a" stroke-width="2" stroke-dasharray="4 3" fill="none"/></svg>
        ${nodes}</div></div></div>
    <div class="absolute bottom-3 end-3 flex items-center gap-1 rounded-md bg-white p-1 shadow ring-1 ring-slate-200">${UI.iconBtn('zoom-out', () => setZoom(WF.zoom - 0.15), 'Zoom out')}<span class="w-10 text-center text-xs text-slate-500">${Math.round(WF.zoom * 100)}%</span>${UI.iconBtn('zoom-in', () => setZoom(WF.zoom + 0.15), 'Zoom in')}${UI.iconBtn('maximize', () => fitView(g), 'Fit to screen')}</div>
    <div class="absolute bottom-3 start-3 rounded-md bg-white/90 p-1 shadow ring-1 ring-slate-200" dir="ltr"><svg id="wf-minimap" width="${W * mmS}" height="${H * mmS}" class="cursor-pointer" data-scale="${mmS}">
      ${g.nodes.map(n => `<rect x="${n.x * mmS}" y="${n.y * mmS}" width="${NW * mmS}" height="${NH * mmS}" rx="1" fill="${n.id === WF.sel ? '#0f9d8a' : '#94a3b8'}"/>`).join('')}<rect id="wf-mm-view" fill="rgba(15,157,138,.08)" stroke="#0f9d8a" stroke-width="1"/></svg></div>
    <div class="pointer-events-none absolute start-3 top-3 rounded bg-white/80 px-2 py-1 text-[11px] text-slate-500">Drag the blue dot to connect · red dot = error handler · Del removes selection</div></div>`;
}
window.wfDeselect = () => { if (WF.sel || WF.selEdge) { WF.sel = null; WF.selEdge = null; wfRender(); } };
function setZoom(z) { WF.zoom = Math.min(1.5, Math.max(0.4, Math.round(z * 100) / 100)); wfRender(); }
function fitView(g) { const c = document.getElementById('wf-canvas'); const [W, H] = canvasSize(g); const maxX = Math.max(...g.nodes.map(n => n.x + NW)) + 60, maxY = Math.max(...g.nodes.map(n => n.y + NH)) + 60; WF.zoom = Math.max(0.4, Math.min(1.2, c.clientWidth / maxX, c.clientHeight / maxY)); wfRender(); const c2 = document.getElementById('wf-canvas'); if (c2) c2.scrollTo(0, 0); }

let WF_SCROLL = null;
function wfRender() {
  const c = document.getElementById('wf-canvas'); if (c) WF_SCROLL = [c.scrollLeft, c.scrollTop];
  const y = window.scrollY; APP.render(); window.scrollTo(0, y);
}
function nextLabel(g, n, used) { const ls = portLabels(n); if (!ls) return undefined; return ls.find(l => !used.includes(l)) || ls[0]; }

function bindCanvas(w, g) {
  const canvas = document.getElementById('wf-canvas'); if (!canvas) return;
  if (WF_SCROLL) { canvas.scrollLeft = WF_SCROLL[0]; canvas.scrollTop = WF_SCROLL[1]; WF_SCROLL = null; }
  const pt = ev => { const r = canvas.getBoundingClientRect(); return [(ev.clientX - r.left + canvas.scrollLeft) / WF.zoom, (ev.clientY - r.top + canvas.scrollTop) / WF.zoom]; };
  // Node drag / select
  canvas.querySelectorAll('[data-node]').forEach(el => el.addEventListener('mousedown', e => {
    if (e.target.closest('[data-handle],[data-errhandle]')) return;
    e.preventDefault();
    const n = g.nodes.find(x => x.id === el.dataset.node); const sx = e.clientX, sy = e.clientY, ox = n.x, oy = n.y; let moved = false;
    const mv = ev => { moved = true; n.x = Math.max(0, Math.round((ox + (ev.clientX - sx) / WF.zoom) / 10) * 10); n.y = Math.max(0, Math.round((oy + (ev.clientY - sy) / WF.zoom) / 10) * 10); el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); WF.sel = n.id; WF.selEdge = null; if (!moved) WF.panel = WF.panel === 'test' ? 'test' : 'properties'; if (moved) wfDirty(w); wfRender(); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }));
  // Connect by dragging from a handle
  const startConnect = (e, fromId, kind) => {
    e.preventDefault(); e.stopPropagation();
    const A = g.nodes.find(n => n.id === fromId); const temp = document.getElementById('wf-temp');
    const [x1, y1] = kind === 'error' ? [A.x + NW / 2, A.y + NH] : [A.x + NW, A.y + NH / 2];
    const mv = ev => { const [x, y] = pt(ev); temp.setAttribute('d', `M${x1} ${y1} L${x} ${y}`); temp.setAttribute('stroke', kind === 'error' ? '#f43f5e' : '#0f9d8a'); };
    const up = ev => {
      document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); temp.setAttribute('d', '');
      // Drop target = node whose box contains the pointer, in graph coordinates (zoom/scroll aware)
      const [px, py] = pt(ev);
      const B = g.nodes.find(n => n.id !== fromId && px >= n.x - 8 && px <= n.x + NW + 8 && py >= n.y - 8 && py <= n.y + NH + 8); if (!B) return;
      const to = B.id;
      if (B.type === 'start') { UI.toast('Nothing can connect into Start', 'info'); return; }
      if (kind === 'error') { g.edges = g.edges.filter(x => !(x.from === fromId && x.kind === 'error')); g.edges.push(mkE(fromId, to, { kind: 'error' })); }
      else { if (g.edges.some(x => x.from === fromId && x.to === to && x.kind === 'normal')) return; const used = g.edges.filter(x => x.from === fromId && x.kind === 'normal').map(x => x.label); g.edges.push(mkE(fromId, to, { label: nextLabel(g, A, used) })); }
      WF.selEdge = g.edges[g.edges.length - 1].id; WF.sel = null; WF.panel = 'properties'; wfDirty(w); wfRender();
    };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  };
  canvas.querySelectorAll('[data-handle]').forEach(h => h.addEventListener('mousedown', e => startConnect(e, h.dataset.handle, 'normal')));
  canvas.querySelectorAll('[data-errhandle]').forEach(h => h.addEventListener('mousedown', e => startConnect(e, h.dataset.errhandle, 'error')));
  // Minimap
  const mm = document.getElementById('wf-minimap'), view = document.getElementById('wf-mm-view');
  const syncMM = () => { const s = +mm.dataset.scale; view.setAttribute('x', canvas.scrollLeft / WF.zoom * s); view.setAttribute('y', canvas.scrollTop / WF.zoom * s); view.setAttribute('width', canvas.clientWidth / WF.zoom * s); view.setAttribute('height', canvas.clientHeight / WF.zoom * s); };
  canvas.addEventListener('scroll', syncMM); syncMM();
  mm.addEventListener('click', e => { const r = mm.getBoundingClientRect(), s = +mm.dataset.scale; canvas.scrollTo({ left: ((e.clientX - r.left) / s) * WF.zoom - canvas.clientWidth / 2, top: ((e.clientY - r.top) / s) * WF.zoom - canvas.clientHeight / 2, behavior: 'smooth' }); });
}
function scrollToNode(g, id) {
  const n = g.nodes.find(x => x.id === id); const c = document.getElementById('wf-canvas'); if (!n || !c) return;
  c.scrollTo({ left: n.x * WF.zoom - c.clientWidth / 2 + NW / 2, top: n.y * WF.zoom - c.clientHeight / 2, behavior: 'smooth' });
}
document.addEventListener('keydown', e => {
  if (APP.route !== 'flows' || !APP.params[0] || !['Delete', 'Backspace'].includes(e.key) || e.target.closest('input,textarea,select,[contenteditable]')) return;
  const w = DB.workflows.find(x => x.id === APP.params[0]); if (!w) return; const g = graphOf(w);
  if (WF.selEdge) { g.edges = g.edges.filter(x => x.id !== WF.selEdge); WF.selEdge = null; }
  else if (WF.sel) { const n = g.nodes.find(x => x.id === WF.sel); if (!n || ['start'].includes(n.type)) return; g.nodes = g.nodes.filter(x => x !== n); g.edges = g.edges.filter(x => x.from !== n.id && x.to !== n.id); WF.sel = null; }
  else return;
  e.preventDefault(); wfDirty(w); wfRender();
});

// ---------- Node properties (F-WF-05) ----------
const PUBLISHED_WFS = () => DB.workflows.filter(x => x.released).map(x => [x.id, x.name]);
const NODE_FIELDS = {
  start: [['inputSchema', 'Input schema (JSON Schema)', 'json']],
  end: [['output', 'Output mapping', 'template']],
  agent: [['agent', 'Worker (released only)', 'select', () => [['', '— pick —'], ...DB.agents.map(a => [a.id, a.name + (a.released ? '' : ' (draft — not allowed)')])]], ['inputSource', 'Input source', 'select', ['run input', 'prior node output', 'custom template']],
    ['template', 'Custom input template', 'template', null, n => n.props.inputSource === 'custom template'], ['requireTool', 'Require tool call (fail if the worker answers without calling a tool)', 'bool'],
    ['narrowing', "Per-step tool narrowing (subset only — can restrict, never escalate)", 'checks', () => ['kb.search', 'incident.get', 'patrol.list_available', 'dispatch.commit', 'query.read', 'memory.save']]],
  foreach: [['items', 'Items expression', 'template'], ['itemVar', 'Item variable', 'text', 'item'], ['concurrency', 'Concurrency', 'number'], ['body', 'Body (runs once per item)', 'select', () => [['', '— connected nodes —'], ...PUBLISHED_WFS()]]],
  sub: [['workflow', 'Flow (released only)', 'select', () => [['', '— pick —'], ...PUBLISHED_WFS()]], ['inputMap', 'Input mapping', 'template'], ['wait', 'Wait for completion', 'bool']],
  loop: [['condition', 'Repeat until (expression)', 'expr'], ['max', 'Max iterations', 'number']],
  parallel: [['join', 'Join policy', 'select', [['all', 'Wait for all branches'], ['any', 'Continue when any finishes'], ['n', 'Continue after N branches']]], ['n', 'N (when join = N)', 'number', null, n => n.props.join === 'n']],
  wait: [['event', 'Event name', 'text'], ['correlation', 'Correlation key', 'template'], ['timeout', 'Timeout', 'text'], ['payloadVar', 'Store payload as', 'text']],
  http: [['method', 'Method', 'select', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']], ['url', 'URL', 'template'], ['headers', 'Headers', 'kv'], ['body', 'Body', 'template', null, n => n.props.method && n.props.method !== 'GET'],
    ['credential', 'Credential (decrypted gateway-side, never stored in run state)', 'select', [['', '— none —'], ['payments-api', 'payments-api · HTTP API credential']]], ['failOn', 'Fail on', 'checks', ['4xx', '5xx']],
    ['assertPath', 'Assertion: JSON path (alone it must exist)', 'text'], ['assertValue', 'Assertion: must equal (optional)', 'text']],
  mcp: [['integration', 'Connector', 'select', [['gov-erp', 'Gov ERP (MCP)'], ['registry-db', 'Registry DB']]], ['tool', 'Tool (granted only)', 'select', () => [['', '— pick —'], 'incident.get', 'patrol.list_available', 'dispatch.commit', 'objection.get', 'objection.decide', 'court.file_referral']], ['args', 'Argument mapping (JSON)', 'template']],
  external: [['agentRef', 'External worker', 'select', () => [['', '— pick —'], ...DB.integrations.filter(i => i.group === 'agents').map(i => [i.key, i.name])]], ['inputMap', 'Input mapping', 'template'], ['timeout', 'Timeout', 'text']],
  comm: [['channel', 'Channel', 'select', ['email', 'SMS', 'WhatsApp', 'Teams', 'Slack', 'webhook']], ['recipient', 'Recipient', 'template'], ['template', 'Message template', 'select', ['report_received', 'case_closed', 'approval_needed']], ['language', 'Language', 'select', [['en', 'English'], ['ar', 'Arabic'], ['bilingual', 'Bilingual (en + ar)']]]],
  set: [['vars', 'Variables (name = expression)', 'kv']],
  gate: [['role', 'Approver role', 'select', [['', '— pick —'], 'Owner', 'Admin', 'Node manager', 'Member']], ['reasoning', 'Reasoning prompt shown to the approver', 'textarea'], ['sla', 'SLA minutes', 'number'],
    ['approvers', 'Required approvers', 'select', ['1', '2', '3']], ['onExpire', 'When the SLA expires', 'select', [['expired path', 'Take the "expired" edge'], ['fail', 'Fail the run']]]],
  branch: [['conditions', 'Conditions (evaluated in order; first match wins)', 'conds']],
  human: [['assignee', 'Assignee', 'select', [['', '— pick —'], 'Role: Dispatcher', 'Node: Dispatch (managers)', 'User: Omar Khalid', 'User: Sara Ahmed']], ['instructions', 'Instructions', 'textarea'], ['fields', 'Form fields (name:type, one per line)', 'lines']]
};

function tokensFor(g, n) {
  const up = [...upstream(g, n.id)].map(id => g.nodes.find(x => x.id === id)).filter(x => x && x.type !== 'start');
  const vars = g.nodes.filter(x => x.type === 'set').flatMap(x => (x.props.vars || []).map(v => v[0])).filter(Boolean);
  return [...new Set(['{{input}}', '{{input.report_id}}', ...up.map(u => `{{outputs.${u.id}.text}}`), ...up.filter(u => u.type === 'wait').map(u => `{{outputs.${u.id}.payload}}`), ...up.filter(u => u.type === 'http').map(u => `{{outputs.${u.id}.status}}`), ...vars.map(v => `{{vars.${v}}}`)])];
}
function propField(g, n, [k, label, type, opt, when]) {
  if (when && !when(n)) return '';
  const v = n.props[k]; const o = typeof opt === 'function' ? opt() : opt;
  const dp = `data-prop="${k}" data-ptype="${type}"`;
  const tokBtn = `<button type="button" data-tokens="${k}" class="absolute end-1.5 top-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 hover:bg-brand-100" title="Insert a variable">{{ }}</button>`;
  if (type === 'bool') return `<label class="flex items-start gap-2 text-sm"><input type="checkbox" class="mt-0.5 rounded text-brand-600" ${v ? 'checked' : ''} ${dp}/><span>${label}</span></label>`;
  if (type === 'select') return UI.field(label, UI.select(o, v ?? '', dp));
  if (type === 'number') return UI.field(label, UI.input(v ?? '', `type="number" ${dp}`));
  if (type === 'textarea') return UI.field(label, UI.textarea(v || '', dp, 3));
  if (type === 'lines') return UI.field(label, UI.textarea((v || []).join('\n'), `class="font-mono" ${dp}`, 3));
  if (type === 'json') return UI.field(label, UI.textarea(v || '{ "type": "object" }', `class="font-mono" ${dp}`, 4));
  if (type === 'checks') return UI.field(label, `<div class="flex flex-wrap gap-1.5">${o.map(x => `<label class="flex items-center gap-1 rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[11px]"><input type="checkbox" class="rounded text-brand-600" ${(v || []).includes(x) ? 'checked' : ''} ${dp} data-val="${x}"/>${x}</label>`).join('')}</div>`);
  if (type === 'template' || type === 'expr') return UI.field(label, `<div class="relative">${(k === 'args' || k === 'body' || k === 'inputMap' || k === 'output') ? UI.textarea(v || '', `class="font-mono pe-12" ${dp}`, 3) : UI.input(v || '', `class="font-mono pe-12" ${dp} placeholder="${type === 'expr' ? 'outputs.node.field == value' : '{{input}}'}"`)}${tokBtn}</div>`, type === 'expr' ? 'Grammar: dot paths, == != > < >= <=, and / or / not, in [..], exists.' : 'Use {{input}}, {{outputs.<node>.*}}, {{vars.<name>}}.');
  if (type === 'kv') return UI.field(label, `<div class="space-y-1.5">${(v || []).map((r, i) => `<div class="flex gap-1.5"><input class="${UI.inputCls} font-mono" value="${UI.esc(r[0])}" data-kv="${k}" data-i="${i}" data-j="0" placeholder="name"/><input class="${UI.inputCls} font-mono" value="${UI.esc(r[1])}" data-kv="${k}" data-i="${i}" data-j="1" placeholder="value or {{…}}"/>${UI.iconBtn('x', () => { v.splice(i, 1); wfDirty(); wfRender(); })}</div>`).join('')}
    ${UI.btn('Add', { size: 'sm', icon: 'plus', onclick: () => { (n.props[k] = n.props[k] || []).push(['', '']); wfRender(); } })}</div>`);
  if (type === 'conds') return UI.field(label, `<div class="space-y-2">${(v || []).map((c, i) => `<div class="rounded-md border border-slate-200 p-2"><div class="mb-1 flex items-center gap-1.5"><span class="text-[11px] text-slate-500">${i + 1}.</span><input class="${UI.inputCls} !py-1 text-xs" value="${UI.esc(c.label)}" data-cond="${i}" data-ck="label" placeholder="edge label"/>${UI.iconBtn('x', () => { v.splice(i, 1); wfDirty(); wfRender(); })}</div>
    <input class="${UI.inputCls} font-mono !py-1 text-xs" value="${UI.esc(c.expr)}" data-cond="${i}" data-ck="expr" placeholder='outputs.call.status == 200'/></div>`).join('')}
    <div class="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">Otherwise → <span class="font-mono">default</span> edge</div>
    ${UI.btn('Add condition', { size: 'sm', icon: 'plus', onclick: () => { (n.props.conditions = n.props.conditions || []).push({ label: 'case' + ((v || []).length + 1), expr: '' }); wfDirty(); wfRender(); } })}</div>`, 'Each condition routes to the outgoing edge with the same label.');
  return UI.field(label, UI.input(v ?? '', dp));
}
function nodePanel(w, g, n, issues) {
  const m = meta(n.type); const errEdge = g.edges.find(e => e.from === n.id && e.kind === 'error');
  const iss = issues.filter(i => i.id === n.id);
  const outs = g.edges.filter(e => e.from === n.id && e.kind === 'normal');
  return `<div class="space-y-3"><div class="flex items-center gap-2"><span class="flex h-7 w-7 items-center justify-center rounded-md bg-${m.color}-100 text-${m.color}-700">${UI.icon(m.icon, 'w-4 h-4')}</span><span class="text-sm font-semibold">${m.label}</span><span class="ms-auto font-mono text-[10px] text-slate-400">${n.id}</span></div>
    <div id="panel-issues">${iss.map(i => `<div class="mb-1 rounded px-2 py-1 text-[11px] ${i.level === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}">${UI.esc(i.msg)}</div>`).join('')}</div>
    ${UI.field('Label', UI.input(n.label, 'data-prop="__label" data-ptype="text"'))}
    ${(NODE_FIELDS[n.type] || []).map(f => propField(g, n, f)).join('')}
    ${!['start', 'end'].includes(n.type) ? UI.field('Error handling', UI.select([['', '— none —'], ...g.nodes.filter(x => x.id !== n.id && x.type !== 'start').map(x => [x.id, x.label])], errEdge?.to || '', 'data-errsel="1"'), 'Optional single route taken only if this node fails (try/catch). Carries no condition.') : ''}
    ${portLabels(n) ? `<div class="rounded-md bg-slate-50 p-2 text-[11px] text-slate-600"><div class="mb-1 font-medium">Outgoing edges</div>${portLabels(n).map(l => `<div class="flex justify-between"><span class="font-mono">${l}</span><span>${outs.find(e => e.label === l) ? '→ ' + UI.esc(g.nodes.find(x => x.id === outs.find(e => e.label === l).to)?.label || '') : '<span class="text-slate-400">not connected</span>'}</span></div>`).join('')}</div>` : ''}
    <p class="text-[11px] text-slate-500">Outputs available to later nodes as <span class="font-mono">{{outputs.${n.id}.*}}</span></p>
    <div class="flex gap-2">${!['start'].includes(n.type) ? UI.btn('Duplicate', { size: 'sm', icon: 'copy', onclick: () => { const c = JSON.parse(JSON.stringify(n)); c.id = n.type + Math.random().toString(36).slice(2, 5); c.x += 30; c.y += 80; c.label += ' copy'; g.nodes.push(c); WF.sel = c.id; wfDirty(w); wfRender(); } }) + UI.btn('Delete', { size: 'sm', variant: 'danger-ghost', icon: 'trash-2', onclick: () => { g.nodes = g.nodes.filter(x => x !== n); g.edges = g.edges.filter(e => e.from !== n.id && e.to !== n.id); WF.sel = null; wfDirty(w); wfRender(); } }) : ''}</div></div>`;
}
function edgePanel(w, g, e) {
  const A = g.nodes.find(n => n.id === e.from), B = g.nodes.find(n => n.id === e.to); const ls = portLabels(A);
  return `<div class="space-y-3"><div class="text-sm font-semibold">${e.kind === 'error' ? 'Error-handler edge' : 'Edge'}</div>
    <div class="rounded-md bg-slate-50 p-2 text-xs"><span class="font-medium">${UI.esc(A.label)}</span> → <span class="font-medium">${UI.esc(B.label)}</span></div>
    ${e.kind === 'normal' && ls ? UI.field('Route', UI.select(ls, e.label || '', 'id="edge-label"'), A.type === 'branch' ? 'Matches a branch condition label, or default.' : A.type === 'gate' ? 'Which decision takes this edge.' : 'Event received, or timeout.') : ''}
    ${e.kind === 'error' ? '<p class="text-xs text-slate-500">Taken only if the source node fails. At most one per node.</p>' : ''}
    ${UI.btn('Delete edge', { size: 'sm', variant: 'danger-ghost', icon: 'trash-2', onclick: () => { g.edges = g.edges.filter(x => x !== e); WF.selEdge = null; wfDirty(w); wfRender(); } })}</div>`;
}
function bindPanel(w, g) {
  const n = g.nodes.find(x => x.id === WF.sel);
  const edgeSel = document.getElementById('edge-label');
  if (edgeSel) edgeSel.onchange = () => { g.edges.find(x => x.id === WF.selEdge).label = edgeSel.value; wfDirty(w); wfRender(); };
  if (!n) return;
  const panel = document.getElementById('wf-panel');
  const after = (rerender) => { wfDirty(w); if (rerender) wfRender(); else refreshValidation(w, g); };
  panel.querySelectorAll('[data-prop]').forEach(el => {
    const k = el.dataset.prop, ty = el.dataset.ptype;
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => {
      if (k === '__label') { n.label = el.value; const t = document.querySelector(`[data-node="${n.id}"] .truncate.text-xs`); if (t) t.textContent = el.value; return after(false); }
      if (ty === 'bool') n.props[k] = el.checked;
      else if (ty === 'checks') n.props[k] = [...panel.querySelectorAll(`[data-prop="${k}"]:checked`)].map(x => x.dataset.val);
      else if (ty === 'lines') n.props[k] = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      else if (ty === 'number') n.props[k] = el.value === '' ? '' : Number(el.value);
      else n.props[k] = el.value;
      after(el.tagName === 'SELECT' && ['inputSource', 'join', 'method'].includes(k));
    });
  });
  panel.querySelectorAll('[data-kv]').forEach(el => el.addEventListener('input', () => { n.props[el.dataset.kv][+el.dataset.i][+el.dataset.j] = el.value; after(false); }));
  panel.querySelectorAll('[data-cond]').forEach(el => el.addEventListener('input', () => {
    const c = n.props.conditions[+el.dataset.cond]; const old = c.label; c[el.dataset.ck] = el.value;
    if (el.dataset.ck === 'label') g.edges.filter(e => e.from === n.id && e.label === old).forEach(e => e.label = el.value);
    after(false);
  }));
  panel.querySelectorAll('[data-errsel]').forEach(el => el.addEventListener('change', () => { g.edges = g.edges.filter(e => !(e.from === n.id && e.kind === 'error')); if (el.value) g.edges.push(mkE(n.id, el.value, { kind: 'error' })); after(true); }));
  panel.querySelectorAll('[data-tokens]').forEach(b => b.addEventListener('click', ev => {
    ev.preventDefault(); const k = b.dataset.tokens; const field = panel.querySelector(`[data-prop="${k}"]`);
    document.getElementById('tok-pop')?.remove();
    const pop = document.createElement('div'); pop.id = 'tok-pop'; pop.className = 'absolute end-0 top-8 z-30 max-h-56 w-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg';
    pop.innerHTML = tokensFor(g, n).map(tk => `<button type="button" class="block w-full truncate rounded px-2 py-1 text-start font-mono text-[11px] hover:bg-brand-50">${tk}</button>`).join('');
    b.parentElement.appendChild(pop);
    pop.querySelectorAll('button').forEach(tb => tb.onclick = () => { const s = field.selectionStart ?? field.value.length; field.value = field.value.slice(0, s) + tb.textContent + field.value.slice(field.selectionEnd ?? s); field.dispatchEvent(new Event('input')); pop.remove(); field.focus(); });
    setTimeout(() => document.addEventListener('click', function off(e2) { if (!pop.contains(e2.target)) { pop.remove(); document.removeEventListener('click', off); } }), 0);
  }));
}

// ---------- Live validation refresh (no full re-render, keeps focus) ----------
function refreshValidation(w, g) {
  const issues = validate(g); const errs = issues.filter(i => i.level === 'error');
  g.nodes.forEach(n => { const el = document.getElementById('nerr-' + n.id); if (!el) return; const c = errs.filter(i => i.id === n.id).length; el.innerHTML = c ? `<span class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">${c}</span>` : ''; });
  const vb = document.getElementById('wf-valid-badge'); if (vb) vb.innerHTML = validBadge(issues);
  const vc = document.getElementById('wf-valid-count'); if (vc) vc.textContent = issues.length;
  const pi = document.getElementById('panel-issues'); if (pi) pi.innerHTML = issues.filter(i => i.id === WF.sel).map(i => `<div class="mb-1 rounded px-2 py-1 text-[11px] ${i.level === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}">${UI.esc(i.msg)}</div>`).join('');
  const dc = document.getElementById('wf-diff-count'); if (dc) dc.textContent = diffText(w, g);
}
const validBadge = issues => { const e = issues.filter(i => i.level === 'error').length, wn = issues.length - e; return e ? UI.badge(`${e} issue${e > 1 ? 's' : ''}`, 'red') + (wn ? ' ' + UI.badge(`${wn} warning${wn > 1 ? 's' : ''}`, 'amber') : '') : UI.badge(`All checks pass${wn ? ` · ${wn} warning${wn > 1 ? 's' : ''}` : ''}`, 'green'); };
function validatePanel(g, issues) {
  if (!issues.length) return `<div class="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">${UI.icon('check-circle-2', 'w-4 h-4 inline')} All checks pass</div>`;
  return `<ul class="space-y-1.5">${issues.map(i => `<li class="flex cursor-pointer gap-2 rounded-md p-2 text-xs ${i.level === 'error' ? 'bg-rose-50 text-rose-800 hover:bg-rose-100' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}" onclick="${UI.fn(() => { if (i.id) { WF.sel = i.id; WF.selEdge = null; WF.panel = 'properties'; wfRender(); setTimeout(() => scrollToNode(g, i.id), 50); } })}">${UI.icon(i.level === 'error' ? 'octagon-x' : 'alert-triangle', 'w-4 h-4 shrink-0')}<span class="flex-1">${UI.esc(i.msg)}</span>${i.id ? UI.icon('locate-fixed', 'w-3.5 h-3.5 shrink-0 opacity-60') : ''}</li>`).join('')}</ul>
    <p class="mt-3 text-[11px] text-slate-500">Errors block test runs and releasing. Warnings don't.</p>`;
}

// ---------- Test run (F-WF-06 simulation) ----------
function simulate(n, ctx, w) {
  const p = n.props;
  switch (n.type) {
    case 'agent': { const a = DB.agentById(p.agent); return { text: `${a?.name || 'Worker'}: ${n.id === 'classify' ? 'theft_major · very_urgent · dispatch lane' : n.id === 'propose' ? 'Unit P-17 (ETA 7 min)' : 'done'}`, tokens: 900 + Math.round(Math.random() * 900), tool_calls: p.requireTool ? 1 : 0 }; }
    case 'http': { const url = fillTemplate(p.url, ctx); const status = /fail|down/.test(url) ? 503 : 200; return { status, url, data: { state: status === 200 ? 'ok' : 'unavailable' } }; }
    case 'mcp': return { ok: true, tool: p.tool, result: { id: 'DSP-' + Math.floor(Math.random() * 900 + 100) } };
    case 'set': { (p.vars || []).forEach(([k, v]) => { if (k) ctx.vars[k] = /^".*"$/.test(v) ? v.slice(1, -1) : (resolvePath(v, ctx) ?? literal(v)); }); return { vars: { ...ctx.vars } }; }
    case 'comm': return { sent: true, channel: p.channel, to: fillTemplate(p.recipient, ctx) || '(empty)' };
    case 'sub': return { status: 'succeeded', flow: p.workflow };
    case 'external': return { text: 'External worker replied', ref: p.agentRef };
    case 'foreach': return { iterations: 3 };
    case 'loop': return { iterations: 2, until: p.condition };
    case 'parallel': return { joined: p.join || 'all' };
    case 'end': return { output: fillTemplate(p.output, ctx) || null };
    default: return {};
  }
}
function startRun(w, g) {
  const issues = validate(g).filter(i => i.level === 'error');
  if (issues.length) { UI.toast(`Fix ${issues.length} validation error${issues.length > 1 ? 's' : ''} before a test run`, 'info'); WF.panel = 'validate'; wfRender(); return; }
  let input; const raw = document.getElementById('wf-input').value; try { input = JSON.parse(raw); } catch { input = { text: raw }; }
  WF.inputRaw = raw;
  WF.run = { wid: w.id, id: Math.random().toString(16).slice(2, 8), status: 'running', steps: [], nodeState: {}, ctx: { input, outputs: {}, vars: {} }, queue: ['start'], visits: 0, tokens: 0, pending: null };
  wfRender(); setTimeout(() => stepRun(w, g), 300);
}
function stepRun(w, g) {
  const R = WF.run; if (!R || R.wid !== w.id || R.status !== 'running') return;
  if (!R.queue.length) { R.status = 'succeeded'; drawRun(w, g); return; }
  if (++R.visits > 60) { R.status = 'failed'; R.error = 'Step limit reached (possible infinite cycle)'; drawRun(w, g); return; }
  const id = R.queue.shift(); const n = g.nodes.find(x => x.id === id); if (!n) return stepRun(w, g);
  R.nodeState[id] = 'running'; drawRun(w, g);
  const outsAll = g.edges.filter(e => e.from === id && e.kind === 'normal');
  const follow = labels => outsAll.filter(e => labels === null || labels.includes(e.label)).forEach(e => R.queue.push(e.to));
  const record = (status, output, extra = {}) => { R.steps.push({ node: id, label: n.label, type: n.type, status, ms: extra.ms ?? 200 + Math.round(Math.random() * 900), input: extra.input, output, note: extra.note }); R.nodeState[id] = status === 'succeeded' ? 'done' : status; if (output) R.ctx.outputs[id] = output; if (output?.tokens) R.tokens += output.tokens; };
  const fail = (code, msg) => {
    const err = g.edges.find(e => e.from === id && e.kind === 'error');
    record('failed', { error: code, message: msg }, { note: err ? `→ error handler "${g.nodes.find(x => x.id === err.to)?.label}"` : 'no error handler — run fails' });
    if (err) { R.queue.push(err.to); setTimeout(() => stepRun(w, g), 500); } else { R.status = 'failed'; R.error = `${code}: ${msg}`; }
    drawRun(w, g);
  };
  setTimeout(() => {
    if (WF.failAt === id) return fail('NODE_FAILED', 'Simulated failure (test option)');
    if (n.type === 'gate' || n.type === 'wait' || n.type === 'human') { R.nodeState[id] = 'waiting'; R.pending = { id, type: n.type }; drawRun(w, g); return; }
    if (n.type === 'start') { record('succeeded', { input: R.ctx.input }, { ms: 0 }); follow(null); }
    else if (n.type === 'branch') {
      const hit = (n.props.conditions || []).find(c => evalExpr(c.expr, R.ctx)); const lab = hit ? hit.label : 'default';
      record('succeeded', { matched: lab }, { ms: 2, note: hit ? `${hit.expr} → true` : 'no condition matched → default' }); follow([lab]);
    } else {
      const out = simulate(n, R.ctx, w);
      if (n.type === 'http') {
        const cls = String(out.status)[0] + 'xx';
        if ((n.props.failOn || []).includes(cls)) return fail('WORKFLOW_HTTP_STATUS', `HTTP ${out.status}`);
        if (n.props.assertPath) { const v = resolvePath(n.props.assertPath, out); if (v === undefined || (n.props.assertValue && String(v) !== n.props.assertValue)) return fail('WORKFLOW_HTTP_ASSERTION', `${n.props.assertPath} ${v === undefined ? 'missing' : `= ${v}`}`); }
      }
      if (n.type === 'agent' && n.props.requireTool && !out.tool_calls) return fail('AGENT_NO_TOOL_CALL', 'Worker answered without calling a tool');
      record('succeeded', out); if (n.type !== 'end') follow(null);
    }
    drawRun(w, g); setTimeout(() => stepRun(w, g), 450);
  }, n.type === 'start' ? 50 : 350);
}
function resume(w, g, decision, payload) {
  const R = WF.run; const p = R.pending; if (!p) return; const n = g.nodes.find(x => x.id === p.id); R.pending = null;
  const outs = g.edges.filter(e => e.from === n.id && e.kind === 'normal');
  const go = lab => { const es = outs.filter(e => lab === null || e.label === lab); if (!es.length && lab) { R.steps.push({ node: n.id, label: n.label, type: n.type, status: 'failed', ms: 0, output: { reason: lab }, note: `no "${lab}" edge — run fails` }); R.nodeState[n.id] = 'failed'; R.status = 'failed'; R.error = `${n.label}: ${lab}`; drawRun(w, g); return false; } es.forEach(e => R.queue.push(e.to)); return true; };
  let out, note, lab;
  if (n.type === 'gate') { lab = decision; out = { decision, approver: decision === 'expired' ? null : 'Layla Hassan (Node manager)' }; note = decision === 'expired' ? `SLA ${n.props.sla || '?'} min expired` : `${decision} by Layla Hassan`; if (decision === 'expired' && n.props.onExpire === 'fail') lab = '__fail'; }
  else if (n.type === 'wait') { lab = decision; let pl; try { pl = JSON.parse(payload || '{}'); } catch { pl = { text: payload }; } out = decision === 'event' ? { event: n.props.event, payload: pl } : { timeout: n.props.timeout }; note = decision === 'event' ? `event ${n.props.event} received` : `timed out after ${n.props.timeout}`; }
  else { lab = null; out = { result: payload }; note = 'submitted by Omar Khalid'; }
  R.steps.push({ node: n.id, label: n.label, type: n.type, status: 'succeeded', ms: 0, output: out, note, waited: true }); R.ctx.outputs[n.id] = out; R.nodeState[n.id] = 'done';
  if (lab === '__fail') { R.nodeState[n.id] = 'failed'; R.status = 'failed'; R.error = 'Checkpoint timer expired'; drawRun(w, g); return; }
  if (go(lab) !== false) { drawRun(w, g); setTimeout(() => stepRun(w, g), 400); }
}
function pendingCard(w, g) {
  const R = WF.run; const p = R?.pending; if (!p) return '';
  const n = g.nodes.find(x => x.id === p.id);
  if (p.type === 'gate') return `<div class="rounded-md bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200"><div class="flex items-center gap-1.5 font-semibold">${UI.icon('shield-check', 'w-3.5 h-3.5')} ${UI.esc(n.label)} · waiting for ${n.props.role || 'approver'}</div>
    <p class="mt-1">${UI.esc(n.props.reasoning || '')}</p><p class="mt-1 text-amber-700">SLA ${n.props.sla || '—'} min · ${n.props.approvers || 1} approver(s)</p>
    <div class="mt-2 flex flex-wrap gap-1.5">${UI.btn('Approve', { size: 'sm', variant: 'primary', onclick: () => resume(w, g, 'approved') })}${UI.btn('Reject', { size: 'sm', onclick: () => resume(w, g, 'rejected') })}${UI.btn('Let SLA expire', { size: 'sm', variant: 'ghost', onclick: () => resume(w, g, 'expired') })}</div></div>`;
  if (p.type === 'wait') return `<div class="rounded-md bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200"><div class="flex items-center gap-1.5 font-semibold">${UI.icon('hourglass', 'w-3.5 h-3.5')} Waiting for event <span class="font-mono">${UI.esc(n.props.event)}</span></div>
    <p class="mt-1 text-amber-700">External systems call <span class="font-mono">POST /v1/workflows/runs/${R.id}/events</span></p>
    <textarea id="wf-payload" rows="3" class="${UI.inputCls} mt-2 font-mono text-xs" dir="ltr">${w.id === 'w2' ? '{ "decision": "uphold" }' : '{ "confirmed": true, "unit": "P-17" }'}</textarea>
    <div class="mt-2 flex gap-1.5">${UI.btn('Send event', { size: 'sm', variant: 'primary', onclick: () => resume(w, g, 'event', document.getElementById('wf-payload').value) })}${UI.btn('Simulate timeout', { size: 'sm', onclick: () => resume(w, g, 'timeout') })}</div></div>`;
  return `<div class="rounded-md bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200"><div class="flex items-center gap-1.5 font-semibold">${UI.icon('user-check', 'w-3.5 h-3.5')} Human task · ${UI.esc(n.props.assignee || 'unassigned')}</div><p class="mt-1">${UI.esc(n.props.instructions || '')}</p>
    <div class="mt-2 space-y-1.5">${(n.props.fields || ['result:text']).map(f => `<input class="${UI.inputCls} !py-1 text-xs" placeholder="${UI.esc(f.split(':')[0])}" data-hfield="${UI.esc(f.split(':')[0])}"/>`).join('')}</div>
    <div class="mt-2">${UI.btn('Submit', { size: 'sm', variant: 'primary', onclick: () => { const v = {}; document.querySelectorAll('[data-hfield]').forEach(i => v[i.dataset.hfield] = i.value); resume(w, g, null, v); } })}</div></div>`;
}
function runPanel(w, g) {
  const R = WF.run && WF.run.wid === w.id ? WF.run : null;
  const ctl = `${UI.field('Input (JSON or plain text)', UI.textarea(WF.inputRaw || (w.id === 'w3' ? '"https://status.acme.gov/health"' : '{ "report_id": "R-5521", "report": "Theft at Al Barsha mall parking, 2 suspects", "contact": { "phone": "+971500000000" } }'), 'id="wf-input" class="font-mono" dir="ltr"', 4))}
    <div class="mt-2 grid grid-cols-2 gap-2">${UI.field('Simulate failure at', `<select id="wf-failat" class="${UI.inputCls}"><option value="">— none —</option>${g.nodes.filter(n => !['start', 'end'].includes(n.type)).map(n => `<option value="${n.id}" ${WF.failAt === n.id ? 'selected' : ''}>${UI.esc(n.label)}</option>`).join('')}</select>`)}
      <div class="flex items-end">${UI.btn(R && R.status === 'running' ? 'Running…' : 'Start dry run', { icon: 'play', variant: 'primary', cls: 'w-full', disabled: R && R.status === 'running', onclick: () => startRun(w, g) })}</div></div>`;
  return ctl + `<div id="wf-run" class="mt-4">${runBody(w, g)}</div>`;
}
function runBody(w, g) {
  const R = WF.run && WF.run.wid === w.id ? WF.run : null; if (!R) return '<p class="text-center text-xs text-slate-400">Nodes light up as they execute. Gates, waits and human tasks pause here for you to act.</p>';
  const tone = { running: 'blue', succeeded: 'green', failed: 'red' }[R.status];
  return `<div class="mb-2 flex items-center justify-between text-xs"><span>Run <span class="font-mono">${R.id}</span> · origin <span class="font-mono">manual</span></span>${UI.badge(R.pending ? 'waiting' : R.status, R.pending ? 'amber' : tone)}</div>
    ${pendingCard(w, g)}
    <ol class="mt-2 space-y-1">${R.steps.map((s, i) => `<li><details class="rounded border border-slate-100 bg-slate-50 text-xs"><summary class="flex cursor-pointer items-center gap-1.5 px-2 py-1">${UI.icon(s.status === 'failed' ? 'x-circle' : s.waited ? 'pause-circle' : 'check-circle-2', `w-3.5 h-3.5 ${s.status === 'failed' ? 'text-rose-500' : s.waited ? 'text-amber-500' : 'text-emerald-500'}`)}<span class="flex-1 truncate">${i}. ${UI.esc(s.label)}</span><span class="text-slate-400">${s.waited ? 'resumed' : s.ms + 'ms'}</span></summary>
      <div class="space-y-1 border-t border-slate-100 p-2">${s.note ? `<div class="text-slate-600">${UI.esc(s.note)}</div>` : ''}<pre class="json-editor overflow-x-auto whitespace-pre-wrap rounded bg-white p-1.5 text-[10px]" dir="ltr">${UI.esc(JSON.stringify(s.output, null, 1))}</pre><button class="text-[11px] text-brand-600" onclick="${UI.fn(() => { WF.sel = s.node; WF.panel = 'test'; wfRender(); setTimeout(() => scrollToNode(g, s.node), 50); })}">Show on canvas</button></div></details></li>`).join('')}</ol>
    ${R.status !== 'running' ? `<div class="mt-3 rounded-md ${R.status === 'succeeded' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'} p-2 text-xs">${R.status === 'succeeded' ? `✓ Run succeeded · ${R.steps.length} steps · ${R.tokens.toLocaleString()} tokens · $${(R.tokens * 0.0000016).toFixed(4)}` : `✕ Run failed · ${UI.esc(R.error || '')}`} · <a href="#/executions" class="underline">Open run</a></div>` : ''}`;
}
function drawRun(w, g) {
  const R = WF.run; const box = document.getElementById('wf-run');
  if (!box || WF.panel !== 'test') { // still reflect node states on the canvas
    g.nodes.forEach(n => { const el = document.querySelector(`[data-node="${n.id}"]`); if (el) { el.classList.remove('running', 'done', 'waiting', 'failed'); if (R.nodeState[n.id]) el.classList.add(R.nodeState[n.id]); } });
    return;
  }
  box.innerHTML = runBody(w, g);
  g.nodes.forEach(n => { const el = document.querySelector(`[data-node="${n.id}"]`); if (!el) return; el.classList.remove('running', 'done', 'waiting', 'failed'); if (R.nodeState[n.id]) el.classList.add(R.nodeState[n.id]); });
  const btn = [...document.querySelectorAll('#wf-panel button')].find(b => /Start dry run|Running/.test(b.innerText)); if (btn) { btn.disabled = R.status === 'running'; btn.querySelector('span').textContent = R.status === 'running' ? 'Running…' : 'Start dry run'; }
  UI.refreshIcons();
}

// ---------- Diff, draft bar, release, versions (F-WF-04 versions) ----------
function graphDiff(oldG, newG) {
  const out = []; oldG = oldG || { nodes: [], edges: [] };
  const on = Object.fromEntries(oldG.nodes.map(n => [n.id, n])), nn = Object.fromEntries(newG.nodes.map(n => [n.id, n]));
  newG.nodes.forEach(n => { if (!on[n.id]) out.push(['+', `node ${n.id} (${meta(n.type).label}) "${n.label}"`]); else { const o = on[n.id]; if (o.label !== n.label) out.push(['~', `node ${n.id}: label "${o.label}" → "${n.label}"`]); const ks = new Set([...Object.keys(o.props), ...Object.keys(n.props)]); ks.forEach(k => { if (JSON.stringify(o.props[k]) !== JSON.stringify(n.props[k])) out.push(['~', `node ${n.id}.${k}: ${JSON.stringify(o.props[k]) ?? '∅'} → ${JSON.stringify(n.props[k]) ?? '∅'}`]); }); } });
  oldG.nodes.forEach(n => { if (!nn[n.id]) out.push(['-', `node ${n.id} "${n.label}"`]); });
  const ek = e => `${e.from}→${e.to}${e.kind === 'error' ? ' (on error)' : e.label ? ` [${e.label}]` : ''}`;
  const oe = new Set(oldG.edges.map(ek)), ne = new Set(newG.edges.map(ek));
  ne.forEach(k => { if (!oe.has(k)) out.push(['+', 'edge ' + k]); }); oe.forEach(k => { if (!ne.has(k)) out.push(['-', 'edge ' + k]); });
  return out;
}
function diffText(w, g) { const n = graphDiff(activeGraph(w), g).length; return w.released ? `${n} change${n === 1 ? '' : 's'} vs v${w.version}` : 'never released'; }
let wfDirtyT;
function wfDirty(w) { const s = document.getElementById('wf-save'); if (!s) return; s.textContent = 'saving…'; clearTimeout(wfDirtyT); wfDirtyT = setTimeout(() => { s.textContent = 'all changes saved'; }, 600); }
function diffList(d) {
  return d.length ? d.map(([op, t]) => `<div class="px-3 py-1 font-mono text-[11px] ${op === '+' ? 'bg-emerald-50 text-emerald-800' : op === '-' ? 'bg-rose-50 text-rose-800' : 'bg-sky-50 text-sky-800'}">${op} ${UI.esc(t)}</div>`).join('') : '<p class="p-4 text-center text-sm text-slate-400">No changes.</p>';
}
function wfReleaseDialog(w) {
  const g = graphOf(w); const issues = validate(g); const errs = issues.filter(i => i.level === 'error'), warns = issues.filter(i => i.level === 'warn');
  const d = graphDiff(activeGraph(w), g); const next = w.version + 1;
  const tested = WF.run && WF.run.wid === w.id && WF.run.status === 'succeeded';
  const blocked = errs.length || (w.released && !d.length);
  const row = (ok, text) => `<div class="flex items-start gap-2 text-sm ${ok === true ? 'text-emerald-700' : ok === 'warn' ? 'text-amber-700' : 'text-rose-700'}">${UI.icon(ok === true ? 'check-circle-2' : ok === 'warn' ? 'alert-triangle' : 'octagon-x', 'w-4 h-4 mt-0.5 shrink-0')}<span>${text}</span></div>`;
  UI.modal({ title: `Release v${next}`, sub: `${w.name}${w.released ? ` · replaces active v${w.version}` : ' · first version'}`, size: 'lg', body: `<div class="grid gap-5 md:grid-cols-2"><div class="space-y-4">
      ${UI.field('What changed in this release?', UI.textarea(WF.changelog[w.id] || '', 'id="wfpub-note" placeholder="Changelog note (recommended)"', 3))}
      <div class="rounded-md border border-slate-200 p-3"><div class="mb-2 text-xs font-semibold uppercase text-slate-500">Checks</div><div class="space-y-1.5">
        ${errs.length ? errs.map(e => row(false, UI.esc(e.msg))).join('') : row(true, 'Graph validated · 0 errors')}
        ${warns.map(x => row('warn', UI.esc(x.msg))).join('')}
        ${row(tested ? true : 'warn', tested ? 'Latest test run succeeded' : 'No successful test run of this draft yet')}
        ${row(true, 'Worker nodes reference released versions only (pinned at run start)')}
        ${w.released && !d.length ? row(false, 'No changes since the active version') : ''}</div></div></div>
      <div><div class="mb-2 flex justify-between text-xs font-semibold uppercase text-slate-500"><span>Changes vs ${w.released ? 'v' + w.version : 'empty'}</span><span>${d.length}</span></div><div class="max-h-80 overflow-y-auto rounded-md border border-slate-200 scrollbar-thin" dir="ltr">${diffList(d)}</div></div></div>
    ${blocked ? `<p class="mt-4 rounded-md bg-rose-50 p-2.5 text-xs text-rose-800">${UI.icon('lock', 'w-3.5 h-3.5 inline')} Releasing is blocked until the red checks pass.</p>` : `<p class="mt-4 text-xs text-slate-500">Released versions are immutable. New runs and triggers use v${next}; running instances keep the version they started on. Audited.</p>`}`,
    footer: UI.btn(t('cancel'), { onclick: 'UI.closeOverlay()' }) + UI.btn(`Release v${next}`, { variant: 'primary', icon: 'upload-cloud', disabled: blocked, onclick: () => {
      const vs = versionsOf(w); vs.forEach(v => { if (v.state === 'active') v.state = 'archived'; });
      vs.unshift({ v: next, state: 'active', at: new Date().toISOString().slice(0, 16).replace('T', ' '), note: document.getElementById('wfpub-note').value || 'No changelog note', graph: cloneG(g) });
      w.version = next; w.released = true; w.status = 'active'; w.nodes = g.nodes.length; w.updated = 'today'; WF.changelog[w.id] = '';
      UI.closeOverlay(); wfRender(); UI.toast(`Released v${next}`);
    } }) });
}
function versionsTab(w) {
  const vs = versionsOf(w); const g = graphOf(w);
  const rows = [[`<span class="font-mono">v${w.version + 1}</span>`, UI.badge('working copy', 'amber'), '—', `<span class="text-slate-500">${diffText(w, g)}</span>`, g.nodes.length, ''],
    ...vs.map((v, i) => [`<span class="font-mono">v${v.v}</span>`, UI.status(v.state), v.at, UI.esc(v.note), v.graph.nodes.length,
      `<div class="flex justify-end gap-1">${UI.btn('View', { size: 'sm', variant: 'ghost', onclick: () => UI.modal({ title: `v${v.v} · read-only`, sub: `Diff vs ${vs[i + 1] ? 'v' + vs[i + 1].v : 'empty'}`, size: 'lg', body: `<div class="rounded-md border border-slate-200" dir="ltr">${diffList(graphDiff(vs[i + 1]?.graph, v.graph))}</div>` }) })}
        ${UI.btn('Restore as working copy', { size: 'sm', variant: 'ghost', onclick: () => UI.confirm('Restore as working copy?', `Replaces the current draft with v${v.v}. Unreleased changes are lost.`, () => { WF.graphs[w.id] = cloneG(v.graph); WF.tab = 'designer'; wfRender(); UI.toast(`v${v.v} restored as draft`); }, 'Restore', false) })}
        ${v.state !== 'active' ? UI.btn('Release this version', { size: 'sm', onclick: () => UI.confirm('Roll back?', `Make v${v.v} the active version. New runs use it immediately; this is audited.`, () => { vs.forEach(x => x.state = x === v ? 'active' : 'archived'); w.version = Math.max(...vs.map(x => x.v)); wfRender(); UI.toast(`Rolled back — v${v.v} is active`); }, 'Roll back', false) }) : ''}</div>`])];
  return UI.card(UI.table(['Release', 'State', 'Released at', 'Changelog', 'Nodes', ''], rows, { footer: false }));
}

// ---------- Page ----------
function workflowDetail(id) {
  const w = DB.workflows.find(x => x.id === id);
  if (!w) return UI.emptyState('workflow', 'Flow not found', '', UI.btn(t('flows'), { href: '#/flows' }));
  if (WF.cur !== id) Object.assign(WF, { cur: id, sel: null, selEdge: null, panel: 'properties', tab: 'designer', zoom: 1, failAt: '', inputRaw: null });
  const g = graphOf(w); const issues = validate(g);
  const header = `<div class="mb-1 text-xs text-slate-500"><a href="#/flows" class="hover:text-slate-800">${t('studio')} › ${t('flows')}</a> › ${w.name}</div>
    <div class="mb-4 flex flex-wrap items-start justify-between gap-4"><div><div class="flex flex-wrap items-center gap-2"><h1 class="text-xl font-semibold">${w.name}</h1>${w.released ? UI.badge('released v' + w.version, 'green') : UI.badge('working copy', 'amber')}<span id="wf-valid-badge">${validBadge(issues)}</span></div>
      <p class="mt-1 font-mono text-xs text-slate-500">${w.key} · ${g.nodes.length} nodes · ${g.edges.length} edges · created 2026-10-01</p></div>
      <div class="flex flex-wrap gap-2">${UI.btn('Settings', { icon: 'settings', onclick: () => UI.modal({ title: 'Flow settings', body: `<div class="space-y-4">${UI.field('Description', UI.textarea('', '', 2))}${UI.field('Input schema (JSON Schema)', UI.textarea('{ "type": "object" }', 'class="font-mono"', 3))}${UI.field('Variables', UI.textarea('health\nunit', 'class="font-mono"', 2), 'One per line. Available as {{vars.<name>}}.')}<div class="grid grid-cols-3 gap-3">${UI.field('Default timeout', UI.input('24h'))}${UI.field('Concurrency', UI.input('10'))}${UI.field('Failure policy', UI.select(['fail run', 'continue', 'compensate']))}</div></div>`, footer: UI.btn(t('save'), { variant: 'primary', onclick: 'UI.closeOverlay()' }) }) })}
      ${UI.btn('Tidy up', { icon: 'layout-grid', onclick: () => { autoLayout(g); wfDirty(w); wfRender(); setTimeout(() => fitView(g), 30); } })}${UI.btn('Save as template', { icon: 'bookmark-plus', onclick: () => UI.toast('Saved as tenant template') })}</div></div>
    ${UI.tabs([{ key: 'designer', label: 'Canvas' }, { key: 'versions', label: 'Releases', count: versionsOf(w).length }, { key: 'triggers', label: 'Triggers' }, { key: 'effective', label: 'Resolved settings' }], WF.tab, k => { WF.tab = k; wfRender(); })}<div class="mb-4"></div>`;

  const draftBar = `<div class="dock-bottom border-t border-slate-200 bg-white/95 backdrop-blur"><div class="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-6 py-3">
    <span class="flex items-center gap-2 text-sm">${UI.badge('Working copy v' + (w.version + 1), 'amber')}<span id="wf-diff-count" class="text-xs text-slate-600">${diffText(w, g)}</span><span class="text-slate-300">·</span><span id="wf-save" class="text-xs text-slate-500">all changes saved</span></span>
    <input id="wf-note" class="${UI.inputCls} max-w-md flex-1" placeholder="What changed in this release?" value="${UI.esc(WF.changelog[w.id] || '')}"/>
    <div class="ms-auto flex gap-2">${UI.btn(t('discard'), { disabled: !w.released, onclick: () => UI.confirm('Discard working copy?', `Revert the graph to the active v${w.version}.`, () => { WF.graphs[w.id] = cloneG(activeGraph(w)); wfRender(); UI.toast('Working copy discarded'); }, t('discard')) })}
      ${UI.btn(t('saveDraft'), { icon: 'save', onclick: () => UI.toast('Working copy saved') })}${UI.btn('Review & release', { variant: 'primary', icon: issues.some(i => i.level === 'error') ? 'lock' : 'upload-cloud', onclick: () => wfReleaseDialog(w) })}</div></div></div>`;
  const noteBind = () => document.getElementById('wf-note')?.addEventListener('input', e => { WF.changelog[w.id] = e.target.value; });

  if (WF.tab === 'versions') return { html: header + versionsTab(w) + '<div class="h-20"></div>' + draftBar, after: noteBind };
  if (WF.tab === 'triggers') return header + agentTriggersTab(w);
  if (WF.tab === 'effective') return header + UI.card(UI.table(['Key', 'Value', 'Source'], [['default_timeout', '24h', UI.badge('workflow settings', 'indigo')], ['approvals.sla_minutes', '30', UI.badge('workspace default', 'blue')], ['guardrails.policy', 'baseline', UI.badge('unit · Dispatch', 'violet')], ['agent versions', 'pinned at run start', UI.badge('platform', 'gray')]], { footer: false }));

  const selN = g.nodes.find(n => n.id === WF.sel), selE = g.edges.find(e => e.id === WF.selEdge);
  const panel = WF.panel === 'properties' ? (selE ? edgePanel(w, g, selE) : selN ? nodePanel(w, g, selN, issues) : `<p class="py-8 text-center text-sm text-slate-500">Select a node or an edge to edit it.<br/><span class="text-xs">Add steps from the palette on the left.</span></p>`)
    : WF.panel === 'validate' ? validatePanel(g, issues) : runPanel(w, g);

  const html = header + `<div class="flex gap-4 pb-20" style="height:calc(100vh - 250px);min-height:520px">
    <aside class="w-44 shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 scrollbar-thin"><div class="px-1 pb-2 text-[11px] font-semibold uppercase text-slate-400">Add step</div>
      ${DB.nodeTypes.map(nt => `<button onclick="${UI.fn(() => addNode(w, g, nt))}" class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs hover:bg-slate-50"><span class="flex h-6 w-6 items-center justify-center rounded bg-${nt.color}-100 text-${nt.color}-700">${UI.icon(nt.icon, 'w-3.5 h-3.5')}</span>${nt.label}</button>`).join('')}
      <button onclick="${UI.fn(() => addNode(w, g, { type: 'end', label: 'End' }))}" class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs hover:bg-slate-50"><span class="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-700">${UI.icon('circle-stop', 'w-3.5 h-3.5')}</span>End</button></aside>
    ${canvasHtml(w, g, issues)}
    <aside class="flex w-80 shrink-0 flex-col rounded-lg border border-slate-200 bg-white"><div class="px-3 pt-3">${UI.tabs([{ key: 'properties', label: 'Details' }, { key: 'validate', label: 'Checks', count: issues.length }, { key: 'test', label: 'Dry run' }], WF.panel, k => { WF.panel = k; wfRender(); }).replace(/(Validate[^<]*<span class="[^"]*")/, '$1 id="wf-valid-count"')}</div>
      <div id="wf-panel" class="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin">${panel}</div></aside></div>` + draftBar;

  const after = () => {
    bindCanvas(w, g); bindPanel(w, g); noteBind();
    const fa = document.getElementById('wf-failat'); if (fa) fa.onchange = () => { WF.failAt = fa.value; };
    const wi = document.getElementById('wf-input'); if (wi) wi.oninput = () => { WF.inputRaw = wi.value; };
    if (WF.run && WF.run.wid === w.id) drawRun(w, g);
  };
  return { html, after };
}
function addNode(w, g, nt) {
  const id = nt.type + '_' + Math.random().toString(36).slice(2, 5);
  const c = document.getElementById('wf-canvas');
  const x = c ? Math.round((c.scrollLeft + c.clientWidth / 2) / WF.zoom / 10) * 10 - NW / 2 : 300, y = c ? Math.round((c.scrollTop + 60) / WF.zoom / 10) * 10 : 60;
  const defaults = { agent: { inputSource: 'prior node output' }, http: { method: 'GET', failOn: ['5xx'] }, gate: { sla: 30, approvers: '1', onExpire: 'expired path' }, branch: { conditions: [{ label: 'case1', expr: '' }] }, loop: { max: 10 }, parallel: { join: 'all' }, foreach: { itemVar: 'item', concurrency: 1 }, sub: { wait: true }, wait: { timeout: '1h' }, comm: { channel: 'email', language: 'bilingual' }, set: { vars: [['', '']] } }[nt.type] || {};
  g.nodes.push(mkN(id, nt.type, nt.label, Math.max(20, x), Math.max(20, y), JSON.parse(JSON.stringify(defaults))));
  WF.sel = id; WF.selEdge = null; WF.panel = 'properties'; wfDirty(w); wfRender();
}
function autoLayout(g) {
  const depth = { start: 0 }; let changed = true, guard = 0;
  while (changed && guard++ < 100) { changed = false; g.edges.filter(e => e.kind === 'normal').forEach(e => { if (depth[e.from] != null && (depth[e.to] == null || depth[e.to] < depth[e.from] + 1) && depth[e.from] < 40) { depth[e.to] = depth[e.from] + 1; changed = true; } }); }
  const cols = {}; g.nodes.forEach(n => { const d = depth[n.id] ?? 0; (cols[d] = cols[d] || []).push(n); });
  Object.entries(cols).forEach(([d, ns]) => ns.forEach((n, i) => { n.x = 40 + d * 220; n.y = 200 + (i - (ns.length - 1) / 2) * 110; }));
}

PAGES.flows = params => params[0] ? workflowDetail(params[0]) : workflowsList();
