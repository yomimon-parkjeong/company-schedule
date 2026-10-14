/* The weekly schedule summary retains the user-approved start-date format. */
function buildWeeklyReport(items,label){
 const eligible=items.filter(s=>s.type==='공동구매'&&s.status!=='취소').slice().sort((a,b)=>a.start.localeCompare(b.start)||openingFields(a).nickname.localeCompare(openingFields(b).nickname,'en')||a.id-b.id);
 const lines=eligible.map(s=>openingDate(s.start)+' '+openingLine(s).replace(/\s+/g,' ').trim());
 return [label,'공동구매 '+eligible.length+'건 오픈',...(lines.length?['',...lines]:[])].join('\n');
}
function updateWeeklyReport(openings,label){
 const text=buildWeeklyReport(openings,label);if($('weeklyReportText').value!==text)$('weeklyReportText').value=text;
}
