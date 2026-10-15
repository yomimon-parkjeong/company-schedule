/* Settlement is an isolated entry screen; no settlement data or calculations are loaded here. */
let workView='all',lastScheduleView='all',weeklyAnchor='',navigationShown=[],mainListView=false;
const workViewLabels={all:'전체일정',week:'주차 일정'};
function koreaToday(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
function sundayOf(day){const d=typeof day==='string'?date(day):day;return iso(shift(d,-d.getUTCDay()));}
function ensureWeeklyAnchor(){
 const first=new Date(Date.UTC(year,month,1)),last=new Date(Date.UTC(year,month+1,0));
 const gridStart=shift(first,-first.getUTCDay()),gridEnd=shift(last,6-last.getUTCDay());
 if(!weeklyAnchor||date(weeklyAnchor)<gridStart||date(weeklyAnchor)>gridEnd){
  const today=date(koreaToday()),selected=schedules.find(s=>s.id===selectedScheduleId),chosen=selected?date(selected.start):null;
  const candidate=chosen&&chosen>=first&&chosen<=last?chosen:today>=first&&today<=last?today:first;
  weeklyAnchor=sundayOf(candidate);
 }
 return {start:date(weeklyAnchor),end:shift(date(weeklyAnchor),6),gridStart};
}
function weekSuggestedDate(){const range=ensureWeeklyAnchor(),today=date(koreaToday());return today>=range.start&&today<=range.end?iso(today):iso(range.start);}
function moveCalendarWeek(direction){
 const range=ensureWeeklyAnchor(),next=shift(range.start,direction*7),end=shift(next,6);
 weeklyAnchor=iso(next);
 const first=new Date(Date.UTC(year,month,1)),last=new Date(Date.UTC(year,month+1,0));
 if(next>last||end<first){const middle=shift(next,3);year=middle.getUTCFullYear();month=middle.getUTCMonth();}
 render();
}
function applyWorkView(shown=navigationShown){
 navigationShown=shown;
 const settlement=workView==='settlement',weekly=workView==='week';
 $('scheduleWorkspace').hidden=settlement;$('settlementWorkspace').hidden=!settlement;$('scheduleSideContent').hidden=settlement;
 document.querySelector('.layout').classList.toggle('has-selection',!settlement&&$('selectedTab').getAttribute('aria-selected')==='true');
 for(const button of document.querySelectorAll('[data-work-view]')){
  const active=button.dataset.workView===workView;button.classList.toggle('active',active);
  if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
 if(settlement)return;
 $('schedulePageTitle').textContent=workViewLabels[workView];
 $('schedulePageSubtitle').textContent=weekly?'일요일부터 토요일까지 한 주의 일정과 담당자를 확인합니다.':'담당자별 공동구매 일정과 주차·월별 매출을 관리합니다.';
 $('weekFocusHeader').hidden=!weekly;document.querySelector('.view-switch').hidden=weekly;
 document.querySelector('.groupbuy-summary').hidden=weekly;$('statsNote').hidden=weekly;
 $('calendarView').classList.toggle('week-focus',weekly);
 $('prev').hidden=weekly;$('next').hidden=weekly;$('prev').setAttribute('aria-label','이전 달');$('next').setAttribute('aria-label','다음 달');
 let range=null;
 if(weekly){
  range=ensureWeeklyAnchor();const index=Math.round((range.start-range.gridStart)/dayMs/7)+1;
  const displayed=shown.filter(s=>date(s.start)<=range.end&&date(s.end)>=range.start);
  const openings=displayed.filter(s=>s.type==='공동구매'&&s.status!=='취소'&&date(s.start)>=range.start&&date(s.start)<=range.end);
  $('weekFocusTitle').textContent=(month+1)+'월 '+index+'주차';
  $('weekFocusRange').textContent=range.start.getUTCFullYear()+'.'+openingDate(iso(range.start))+' ~ '+(range.end.getUTCFullYear()!==range.start.getUTCFullYear()?range.end.getUTCFullYear()+'.':'')+openingDate(iso(range.end));
  $('weekFocusCount').textContent='표시 일정 '+displayed.length+'건 · 공동구매 '+openings.length+'건 오픈';
  $('result').textContent='선택 주 일정 '+displayed.length+'건 · 현재 검색·필터 결과';
  for(const owner of ownerOrder)$('count'+owner).textContent=schedules.filter(s=>s.owner===owner&&date(s.start)<=range.end&&date(s.end)>=range.start).length;
 }
 for(const week of document.querySelectorAll('#weeks .week'))week.hidden=weekly&&week.dataset.start!==iso(range.start);
 sizeCalendarHeaders();
}
function switchWorkView(view){
 if(view==='month')view='all';
 if(!['all','week','settlement'].includes(view))return;
 if(workView==='all'&&view!=='all')mainListView=!$('listView').hidden;
 if(view==='settlement'){
  if(workView!=='settlement'){lastScheduleView=workView;}
  workView=view;applyWorkView();return;
 }
 workView=view;lastScheduleView=view;
 if(view==='week')ensureWeeklyAnchor();
 setView(view==='all'?mainListView:false);
}
for(const button of document.querySelectorAll('[data-work-view]'))button.onclick=()=>switchWorkView(button.dataset.workView);
$('backToSchedule').onclick=()=>{switchWorkView(lastScheduleView);$('schedulePageTitle').focus();};
