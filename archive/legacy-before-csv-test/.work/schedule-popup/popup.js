/* Schedule popup feedback */
let scheduleToastTimer=null;
function closeScheduleToast(){clearTimeout(scheduleToastTimer);$('scheduleToast').hidden=true;}
function armScheduleToast(){clearTimeout(scheduleToastTimer);scheduleToastTimer=setTimeout(closeScheduleToast,6500);}
function showScheduleToast(heading,message){
 $('scheduleToastTitle').textContent=heading;$('scheduleToastMessage').textContent=message;$('scheduleToast').hidden=false;
 $('scheduleToastAnnouncer').textContent='';queueMicrotask(()=>{$('scheduleToastAnnouncer').textContent=message;});armScheduleToast();
}
function pulseScheduleSelection(id){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(const item of document.querySelectorAll('[data-schedule-id]')){
  if(item.dataset.scheduleId!==String(id)||!item.getClientRects().length||typeof item.animate!=='function')continue;
  item.animate([{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(.985)',filter:'brightness(1.13)'},{transform:'scale(1)',filter:'brightness(1)'}],{duration:220,easing:'ease-out'});
 }
}
function installSchedulePopupFeedback(){
 const submit=$('addForm').onsubmit;
 $('addForm').onsubmit=function(event){
  const previous=new Set(schedules.map(s=>s.id));submit.call(this,event);
  const added=schedules.find(s=>!previous.has(s.id));if(!added||$('addDialog').open)return;
  pulseScheduleSelection(added.id);
  showScheduleToast('일정 등록 완료',added.title+' 일정이 등록 완료되었습니다.');
 };
 $('dismissScheduleToast').onclick=closeScheduleToast;
 $('scheduleToast').addEventListener('mouseenter',()=>clearTimeout(scheduleToastTimer));
 $('scheduleToast').addEventListener('mouseleave',armScheduleToast);
 $('scheduleToast').addEventListener('focusin',()=>clearTimeout(scheduleToastTimer));
 $('scheduleToast').addEventListener('focusout',armScheduleToast);
 $('detailDialog').addEventListener('close',()=>queueMicrotask(()=>{
  const target=[...document.querySelectorAll('[data-schedule-id]')].find(el=>el.dataset.scheduleId===String(selectedScheduleId)&&el.getClientRects().length);
  if(target)target.focus({preventScroll:true});
 }));
}
installSchedulePopupFeedback();
