let groupbuyWeekSelection=null;
function groupbuyWeekContext(){return year+'-'+String(month+1).padStart(2,'0');}
function groupbuyWeekItems(owner,index){
 const stats=getGroupbuyStats(schedules,year,month),week=stats.weeks[index];if(!week)return [];
 const start=iso(week.start),end=iso(week.end);
 return schedules.filter(s=>s.type==='공동구매'&&s.status!=='취소'&&s.start>=start&&s.start<=end&&(owner==='*'||s.owner===owner)).sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id);
}
function groupbuyCountButton(owner,index,count){
 const cell=node('td',undefined,count?'':'zero');if(!count){cell.textContent='0건';return cell;}
 const button=node('button',undefined,'groupbuy-count'),arrow=node('span','▸','groupbuy-count-arrow');button.type='button';button.dataset.groupbuyOwner=owner;button.dataset.groupbuyWeek=String(index);arrow.setAttribute('aria-hidden','true');button.append(arrow,node('span',count+'건'));
 button.setAttribute('aria-controls','groupbuyWeekDetail');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',(month+1)+'월 '+(index+1)+'주차 '+(owner==='*'?'전체 담당자':ownerNames[owner])+' 공동구매 '+count+'건 상세 보기');
 button.onclick=()=>{const current=groupbuyWeekSelection;groupbuyWeekSelection=current?.context===groupbuyWeekContext()&&current.owner===owner&&current.index===index?null:{context:groupbuyWeekContext(),owner,index};renderGroupbuyWeekDetail();refreshSelected();};
 cell.append(button);return cell;
}
function groupbuyDetailLine(s){
 const inferred=s.typeClassification?.rule==='nickname-name-product'?s.typeClassification:null;
 let influencer=(s.influencer||'').trim()||(inferred?inferred.nickname+'('+inferred.person+')':'');
 const fields=openingFields(s);if(!influencer)influencer=fields.nickname;
 if(!influencer)return s.title;
 const round=(s.title.match(/(\d+\s*차)/)||[])[1]||'';
 let product=fields.product;if(round&&!product.includes(round))product+=' '+round.replace(/\s/g,'');
 return '@'+influencer.replace(/^@+/,'')+' : '+product;
}
function renderGroupbuyWeekDetail(){
 const selection=groupbuyWeekSelection;
 if(selection&&selection.context!==groupbuyWeekContext())groupbuyWeekSelection=null;
 const state=groupbuyWeekSelection,items=state?groupbuyWeekItems(state.owner,state.index):[];
 $('groupbuyWeekDetail').hidden=!state||!items.length;
 for(const button of document.querySelectorAll('[data-groupbuy-owner]')){
  const active=!!state&&items.length>0&&button.dataset.groupbuyOwner===state.owner&&Number(button.dataset.groupbuyWeek)===state.index;
  button.setAttribute('aria-expanded',String(active));button.classList.toggle('is-active',active);button.querySelector('.groupbuy-count-arrow').textContent=active?'▾':'▸';
 }
 $('groupbuyWeekItems').replaceChildren();if(!state||!items.length){if(!items.length)groupbuyWeekSelection=null;return;}
 const week=getGroupbuyStats(schedules,year,month).weeks[state.index];
 $('groupbuyWeekTitle').textContent=(month+1)+'월 '+(state.index+1)+'주차 · '+(state.owner==='*'?'전체 담당자':ownerNames[state.owner])+' · 공동구매 '+items.length+'건';
 $('groupbuyWeekPeriod').textContent=openingDate(iso(week.start))+' ~ '+openingDate(iso(week.end))+' · 공구 시작일 기준 · 일정을 누르면 왼쪽에서 확인할 수 있습니다.';
 for(const s of items){
  const li=node('li'),button=node('button',undefined,'groupbuy-schedule-button'),accent=node('span',undefined,'groupbuy-detail-accent'),when=node('time',openingDate(s.start),'groupbuy-detail-date'),text=node('span',undefined,'groupbuy-detail-text');
  button.type='button';button.dataset.scheduleId=String(s.id);button.style.setProperty('--groupbuy-color',scheduleColor(s));when.dateTime=s.start;accent.setAttribute('aria-hidden','true');
  text.append(node('span',groupbuyDetailLine(s)),node('span',scheduleOwnerName(s)+' · '+s.start+' ~ '+s.end,'groupbuy-detail-owner'));
  button.append(accent,when,text);button.title=s.title;button.setAttribute('aria-label',openingDate(s.start)+' '+groupbuyDetailLine(s)+' - '+scheduleOwnerName(s));button.onclick=()=>openDetail(s);li.append(button);$('groupbuyWeekItems').append(li);
 }
}
function renderGroupbuyStats(){
 const stats=getGroupbuyStats(schedules,year,month);
 $('statsMonth').textContent=(month+1)+'월 공동구매';$('groupbuyTotal').textContent=stats.total;
 for(const owner of ownerOrder)$('groupbuy'+owner).textContent=stats.counts[owner]+'건';
 for(const owner of ['S','U'])$('ownerTotal'+owner).hidden=!stats.counts[owner];
 const header=node('tr');header.append(node('th','담당자'));
 const shortDate=d=>(d.getUTCMonth()+1)+'/'+String(d.getUTCDate()).padStart(2,'0');
 for(const week of stats.weeks){const cell=node('th',(week.index+1)+'주차');cell.scope='col';cell.append(node('span',shortDate(week.start)+'~'+String(week.end.getUTCDate()).padStart(2,'0'),'week-range'));header.append(cell);}
 $('weeklyHead').replaceChildren(header);$('weeklyBody').replaceChildren();
 for(const owner of ownerOrder.filter(o=>!['S','U'].includes(o)||stats.counts[o]>0)){
  const row=node('tr'),heading=node('th'),label=node('span',undefined,'owner-label'),dot=node('i',undefined,'dot');dot.style.background=colors[owner][0];label.append(dot,document.createTextNode(ownerNames[owner]));heading.scope='row';heading.append(label);row.append(heading);
  for(const week of stats.weeks)row.append(groupbuyCountButton(owner,week.index,week.counts[owner]));$('weeklyBody').append(row);
 }
 const totalRow=node('tr',undefined,'weekly-total'),label=node('th','합계');label.scope='row';totalRow.append(label);
 for(const week of stats.weeks)totalRow.append(groupbuyCountButton('*',week.index,week.total));$('weeklyBody').append(totalRow);
 renderGroupbuyWeekDetail();
}
$('closeGroupbuyWeek').onclick=()=>{
 const state=groupbuyWeekSelection;groupbuyWeekSelection=null;renderGroupbuyWeekDetail();
 if(state)document.querySelector('[data-groupbuy-owner="'+state.owner+'"][data-groupbuy-week="'+state.index+'"]')?.focus();
};
