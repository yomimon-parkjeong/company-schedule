from pathlib import Path
ROOT=Path(r'D:\타임블럭')
WORK=ROOT/'.work/weekly-report'

def apply_weekly_report(markup,data):
 def replace(old,new,count=1):
  nonlocal markup
  actual=markup.count(old)
  if actual!=count:raise ValueError('Weekly report anchor mismatch: '+old[:100]+' count='+str(actual))
  markup=markup.replace(old,new,count)
 replace('</section>\n<div class="calendar-meta">','</section>\n'+(WORK/'report.html').read_text(encoding='utf-8')+'\n<div class="calendar-meta">')
 replace("$('weekFocusHeader').hidden=!weekly;document.querySelector('.view-switch').hidden=weekly;",
         "$('weekFocusHeader').hidden=!weekly;$('weeklyReportPanel').hidden=!weekly;document.querySelector('.view-switch').hidden=weekly;")
 replace("$('weekFocusCount').textContent='표시 일정 '+displayed.length+'건 · 공동구매 '+openings.length+'건 오픈';",
         "$('weekFocusCount').textContent='표시 일정 '+displayed.length+'건 · 공동구매 '+openings.length+'건 오픈';updateWeeklyReport(openings,$('weekFocusTitle').textContent);")
 replace('</style>',(WORK/'report.css').read_text(encoding='utf-8')+'\n</style>')
 replace('restoreCalendarHistory();',(WORK/'report.js').read_text(encoding='utf-8')+'\nrestoreCalendarHistory();')
 return markup,data
