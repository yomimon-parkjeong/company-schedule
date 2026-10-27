/* Read-only detail dialog. The parent editor remains open and is never re-rendered. */
const salesRecordState={scheduleId:null,scope:'all',parentScroll:0,outsidePointer:false};
function salesRecordNickname(schedule){return String(openingFields(schedule).nickname||'').normalize('NFC').trim().replace(/^@+/,'').toLowerCase();}
function salesRecordSchedules(schedule,scope='all'){
 const key=salesRecordNickname(schedule);
 return scope==='current'||!key?[schedule]:schedules.filter(row=>row.type==='공동구매'&&salesRecordNickname(row)===key);
}
function salesRecordPeriod(link){
 const start=String(link.start||''),end=String(link.end||'');
 if(!scheduleCsvValidDate(start)||!scheduleCsvValidDate(end)||start>end)return '정산 기간 미등록';
 const sameMonth=start.slice(0,7)===end.slice(0,7),first=Number(start.slice(8))<=15,last=Number(end.slice(8))<=15;
 return sameMonth&&first===last?start.slice(0,4)+'년 '+Number(start.slice(5,7))+'월 '+(first?'1차':'2차'):'정산 기간 확인 필요';
}
function salesRecordMoney(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0?value.toLocaleString('ko-KR',{maximumFractionDigits:2})+'원':'미등록';}
function salesRecordFinancialSnapshot(){
 const result=settlementCalculate(settlementState.book,settlementState.recipient,settlementState.rate);
 return {basis:result.basis,commission:result.commission,incomeTax:result.income,localTax:result.local,payment:result.payment,rate:settlementState.rate};
}
function salesRecordData(items){
 const rows=[],seen=new Set();
 for(const schedule of items){
  const links=settlementCalendarLinks(schedule);
  if(!links.length){rows.push({schedule,link:null});continue;}
  for(const link of links){if(link.key&&seen.has(link.key))continue;if(link.key)seen.add(link.key);rows.push({schedule,link});}
 }
 return rows.sort((a,b)=>String(b.link?.start||b.schedule.start).localeCompare(String(a.link?.start||a.schedule.start))||String(a.link?.key||a.schedule.id).localeCompare(String(b.link?.key||b.schedule.id)));
}
function salesRecordMetric(label,value,note){const el=node('div',undefined,'sales-record-metric');el.append(node('span',label),node('strong',value),node('small',note));return el;}
function renderSalesRecords(){
 const schedule=schedules.find(row=>row.id===salesRecordState.scheduleId);if(!schedule)return;
 const items=salesRecordSchedules(schedule,salesRecordState.scope),rows=salesRecordData(items),links=rows.filter(row=>row.link),financial=links.filter(row=>Number.isFinite(row.link.financial?.commission)&&row.link.financial.commission>=0);
 const entered=items.filter(row=>salesOf(row).amount!==null),gross=entered.reduce((sum,row)=>sum+salesOf(row).amount,0);
 const paid=links.filter(row=>row.link.paymentStatus==='paid'&&typeof row.link.paidAmount==='number'&&Number.isFinite(row.link.paidAmount)&&row.link.paidAmount>=0);
 const paymentKnown=links.filter(row=>row.link.paymentStatus==='pending'||row.link.paymentStatus==='paid'&&typeof row.link.paidAmount==='number'&&Number.isFinite(row.link.paidAmount)&&row.link.paidAmount>=0);
 const nickname=openingFields(schedule).displayName||openingFields(schedule).nickname||'닉네임 미등록';
 $('salesRecordIdentity').textContent=(nickname==='닉네임 미등록'?'':'@')+nickname+' · '+(salesRecordState.scope==='all'&&salesRecordNickname(schedule)?'전체 기간 · 같은 닉네임의 일정':'선택한 일정');
 $('salesRecordAll').disabled=!salesRecordNickname(schedule);$('salesRecordAll').setAttribute('aria-pressed',String(salesRecordState.scope==='all'));$('salesRecordCurrent').setAttribute('aria-pressed',String(salesRecordState.scope==='current'));
 $('salesRecordSummary').replaceChildren(
  salesRecordMetric('저장된 주문금액',entered.length?salesRecordMoney(gross):'미입력',items.length+'개 일정 중 '+entered.length+'개 입력'),
  salesRecordMetric('누적 수수료(세전)',financial.length?salesRecordMoney(financial.reduce((sum,row)=>sum+row.link.financial.commission,0)):'미등록',links.length+'건 중 '+financial.length+'건 등록'),
  salesRecordMetric('지급 완료액',paymentKnown.length?salesRecordMoney(paid.reduce((sum,row)=>sum+row.link.paidAmount,0)):'미확인','지급완료 표시 '+paid.length+'건 · 미확인 '+(links.length-paymentKnown.length)+'건'),
  salesRecordMetric('연결된 정산 기록',links.length+'건',items.length+'개 일정 · 미연결 '+rows.filter(row=>!row.link).length+'개')
 );
 $('salesRecordCoverage').textContent='저장된 값 기준 · 수수료 미등록 '+(links.length-financial.length)+'건 · 일정 편집창에서 아직 저장하지 않은 입력은 합계에 포함되지 않습니다.';
 $('salesRecordCaption').textContent=salesRecordState.scope==='current'?'이 일정의 정산 기간별 내역':'인플루언서 정산 기간별 내역';
 $('salesRecordRows').replaceChildren();$('salesRecordEmpty').hidden=rows.length>0;
 for(const {schedule:rowSchedule,link} of rows){
  const row=node('tr',undefined,rowSchedule.id===schedule.id?'is-current':''),period=node('td',link?salesRecordPeriod(link):'정산 이력 미등록'),campaign=node('td',calendarTitle(rowSchedule)),values=link||salesOf(rowSchedule);
  if(link?.start&&link?.end)period.append(node('small',link.start+' ~ '+link.end));
  campaign.append(node('small',rowSchedule.start+' ~ '+rowSchedule.end+(rowSchedule.status==='취소'?' · 취소 일정':'')));
  if(link?.recipient?.type==='business'&&link.recipient.businessName)campaign.append(node('small',link.recipient.businessName));
  const status=link?.paymentStatus==='paid'?'지급완료':link?.paymentStatus==='pending'?'지급대기':'지급정보 미등록',payment=node('td',status);
  if(link?.paymentStatus==='paid'){payment.append(node('small',salesRecordMoney(link.paidAmount)));if(link.paidAt)payment.append(node('small',String(link.paidAt).slice(0,10)));}
  row.append(period,campaign,node('td',salesText(values.count,'건')),node('td',salesRecordMoney(values.amount)),node('td',salesRecordMoney(link?.financial?.commission)),node('td',salesRecordMoney(link?.financial?.payment)),payment);
  $('salesRecordRows').append(row);
 }
}
function openSalesRecords(){
 const parent=$('detailDialog'),schedule=schedules.find(row=>row.id===selectedScheduleId);
 if(!parent.open||!schedule)return;
 salesRecordState.scheduleId=schedule.id;salesRecordState.scope=salesRecordNickname(schedule)?'all':'current';salesRecordState.parentScroll=parent.querySelector('.dialog-body').scrollTop;salesRecordState.outsidePointer=false;
 renderSalesRecords();$('salesRecordDialog').showModal();$('closeSalesRecords').focus({preventScroll:true});
}
function closeSalesRecords(){if($('salesRecordDialog').open)$('salesRecordDialog').close();}
function salesRecordOutside(event){const rect=$('salesRecordDialog').getBoundingClientRect();return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;}
$('openSalesRecords').onclick=openSalesRecords;
$('closeSalesRecords').onclick=$('returnSalesRecords').onclick=closeSalesRecords;
$('salesRecordAll').onclick=()=>{salesRecordState.scope='all';renderSalesRecords();};
$('salesRecordCurrent').onclick=()=>{salesRecordState.scope='current';renderSalesRecords();};
$('salesRecordDialog').addEventListener('pointerdown',event=>{salesRecordState.outsidePointer=event.target===$('salesRecordDialog')&&salesRecordOutside(event);});
$('salesRecordDialog').addEventListener('click',event=>{const outside=salesRecordState.outsidePointer;salesRecordState.outsidePointer=false;if(outside&&event.target===$('salesRecordDialog')&&salesRecordOutside(event))closeSalesRecords();});
$('salesRecordDialog').addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();closeSalesRecords();});
$('salesRecordDialog').addEventListener('close',()=>queueMicrotask(()=>{
 salesRecordState.outsidePointer=false;
 if($('detailDialog').open&&selectedScheduleId===salesRecordState.scheduleId){$('detailDialog').querySelector('.dialog-body').scrollTop=salesRecordState.parentScroll;$('openSalesRecords').focus({preventScroll:true});}
}));
$('detailDialog').addEventListener('close',closeSalesRecords);
