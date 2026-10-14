/* Remember the last calendar month; schedule/sales edits remain session-only. */
const monthHistoryKey='company-schedule.last-month.v1';
const salesScopeHistoryKey='company-schedule.sales-scope.v1';
let lastRememberedMonth=null;
function validViewMonth(value){return typeof value==='string'&&/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(value);}
function seoulMonthKey(now=new Date()){
 const values=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
 return values.year+'-'+values.month;
}
function readMonthHistory(){try{const value=localStorage.getItem(monthHistoryKey);return validViewMonth(value)?value:null;}catch{return null;}}
function initialCalendarMonth(search,saved,now=new Date()){
 const requested=new URLSearchParams(search).get('month');
 return validViewMonth(requested)?requested:validViewMonth(saved)?saved:seoulMonthKey(now);
}
function restoreCalendarHistory(){
 const value=initialCalendarMonth(location.search,readMonthHistory());const [y,m]=value.split('-').map(Number);year=y;month=m-1;
 try{const scope=localStorage.getItem(salesScopeHistoryKey);if(['active','start'].includes(scope))$('salesScope').value=scope;}catch{}
}
function rememberCalendarMonth(){
 const value=year+'-'+String(month+1).padStart(2,'0');if(!validViewMonth(value)||value===lastRememberedMonth)return;lastRememberedMonth=value;
 try{localStorage.setItem(monthHistoryKey,value);}catch{}
 try{const url=new URL(location.href);if(url.searchParams.get('month')!==value){url.searchParams.set('month',value);history.replaceState(history.state,'',url.href);}}catch{}
}
function rememberSalesScope(){try{localStorage.setItem(salesScopeHistoryKey,salesScope());}catch{}}
$('salesScope').addEventListener('change',()=>{rememberSalesScope();render();});
