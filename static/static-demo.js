'use strict';
function renderSnapshotUpdates(data){
 let sources=data.sources.filter(s=>s.id.startsWith('skincare-disclosure-'));
 if(state.materialCompany)sources=sources.filter(s=>s.company_id===state.materialCompany);
 if(state.q){const q=state.q.toLowerCase();sources=sources.filter(s=>(s.title+' '+data.evidence.filter(e=>e.source_id===s.id).map(e=>e.title+' '+e.text).join(' ')).toLowerCase().includes(q));}
 sources.sort((a,b)=>(b.published_at||'').localeCompare(a.published_at||''));
 return `<div class="updates-page">${title('资料与证据','公开披露的已核对快照 · 统计期、披露日和采集日分别展示',`<a class="button" href="data/case.json" download="行业机会-证据快照.json">导出证据</a>`)}
 <div class="demo-worker"><span class="status">数据截至 ${esc(data.snapshot.reviewed_at)}</span><p>此版用于面试演示；企业事实有原文出处，机会建议属于待业务确认的研究假设。</p></div>
 <section class="panel"><div class="panel-head"><div><h2>三家企业的资料范围</h2><p>财报统计期与页面日期不同；新披露须重新核对后才更新</p></div></div><div class="table-wrap"><table class="demo-schedule snapshot-table"><thead><tr><th>企业</th><th>财报统计期</th><th>最近相关披露日</th><th>资料采集时间</th></tr></thead><tbody>${data.companies.map(c=>{const files=data.sources.filter(s=>s.company_id===c.id);const latest=files.map(s=>s.published_at||'').sort().at(-1);return `<tr><td>${esc(c.name)}</td><td>${esc(c.finance_period)}</td><td>${esc(latest||'未标明')}</td><td>${stamp(c.collection?.checked_at)}</td></tr>`;}).join('')}</tbody></table></div></section>
 <section class="panel demo-section"><div class="panel-head"><div><h2>可追溯的原文与摘录</h2><p>${sources.length} 份匹配披露；保留官方原件链接、PDF 页码与文件指纹</p></div></div>
 <form class="demo-material-search" id="material-search"><label class="sr-only" for="material-query">检索材料关键词</label><input id="material-query" placeholder="检索 OMO、微信、销售费用等" value="${esc(state.q)}"><label class="sr-only" for="material-company">企业范围</label><select id="material-company"><option value="">全部三家</option>${data.companies.map(c=>`<option value="${esc(c.id)}" ${state.materialCompany===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select><button class="button" type="submit">检索证据</button></form>
 <div class="demo-materials">${sources.map(s=>`<article><div><span class="case-caption">${esc({financial:'财报',operating:'经营数据',relation:'投资者交流'}[s.role]||'披露材料')} · 披露 ${esc(s.published_at)}</span><h3><button class="text-button" data-material="${esc(s.id)}">${esc(s.title)} →</button></h3><p>${esc(s.period)}${s.review_reason?' · 关键指标待核对':''}</p></div><button class="button" data-material="${esc(s.id)}">查看原文与摘录</button></article>`).join('')||'<div class="empty">没有匹配的材料，请调整关键词或企业范围。</div>'}</div></section>
 <p class="demo-boundary">检索范围为本案已核对的材料。点击证据可阅读引用，全文通过来源站 PDF 查阅。</p></div>`;
}
