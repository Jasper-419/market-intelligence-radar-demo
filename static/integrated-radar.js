'use strict';
window.MarketRadar = (() => {
  const ui = {query:'',category:'',provider:'',scope:'research',selected:{industry:'',competitor:''}};
  const materials = {query:'',kind:'',company:''};
  const mobile = () => matchMedia('(max-width:780px)').matches;
  const trackFromHash = hash => hash === 'policies' ? 'competitor' : ['case','companies'].includes(hash) ? 'companies' : 'industry';
  const isArchived = s => s.policy?.state === 'withdrawn';
  const model = () => state.signalData;
  const findSource = id => model().sources.find(s => s.id === id);
  function restore(p) {
    Object.assign(ui,{query:p.get('q')||'',category:p.get('category')||'',provider:p.get('provider')||'',scope:['all','withdrawn'].includes(p.get('scope'))?p.get('scope'):'research'});
    if(state.radarView !== 'companies')ui.selected[state.radarView]=p.get('signal')||'';
    Object.assign(materials,{query:p.get('q')||'',kind:p.get('kind')||'',company:p.get('company')||''});
    state.caseCompany=p.get('company')||'';
  }
  function params() {
    const p=new URLSearchParams();
    if(state.view==='updates'){
      for(const [key,value] of Object.entries({q:materials.query,kind:materials.kind,company:materials.company}))if(value)p.set(key,value);
    }else if(state.radarView==='companies'){
      if(state.caseCompany)p.set('company',state.caseCompany);
    }else{
      for(const [key,value] of Object.entries({q:ui.query,category:ui.category,provider:ui.provider,scope:ui.scope==='research'?'':ui.scope,signal:ui.selected[state.radarView]}))if(value)p.set(key,value);
    }
    return p;
  }
  const path = () => state.view==='updates'?'updates':({industry:'opportunities',competitor:'policies',companies:'case'}[state.radarView]);
  const tabs = () => `<div class="radar-tabs" role="tablist" aria-label="行业机会视图">${[['industry','行业变化'],['competitor','竞媒政策'],['companies','企业案例']].map(([id,name])=>`<button type="button" id="tab-${id}" role="tab" aria-controls="radar-view" aria-selected="${state.radarView===id}" tabindex="${state.radarView===id?'0':'-1'}" data-radar-tab="${id}">${name}</button>`).join('')}</div>`;
  const choices = (values,current,label) => `<option value="">${label}</option>`+[...new Set(values)].map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('');
  const signalBase = () => model().signals.filter(s=>(s.tracks||[s.track]).includes(state.radarView)).sort((a,b)=>state.radarView==='industry'?({'行业统计':0,'企业财报':1,'投放研究':2}[a.category]??3)-({'行业统计':0,'企业财报':1,'投放研究':2}[b.category]??3):0);
  function matching() {
    const q=ui.query.toLowerCase();
    return signalBase().filter(s=>(ui.scope==='all'||(ui.scope==='withdrawn'?isArchived(s):!isArchived(s)))&&(!ui.category||s.category===ui.category)&&(!ui.provider||s.platform===ui.provider)&&(!q||[s.title,s.industry,s.platform,s.period,s.review,...s.companies,...s.facts.map(f=>f.text),s.impact,s.hypothesis,s.policy?.body,s.policy?.attachments].join(' ').toLowerCase().includes(q)));
  }
  function summary() {
    const d=model();
    return `<dl class="radar-summary"><div><dt>研究线索</dt><dd>${d.signals.length}条，含${d.signals.filter(isArchived).length}条下线归档</dd></div><div><dt>主要来源</dt><dd>${d.sources.length}份</dd></div><div><dt>扶持核验</dt><dd>${d.support_leads.length}条线索，完整核验${d.support_policies.length}条</dd></div><div><dt>企业案例</dt><dd>${state.skincareCase.companies.length}家</dd></div></dl>`;
  }
  function researchBrief() {
    const beauty=model().signals.find(s=>s.id==='retail-beauty');
    const briefs=model().opportunity_briefs.map((b,i)=>state.radarView==='industry'&&i===0&&beauty?{...b,signal_id:beauty.id,question:beauty.impact,action:beauty.actions[0]}:b);
    const row=b=>{const s=model().signals.find(s=>s.id===b.signal_id);return `<article class="radar-brief-row"><div><h3>${esc(b.industry)}</h3><span class="decision">${esc(b.priority)}</span>${s.companies.length?`<small>研究企业：${esc(s.companies.join('、'))}</small>`:''}</div><div><p>${esc(s.title)}</p><small>${esc(s.review)}</small></div><div><p>${esc(b.action)}</p><small>${esc(b.question)}</small></div><button type="button" class="button" data-radar-select="${esc(b.signal_id)}" data-radar-brief>查看依据</button></article>`;};
    return `<details class="radar-brief" ${mobile()?'':'open'}><summary><h2 id="priorities-title">优先研究方向</h2><span>${esc(briefs[0].industry)}：${esc(briefs[0].priority)}</span></summary><p class="radar-brief-note">基于现有证据的研究顺序，仍需核对客户目标和腾讯覆盖。</p>${row(briefs[0])}<details class="radar-more-priorities" ${mobile()?'':'open'}><summary>查看另外${briefs.length-1}个研究方向</summary>${briefs.slice(1).map(row).join('')}</details></details>`;
  }
  function retailChart() {
    const rows=[...model().retail].sort((a,b)=>b.ytd_yoy-a.ytd_yoy),max=Math.max(1,...rows.map(r=>Math.abs(r.ytd_yoy)));
    return `<details class="radar-background"><summary>行业需求背景：11类商品零售累计同比</summary><div class="section-heading"><h2>行业需求参考</h2><p>限额以上单位商品零售分类，不代表广告预算或腾讯机会分。图表独立于线索筛选。</p><button type="button" class="text-button" data-radar-source="nbs-retail">核对统计局原表</button></div><div class="radar-retail-rows">${rows.map(r=>`<div><span>${esc(r.name)}</span><div class="radar-bar-lane" aria-hidden="true"><i style="left:${r.ytd_yoy>=0?50:50-Math.abs(r.ytd_yoy)/max*48}%;width:${Math.abs(r.ytd_yoy)/max*48}%"></i></div><strong>${pct(r.ytd_yoy,1)}</strong></div>`).join('')}</div><p class="panel-note">统计期 ${esc(rows[0].period)}；披露 ${esc(rows[0].published_at)}。中线左侧为下降，右侧为增长。</p></details>`;
  }
  function policyPanel(item) {
    const p=item.policy;if(!p)return '';
    return `<section class="radar-policy" aria-label="政策期限与正文核对"><h3>政策期限与正文核对</h3><p class="radar-status ${isArchived(item)?'withdrawn':''}">${esc(p.status)}</p><dl>${p.dates.map(d=>`<div><dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd></div>`).join('')}</dl><p><strong>正文覆盖：</strong>${esc(p.body)}</p><p class="radar-pending"><strong>待补材料：</strong>${esc(p.attachments)}</p><details><summary>参与条件与权益范围</summary><ul>${[...p.eligibility,...p.benefits].map(v=>`<li>${esc(v)}</li>`).join('')}</ul></details></section>`;
  }
  function companies(item) {
    if(!item.companies.length)return '<p class="muted">尚未建立有出处的企业名单；先补公司披露与经营目标。</p>';
    return `<div class="radar-companies">${item.companies.map(name=>{const c=state.skincareCase.companies.find(c=>c.name===name);return c?`<button type="button" class="button" data-radar-company="${esc(c.id)}">研究${esc(name)}</button>`:`<span>${esc(name)}</span>`;}).join('')}</div>${item.company_context?`<p class="radar-context">${esc(item.company_context)}</p>`:''}`;
  }
  function detail(item) {
    if(!item)return `<section class="radar-detail"><h2 id="radar-detail-title" tabindex="-1">暂无匹配线索</h2><p class="notice">请调整关键词、类别、来源或政策范围。下线政策需单独选择。</p><button type="button" class="button" data-radar-clear>清空筛选</button></section>`;
    return `<section class="radar-detail" id="radar-detail" tabindex="-1"><h2 id="radar-detail-title" tabindex="-1">${esc(item.title)}</h2><div class="radar-context"><span>${esc(item.category)}</span><span>${esc(item.platform)}</span><span>期间 ${esc(item.period)}</span></div><p class="radar-quality">${esc(item.review)}</p><div class="radar-next"><h3>建议先做</h3><p>${esc(item.actions[0])}</p></div>${policyPanel(item)}
      <h3>外部发生了什么</h3><ul class="radar-facts">${item.facts.map(f=>`<li><p>${esc(f.text)}</p>${f.quote?`<blockquote>${esc(f.quote)}</blockquote>`:''}<button type="button" class="text-button" data-radar-source="${esc(f.source_id)}">${esc(findSource(f.source_id).publisher)}：${esc(f.locator)}</button></li>`).join('')}</ul>
      <h3>行业影响</h3><p><strong>${esc(item.industry)}</strong>：${esc(item.impact)}</p><h3>腾讯相关假设</h3><p class="radar-hypothesis">${esc(item.hypothesis)}</p><h3>可继续研究的企业</h3>${companies(item)}
      <h3>完整跟进动作</h3><ol>${item.actions.map(a=>`<li>${esc(a)}</li>`).join('')}</ol><button type="button" class="text-button mobile-only" data-radar-back>选择其他线索</button><details class="radar-limits" open><summary>口径与反证</summary><ul>${item.limits.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></details></section>`;
  }
  function filters(base,rows) {
    const active=Boolean(ui.query||ui.category||ui.provider||ui.scope!=='research');
    return `<details class="radar-filter-disclosure" ${!mobile()||active?'open':''}><summary>筛选线索${active?'（已应用条件）':''}</summary><form class="radar-filters" id="radar-filters"><label>关键词<input id="radar-query" type="search" placeholder="行业、企业或规则" value="${esc(ui.query)}"></label><label>类别<select id="radar-category">${choices(base.map(s=>s.category),ui.category,'全部类别')}</select></label><label>来源<select id="radar-provider">${choices(base.map(s=>s.platform),ui.provider,'全部来源')}</select></label>${state.radarView==='competitor'?`<label>政策范围<select id="radar-scope"><option value="research" ${ui.scope==='research'?'selected':''}>不含下线</option><option value="withdrawn" ${ui.scope==='withdrawn'?'selected':''}>仅已下线</option><option value="all" ${ui.scope==='all'?'selected':''}>含下线归档</option></select></label>`:''}<button class="button primary" type="submit">应用筛选</button><button class="text-button" type="button" data-radar-clear>清空筛选</button></form></details><div class="radar-result-heading"><h2 id="radar-results-title" tabindex="-1">${state.radarView==='industry'?'行业变化':'竞媒政策'}，${rows.length}条线索</h2><span>${active?'已按条件筛选':'选择线索核对依据'}</span></div>`;
  }
  function render() {
    if(state.radarView==='companies')return tabs()+`<div id="radar-view" role="tabpanel" aria-labelledby="tab-companies">${renderSkincareCase(state.skincareCase)}</div>`;
    const d=model(),base=signalBase(),rows=matching(),selected=rows.find(s=>s.id===ui.selected[state.radarView])||rows[0];
    ui.selected[state.radarView]=selected?.id||'';
    return `<div class="radar-page">${tabs()}<div id="radar-view" role="tabpanel" aria-labelledby="tab-${state.radarView}">${title(state.radarView==='industry'?'行业机会研究':'竞媒政策研究',`公开资料核对截至 ${d.as_of}，机会假设待业务确认。`,`<button type="button" class="button" data-radar-export>导出当前${rows.length}条线索</button>`)}${researchBrief()}<p class="radar-scope-note">扶持线索${d.support_leads.length}条，完整核验${d.support_policies.length}条。研究方向为整体摘要，下方筛选作用于线索列表。</p>${filters(base,rows)}
      <label class="radar-picker mobile-only" id="radar-picker">当前线索<select id="radar-signal-picker" ${rows.length?'':'disabled'}>${rows.map(s=>`<option value="${esc(s.id)}" ${selected?.id===s.id?'selected':''}>${esc(s.title)}</option>`).join('')||'<option>暂无匹配线索</option>'}</select></label>
      <div class="radar-workspace"><details class="radar-index" id="radar-index" ${mobile()?'':'open'}><summary>全部匹配线索（${rows.length}条）</summary><div class="radar-list">${rows.map(s=>`<button type="button" data-radar-select="${esc(s.id)}" aria-pressed="${s.id===selected?.id}"><strong>${esc(s.title)}</strong><span>${esc(s.platform)}</span><span>${esc(s.review)}</span></button>`).join('')||'<p class="panel-note">没有匹配线索，请清空或调整筛选。</p>'}</div></details>${detail(selected)}</div>${state.radarView==='industry'?retailChart():''}
      <details class="radar-gaps"><summary>资料范围、口径与待补</summary>${summary()}<div>${d.gaps.map(g=>`<p><strong>${esc(g.label)}：${esc(g.status)}</strong><br>${esc(g.detail)}</p>`).join('')}</div></details>
      <p class="demo-boundary">时效状态以资料核对日为准。零售规模、集团销售费用与广告消耗口径不同，研究建议不表示已确认的客户预算、转投意向或投放效果。</p></div></div>`;
  }
  function showSource(id) {
    const s=findSource(id);if(!s)return;
    if(state.skincareCase.sources.some(x=>x.id===id)){showMaterial(id);return;}
    openDrawer(`<h2 id="detail-title">${esc(s.title)}</h2><p class="notice">${esc(s.publisher)}<br>${esc(s.quality)}</p><dl class="radar-source-fields"><div><dt>披露 / 公示</dt><dd>${esc(s.published_at||'原文未标明')}</dd></div><div><dt>页面更新</dt><dd>${esc(s.updated_at||'原文未标明')}</dd></div>${s.displayed_date?`<div><dt>${esc(s.displayed_date_note)}</dt><dd>${esc(s.displayed_date)}</dd></div>`:''}${s.effective_at?`<div><dt>执行 / 生效</dt><dd>${esc(s.effective_at)}</dd></div>`:''}${s.ends_at?`<div><dt>终止 / 下线</dt><dd>${esc(s.ends_at)}</dd></div>`:''}<div><dt>采集或正常浏览核对</dt><dd>${stamp(s.observed_at)}</dd></div></dl>${s.validity?`<h3>时效依据</h3><p>${esc(s.validity)}</p>`:''}<h3>适用范围</h3><p>${esc(s.scope)}</p><section class="radar-policy"><h3>正文覆盖与完整性</h3><p>${esc(s.coverage)}</p>${s.attachment_status?`<p class="radar-pending">待补：${esc(s.attachment_status)}</p>`:''}</section><a class="button" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">打开官方原文</a><details class="demo-fingerprint"><summary>核对记录指纹</summary><p>${esc(s.fingerprint_scope)}<br>SHA-256：${esc(s.sha256)}</p></details><p class="quality-note">核对时间不替代生效日或统计期；受限附件保留待补，不在此自动打开。</p>`);
  }
  function sourceKind(s) {
    return s.id.startsWith('skincare-disclosure-')?'企业披露':s.id==='nbs-retail'?'行业统计':['quest-ad','iresearch-cost'].includes(s.id)?'行业报告':'竞媒政策';
  }
  function owner(s) {
    const file=state.skincareCase.sources.find(x=>x.id===s.id);
    return state.skincareCase.companies.find(c=>c.id===file?.company_id)?.name||'';
  }
  function highlight(value,q) {
    const t=String(value||'');if(!q)return esc(t);
    const low=t.toLowerCase(),needle=q.toLowerCase();let from=0,found,out='';
    while((found=low.indexOf(needle,from))!==-1){out+=esc(t.slice(from,found))+'<mark>'+esc(t.slice(found,found+q.length))+'</mark>';from=found+q.length;}
    return out+esc(t.slice(from));
  }
  function snippet(s,q) {
    const c=state.skincareCase,quotes=c.evidence.filter(e=>e.source_id===s.id),related=model().signals.filter(x=>x.facts.some(f=>f.source_id===s.id));
    const entries=[...quotes.map(e=>({text:e.text,label:`${e.quality?.includes('table')?'已核对表格':'原文摘录'}：${e.title}，PDF第${e.page}页`})),...related.flatMap(x=>x.facts.filter(f=>f.source_id===s.id).map(f=>({text:f.text,label:'已核对事实'}))),...related.map(x=>({text:x.title,label:'关联研究线索'}))];
    const hit=(q&&entries.find(e=>(e.label+' '+e.text).toLowerCase().includes(q.toLowerCase())))||entries[0];if(!hit)return '';
    const at=q?hit.text.toLowerCase().indexOf(q.toLowerCase()):-1,start=Math.max(0,at-32),end=Math.min(hit.text.length,start+155),text=(start?'…':'')+hit.text.slice(start,end)+(end<hit.text.length?'…':'');
    return `<div class="material-snippet"><span>${highlight(hit.label,q)}</span><p>${highlight(text,q)}</p></div>`;
  }
  function renderEvidence() {
    const d=model(),c=state.skincareCase,q=materials.query.toLowerCase();
    const sources=d.sources.filter(s=>{
      if(materials.kind&&sourceKind(s)!==materials.kind)return false;
      if(materials.company&&!c.sources.some(x=>x.id===s.id&&x.company_id===materials.company))return false;
      const related=d.signals.filter(x=>x.facts.some(f=>f.source_id===s.id));
      return !q||[s.title,owner(s),s.publisher,s.scope,s.coverage,s.effective_at,s.ends_at,...related.map(x=>x.title),...related.flatMap(x=>x.facts.filter(f=>f.source_id===s.id).map(f=>f.text)),...c.evidence.filter(e=>e.source_id===s.id).map(e=>e.title+' '+e.text)].join(' ').toLowerCase().includes(q);
    });
    return `<div class="updates-page">${title('资料与证据','检索已核对事实与原文短摘录，全文通过官方来源查看。',`<button type="button" class="button" data-radar-export-evidence>导出全部证据</button>`)}<p class="radar-evidence-note">核对截至 ${esc(d.as_of)}；${d.sources.length}份主要来源，${c.evidence.length}处企业摘录。图片和附件未全验时保留待补。</p>
      <form class="radar-material-search" id="radar-material-search"><label>关键词<input id="radar-material-query" type="search" placeholder="微信、销售费用、双十一" value="${esc(materials.query)}"></label><label>材料类型<select id="radar-material-kind">${choices(['竞媒政策','行业统计','行业报告','企业披露'],materials.kind,'全部类型')}</select></label><label>企业披露<select id="radar-material-company"><option value="">全部主体</option>${c.companies.map(x=>`<option value="${esc(x.id)}" ${materials.company===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><button class="button primary" type="submit">检索证据</button><button class="text-button" type="button" data-material-clear>清空筛选</button></form>
      <div class="radar-result-heading"><h2 id="material-results-title" tabindex="-1">${sources.length}份匹配材料</h2><span>${materials.query?'关键词：'+esc(materials.query):'全部已核对材料'}</span></div><div class="demo-materials">${sources.map(s=>`<article><div class="material-heading"><div><h3><button type="button" class="text-button" data-radar-source="${esc(s.id)}">${highlight(s.title,materials.query)}</button></h3><div class="material-meta"><strong>${esc(owner(s)||sourceKind(s))}</strong><span>${esc(s.publisher)}</span><span>披露 ${esc(s.published_at||'未标明')}</span>${s.effective_at?`<span>生效 ${esc(s.effective_at)}</span>`:''}</div></div><button type="button" class="button" data-radar-source="${esc(s.id)}">查看证据</button></div>${snippet(s,materials.query)}<p class="material-quality">${esc(s.quality)}</p></article>`).join('')||'<div class="empty"><p>没有匹配材料。请调整关键词、材料类型或企业范围。</p><button type="button" class="button" data-material-clear>清空筛选</button></div>'}</div><p class="demo-boundary">企业筛选只返回该公司的公开披露，不把通用政策当成企业已受影响的证据。未核实的扶持、受限附件及真实账户投放消耗不计为已完成能力。</p></div>`;
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
  async function selectSignal(id,fromBrief=false) {
    const s=model().signals.find(s=>s.id===id);if(!s)return;
    const track=(s.tracks||[s.track]).includes(state.radarView)?state.radarView:(s.tracks||[s.track])[0];
    state.radarView=track;
    if(fromBrief)Object.assign(ui,{query:'',category:'',provider:'',scope:'research'});
    ui.selected[track]=id;
    await navigate(track==='industry'?'opportunities':'policies',{params:params(),focusId:'radar-detail-title',scroll:mobile()||fromBrief?'detail':'preserve'});
  }
  async function handleClick(b) {
    if(b.dataset.radarTab)await navigate({industry:'opportunities',competitor:'policies',companies:'case'}[b.dataset.radarTab],{focusId:'tab-'+b.dataset.radarTab});
    else if(b.dataset.radarSelect)await selectSignal(b.dataset.radarSelect,b.hasAttribute('data-radar-brief'));
    else if(b.dataset.radarSource)showSource(b.dataset.radarSource);
    else if(b.dataset.radarCompany){await navigate('case',{params:new URLSearchParams({company:b.dataset.radarCompany})});}
    else if(b.hasAttribute('data-radar-clear')){Object.assign(ui,{query:'',category:'',provider:'',scope:'research'});ui.selected[state.radarView]='';await navigate(path(),{params:params(),focusId:'radar-results-title',scroll:'preserve'});}
    else if(b.hasAttribute('data-material-clear')){Object.assign(materials,{query:'',kind:'',company:''});await navigate('updates',{params:params(),focusId:'material-results-title',scroll:'preserve'});}
    else if(b.hasAttribute('data-radar-back')){$('#radar-picker')?.scrollIntoView({block:'center'});$('#radar-signal-picker')?.focus({preventScroll:true});}
    else if(b.hasAttribute('data-radar-export'))exportResearch();
    else if(b.hasAttribute('data-radar-export-evidence')){const c=state.skincareCase;download(JSON.stringify({as_of:model().as_of,mode:'snapshot',scheduled_collection:false,business:model(),company_evidence:c.evidence,company_sources:c.sources.map(s=>Object.fromEntries(['id','title','publisher','url','published_at','period','pages','sha256','fetched_at','note'].filter(k=>k in s).map(k=>[k,s[k]]))),companies:c.companies.map(x=>({id:x.id,name:x.name,brand:x.brand,finance_period:x.finance_period,revenue_yoy:x.revenue_yoy,selling_yoy:x.selling_yoy}))},null,2),'市场情报-证据快照.json','application/json');}
    else return false;
    return true;
  }
  function handleSubmit(event) {
    if(event.target.id==='radar-filters'){
      event.preventDefault();Object.assign(ui,{query:$('#radar-query').value.trim(),category:$('#radar-category').value,provider:$('#radar-provider').value,scope:$('#radar-scope')?.value||'research'});ui.selected[state.radarView]='';
      navigate(path(),{params:params(),focusId:'radar-results-title',scroll:'preserve'});return true;
    }
    if(event.target.id==='radar-material-search'){
      event.preventDefault();Object.assign(materials,{query:$('#radar-material-query').value.trim(),kind:$('#radar-material-kind').value,company:$('#radar-material-company').value});
      navigate('updates',{params:params(),focusId:'material-results-title',scroll:'preserve'});return true;
    }
    return false;
  }
  return {render,renderEvidence,handleClick,handleSubmit,trackFromHash,restore,params,selectSignal};
})();
