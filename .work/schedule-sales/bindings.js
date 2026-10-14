
$('selectedTab').onclick=()=>activateSide('selected');$('filterTab').onclick=()=>activateSide('filter');
$('closeSelection').onclick=()=>{selectedScheduleId=null;refreshSelected();activateSide('filter');};
$('editSelected').onclick=openEdit;$('salesFilter').addEventListener('change',render);
$('exportMonthly').onclick=()=>exportSales('month');$('exportWeekly').onclick=()=>exportSales('week');
$('saveDetailColor').onclick=saveEdit;
for(const id of ['editTitle','editProduct'])$(id).addEventListener('input',()=>updateColorPreview('detail',$('detailColor').value,composeScheduleTitle($('editTitle').value,$('editProduct').value),$('detailOwner').value));
$('detailOwner').onchange=()=>updateColorPreview('detail',$('detailColor').value,composeScheduleTitle($('editTitle').value,$('editProduct').value),$('detailOwner').value);
$('addForm').onsubmit=e=>{e.preventDefault();try{const f=Object.fromEntries(new FormData(e.target));if(!f.title.trim())throw new Error('일정명을 입력해주세요.');if(!validPeriod(f.start,f.end))throw new Error('시작일과 종료일을 확인해주세요.');const sales=readSalesInputs(f.salesCount,f.salesAmount);schedules.push({...f,...sales,influencer:f.title.trim(),product:f.product.trim(),title:composeScheduleTitle(f.title,f.product),status:e.target.elements.cancelled.checked?'취소':'미표기',autoComposed:true,id:Math.max(0,...schedules.map(s=>s.id))+1,related:'시안 추가 일정'});const d=date(f.start);year=d.getUTCFullYear();month=d.getUTCMonth();$('addDialog').close();render();}catch(err){$('formError').textContent=err.message;}};

for(const tab of [$('selectedTab'),$('filterTab')])tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[$('selectedTab'),$('filterTab')].filter(t=>!t.disabled);const next=e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):tabs[(tabs.indexOf(e.currentTarget)+1)%tabs.length];e.preventDefault();next.click();next.focus();});
