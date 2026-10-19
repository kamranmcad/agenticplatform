// Command center: the tenant's landing page — pulse metrics, what needs a person, and section launchers.
PAGES.command = function () {
  const hr = new Date().getHours();
  const greet = hr < 12 ? t('goodMorning') : hr < 18 ? t('goodAfternoon') : t('goodEvening');
  const date = new Date().toLocaleDateString(APP.lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const live = DB.agents.filter(a => a.status === 'active' && a.released).length;
  const T = DB.tenant;

  const needs = [
    ['shield-check', 'bg-amber-50 text-amber-700', '3 actions are waiting at a human checkpoint', 'Oldest has 18 min left on its timer', 'Review', '#/checkpoints'],
    ['circle-alert', 'bg-orange-50 text-orange-700', '3 executions failed this week', 'Mostly Incident Enrichment — connector timeout', 'Inspect', '#/executions'],
    ['sparkles', 'bg-brand-50 text-brand-700', '2 learned changes to confirm', 'A new playbook and a recall entry', 'Confirm', '#/learned'],
    ['plug-zap', 'bg-rose-50 text-rose-700', 'Partner agency worker is unreachable', 'Connector check failing since yesterday', 'Open', '#/connectors']
  ];
  const sections = NAV.filter(s => s.items);
  const counts = { studio: `${DB.agents.length} workers · ${DB.workflows.length} flows`, 'live-ops': '1,442 messages today', insights: '98.6% success · 7d', assurance: '3 test suites', oversight: '18,204 trail entries', tenant: `${DB.members.length} users · ${T.plan}` };

  return `
  <section class="mb-7 overflow-hidden rounded-2xl bg-navy-900 text-white">
    <div class="flex flex-wrap items-end justify-between gap-6 p-7">
      <div><p class="text-sm text-navy-300">${date}</p><h1 class="mt-1 text-[28px] font-semibold tracking-tight">${greet}, ${DB.user.first}</h1>
        <p class="mt-2 max-w-xl text-sm text-navy-200">${live} digital workers are live for ${T.name}. Here's what changed since your last visit.</p></div>
      <div class="flex gap-2">${UI.btn(t('newWorkflow'), { icon: 'workflow', href: '#/flows', cls: '!bg-white/10 !text-white !ring-white/20 hover:!bg-white/20' })}${UI.btn(t('newAgent'), { icon: 'plus', variant: 'primary', onclick: () => { location.hash = '#/workers'; setTimeout(() => openCreateAgent(), 50); } })}</div>
    </div>
    <div class="grid grid-cols-2 border-t border-white/10 md:grid-cols-4">${[['Workers live', live, `of ${DB.agents.length} · 1 paused`], ['Executions · 7d', '819', '+12% vs last week'], ['At checkpoints', '3', 'awaiting a person'], ['Spend · 7d', '$188', '41% of weekly budget']].map(([l, v, s], i) => `<div class="p-5 ${i ? 'border-s border-white/10' : ''}"><div class="text-xs text-navy-300">${l}</div><div class="mt-1 text-2xl font-semibold">${v}</div><div class="mt-0.5 text-[11px] text-navy-300">${s}</div></div>`).join('')}</div>
  </section>

  <div class="grid gap-6 xl:grid-cols-3">
    <div class="xl:col-span-2">
      <div class="mb-3 flex items-center justify-between"><h2 class="text-base font-semibold text-navy-900">${t('needsAttention')}</h2><span class="text-xs text-slate-500">${needs.length} items</span></div>
      <div class="grid gap-3 md:grid-cols-2">${needs.map(([ic, tone, title, sub, cta, href]) => `<a href="${href}" class="group flex gap-3 rounded-xl border border-slate-200/80 bg-white p-4 hover:border-brand-300">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}">${UI.icon(ic, 'w-5 h-5')}</span>
        <div class="min-w-0 flex-1"><div class="text-sm font-medium text-navy-900">${title}</div><div class="mt-0.5 text-xs text-slate-500">${sub}</div><div class="mt-2 text-xs font-medium text-brand-700 group-hover:underline">${cta} →</div></div></a>`).join('')}</div>

      <div class="mb-3 mt-7 flex items-center justify-between"><h2 class="text-base font-semibold text-navy-900">Go to</h2></div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${sections.map(s => UI.tile({ href: '#/' + s.hub, icon: s.icon, title: t(s.key), desc: HUBS[s.hub].desc, metric: counts[s.hub], later: s.later, tone: s.later ? 'navy' : 'brand' })).join('')}</div>
    </div>

    <div class="space-y-6">
      ${UI.card(UI.cardHeader(t('yourAgents'), UI.btn(t('all'), { size: 'sm', variant: 'ghost', href: '#/workers' })) +
        `<div class="divide-y divide-slate-100">${DB.agents.slice(0, 5).map(a => `<a href="#/workers/${a.id}/builder" class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
          <span class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">${UI.icon('bot', 'w-4 h-4')}<span class="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${a.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}"></span></span>
          <div class="min-w-0 flex-1"><div class="truncate text-sm font-medium text-navy-900">${a.name}</div><div class="text-xs text-slate-500">${a.runs7d} executions · ${a.lastActive}</div></div>${UI.audience(a.audience)}</a>`).join('')}</div>`)}
      ${UI.card(UI.cardHeader('Executions per day', UI.segmented([{ key: '7', label: '7d' }, { key: '30', label: '30d' }], '7', () => {})) +
        `<div class="p-5">${UI.bars([96, 120, 108, 131, 99, 142, 123])}<div class="mt-2 flex justify-between text-[11px] text-slate-400">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<span>${d}</span>`).join('')}</div></div>`)}
    </div>
  </div>`;
};
