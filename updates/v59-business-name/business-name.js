/* v59 preview: recipient metadata is separate from sales and order hashes. */
let settlementRecipientEdit=null;
function normalizeSettlementBusinessName(value,required=false){
 const name=String(value??'').normalize('NFC').trim().replace(/\s+/gu,' ');
 if(/[\u0000-\u001f\u007f]/u.test(String(value??'')))throw Error('사업자명은 줄바꿈 없이 입력해주세요.');
 if(Array.from(name).length>100)throw Error('사업자명은 100자 이내로 입력해주세요.');
 if(required&&!name)throw Error('정산받는 사업자명을 입력해주세요.');
 return name;
}
function settlementRecipientSnapshot(){
 if(!Object.hasOwn(settlementRecipients,settlementState.recipient))throw Error('정산 대상을 확인해주세요.');
 return {type:settlementState.recipient,businessName:settlementState.recipient==='business'?normalizeSettlementBusinessName(settlementState.businessName,true):''};
}
function settlementBusinessNames(schedule){
 const names=[];
 for(const link of settlementCalendarLinks(schedule)){
  if(link.recipient?.type!=='business')continue;
  const name=normalizeSettlementBusinessName(link.recipient.businessName);
  if(name&&!names.includes(name))names.push(name);
 }
 return names;
}
function settlementBusinessNameLabel(schedule){return settlementBusinessNames(schedule).join(' · ')||'—';}
function settlementRenderBusinessName(){
 const business=settlementState.recipient==='business',input=$('settleBusinessName');
 $('settleBusinessNameSection').hidden=!business;
 input.disabled=settlementState.busy;input.value=settlementState.businessName||'';
 let linked=null,snapshot=null,error='';
 try{if(settlementState.book)linked=settlementCalendarCompleted();if(business)snapshot=settlementRecipientSnapshot();}catch(e){error=e.message;}
 $('settleBusinessNameError').textContent=error;
 const link=linked?settlementCalendarLinks(linked).find(row=>row.key===settlementCalendarKey(settlementState.book)):null;
 const same=!!snapshot&&link?.recipient?.type===snapshot.type&&normalizeSettlementBusinessName(link.recipient.businessName)===snapshot.businessName;
 $('settleBusinessNameSave').hidden=!linked||!business;
 $('settleBusinessNameSave').disabled=settlementState.busy||!!error||same;
 $('settleBusinessNameStatus').textContent=linked?(same?'이 정산의 사업자명이 일정표에 반영되어 있습니다.':'일정에 반영된 매출은 유지하고 사업자명만 저장할 수 있습니다.'):'일정표 매출 반영을 확인하면 사업자명도 함께 반영됩니다.';
 $('settleDownload').disabled=settlementState.busy||!!error;
 if(business&&error&&!linked)$('settleCalendarApply').disabled=true;
}
function settlementPrepareRecipientConfirmation(schedule,recipient){
 $('settleConfirmRecipient').textContent='정산 대상: '+settlementRecipients[recipient.type]+(recipient.type==='business'?' · '+recipient.businessName:'');
 const names=recipient.type==='business'?settlementBusinessNames(schedule).filter(name=>name!==recipient.businessName):[];
 $('settleBusinessDifference').hidden=!names.length;$('settleBusinessDifferenceCheck').checked=false;
 $('settleBusinessDifferenceText').textContent=names.length?'기존 사업자명: '+names.join(' · ')+' / 이번 사업자명: '+recipient.businessName+'. 기존 정산의 이름은 유지됩니다.':'';
 $('settleCalendarYes').disabled=!!names.length;
 return names;
}
function settlementCheckRecipientConfirmation(pending){
 const current=settlementRecipientSnapshot();
 if(JSON.stringify(current)!==JSON.stringify(pending.recipientSnapshot))throw Error('사업자명이 변경되었습니다. 일정을 다시 선택해주세요.');
 if(pending.businessDifferences?.length&&!$('settleBusinessDifferenceCheck').checked)throw Error('다른 사업자명을 함께 표시하는 내용을 확인해주세요.');
 return current;
}
function settlementOpenBusinessNameEdit(){
 try{
  const recipient=settlementRecipientSnapshot();if(recipient.type!=='business')return;
  const schedule=settlementCalendarCompleted();if(!schedule)throw Error('먼저 정산 자료를 일정표에 반영해주세요.');
  const key=settlementCalendarKey(settlementState.book),link=settlementCalendarLinks(schedule).find(row=>row.key===key);
  if(!link)throw Error('반영한 정산 이력을 확인해주세요.');
  settlementRecipientEdit={id:schedule.id,key,before:JSON.stringify(link),recipient,history:JSON.stringify(settlementCalendarLinks(schedule)),sales:salesOf(schedule)};
  $('settleBusinessEditSchedule').textContent=calendarTitle(schedule);
  $('settleBusinessEditBefore').textContent=link.recipient?.businessName||'미등록';$('settleBusinessEditAfter').textContent=recipient.businessName;
  $('settleBusinessEditError').textContent='';$('settleBusinessEditDialog').showModal();$('settleBusinessEditCancel').focus();
 }catch(e){settlementNotice(e.message,true);}
}
function settlementSaveBusinessName(){
 const pending=settlementRecipientEdit;if(!pending||!$('settleBusinessEditDialog').open)return;
 try{
  const recipient=settlementRecipientSnapshot(),schedule=schedules.find(row=>row.id===pending.id),links=schedule?settlementCalendarLinks(schedule):[],sales=schedule?salesOf(schedule):null;
  if(!schedule||JSON.stringify(recipient)!==JSON.stringify(pending.recipient)||JSON.stringify(links)!==pending.history||sales.count!==pending.sales.count||sales.amount!==pending.sales.amount)throw Error('일정이나 입력값이 변경되었습니다. 취소한 뒤 다시 확인해주세요.');
  const updated=links.map(link=>link.key===pending.key?{...link,recipient:{...recipient},recipientUpdatedAt:new Date().toISOString()}:link);
  schedule.settlementSalesLinks=updated;
  if(schedule.settlementSalesLink?.key===pending.key)schedule.settlementSalesLink=updated.find(link=>link.key===pending.key);
  settlementRecipientEdit=null;$('settleBusinessEditDialog').close();render();settlementRenderCalendarLink();settlementRenderBusinessName();
  settlementNotice('사업자명만 저장했습니다. 판매건수와 매출액은 변경하지 않았습니다.');
 }catch(e){$('settleBusinessEditError').textContent=e.message;}
}
$('settleRateBusinessName').addEventListener('input',settlementUpdateRateContinue);
$('settleBusinessName').addEventListener('input',event=>{
 settlementState.businessName=event.target.value;
 settlementRenderCalendarLink();settlementRenderBusinessName();
});
$('settleBusinessDifferenceCheck').addEventListener('change',()=>{
 const pending=settlementCalendarState.pending;$('settleCalendarYes').disabled=!!pending?.businessDifferences?.length&&!$('settleBusinessDifferenceCheck').checked;
});
$('settleBusinessNameSave').onclick=settlementOpenBusinessNameEdit;
$('settleBusinessEditConfirm').onclick=settlementSaveBusinessName;
$('settleBusinessEditCancel').onclick=$('settleBusinessEditClose').onclick=()=>$('settleBusinessEditDialog').close();
$('settleBusinessEditDialog').addEventListener('close',()=>{settlementRecipientEdit=null;});
settlementRenderBusinessName();
