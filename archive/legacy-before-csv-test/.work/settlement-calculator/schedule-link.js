
/* A settlement writes calendar sales only after schedule selection and explicit confirmation. */
const settlementCalendarState={year:2026,month:0,pending:null,linkedId:null};
function settlementCalendarKey(book){
 if(!/^[a-f0-9]{64}$/.test(book.calendarSalesKey||''))throw new Error('정산 자료의 반영 이력을 확인할 수 없습니다. 엑셀을 다시 불러와주세요.');
 return book.calendarSalesKey;
}
function settlementCalendarValues(){
 const b=settlementState.book;if(!b||settlementState.busy)throw new Error('정산할 엑셀을 먼저 불러와주세요.');
 const amount=b.gross,count=b.activeOrderCount;
 if(salesValue(count,countLimit)===null||salesValue(amount,amountLimit)===null)throw new Error('일정표에 반영할 판매건수와 매출액의 범위를 확인해주세요.');
 return {count,amount,key:settlementCalendarKey(b),book:b};
}
function settlementCalendarEligible(s){return !!s&&s.type==='공동구매'&&s.status!=='취소';}
function settlementCalendarLinks(s){
 const links=Array.isArray(s.settlementSalesLinks)?s.settlementSalesLinks.slice():[];
 if(s.settlementSalesLink?.key&&!links.some(link=>link.key===s.settlementSalesLink.key))links.push(s.settlementSalesLink);
 return links;
}
function settlementCalendarCompleted(){
 if(!settlementState.book||settlementState.busy)return null;
 const v=settlementCalendarValues();
 // Keep every applied source key even if later settlements or manual edits change the total.
 return schedules.find(s=>settlementCalendarLinks(s).some(link=>link.key===v.key))||null;
}
function settlementCalendarTotals(before,v){
 const count=(before.count??0)+v.count,amount=(before.amount??0)+v.amount;
 if(salesValue(count,countLimit)===null||salesValue(amount,amountLimit)===null)throw new Error('합산 후 판매건수 또는 매출액이 입력 가능한 범위를 초과합니다. 기존 값을 확인해주세요.');
 return {count,amount};
}
function settlementRenderCalendarLink(){
 const b=settlementState.book,button=$('settleCalendarApply');if(!button)return;
 let linked=null;try{linked=settlementCalendarCompleted();}catch{}
 button.disabled=!b||settlementState.busy||!!linked;button.classList.toggle('is-applied',!!linked);
 if(!linked)button.classList.remove('just-applied');
 $('settleCalendarApplyLabel').textContent=linked?'✓ 일정표에 반영완료':'일정표 매출 반영하기';
 $('settleCalendarView').hidden=!linked;settlementCalendarState.linkedId=linked?.id??null;
 $('settleCalendarStatus').textContent=linked?calendarTitle(linked)+' · '+linked.start+' ~ '+linked.end+' · '+salesText(linked.salesCount,'건')+' / '+salesText(linked.salesAmount,'원')+' 누적 반영 완료':'판매건수와 주문금액을 선택한 일정에 반영합니다. 판매건수는 유효 주문번호 기준이며 매출액은 취소·반품 차감 전 주문금액입니다.';
}
function settlementCalendarNicknameMatch(s){
 const nickname=String(openingFields(s).nickname||'').replace(/^@+/,'').toLowerCase();if(!nickname)return false;
 const escaped=nickname.replace(/[|\\{}()[\]^$+*?.]/g,'\\$&');
 return new RegExp('(?:^|[^a-z0-9_.])@?'+escaped+'(?=$|[^a-z0-9_.])','i').test([$('settleCampaign').value,settlementState.book?.filename||''].join(' ').normalize('NFKC'));
}
function settlementOpenCalendar(){
 try{
  const v=settlementCalendarValues();settlementRenderCalendarLink();if(settlementCalendarCompleted())return;
  const matches=schedules.filter(s=>settlementCalendarEligible(s)&&settlementCalendarNicknameMatch(s)),overlapping=s=>s.start<=v.book.end&&s.end>=v.book.start;
  matches.sort((a,b)=>Number(overlapping(b))-Number(overlapping(a))||Math.abs(date(a.start)-date(v.book.start))-Math.abs(date(b.start)-date(v.book.start))||a.id-b.id);
  const suggested=matches[0]?.start.slice(0,7)||v.book.start.slice(0,7),chosen=calendarMonths.includes(suggested)?suggested:year+'-'+String(month+1).padStart(2,'0');
  [settlementCalendarState.year,settlementCalendarState.month]=chosen.split('-').map(Number);settlementCalendarState.month--;
  settlementCalendarState.pending=null;$('settleMiniSearch').value='';$('settleLinkError').textContent='';
  $('settleLinkCount').textContent=salesText(v.count,'건');$('settleLinkAmount').textContent=salesText(v.amount,'원');
  $('settleLinkCampaign').textContent='공구명: '+($('settleCampaign').value.trim()||v.book.filename);
  $('settleCalendarPick').hidden=false;$('settleCalendarConfirm').hidden=true;
  settlementRenderMiniCalendar();$('settleCalendarDialog').showModal();$('settleMiniSearch').focus();
  $('settleMiniWeeks').querySelector('.matched')?.scrollIntoView({block:'nearest',inline:'nearest'});
 }catch(error){settlementNotice(error.message,true);}
}
function settlementRenderMiniCalendar(){
 const {year:y,month:m}=settlementCalendarState,first=new Date(Date.UTC(y,m,1)),last=new Date(Date.UTC(y,m+1,0)),gridStart=shift(first,-first.getUTCDay()),n=Math.ceil((first.getUTCDay()+last.getUTCDate())/7);
 const value=y+'-'+String(m+1).padStart(2,'0'),query=$('settleMiniSearch').value.normalize('NFKC').trim().toLowerCase();
 $('settleMiniMonth').value=value;$('settleMiniPrev').disabled=value===calendarMonths[0];$('settleMiniNext').disabled=value===calendarMonths.at(-1);
 const rows=schedules.filter(s=>settlementCalendarEligible(s)&&[calendarTitle(s),s.influencer||'',s.title,ownerNames[s.owner]].join(' ').normalize('NFKC').toLowerCase().includes(query)).sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id);
 const visible=rows.filter(s=>date(s.start)<=last&&date(s.end)>=first),matched=visible.filter(settlementCalendarNicknameMatch);
 $('settleMiniCount').textContent='선택 월 공동구매 '+visible.length+'건 · 닉네임 일치 '+matched.length+'건';$('settleMiniWeeks').replaceChildren();
 for(let w=0;w<n;w++){
  const ws=shift(gridStart,w*7),we=shift(ws,6),week=node('div',undefined,'settlement-mini-week'),days=node('div',undefined,'settlement-mini-days'),events=node('div',undefined,'settlement-mini-events');
  for(let d=0;d<7;d++){
   const dt=shift(ws,d),names=holidayNames(iso(dt)),cell=node('div',undefined,(d===0?'sunday':d===6?'saturday':'')+(dt.getUTCMonth()!==m?' outside':'')+(names.length?' holiday':''));
   cell.append(node('span',String(dt.getUTCDate())));if(names.length){const holiday=node('small',names.join(' · '));holiday.title=names.join(' · ');cell.append(holiday);}days.append(cell);
  }
  const lanes=[];
  for(const s of rows.filter(s=>date(s.start)<=we&&date(s.end)>=ws)){
   const start=Math.max(0,Math.round((date(s.start)-ws)/dayMs)),end=Math.min(6,Math.round((date(s.end)-ws)/dayMs));let lane=0;while(lanes[lane]?.some(([a,b])=>start<=b&&end>=a))lane++;(lanes[lane]??=[]).push([start,end]);
   const button=node('button',undefined,'settlement-mini-event'+(settlementCalendarNicknameMatch(s)?' matched':''));button.type='button';button.dataset.settleSchedule=String(s.id);
   button.style.gridColumn=(start+1)+' / '+(end+2);button.style.gridRow=String(lane+1);button.style.setProperty('--schedule-color',scheduleColor(s));
   button.append(node('strong',calendarTitle(s)),node('small',ownerNames[s.owner]+' · '+s.start.slice(5)+' ~ '+s.end.slice(5)));
   button.title=calendarTitle(s)+' · '+ownerNames[s.owner]+' · '+s.start+' ~ '+s.end;button.setAttribute('aria-label',button.title+' · 이 일정 선택');
   button.onclick=()=>settlementConfirmCalendar(s.id);events.append(button);
  }
  week.append(days,events);$('settleMiniWeeks').append(week);
 }
}
function settlementMoveMiniMonth(direction){
 const state=settlementCalendarState,current=state.year+'-'+String(state.month+1).padStart(2,'0'),index=calendarMonths.indexOf(current),next=calendarMonths[index+direction];if(!next)return;
 [state.year,state.month]=next.split('-').map(Number);state.month--;settlementRenderMiniCalendar();
}
function settlementConfirmCalendar(id){
 try{
  settlementCalendarState.pending=null;
  if(!$('settleCalendarDialog').open)return;
  const s=schedules.find(row=>row.id===id);if(!settlementCalendarEligible(s))throw new Error('취소되지 않은 공동구매 일정을 선택해주세요.');
  const v=settlementCalendarValues();
  if(settlementCalendarCompleted())throw new Error('이미 일정표에 반영한 정산 자료입니다. 같은 내역은 다시 합산할 수 없습니다.');
  const before=salesOf(s),after=settlementCalendarTotals(before,v),hasExisting=before.count!==null||before.amount!==null;
  settlementCalendarState.pending={id,...v,before,after,history:JSON.stringify(settlementCalendarLinks(s))};
  $('settleConfirmTitle').textContent=hasExisting?'기존 매출액과 판매건수가 있습니다. 내역을 합산할까요?':'정말 일정표에 해당 매출을 반영하시겠습니까?';
  $('settleConfirmSchedule').textContent=calendarTitle(s);$('settleConfirmPeriod').textContent=s.start+' ~ '+s.end;$('settleConfirmOwner').textContent='담당자: '+ownerNames[s.owner];
  $('settleConfirmSource').textContent='이번 정산 주문기간: '+v.book.start+' ~ '+v.book.end;
  for(const [field,value] of [['settleBeforeCount',salesText(before.count,'건')],['settleBeforeAmount',salesText(before.amount,'원')],['settleIncomingCount',salesText(v.count,'건')],['settleIncomingAmount',salesText(v.amount,'원')],['settleAfterCount',salesText(after.count,'건')],['settleAfterAmount',salesText(after.amount,'원')]])$(field).textContent=value;
  $('settleConfirmNote').textContent=hasExisting?'기존 값에 이번 정산의 판매건수와 주문금액을 더합니다. 미입력 항목은 0으로 계산합니다.':'이번 정산의 판매건수와 주문금액을 선택한 일정에 저장합니다.';
  $('settleCalendarYes').textContent=hasExisting?'예, 합산하기':'예, 반영하기';
  $('settleLinkError').textContent='';$('settleCalendarPick').hidden=true;$('settleCalendarConfirm').hidden=false;$('settleCalendarNo').focus();
 }catch(error){$('settleLinkError').textContent=error.message;}
}
function settlementDeclineCalendar(){
 settlementCalendarState.pending=null;$('settleCalendarPick').hidden=false;$('settleCalendarConfirm').hidden=true;$('settleLinkError').textContent='';$('settleMiniSearch').focus();
}
function settlementApplyCalendar(){
 const pending=settlementCalendarState.pending;if(!pending||!$('settleCalendarDialog').open||$('settleCalendarConfirm').hidden)return;
 try{
  const v=settlementCalendarValues(),s=schedules.find(row=>row.id===pending.id),before=s?salesOf(s):null;
  const existing=settlementCalendarCompleted();if(existing){settlementCalendarState.pending=null;$('settleCalendarDialog').close();settlementRenderCalendarLink();settlementNotice('이미 일정표에 반영한 정산 자료입니다. 같은 내역은 다시 합산하지 않았습니다.');return;}
  if(!settlementCalendarEligible(s)||v.book!==pending.book||v.key!==pending.key||v.count!==pending.count||v.amount!==pending.amount||before.count!==pending.before.count||before.amount!==pending.before.amount||JSON.stringify(settlementCalendarLinks(s))!==pending.history){
   settlementDeclineCalendar();$('settleLinkError').textContent='정산 또는 일정 매출이 변경되었습니다. 최신 값을 확인하고 일정을 다시 선택해주세요.';return;
  }
  const after=settlementCalendarTotals(before,v),links=settlementCalendarLinks(s),entry={key:v.key,source:pending.book.filename,start:pending.book.start,end:pending.book.end,count:v.count,amount:v.amount,basis:'gross-order-amount',appliedAt:new Date().toISOString()};
  Object.assign(s,{salesCount:after.count,salesAmount:after.amount,settlementSalesLinks:[...links,entry],settlementSalesLink:entry});
  settlementCalendarState.pending=null;$('settleCalendarDialog').close();render();settlementRenderCalendarLink();
  const button=$('settleCalendarApply');button.classList.remove('just-applied');void button.offsetWidth;button.classList.add('just-applied');
  settlementNotice('반영이 완료되었습니다. '+calendarTitle(s)+' · 누적 '+salesText(after.count,'건')+' / '+salesText(after.amount,'원'));
 }catch(error){$('settleLinkError').textContent=error.message;}
}
function settlementViewLinkedCalendar(){
 const s=schedules.find(row=>row.id===settlementCalendarState.linkedId);if(!s)return;
 year=Number(s.start.slice(0,4));month=Number(s.start.slice(5,7))-1;weeklyAnchor=sundayOf(s.start);switchWorkView('month');render();openDetail(s);
}
$('settleCalendarApply').onclick=settlementOpenCalendar;$('settleCalendarView').onclick=settlementViewLinkedCalendar;
$('settleCalendarClose').onclick=()=>$('settleCalendarDialog').close();
$('settleCalendarDialog').addEventListener('close',()=>{if(!$('settleCalendarDialog').open)settlementCalendarState.pending=null;});
$('settleCalendarNo').onclick=settlementDeclineCalendar;$('settleCalendarYes').onclick=settlementApplyCalendar;
$('settleMiniSearch').oninput=settlementRenderMiniCalendar;$('settleMiniPrev').onclick=()=>settlementMoveMiniMonth(-1);$('settleMiniNext').onclick=()=>settlementMoveMiniMonth(1);
$('settleMiniMonth').onchange=()=>{const value=$('settleMiniMonth').value;if(!calendarMonths.includes(value)){settlementRenderMiniCalendar();return;}[settlementCalendarState.year,settlementCalendarState.month]=value.split('-').map(Number);settlementCalendarState.month--;settlementRenderMiniCalendar();};
$('settleCampaign').addEventListener('input',()=>{if($('settleCalendarDialog').open&&!$('settleCalendarPick').hidden)settlementRenderMiniCalendar();});
$('navSettlement').addEventListener('click',settlementRenderCalendarLink);
$('settleCalendarApply').addEventListener('animationend',()=>{$('settleCalendarApply').classList.remove('just-applied');});
