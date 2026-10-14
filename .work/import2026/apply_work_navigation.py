from pathlib import Path
ROOT=Path(r'D:\타임블럭')
WORK=ROOT/'.work/work-navigation'

def apply_work_navigation(markup,data):
 def replace(old,new,count=1):
  nonlocal markup
  actual=markup.count(old)
  if actual!=count:raise ValueError('Navigation anchor mismatch: '+old[:100]+' count='+str(actual))
  markup=markup.replace(old,new,count)
 replace('<aside aria-label="일정 정보와 필터" class="schedule-sidebar">',
         '<aside aria-label="업무 관리와 일정 정보" class="schedule-sidebar">'+(WORK/'navigation.html').read_text(encoding='utf-8')+'<div id="scheduleSideContent">')
 replace('<p class="nav-title">업무 관리</p><div class="nav-item">▦ &nbsp; 전체 일정</div>','')
 replace('</div></aside>','</div></div></aside>')
 replace('<main>','<main><section id="scheduleWorkspace" aria-labelledby="schedulePageTitle">')
 replace('<h1>업무 스케줄</h1>','<h1 id="schedulePageTitle" tabindex="-1">업무 스케줄</h1>')
 replace('<p class="subtitle">담당자별 공동구매 일정과 주차·월별 매출을 관리합니다.</p>',
         '<p class="subtitle" id="schedulePageSubtitle">담당자별 공동구매 일정과 주차·월별 매출을 관리합니다.</p>')
 replace('</main></div>','</section>'+(WORK/'settlement.html').read_text(encoding='utf-8')+'</main></div>')
 week_header='''<section class="week-focus-head" id="weekFocusHeader" aria-label="선택 주" hidden><div><h2><span id="weekFocusTitle"></span> <small>일요일~토요일</small></h2><p id="weekFocusRange" class="week-focus-date"></p><p id="weekFocusCount" role="status"></p></div><div class="week-focus-controls"><button type="button" id="previousWeek">‹ 이전 주</button><button type="button" id="nextWeek">다음 주 ›</button></div></section>'''
 replace('<div class="calendar-meta">',week_header+'\n<div class="calendar-meta">')
 replace('</style>',(WORK/'navigation.css').read_text(encoding='utf-8')+'\n</style>')
 replace('restoreCalendarHistory();',(WORK/'navigation.js').read_text(encoding='utf-8')+"\n$('previousWeek').onclick=()=>moveCalendarWeek(-1);$('nextWeek').onclick=()=>moveCalendarWeek(1);\nrestoreCalendarHistory();")
 replace('function render(){\n','function render(){\n if(workView===\'week\')ensureWeeklyAnchor();\n')
 replace("week.dataset.lanes=String(lanes.length);","week.dataset.start=iso(ws);week.dataset.lanes=String(lanes.length);")
 replace("heading.append(node('span',String(dt.getUTCDate()),'day-number'));",
         "heading.append(node('span',workView==='week'?(dt.getUTCMonth()+1)+'/'+dt.getUTCDate():String(dt.getUTCDate()),'day-number'));")
 replace("eventColor=outsideOnly?", "eventColor=workView!=='week'&&outsideOnly?")
 replace("if(outsideOnly)e.classList.add('outside-event');","if(workView!=='week'&&outsideOnly)e.classList.add('outside-event');")
 replace("if(!$('listView').hidden)$('result').textContent='시작일 기준 '+listInfo.count+'건 · 공동구매 '+listInfo.total+'건';",
         "if(!$('listView').hidden)$('result').textContent='시작일 기준 '+listInfo.count+'건 · 공동구매 '+listInfo.total+'건';applyWorkView(shown);")
 replace("function changeMonth(n){","function changeMonth(n){if(workView==='week'){moveCalendarWeek(n);return;}")
 replace("month=Number(values.month)-1;render();","month=Number(values.month)-1;weeklyAnchor=sundayOf(koreaToday());render();")
 replace("year=y;month=m-1;render();","year=y;month=m-1;weeklyAnchor='';render();")
 replace("const d=iso(new Date(Date.UTC(year,month,12)));","const d=workView==='week'?weekSuggestedDate():iso(new Date(Date.UTC(year,month,12)));")
 replace("month=d.getUTCMonth();$('addDialog').close();render();","month=d.getUTCMonth();weeklyAnchor=sundayOf(f.start);$('addDialog').close();render();",count=2)
 replace("const cells=[...week.querySelectorAll('.day')];","if(week.hidden)continue;const cells=[...week.querySelectorAll('.day')];")
 replace("week.style.minHeight=Math.max(144,height+16+Number(week.dataset.lanes)*62)+'px';",
         "const focused=$('calendarView').classList.contains('week-focus');week.style.minHeight=Math.max(focused?270:144,height+16+Number(week.dataset.lanes)*(focused?72:62))+'px';")
 return markup,data
