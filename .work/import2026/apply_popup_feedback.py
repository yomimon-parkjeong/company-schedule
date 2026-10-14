from pathlib import Path
ROOT=Path(r'D:\타임블럭')

def apply_popup_feedback(markup,data):
 if '/* Schedule popup feedback */' in markup:return markup,data
 work=ROOT/'.work/schedule-popup'
 def replace(old,new):
  nonlocal markup
  if old not in markup:raise ValueError('Popup feedback anchor missing: '+old[:110])
  markup=markup.replace(old,new,1)
 replace('</style>',(work/'popup.css').read_text(encoding='utf-8')+'\n</style>')
 replace('<dialog id="detailDialog"><div class="dialog-head"><h2>일정 편집</h2>','<dialog id="detailDialog" aria-labelledby="scheduleEditHeading" aria-describedby="popupEditorHint"><div class="dialog-head"><div class="popup-editor-heading"><h2 id="scheduleEditHeading">일정 상세 · 편집</h2><p class="popup-editor-hint" id="popupEditorHint">내용을 바로 수정한 뒤 아래의 변경 저장을 눌러주세요.</p></div>')
 replace('<dialog id="addDialog">','<dialog id="addDialog" aria-labelledby="scheduleAddHeading">')
 replace('<h2>일정 등록</h2>','<h2 id="scheduleAddHeading">일정 등록</h2>')
 replace('<script>',(work/'popup.html').read_text(encoding='utf-8')+'\n<script>')
 replace("function openDetail(s){selectedScheduleId=s.id;refreshSelected();activateSide('selected');}","function openDetail(s){selectedScheduleId=s.id;refreshSelected();activateSide('filter');pulseScheduleSelection(s.id);openEdit();}")
 replace("$('detailDialog').showModal();}","if(!$('detailDialog').open)$('detailDialog').showModal();$('detailDialog').querySelector('.dialog-body').scrollTop=0;$('editTitle').focus({preventScroll:true});}")
 replace("$('detailDialog').close();render();activateSide('selected');}catch(err)","$('detailDialog').close();render();activateSide('filter');pulseScheduleSelection(s.id);showScheduleToast('일정 수정 완료',s.title+' 일정이 수정 완료되었습니다.');}catch(err)")
 replace('일정을 클릭하면 왼쪽에서 상세 내용과 매출을 확인하고 편집할 수 있습니다.','일정을 클릭하면 팝업에서 상세 내용과 매출을 확인하고 바로 편집할 수 있습니다.')
 replace('일정을 누르면 왼쪽에서 확인할 수 있습니다.','일정을 누르면 팝업에서 확인하고 편집할 수 있습니다.')
 replace('restoreCalendarHistory();\nrender();',(work/'popup.js').read_text(encoding='utf-8')+'\nrestoreCalendarHistory();\nrender();')
 return markup,data
