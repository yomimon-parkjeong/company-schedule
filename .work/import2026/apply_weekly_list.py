from pathlib import Path
import json,re

LIST_CSS=r'''
/* Start-date weekly opening list */
.list-wrap.weekly-list-view{background:transparent;border:0;overflow:visible}
.list-intro{display:flex;justify-content:space-between;align-items:center;gap:16px;background:#fff;border:1px solid #c7d1dd;border-radius:7px;padding:16px 20px;margin-bottom:14px}
.list-intro h2{font-size:18px;color:#1d2c43;margin:0 0 4px}.list-intro p{font-size:12px;color:#526175;margin:0}.list-count{white-space:nowrap;font-size:13px;color:#245fc5;font-weight:700}
.weekly-openings{display:flex;flex-direction:column;gap:18px}.opening-week{background:#fff;border:1px solid #bac7d8;border-radius:7px;overflow:hidden}
.opening-week-head{padding:16px 20px;border-bottom:1px solid #cbd5e1;background:#edf3fc;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.opening-week-head h2{font-size:16px;line-height:1.6;margin:0;color:#192e4b;font-weight:700}.opening-range{font-size:12px;white-space:nowrap;color:#47586f}
.opening-items{list-style:none;padding:0;margin:0}.opening-items li+li{border-top:1px solid #e1e7ef}
.opening-item{width:100%;border:0;border-radius:0;background:#fff;padding:16px 22px;text-align:left;display:flex;align-items:center;gap:14px;line-height:1.75;font-size:15px;color:#23324a}
.opening-item:hover{background:#f3f7fc}.opening-item:focus-visible{outline:3px solid #245fc5;outline-offset:-3px;background:#f3f7fc}
.opening-color{width:5px;height:32px;border-radius:3px;flex-shrink:0;background:var(--opening-color)}
.opening-date{font-weight:700;min-width:91px;font-variant-numeric:tabular-nums;white-space:nowrap;color:#243a59}
.opening-date.holiday{color:#b42332}.opening-line{min-width:0;overflow-wrap:anywhere}.opening-handle{font-weight:700;color:#152d4e}.opening-product{font-weight:600}.opening-owner{color:#40516b}
.other-list{margin-top:18px;background:#fff;border:1px solid #c7d1dd;border-radius:7px;overflow:hidden}.other-list summary{padding:14px 20px;cursor:pointer;font-weight:600;color:#40516b;font-size:13px}.other-list .opening-item{font-size:13px}.other-list summary:hover{background:#f3f7fc}
.weekly-table th:first-child{width:180px}.weekly-table .owner-label{white-space:normal;text-align:left}.legend{gap:12px}
@media(max-width:700px){.list-intro{padding:14px;align-items:flex-start}.list-intro h2{font-size:16px}.list-count{font-size:12px}.opening-week-head{padding:13px 14px;gap:5px}.opening-week-head h2{font-size:14px}.opening-item{padding:14px 12px;gap:9px;font-size:14px;align-items:flex-start}.opening-date{min-width:79px;font-size:13px}.opening-color{margin-top:4px;width:4px;height:25px}.opening-owner{display:inline}.weekly-table th:first-child{width:165px}}
'''

