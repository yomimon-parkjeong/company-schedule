from pathlib import Path
import re,json
ROOT=Path(r'D:\타임블럭')
WORK=ROOT/'.work/schedule-refinement'

def apply_schedule_refinements(markup,data):
 def replace(old,new,count=1):
  nonlocal markup
  if markup.count(old)!=count:raise ValueError('Refinement anchor mismatch: '+old[:100])
  markup=markup.replace(old,new,count)
 replace('<p>공구 시작일 기준 · 취소 제외 · 검색·필터와 관계없이 월 전체 입력값 합계</p>',
         '<p id="salesScopeDescription">선택 월에 진행한 공구 기준</p>')
 replace('<div class="export-actions"><button id="exportMonthly">',
         '<div class="sales-summary-controls"><label class="sales-scope-label">집계 기준<select id="salesScope" aria-label="매출 집계 기준"><option value="active">선택 월에 진행한 공구</option><option value="start">공구 시작일</option></select></label><div class="export-actions"><button id="exportMonthly">')
 replace('<button id="exportWeekly">주차별 엑셀</button></div></div><div class="sales-metrics">',
         '<button id="exportWeekly">주차별 엑셀</button></div></div></div><p id="salesScopeNote" class="sales-scope-note"></p><div class="sales-metrics">')
 replace('<caption class="sr-only">선택 월의 시작일 기준 주차별 주문·결제 매출</caption>',
         '<caption class="sr-only" id="salesWeeklyCaption">주차별 주문·결제 매출</caption>')
 first=markup.index('function currentSalesItems(')
 last=markup.index('function calendarTitle(',first)
 markup=markup[:first]+(WORK/'sales-scope.js').read_text(encoding='utf-8')+'\n'+markup[last:]
 old="s.type!=='공동구매'?'공동구매 매출 집계 대상이 아닙니다.':s.status==='취소'?'취소 일정은 매출 집계에서 제외됩니다.':salesComplete(s)?'입력 완료 · 공구 시작일 기준 집계':'편집에서 주문·결제 건수와 매출액을 입력하세요.'"
 replace(old,'selectedSalesSummary(s)')
 replace("const label=w.index+'주차 ('+w.start.slice(5)+' ~ '+w.end.slice(5)+')';",
         "const carried=w.items.filter(s=>s.start<currentMonthPeriod().first).length;const label=w.index+'주차 ('+w.start.slice(5)+' ~ '+w.end.slice(5)+(carried?' · 전월 시작 포함':'')+')';")
 replace('week=Math.floor((date(s.start)-gridStart)/dayMs/7)+1;',
         'week=Math.max(1,Math.floor((date(s.start)-gridStart)/dayMs/7)+1);')
 replace("' · 공구 시작일 기준 · 취소 제외 · 월 전체 (화면 필터와 무관)'",
         "' · '+salesScopeLabel()+' · 공구 전체 실적 · 취소 제외 · 화면 필터와 무관'")
 replace("const currentMonth=year+'-'+String(month+1).padStart(2,'0');$('monthJump').value=calendarMonths.includes(currentMonth)?currentMonth:'';",
         "const currentMonth=year+'-'+String(month+1).padStart(2,'0');$('monthJump').value=calendarMonths.includes(currentMonth)?currentMonth:'';rememberCalendarMonth();")
 bootstrap="const requestedMonth=new URLSearchParams(location.search).get('month');if(calendarMonths.includes(requestedMonth)){[year,month]=requestedMonth.split('-').map(Number);month--;}"
 replace(bootstrap,(WORK/'calendar-history.js').read_text(encoding='utf-8')+'\nrestoreCalendarHistory();')
 replace('현재 HTML 시안에서 추가·편집한 일정과 매출은 새로고침하면 초기화됩니다. 필요한 입력값은 엑셀로 내보내세요.',
         '마지막으로 본 월은 같은 PC·브라우저에서 기억합니다. 추가·편집한 일정과 매출은 새로고침하면 초기화됩니다. 필요한 입력값은 엑셀로 내보내세요.')
 css="""
.sales-summary-controls{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}.sales-scope-label{display:flex;flex-direction:column;gap:3px;font-size:11px;color:#526175}.sales-scope-label select{font-size:12px;padding:5px 8px;max-width:100%}.sales-scope-note{font-size:11px;color:#526175;margin:8px 0 0;line-height:1.6}.sales-carry-note{font-size:10px;font-weight:400;color:#526175;margin-top:2px}
@media(max-width:700px){.sales-summary-controls{width:100%;justify-content:space-between;align-items:center;gap:8px}.sales-summary-head{gap:8px}.sales-scope-label select{max-width:195px}}
"""
 replace('</style>',css+'\n</style>')
 for record in data:
  record['salesCount']=None
  record['salesAmount']=None
 match=re.search(r'let schedules=(\[.*?\]);',markup,re.S)
 if not match:raise ValueError('Schedule block missing')
 markup=markup[:match.start(1)]+json.dumps(data,ensure_ascii=False,indent=2)+markup[match.end(1):]
 return markup,data
