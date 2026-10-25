'use strict';
window.MarketRadar = (() => {
  const ui = {query:'',category:'',provider:'',scope:'research',selected:{industry:'',competitor:''}};
  const materials = {query:'',kind:'',company:''};
  const trackFromHash = hash => hash === 'policies' ? 'competitor' : ['case','companies'].includes(hash) ? 'companies' : 'industry';
  const isArchived = s => s.policy?.state === 'withdrawn';
  const model = () => state.signalData;
  const findSource = id => model().sources.find(s => s.id === id);
  const tabs = () => `<div class="radar-tabs" role="tablist" aria-label="行业机会视图">${[['industry','行业变化'],['competitor','竞媒政策'],['companies','企业案例']].map(([id,name]) => `<button role="tab" aria-selected="${state.radarView === id}" data-radar-tab="${id}">${name}</button>`).join('')}</div>`;
  const choices = (values, current, label) => `<option value="">${label}</option>` + [...new Set(values)].map(v => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const signalBase = () => model().signals.filter(s => (s.tracks || [s.track]).includes(state.radarView)).sort((a,b) => state.radarView === 'industry' ? ({'行业统计':0,'企业财报':1,'投放研究':2}[a.category] ?? 3) - ({'行业统计':0,'企业财报':1,'投放研究':2}[b.category] ?? 3) : 0);
  function matching() {
    const q=ui.query.toLowerCase();
    return signalBase().filter(s => (ui.scope === 'all' || (ui.scope === 'withdrawn' ? isArchived(s) : !isArchived(s))) &&
      (!ui.category || s.category === ui.category) && (!ui.provider || s.platform === ui.provider) &&
      (!q || [s.title,s.industry,s.platform,s.period,s.review,...s.companies,...s.facts.map(f=>f.text),s.impact,s.hypothesis,s.policy?.body,s.policy?.attachments].join(' ').toLowerCase().includes(q)));
  }
  function summary() {
    const d=model();
    return `<div class="radar-summary"><span><strong>${d.signals.length}</strong> 条研究线索 · 含${d.signals.filter(isArchived).length}条下线归档</span><span><strong>${d.sources.length}</strong> 份来源材料</span><span><strong>${d.support_leads.length}</strong> 条扶持线索 · 完整核验${d.support_policies.length}条</span><span><strong>${state.skincareCase.companies.length}</strong> 家企业可下钻</span></div>`;
  }
  function researchBrief() {
    if(state.radarView !== 'competitor')return '';
    return `<section class="panel radar-brief"><div class="panel-head"><div><h2>先研究哪些行业</h2><p>研究顺序基于现有证据；腾讯覆盖、客户经营目标与新增预算仍需核对</p></div></div>${model().opportunity_briefs.map(b => `<button data-radar-select="${esc(b.signal_id)}" data-radar-brief><strong>${esc(b.industry)}<small>${esc(b.priority)}</small></strong><span>${esc(b.question)}</span><span>${esc(b.action)} →</span></button>`).join('')}</section>`;
  }
  function retailChart() {
    const rows=[...model().retail].sort((a,b)=>b.ytd_yoy-a.ytd_yoy), max=Math.max(1,...rows.map(r=>Math.abs(r.ytd_yoy)));
    return `<section class="panel radar-retail"><div class="panel-head"><div><h2>行业需求参考 · 1—9月累计同比</h2><p>限额以上单位商品零售分类，不代表广告预算或腾讯机会分</p></div><button class="text-button" data-radar-source="nbs-retail">核对统计局原表 →</button></div><div class="radar-retail-rows" role="img" aria-label="11类商品零售累计同比，分别显示正增长和负增长">${rows.map(r=>`<div><span>${esc(r.name)}</span><div class="radar-bar-lane"><i style="left:${r.ytd_yoy>=0?50:50-Math.abs(r.ytd_yoy)/max*48}%;width:${Math.abs(r.ytd_yoy)/max*48}%"></i></div><strong>${pct(r.ytd_yoy,1)}</strong></div>`).join('')}</div><p class="panel-note">统计期 ${esc(rows[0].period)} · 披露 ${esc(rows[0].published_at)} · 本图独立于下方线索筛选。</p></section>`;
  }
  function policyPanel(item) {
    const p=item.policy;if(!p)return '';
    return `<section class="radar-policy" aria-label="政策期限与正文核对"><h3>政策期限与正文核对</h3><p class="radar-status ${isArchived(item)?'withdrawn':''}">${esc(p.status)}</p><dl>${p.dates.map(d=>`<div><dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd></div>`).join('')}</dl><p><strong>正文：</strong>${esc(p.body)}</p><p class="radar-pending"><strong>待补：</strong>${esc(p.attachments)}</p><details><summary>参与条件与权益范围</summary><ul>${[...p.eligibility,...p.benefits].map(v=>`<li>${esc(v)}</li>`).join('')}</ul></details></section>`;
  }
  function companies(item) {
    if(!item.companies.length)return '<p class="muted">尚未建立有出处的企业名单；先补公司披露与经营目标。</p>';
    return `<div class="radar-companies">${item.companies.map(name=>{const c=state.skincareCase.companies.find(c=>c.name===name);return c?`<button class="button" data-radar-company="${esc(c.id)}">${esc(name)} · 企业案例 →</button>`:`<span>${esc(name)}</span>`;}).join('')}</div>${item.company_context?`<p class="radar-context">${esc(item.company_context)}</p>`:''}`;
  }
  function detail(item) {
    if(!item)return '<section class="panel radar-detail"><h2>暂无匹配线索</h2><p class="notice">请调整关键词、类别、来源或政策范围；已下线记录需单独选择。</p></section>';
    return `<section class="panel radar-detail" id="radar-detail" tabindex="-1"><h2>${esc(item.title)}</h2><p class="radar-context">${esc(item.category)} · ${esc(item.platform)}<br>期间：${esc(item.period)}<br>${esc(item.review)}</p>${policyPanel(item)}
    <h3>外部发生了什么</h3><ul class="radar-facts">${item.facts.map(f=>`<li><p>${esc(f.text)}</p>${f.quote?`<small>原文短摘录：“${esc(f.quote)}”</small><br>`:''}<button class="text-button" data-radar-source="${esc(f.source_id)}">${esc(findSource(f.source_id).publisher)} · ${esc(f.locator)} →</button></li>`).join('')}</ul>
    <h3>行业影响</h3><p><strong>${esc(item.industry)}</strong> · ${esc(item.impact)}</p><h3>腾讯相关假设</h3><p class="radar-hypothesis">${esc(item.hypothesis)}</p><h3>可继续研究的企业</h3>${companies(item)}
    <h3>下一步跟进动作</h3><ol>${item.actions.map(a=>`<li>${esc(a)}</li>`).join('')}</ol><div class="radar-limits"><strong>口径与反证</strong><ul>${item.limits.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></div></section>`;
  }
  function render() {
    if(state.radarView==='companies')return tabs()+renderSkincareCase(state.skincareCase);
    const d=model(), base=signalBase(),rows=matching(),selected=rows.find(s=>s.id===ui.selected[state.radarView])||rows[0];
    ui.selected[state.radarView]=selected?.id||'';
    return `<div class="radar-page">${tabs()}${title(state.radarView==='industry'?'行业变化与机会线索':'竞媒政策与机会线索',`资料核对截至 ${d.as_of} · 公开事实、研究假设与待补材料分别呈现`,`<button class="button" data-radar-export>导出研究清单</button>`)}${summary()}${state.radarView==='industry'?retailChart():researchBrief()}
    <details class="radar-gaps"><summary>口径与待补：真实投放消耗未取得 · 完整核验扶持${d.support_policies.length}条</summary><div>${d.gaps.map(g=>`<p><strong>${esc(g.label)} · ${esc(g.status)}</strong><br>${esc(g.detail)}</p>`).join('')}</div></details>
    <form class="radar-filters" id="radar-filters"><label class="sr-only" for="radar-query">检索机会线索</label><input id="radar-query" placeholder="搜索行业、企业、规则或线索" value="${esc(ui.query)}"><label class="sr-only" for="radar-category">线索类别</label><select id="radar-category">${choices(base.map(s=>s.category),ui.category,'全部类别')}</select><label class="sr-only" for="radar-provider">平台或来源</label><select id="radar-provider">${choices(base.map(s=>s.platform),ui.provider,'全部平台 / 来源')}</select>${state.radarView==='competitor'?`<label class="sr-only" for="radar-scope">政策范围</label><select id="radar-scope"><option value="research" ${ui.scope==='research'?'selected':''}>研究线索 · 不含下线</option><option value="withdrawn" ${ui.scope==='withdrawn'?'selected':''}>仅已下线政策</option><option value="all" ${ui.scope==='all'?'selected':''}>全部 · 含下线归档</option></select>`:''}<button class="button" type="submit">筛选线索</button></form>
    <div class="radar-workspace"><section class="panel"><div class="panel-head"><div><h2>${state.radarView==='industry'?'行业变化':'竞媒政策'} · ${rows.length}条</h2><p>选择一条线索，查看依据与跟进条件</p></div></div><div class="radar-list">${rows.map(s=>`<button data-radar-select="${esc(s.id)}" aria-pressed="${s.id===selected?.id}"><small>${esc(s.category)} · ${esc(s.platform)}</small><strong>${esc(s.title)}</strong><span>${esc(s.period)}</span><span>${esc(s.review)}</span></button>`).join('')||'<p class="panel-note">没有匹配线索。已下线记录需在政策范围中单独选择。</p>'}</div></section>${detail(selected)}</div>
    <p class="demo-boundary">时效状态以资料核对日为准；零售规模、集团销售费用与广告消耗口径不同。研究建议不表示已确认的客户预算、转投意向或投放效果。</p></div>`;
  }
  function showSource(id) {
    const s=findSource(id);if(!s)return;
    if(state.skincareCase.sources.some(x=>x.id===id)){showMaterial(id);return;}
    openDrawer(`<h2 id="detail-title">${esc(s.title)}</h2><p class="notice">${esc(s.publisher)} · ${esc(s.quality)}</p><dl class="radar-source-fields"><div><dt>披露 / 公示</dt><dd>${esc(s.published_at||'原文未标明')}</dd></div><div><dt>页面更新</dt><dd>${esc(s.updated_at||'原文未标明')}</dd></div>${s.displayed_date?`<div><dt>${esc(s.displayed_date_note)}</dt><dd>${esc(s.displayed_date)}</dd></div>`:''}${s.effective_at?`<div><dt>执行 / 生效</dt><dd>${esc(s.effective_at)}</dd></div>`:''}${s.ends_at?`<div><dt>终止 / 下线</dt><dd>${esc(s.ends_at)}</dd></div>`:''}<div><dt>采集或正常浏览核对</dt><dd>${stamp(s.observed_at)}</dd></div></dl>${s.validity?`<h3>时效依据</h3><p>${esc(s.validity)}</p>`:''}<h3 class="demo-drawer-heading">适用范围</h3><p>${esc(s.scope)}</p><section class="radar-policy"><h3>正文覆盖与完整性</h3><p>${esc(s.coverage)}</p>${s.attachment_status?`<p class="radar-pending">待补：${esc(s.attachment_status)}</p>`:''}</section><a class="button" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">打开官方原文 ↗</a><details class="demo-fingerprint"><summary>核对记录指纹</summary><p>${esc(s.fingerprint_scope)}<br>SHA-256：${esc(s.sha256)}</p></details><p class="quality-note">核对时间不替代生效日或统计期；受限附件保留待补，不在此自动打开。</p>`);
  }
  function sourceKind(s) {
    return s.id.startsWith('skincare-disclosure-')?'企业披露':s.id==='nbs-retail'?'行业统计':['quest-ad','iresearch-cost'].includes(s.id)?'行业报告':'竞媒政策';
  }
  function renderEvidence() {
    const d=model(),c=state.skincareCase,q=materials.query.toLowerCase();
    const sources=d.sources.filter(s=>{
      if(materials.kind&&sourceKind(s)!==materials.kind)return false;
      if(materials.company&&!c.sources.some(x=>x.id===s.id&&x.company_id===materials.company))return false;
      const related=d.signals.filter(x=>x.facts.some(f=>f.source_id===s.id));
      const facts=related.flatMap(x=>x.facts.filter(f=>f.source_id===s.id).map(f=>f.text));
      const excerpts=c.evidence.filter(e=>e.source_id===s.id).map(e=>e.title+' '+e.text);
      return !q||[s.title,s.publisher,s.scope,s.coverage,s.effective_at,s.ends_at,...related.map(x=>x.title),...facts,...excerpts].join(' ').toLowerCase().includes(q);
    });
    return `<div class="updates-page">${title('资料与证据','统一检索政策、行业统计、研究报告与企业披露的已核对内容',`<button class="button" data-radar-export-evidence>导出全部证据</button>`)}<p class="radar-evidence-note">资料核对截至 ${esc(d.as_of)} · ${d.sources.length}份来源 · ${c.evidence.length}处企业摘录。检索覆盖标题、已核实事实与短摘录；完整正文通过官方原文查看。</p>
    <section class="panel"><div class="panel-head"><div><h2>可追溯的材料 · ${sources.length}份匹配</h2><p>披露日、统计期、生效日与核对时间分别标注；图片或附件未全验时保留待补</p></div></div><form class="radar-material-search" id="radar-material-search"><label class="sr-only" for="radar-material-query">检索材料关键词</label><input id="radar-material-query" placeholder="检索 微信、销售费用、双十一、品牌授权等" value="${esc(materials.query)}"><label class="sr-only" for="radar-material-kind">材料类型</label><select id="radar-material-kind">${choices(['竞媒政策','行业统计','行业报告','企业披露'],materials.kind,'全部材料类型')}</select><label class="sr-only" for="radar-material-company">企业披露范围</label><select id="radar-material-company"><option value="">全部企业与行业材料</option>${c.companies.map(x=>`<option value="${esc(x.id)}" ${materials.company===x.id?'selected':''}>仅${esc(x.name)}披露</option>`).join('')}</select><button class="button" type="submit">检索证据</button></form><div class="demo-materials">${sources.map(s=>`<article><div><span class="case-caption">${sourceKind(s)} · ${esc(s.publisher)}</span><h3><button class="text-button" data-radar-source="${esc(s.id)}">${esc(s.title)} →</button></h3><p>披露 ${esc(s.published_at||'未标明')}${s.effective_at?' · 生效 '+esc(s.effective_at):''} · ${esc(s.quality)}</p></div><button class="button" data-radar-source="${esc(s.id)}">查看证据与覆盖范围</button></article>`).join('')||'<p class="empty">没有匹配材料，请调整关键词、材料类型或企业披露范围。</p>'}</div></section><p class="demo-boundary">企业筛选只返回该公司的公开披露，不把通用政策当成企业已受影响的证据。未核实的扶持、受限附件及真实账户投放消耗仍不计为已完成能力。</p></div>`;
  }
  function download(text, filename, type='text/markdown;charset=utf-8') {
    const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportResearch() {
    const rows=matching(),lines=['# 腾讯广告行业机会 · 外部研究清单',`资料核对截至 ${model().as_of}；公开资料快照，机会假设待业务验证。`,''];
    for(const s of rows){
      lines.push('## '+s.title,`类别：${s.category}；行业：${s.industry}；期间：${s.period}`,`核对状态：${s.review}`);
      if(s.policy){const p=s.policy;lines.push('### 政策期限与正文核对',p.status,...p.dates.map(d=>`- ${d.label}：${d.value}`),'正文：'+p.body,'待补：'+p.attachments,'参与条件与权益：',...[...p.eligibility,...p.benefits].map(v=>'- '+v));}
      lines.push('### 外部事实');
      for(const f of s.facts){const r=findSource(f.source_id);lines.push(`- ${f.text}\n  出处：${r.title} / ${f.locator}\n  ${r.url}\n  披露 ${r.published_at||'未标明'}；更新 ${r.updated_at||'未标明'}；生效 ${r.effective_at||'未标明'}；终止/下线 ${r.ends_at||'未注明'}；核对 ${r.observed_at}\n  覆盖：${r.coverage}\n  指纹（${r.fingerprint_scope}）：${r.sha256}`);}
      lines.push('### 行业影响',s.impact,'### 腾讯相关假设',s.hypothesis,'研究企业：'+(s.companies.join('、')||'尚无有出处的名单'),s.company_context||'','### 下一步跟进动作',...s.actions.map((v,i)=>`${i+1}. ${v}`),'### 口径与反证',...s.limits.map(v=>'- '+v),'');
    }
    download(lines.join('\n'),(state.radarView==='competitor'?'竞媒政策':'行业变化')+'-机会研究清单.md');
  }
  async function handleClick(b) {
    if(b.dataset.radarTab){Object.assign(ui,{query:'',category:'',provider:'',scope:'research'});await navigate({industry:'opportunities',competitor:'policies',companies:'case'}[b.dataset.radarTab]);}
    else if(b.dataset.radarSelect){if(b.hasAttribute('data-radar-brief'))Object.assign(ui,{query:'',category:'',provider:'',scope:'research'});ui.selected[state.radarView]=b.dataset.radarSelect;await renderApp();if(b.hasAttribute('data-radar-brief')||matchMedia('(max-width:780px)').matches)document.querySelector('#radar-detail')?.scrollIntoView({block:'start'});}
    else if(b.dataset.radarSource)showSource(b.dataset.radarSource);
    else if(b.dataset.radarCompany){state.caseCompany=b.dataset.radarCompany;await navigate('case');}
    else if(b.hasAttribute('data-radar-export'))exportResearch();
    else if(b.hasAttribute('data-radar-export-evidence')){const c=state.skincareCase;download(JSON.stringify({as_of:model().as_of,mode:'snapshot',scheduled_collection:false,business:model(),company_evidence:c.evidence,company_sources:c.sources.map(s=>Object.fromEntries(['id','title','publisher','url','published_at','period','pages','sha256','fetched_at','note'].filter(k=>k in s).map(k=>[k,s[k]]))),companies:c.companies.map(x=>({id:x.id,name:x.name,brand:x.brand,finance_period:x.finance_period,revenue_yoy:x.revenue_yoy,selling_yoy:x.selling_yoy}))},null,2),'市场情报-证据快照.json','application/json');}
    else return false;
    return true;
  }
  function handleSubmit(event) {
    if(event.target.id==='radar-filters'){event.preventDefault();Object.assign(ui,{query:$('#radar-query').value.trim(),category:$('#radar-category').value,provider:$('#radar-provider').value,scope:$('#radar-scope')?.value||'research'});renderApp();return true;}
    if(event.target.id==='radar-material-search'){event.preventDefault();Object.assign(materials,{query:$('#radar-material-query').value.trim(),kind:$('#radar-material-kind').value,company:$('#radar-material-company').value});renderApp();return true;}
    return false;
  }
  // The global shell owns asynchronous rendering and navigation.
  const renderApp = () => window.renderRadarApp();
  return {render,renderEvidence,handleClick,handleSubmit,trackFromHash};
})();
