/* Campaign-wide sales: this view does not split orders by transaction date. */
function salesScope(){return $('salesScope').value==='start'?'start':'active';}
function salesScopeLabel(){return salesScope()==='start'?'공구 시작일 기준':'선택 월에 진행한 공구 기준';}
function currentMonthPeriod(){return {first:iso(new Date(Date.UTC(year,month,1))),last:iso(new Date(Date.UTC(year,month+1,0)))};}
function currentSalesItems(scope=salesScope()){
 const {first,last}=currentMonthPeriod();
 return schedules.filter(s=>s.type==='공동구매'&&s.status!=='취소'&&(scope==='start'?s.start>=first&&s.start<=last:s.start<=last&&s.end>=first)).sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id);
}
function salesWeeks(items=currentSalesItems()){
 const first=new Date(Date.UTC(year,month,1)),last=new Date(Date.UTC(year,month+1,0)),start=shift(first,-first.getUTCDay()),n=Math.ceil((first.getUTCDay()+last.getUTCDate())/7);
 return Array.from({length:n},(_,i)=>{const ws=shift(start,i*7),we=shift(ws,6);return {index:i+1,start:iso(new Date(Math.max(first,ws))),end:iso(new Date(Math.min(last,we))),items:items.filter(s=>i===0&&date(s.start)<first||date(s.start)>=ws&&date(s.start)<=we)};});
}
function salesViewContext(){
 const monthItems=currentSalesItems(),weeks=salesWeeks(monthItems),weekly=workView==='week';
 if(!weekly)return {weekly,items:monthItems,weeks,week:null,index:null,label:(month+1)+'월'};
 const range=ensureWeeklyAnchor(),index=Math.round((range.start-range.gridStart)/dayMs/7)+1,week=weeks.find(w=>w.index===index);
 return {weekly,items:week?week.items:[],weeks,week,index,label:(month+1)+'월 '+index+'주차'};
}
function renderSales(){
 const context=salesViewContext(),items=context.items,v=summarizeSales(items),{first}=currentMonthPeriod(),carry=currentSalesItems('active').filter(s=>s.start<first);
 $('salesMonthTitle').textContent=context.weekly?context.label+' 종합 매출':(month+1)+'월 매출 종합';
 $('monthSalesSummary').setAttribute('aria-label',context.weekly?context.label+' 매출 집계':'월별 주차별 매출 집계');
 $('salesBreakdown').hidden=context.weekly;document.querySelector('#monthSalesSummary .export-actions').hidden=context.weekly;
 $('salesScopeDescription').textContent=(context.weekly?'전체일정의 해당 주차 집계와 동일 · ':'')+salesScopeLabel()+' · 취소 제외 · 검색·필터와 관계없이 전체 입력값 합계';
 $('salesScopeNote').textContent=context.weekly?
  (context.week?openingDate(context.week.start)+' ~ '+openingDate(context.week.end):'해당 주차 없음')+' · 공구 전체 실적 기준'+(items.some(s=>s.start<first)?' · 전월 시작 공구 '+items.filter(s=>s.start<first).length+'개 포함':''):
  salesScope()==='active'?'전월 시작 공구 '+carry.length+'개 포함 · 공구 전체 실적을 표시하며, 주문일별로 월 매출을 나누지는 않습니다.':'전월 시작 공구 '+carry.length+'개는 시작월 매출에 포함됩니다.';
 $('salesMonthCount').textContent=salesText(v.count,'건');$('salesMonthAmount').textContent=salesText(v.amount,'원');
 $('salesCountCoverage').textContent=v.countEntered+'/'+v.total+'개 공구 입력 · 미입력 '+(v.total-v.countEntered)+'개';
 $('salesAmountCoverage').textContent=v.amountEntered+'/'+v.total+'개 공구 입력 · 미입력 '+(v.total-v.amountEntered)+'개';
 $('salesMonthComplete').textContent=v.complete+' / '+v.total+'개';
 $('salesWeeklyCaption').textContent='선택 월의 '+salesScopeLabel()+' 주차별 주문·결제 매출. 전월 시작 공구는 첫 주에 한 번 집계합니다.';
 $('salesWeeklyBody').replaceChildren();
 for(const w of salesWeeks(items)){
  const t=summarizeSales(w.items),tr=node('tr'),th=node('th',w.index+'주차');th.scope='row';th.append(node('div',openingDate(w.start)+' ~ '+openingDate(w.end),'week-range'));
  const carried=w.items.filter(s=>s.start<first).length;if(carried)th.append(node('div','전월 시작 '+carried+'개 포함','sales-carry-note'));
  tr.append(th,node('td',t.total+'개'),node('td',t.complete+'개'),node('td',t.total?salesText(t.count,'건'):'공구 없음'),node('td',t.total?salesText(t.amount,'원'):'공구 없음'),node('td',t.missing+'개'));$('salesWeeklyBody').append(tr);
 }
 document.querySelectorAll('.opening-sales,.opening-week-sales').forEach(el=>el.remove());
 for(const button of document.querySelectorAll('.opening-item')){
  const s=schedules.find(s=>s.id===Number(button.dataset.scheduleId));if(!s||s.type!=='공동구매'||s.status==='취소')continue;
  button.append(node('span',salesLabel(s),'opening-sales'+(!salesComplete(s)?' missing':'')));
  button.setAttribute('aria-label',openingLine(s)+' · '+openingDate(s.start)+' 시작 · '+salesLabel(s));
 }
 for(const section of document.querySelectorAll('.opening-week')){
  const rows=[...section.querySelectorAll('.opening-item')].map(b=>schedules.find(s=>s.id===Number(b.dataset.scheduleId))),t=summarizeSales(rows);
  section.querySelector('.opening-week-head').append(node('span','표시 일정 매출 · '+salesText(t.count,'건')+' · '+salesText(t.amount,'원')+' · 입력 완료 '+t.complete+'/'+t.total+'개','opening-week-sales'));
 }
 refreshSelected();
}
function selectedSalesSummary(s){
 if(s.type!=='공동구매')return '공동구매 매출 집계 대상이 아닙니다.';
 if(s.status==='취소')return '취소 일정은 매출 집계에서 제외됩니다.';
 if(!salesComplete(s))return '편집에서 주문·결제 건수와 매출액을 입력하세요.';
 const context=salesViewContext(),included=context.items.some(row=>row.id===s.id);
 return '입력 완료 · '+(included?context.label+' 매출 집계에 반영':'현재 매출 집계 범위에서 제외');
}
