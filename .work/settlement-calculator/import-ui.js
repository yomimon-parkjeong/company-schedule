/* A file is staged locally; calculation starts only after confirming recipient and rate. */
let settlementPendingFile=null,settlementPendingRecipient=null;
function settlementDropNotice(message,error=false){
 $('settleDropStatus').textContent=message;$('settleDropStatus').classList.toggle('error',error);
}
function settlementUpdateRateContinue(){
 const valid=[10,15,20].includes(settlementPendingRate)&&Object.hasOwn(settlementRecipients,settlementPendingRecipient);
 $('settleRateContinue').disabled=!valid||settlementState.busy;
 $('settleRateContinue').textContent=settlementRateAction==='change'?'수수료율 적용':valid?settlementPendingRate+'%로 정산 불러오기':'선택 후 정산 불러오기';
}
function settlementOpenRate(action='import',file=null){
 if(settlementState.busy||$('settleRateDialog').open)return;
 if(action==='change'&&!settlementState.book)return;
 if(action==='import'&&!file){$('settleFile').value='';$('settleFile').click();return;}
 settlementRateAction=action;settlementPendingFile=file;settlementPendingRate=null;settlementPendingRecipient=settlementState.recipient;
 for(const input of document.querySelectorAll('input[name="settleRate"]'))input.checked=false;
 for(const input of document.querySelectorAll('input[name="settleRateRecipient"]'))input.checked=input.value===settlementPendingRecipient;
 $('settleRateRecipientGroup').hidden=action==='change';
 $('settleRateFile').textContent=file?file.name:settlementState.book.filename;
 $('settleRateHelp').textContent=action==='change'?'현재 정산에 적용할 수수료율을 선택해주세요.':'정산 대상과 수수료율을 확인하면 선택한 엑셀을 불러옵니다.';
 settlementUpdateRateContinue();$('settleRateDialog').showModal();
 const first=settlementPendingRecipient?document.querySelector('input[name="settleRate"]'):document.querySelector('input[name="settleRateRecipient"]');
 first.focus({preventScroll:true});
}
function settlementStageFiles(files){
 $('settleDropZone').classList.remove('is-dragging');
 if(settlementState.busy){settlementDropNotice('엑셀을 읽고 있습니다. 잠시 후 다시 넣어주세요.',true);return;}
 if($('settleRateDialog').open)return;
 if(files.length!==1){settlementDropNotice('정산할 엑셀 파일을 한 개씩 넣어주세요.',true);return;}
 const file=files[0];
 if(!/\.xlsx$/i.test(file.name)){settlementDropNotice('.xlsx 형식의 주문 엑셀을 넣어주세요.',true);return;}
 if(!file.size){settlementDropNotice('비어 있는 파일입니다. 엑셀 내용을 확인해주세요.',true);return;}
 if(file.size>20000000){settlementDropNotice('파일이 너무 큽니다. 20 MB 이하로 나누어 넣어주세요.',true);return;}
 settlementDropNotice(file.name+' · 수수료율 선택 대기');
 settlementOpenRate('import',file);
}
for(const radio of document.querySelectorAll('input[name="settleRate"]'))radio.onchange=()=>{settlementPendingRate=Number(radio.value);settlementUpdateRateContinue();};
for(const radio of document.querySelectorAll('input[name="settleRateRecipient"]'))radio.onchange=()=>{settlementPendingRecipient=radio.value;settlementUpdateRateContinue();};
$('settleImport').onclick=()=>{if(!settlementState.busy){$('settleFile').value='';$('settleFile').click();}};
$('settleRateChange').onclick=()=>settlementOpenRate('change');
$('settleRateClose').onclick=$('settleRateCancel').onclick=()=>$('settleRateDialog').close();
$('settleRateDialog').addEventListener('close',()=>{
 if($('settleRateDialog').open)return;
 settlementPendingFile=null;settlementPendingRate=null;settlementPendingRecipient=null;
 if(!settlementState.busy)settlementDropNotice('엑셀을 여기에 끌어 놓거나 파일을 선택해주세요.');
});
$('settleRateContinue').onclick=async()=>{
 if(settlementState.busy||![10,15,20].includes(settlementPendingRate)||!Object.hasOwn(settlementRecipients,settlementPendingRecipient))return;
 const action=settlementRateAction,rate=settlementPendingRate,recipient=settlementPendingRecipient,file=settlementPendingFile;
 if(action==='import'&&!file)return;
 $('settleRateContinue').disabled=true;$('settleRateDialog').close();
 if(action==='change'){
  settlementState.rate=rate;settlementRender();settlementNotice('수수료 '+rate+'%를 적용했습니다.');
 }else{
  await settlementImportFile(file,rate,recipient);
  settlementDropNotice(settlementState.book?.filename===file.name?'다른 엑셀로 교체하려면 여기에 끌어 놓으세요.':'엑셀을 여기에 끌어 놓거나 파일을 선택해주세요.');
 }
};
$('settleFile').onchange=event=>{const files=Array.from(event.target.files);event.target.value='';if(files.length)settlementStageFiles(files);};
const settleDropZone=$('settleDropZone');
settleDropZone.addEventListener('dragenter',event=>{event.preventDefault();if(!settlementState.busy)settleDropZone.classList.add('is-dragging');});
settleDropZone.addEventListener('dragover',event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect=settlementState.busy?'none':'copy';});
settleDropZone.addEventListener('dragleave',event=>{if(!settleDropZone.contains(event.relatedTarget))settleDropZone.classList.remove('is-dragging');});
settleDropZone.addEventListener('drop',event=>{event.preventDefault();event.stopPropagation();settlementStageFiles(Array.from(event.dataTransfer?.files||[]));});
$('settlementWorkspace').addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files'))event.preventDefault();});
$('settlementWorkspace').addEventListener('drop',event=>{
 if(!event.dataTransfer?.files.length)return;event.preventDefault();settlementStageFiles(Array.from(event.dataTransfer.files));
});
$('settleDownload').onclick=settlementDownload;