LIST_JS=r'''
function openingFields(s){
 const source=s.influencer||s.title;
 const cleaned=source.replace(/^(?:[＊*]?전달완료\s*|\[(?:전달완료|취소)\]\s*|\(취소\)\s*)+/,'').trim();
 let nickname=s.listNickname||(s.influencer||'').replace(/^@+/,'').split(/[（(]/)[0].trim();
 if(!nickname){const handle=cleaned.match(/@?([A-Za-z0-9_][A-Za-z0-9_.]*)(?=[\s(（/\-]|$)/);nickname=handle?handle[1]:(s.influencer||'').replace(/^@/,'').split(/[（(]/)[0].trim();}
 let product=s.listProduct||s.product?.trim()||'';
 if(!product){const known=s.title.match(/클레이\s*\+\s*무한워크북(?:보드)?|키즈점프프로|키즈점프로|키즈챔프프로|키즈챔프로|키즈주니어마이크|무한워크북보드|무선워크북보드|무한워크북|무선마이크|멀티보드|낱말카드|샤워타월|세타글단본|플레이5\s*max|플레이5\s*믹스|플레이5|플레이10중택|뉴원USB|클레이|플레이도\s*믹스|플레이돌\s*믹스|플레이도\s*max|플레이돌\s*max|플레이도5|플레이돌5|플레이도|플레이돌|와우펜|듀얼\s*USB|사파리펜|세라믹펜|플레이|USB/iu);product=known?known[0].replace(/듀얼\s*usb/iu,'듀얼USB'):'상품 확인 필요';}
 return {nickname:nickname.replace(/^@+/,''),product};
}
function openingDate(value){const d=date(value);return (d.getUTCMonth()+1)+'/'+String(d.getUTCDate()).padStart(2,'0')+'('+['일','월','화','수','목','금','토'][d.getUTCDay()]+')';}
function openingLine(s){const fields=openingFields(s);return '@'+(fields.nickname||'닉네임 확인 필요')+' : '+fields.product+' - '+ownerNames[s.owner];}
function getOpeningGroups(items,y,m){
 const first=new Date(Date.UTC(y,m,1)),last=new Date(Date.UTC(y,m+1,0)),gridStart=shift(first,-first.getUTCDay());
 const eligible=items.filter(s=>s.type==='공동구매'&&s.status!=='취소'&&date(s.start)>=first&&date(s.start)<=last).sort((a,b)=>a.start.localeCompare(b.start)||openingFields(a).nickname.localeCompare(openingFields(b).nickname,'en')||a.id-b.id);
 const groups=new Map();for(const s of eligible){const index=Math.floor((date(s.start)-gridStart)/dayMs/7);if(!groups.has(index))groups.set(index,{index,start:new Date(Math.max(first,shift(gridStart,index*7))),end:new Date(Math.min(last,shift(gridStart,index*7+6))),items:[]});groups.get(index).items.push(s);}
 return [...groups.values()];
}
function openingButton(s,full=false){
 const button=node('button',undefined,'opening-item');button.type='button';button.dataset.scheduleId=String(s.id);button.style.setProperty('--opening-color',scheduleColor(s));
 const accent=node('span',undefined,'opening-color');accent.setAttribute('aria-hidden','true');
 const d=node('time',openingDate(s.start),'opening-date'+(holidayNames(s.start).length?' holiday':''));d.dateTime=s.start;
 const line=node('span',undefined,'opening-line');
 if(full){line.textContent=s.title+' - '+ownerNames[s.owner];}else{const fields=openingFields(s);line.append(node('span','@'+(fields.nickname||'닉네임 확인 필요'),'opening-handle'),document.createTextNode(' : '),node('span',fields.product,'opening-product'),document.createTextNode(' - '),node('span',ownerNames[s.owner],'opening-owner'));}
 button.append(accent,d,line);button.title=s.title+' | '+s.start+' ~ '+s.end;button.setAttribute('aria-label',openingDate(s.start)+' '+(full?s.title+' - '+ownerNames[s.owner]:openingLine(s)));button.addEventListener('click',()=>openDetail(s));return button;
}
function renderOpeningList(shown){
 const first=new Date(Date.UTC(year,month,1)),last=new Date(Date.UTC(year,month+1,0));
 const monthItems=shown.filter(s=>date(s.start)>=first&&date(s.start)<=last),groups=getOpeningGroups(monthItems,year,month),total=groups.reduce((n,g)=>n+g.items.length,0);
 $('listTitle').textContent=(month+1)+'월 공동구매 오픈 일정';$('listCount').textContent=total+'건 표시';$('rows').replaceChildren();$('otherRows').replaceChildren();
 for(const group of groups){const section=node('section',undefined,'opening-week');section.dataset.week=String(group.index+1);const head=node('div',undefined,'opening-week-head');const h=node('h2',"'마케팅팀' "+(month+1)+'월 '+(group.index+1)+'주차 공동구매 - '+group.items.length+'건 오픈 예정');head.append(h,node('span',openingDate(iso(group.start))+' ~ '+openingDate(iso(group.end)),'opening-range'));const list=node('ul',undefined,'opening-items');for(const s of group.items){const li=node('li');li.append(openingButton(s));list.append(li);}section.append(head,list);$('rows').append(section);}
 if(!total)$('rows').append(node('p','선택한 조건에 해당하는 공동구매 오픈 일정이 없습니다.','empty'));
 const others=monthItems.filter(s=>s.type!=='공동구매'||s.status==='취소').sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id);
 $('otherSchedules').hidden=!others.length;$('otherSummary').textContent='그 외 일정 · 행사 / 발송 / 취소 '+others.length+'건';for(const s of others){const li=node('li');li.append(openingButton(s,true));$('otherRows').append(li);}
 return {total,count:monthItems.length};
}
'''

