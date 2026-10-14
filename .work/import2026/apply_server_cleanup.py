import json,re
from pathlib import Path
ROOT=Path(r'D:\타임블럭')
def apply_server_cleanup(markup,data):
 def replace(old,new,count=1):
  nonlocal markup
  if markup.count(old)!=count:
   raise ValueError('Cleanup anchor mismatch: '+old[:120])
  markup=markup.replace(old,new,count)
 def remove_line(pattern):
  nonlocal markup
  markup,n=re.subn(pattern,'',markup,flags=re.M)
  if n!=1:raise ValueError('Cleanup line mismatch: '+pattern)
 replace('<span class="badge">전달 일정 반영 · 검토용</span>','<span class="badge">마케팅팀</span>')
 replace('<p class="subtitle">2026년 1월~2027년 1월 전달 일정을 확인합니다.</p>','<p class="subtitle">담당자별 공동구매 일정과 주차·월별 매출을 관리합니다.</p>')
 replace('<div class="page-actions"><button id="openSource">원본 비교</button><button class="primary" id="add">+ 일정 등록</button></div>','')
 replace('<div class="import-note"><span id="importSummary"></span><button id="reviewFilter" aria-pressed="false">확인 필요</button></div>','')
 replace('<span class="holiday-key"><i class="dot" aria-hidden="true"></i>대한민국 공휴일 · 대체공휴일</span><span id="holidayCoverage" role="status"></span>',
  '<span class="holiday-key" title="2025~2030년 공휴일 반영. 2028~2030년은 현행 규정 기준이며 선거일은 예정으로 표시합니다."><i class="dot" aria-hidden="true"></i>대한민국 공휴일 · 대체공휴일</span><button class="primary" id="add">+ 일정 등록</button>')
 markup,n=re.subn(r'<dialog id="sourceDialog".*?</dialog>\n','',markup,flags=re.S)
 if n!=1:raise ValueError('Source dialog mismatch')
 replace('<div class="selected-source"><strong>원본 일정명</strong><span id="selectedSource"></span></div>','')
 replace('<p id="selectedReview" class="selected-review" hidden></p>','')
 replace("$('selectedSource').textContent=s.originalTitle||s.title;",'')
 remove_line(r"^.*\$\('selectedReview'\).*?\n")
 replace('전달 이미지의 원본 일정명은 보존됩니다. 변경은 현재 화면에 반영되며 엑셀로 내보낼 수 있습니다.',
         '변경은 현재 화면에 반영되며 엑셀로 내보낼 수 있습니다.')
 replace('전달하신 색상표를 기준으로<br>담당자와 사이트 행사를<br>구분합니다.','색상과 담당자 표시로 공동구매 일정과 사이트 행사를 구분합니다.')
 # Source review metadata remains attached to records and spreadsheet exports; the operating screen has no review flow.
 replace("const sourceMonths=Array.from({length:13},(_,i)=>i<12?'2026-'+String(i+1).padStart(2,'0'):'2027-01');",
         "const calendarMonths=Array.from({length:60},(_,i)=>(2026+Math.floor(i/12))+'-'+String(i%12+1).padStart(2,'0'));")
 replace('let reviewOnly=false;\n','')
 replace('(!reviewOnly||s.uncertain?.length)&&','')
 remove_line(r'^ const holidayYearKnown=.*?\n')
 remove_line(r"^.*\$\('holidayCoverage'\)\.textContent=.*?\n")
 remove_line(r"^.*\$\('holidayCoverage'\)\.classList.*?\n")
 remove_line(r"^.*\$\('importSummary'\)\.textContent=.*?\n")
 replace("const currentMonth=year+'-'+String(month+1).padStart(2,'0');$('monthJump').value=sourceMonths.includes(currentMonth)?currentMonth:'';const reviewCount=gridItems.filter(s=>s.uncertain?.length).length;const importedCount=gridItems.filter(s=>s.imported).length;",
         "const currentMonth=year+'-'+String(month+1).padStart(2,'0');$('monthJump').value=calendarMonths.includes(currentMonth)?currentMonth:'';")
 replace('for(const value of sourceMonths)','for(const value of calendarMonths)')
 replace('month=m-1;reviewOnly=false;render();','month=m-1;render();')
 remove_line(r"^.*\$\('reviewFilter'\)\.onclick=.*?\n")
 remove_line(r"^.*\$\('openSource'\)\.onclick=.*?\n")
 remove_line(r"^.*\$\('closeSource'\)\.onclick=.*?\n")
 replace('if(sourceMonths.includes(requestedMonth))','if(calendarMonths.includes(requestedMonth))')
 replace('// 대한민국 공휴일: 2026-10-12 확인. 출처와 추가 지정 사항은 08_공휴일_반영기준.md 참조.\n// 음력·대체·선거·임시 공휴일은 공식 발표 날짜를 등록하며 임의로 추정하지 않는다.',
         '// 대한민국 공휴일 2025~2030: 2026-10-13 확인. 08_공휴일_반영기준.md 참조.\n// 음력 날짜는 한국천문연구원 자료, 대체공휴일은 현행 규정 기준. 미래 선거일은 예정 표기.')
 future=json.loads((ROOT/'.work/holiday2030/holidays-2028-2030.json').read_text(encoding='utf-8'))
 match=re.search(r'const holidaysByYear=(.*?);\nconst holidayByDate=',markup,re.S)
 if not match:raise ValueError('Holiday map mismatch')
 additions=',\n'+',\n'.join(' '+y+':'+json.dumps(items,ensure_ascii=False,separators=(',',':')) for y,items in future.items())
 old=match.group(1)
 replace('const holidaysByYear='+old+';\nconst holidayByDate=',
         'const holidaysByYear='+old.rstrip()[:-1].rstrip()+additions+'\n};\nconst holidayByDate=')
 # Keep long holiday names clear of event bars as the calendar width changes.
 replace("week.style.minHeight=Math.max(144,84+lanes.length*62)+'px';week.append(days,events);$('weeks').append(week);",
         "week.dataset.lanes=String(lanes.length);week.style.minHeight=Math.max(144,84+lanes.length*62)+'px';week.append(days,events);$('weeks').append(week);")
 replace("const listInfo=renderOpeningList(shown);renderSales();",
         "sizeCalendarHeaders();const listInfo=renderOpeningList(shown);renderSales();")
 sizing_js='''function sizeCalendarHeaders(){
 if($('calendarView').hidden)return;
 for(const week of document.querySelectorAll('#weeks .week')){
  const cells=[...week.querySelectorAll('.day')];
  const height=Math.ceil(Math.max(68,...cells.map(cell=>cell.querySelector('.day-header').offsetHeight+parseFloat(getComputedStyle(cell).paddingTop)+12)));
  week.style.paddingTop=height+'px';
  week.style.minHeight=Math.max(144,height+16+Number(week.dataset.lanes)*62)+'px';
 }
}
const calendarResize=new ResizeObserver(sizeCalendarHeaders);calendarResize.observe(document.querySelector('.calendar'));
'''
 replace('function render(){',sizing_js+'function render(){')
 # Remove unused image-comparison and import-banner styles.
 markup=re.sub(r'^\.import-note\{.*?\n','',markup,flags=re.M)
 markup=re.sub(r'^\.source-dialog\{.*?\n','',markup,flags=re.M)
 markup=markup.replace('.import-note{align-items:flex-start}','')
 markup=markup.replace('.calendar-meta .coverage-warning{color:#9a4d00;font-weight:600}','')
 markup=markup.replace('</style>','.calendar-meta{min-height:40px;margin-bottom:10px}.calendar-meta #add{font-size:13px;padding:9px 14px;white-space:nowrap}\n</style>',1)
 for id_ in ['openSource','sourceDialog','sourceImage','sourceTitle','closeSource','closeSourceBottom','reviewFilter','importSummary','holidayCoverage','selectedSource','selectedReview']:
  if re.search(r'id="'+id_+r'"|\$\([\'"]'+id_+r'[\'"]\)',markup):
   raise ValueError('Removed control still referenced: '+id_)
 return markup,data