def apply_weekly_list(markup,data):
 confirmations=[
  ('2026-10-12','ebenbebe_','ebenbebe_','플레이돌'),
  ('2026-10-13','bunnygamza','bunnygamza','클레이'),
  ('2026-10-14','jihoomom0.0','jihoomom0.0','와우펜'),
  ('2026-10-15','daml.momm','dami.momm','듀얼USB'),
  ('2026-10-19','dundun.mom','dundun.mom','와우펜'),
  ('2026-10-22','crys___tal','crys.__tal','플레이돌'),
  ('2026-10-22','urlu_grow','uriu_grow','와우펜'),
  ('2026-10-23','hodomom.pick','hodomom.pick','멀티보드')]
 for start,source,nickname,product in confirmations:
  rows=[s for s in data if s['start']==start and source in s['title']]
  if len(rows)!=1:raise ValueError('확인된 일정 매칭 실패: '+nickname)
  rows[0].update(listNickname=nickname,listProduct=product,listVerifiedAt='2026-10-13')
 markup=markup.replace('김태수 차장','김태수 부장(레몬트리)').replace('손안나','손안나 알바')
 markup=re.sub(r'let schedules=\[.*?\n\];',lambda m:'let schedules='+json.dumps(data,ensure_ascii=False,indent=2).replace('<','\\u003c')+';',markup,count=1,flags=re.S)
 old='<div class="list-wrap" id="listView" hidden><table><thead><tr><th>일정 / 상품</th><th>담당자</th><th>업무</th><th>기간</th><th>상태</th></tr></thead><tbody id="rows"></tbody></table></div>'
 new='<div class="list-wrap weekly-list-view" id="listView" hidden><div class="list-intro"><div><h2 id="listTitle">공동구매 오픈 일정</h2><p>시작일 기준 · 주차는 일요일~토요일 · 취소 제외 · 현재 검색·필터 결과</p></div><span class="list-count" id="listCount" role="status"></span></div><div class="weekly-openings" id="rows"></div><details class="other-list" id="otherSchedules"><summary id="otherSummary">그 외 일정</summary><ul class="opening-items" id="otherRows"></ul></details></div>'
 if old not in markup:raise ValueError('기존 목록 마크업을 찾을 수 없음')
 markup=markup.replace(old,new,1)
 markup=markup.replace('</style>',LIST_CSS+'\n</style>',1)
 markup=markup.replace('function render(){',LIST_JS+'\nfunction render(){',1)
 old_rows=" for(const s of shown){const row=node('tr'),titleCell=node('td'),btn=node('button',s.title);btn.addEventListener('click',()=>openDetail(s));titleCell.append(btn);if(s.uncertain?.length)titleCell.append(node('span','확인 필요','review-badge'));titleCell.append(node('div',s.product,'subtitle'));row.append(titleCell,node('td',ownerNames[s.owner]),node('td',s.type),node('td',s.start+' ~ '+s.end),node('td',s.status));$('rows').append(row);}\n if(!shown.length){const row=node('tr'),cell=node('td','조건에 맞는 일정이 없습니다.','empty');cell.colSpan=5;row.append(cell);$('rows').append(row);}"
 if old_rows not in markup:raise ValueError('기존 목록 렌더러를 찾을 수 없음')
 markup=markup.replace(old_rows," const listInfo=renderOpeningList(shown);if(!$('listView').hidden)$('result').textContent='시작일 기준 '+listInfo.count+'건 · 공동구매 '+listInfo.total+'건';",1)
 markup=markup.replace("[s.title,s.product,s.partner].join(' ').toLowerCase().includes(query)","[s.title,s.product,s.partner,openingFields(s).nickname,openingFields(s).product,ownerNames[s.owner]].join(' ').toLowerCase().includes(query)")
 markup=markup.replace("function setView(list){$('calendarView').hidden=list;", "function setView(list){$('calendarView').hidden=list;")
 markup=markup.replace("$(id).setAttribute('aria-pressed',String(active));}}", "$(id).setAttribute('aria-pressed',String(active));}render();}",1)
 bootstrap="const requestedMonth=new URLSearchParams(location.search).get('month');if(sourceMonths.includes(requestedMonth)){[year,month]=requestedMonth.split('-').map(Number);month--;}\nrender();if(location.hash==='#list')setView(true);"
 tail="render();\n</script>"
 position=markup.rfind(tail)
 if position<0:raise ValueError('최초 렌더링 위치 없음')
 markup=markup[:position]+markup[position:].replace(tail,bootstrap+'\n</script>',1)
 return markup,data
