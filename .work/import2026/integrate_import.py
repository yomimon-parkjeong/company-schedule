from pathlib import Path
import json,re,shutil,datetime
root=Path(r'D:\타임블럭');work=root/'.work'/'import2026';html=root/'03_사내일정관리_시안.html'
raw=html.read_text(encoding='utf-8-sig')
# Always apply changes from a preserved source to make repeat integration safe.
base=work/'before-real-import.html'
if not base.exists():shutil.copy2(html,base)
markup=base.read_text(encoding='utf-8-sig')
items=[]
for name in ['jan-apr.json','may-aug.json','sep-jan.json']:items.extend(json.loads((work/name).read_text(encoding='utf-8-sig')))
owner_names={'A':'김태수 차장','B':'박정 주임','C':'손안나','S':'사이트 행사','U':'담당자 확인 필요'}
color_owner={'#3fa9f5':'A','#b980d0':'B','#ff9e18':'C','#00b392':'S'}
seen=set();data=[]
for row in items:
 key=(row['title'],row['start'],row['end'],row['color'])
 if key in seen:continue
 seen.add(key)
 row['owner']=color_owner.get(row['color'],'U')
 row['status']='취소' if row['status']=='취소' else '미표기'
 if row['owner']=='U' and not any('담당' in reason for reason in row['uncertain']):row['uncertain'].append('첨부 색상표에서 원래 담당자를 확인할 수 없음')
 row['imported']=True;row['partner']='';row['product']='';row['related']='첨부 월별 일정 화면'
 data.append(row)
data.sort(key=lambda s:(s['start'],s['end'],s['title']))
for i,row in enumerate(data,1):row['id']=i
serialized=json.dumps(data,ensure_ascii=False,indent=2)
(root/'09_이미지반영_일정데이터.json').write_text(serialized,encoding='utf-8')
assets=root/'자료'/'2026_원본';assets.mkdir(parents=True,exist_ok=True)
for i in range(1,14):
 key=f'2026-{i:02d}' if i<=12 else '2027-01';shutil.copy2(work/f'month-{i:02d}.png',assets/f'{key}.png')
shutil.copy2(work/'owner-colors.png',assets/'담당자_색상표.png')
# The HTML remains standalone for schedule data; source images are optional review assets.
markup=re.sub(r'let schedules=\[.*?\n\];',lambda m:'let schedules='+serialized.replace('<','\\u003c')+';',markup,count=1,flags=re.S)
markup=markup.replace('let year=2026,month=9;','let year=2026,month=0;')
markup=markup.replace("const colors={A:['#1859b8','#1859b8'],B:['#7343ad','#7343ad'],C:['#087364','#087364']};", """const colors={A:['#3fa9f5','#3fa9f5'],B:['#b980d0','#b980d0'],C:['#ff9e18','#ff9e18'],S:['#00b392','#00b392'],U:['#7ba0c4','#7ba0c4']};
const ownerNames={A:'김태수 차장',B:'박정 주임',C:'손안나',S:'사이트 행사',U:'담당자 확인 필요'};
const ownerOrder=['A','B','C','S','U'];
const ownerCaption=owner=>['A','B','C'].includes(owner)?ownerNames[owner]+'의 일정':ownerNames[owner];
const sourceMonths=Array.from({length:13},(_,i)=>i<12?'2026-'+String(i+1).padStart(2,'0'):'2027-01');
let reviewOnly=false;""")
markup=markup.replace('--a:#1859b8;--b:#7343ad;--c:#087364','--a:#3fa9f5;--b:#b980d0;--c:#ff9e18')
markup=markup.replace('검토용 시안 · 예시 데이터','전달 일정 반영 · 검토용')
markup=markup.replace('<p class="subtitle">행사 기간과 후속 업무를 한눈에 확인합니다.</p>','<p class="subtitle">2026년 1월~2027년 1월 전달 일정을 확인합니다.</p>')
markup=markup.replace('<button class="primary" id="add">+ 일정 등록</button>','<div class="page-actions"><button id="openSource">원본 비교</button><button class="primary" id="add">+ 일정 등록</button></div>')
for key in ['A','B','C']:
 markup=markup.replace('담당자 '+key+'<span class="owner-count"',owner_names[key]+'<span class="owner-count"')
 markup=markup.replace('담당자 '+key+'</span><strong id="groupbuy',owner_names[key]+'</span><strong id="groupbuy')
extras=''.join(f'<label class="check"><input class="owner-filter" type="checkbox" value="{key}" checked><span class="dot" style="background:{color}"></span>{owner_names[key]}<span class="owner-count" id="count{key}"></span></label>' for key,color in [('S','#00b392'),('U','#7ba0c4')])
markup=markup.replace('</div>\n<div class="filter-group"><div class="filter-heading">업무 유형</div>',extras+'</div>\n<div class="filter-group"><div class="filter-heading">업무 유형</div>',1)
markup=markup.replace('value="페이백" checked>페이백</label></div>','value="페이백" checked>페이백</label><label class="check"><input class="type-filter" type="checkbox" value="기타" checked>기타 / 연락</label></div>')
markup=markup.replace('담당자별 기본색을 제공합니다.<br>각 일정의 색상은 직접<br>변경할 수 있습니다.','전달하신 색상표를 기준으로<br>담당자와 사이트 행사를<br>구분합니다.')
extra_totals=''.join(f'<div id="ownerTotal{key}"><span class="owner-label"><i class="dot" style="background:{color}"></i>{owner_names[key]}</span><strong id="groupbuy{key}">0건</strong></div>' for key,color in [('S','#00b392'),('U','#7ba0c4')])
markup=markup.replace('<strong id="groupbuyC">0건</strong></div></div></div>','<strong id="groupbuyC">0건</strong></div>'+extra_totals+'</div></div>')
markup=markup.replace('공구 시작일 기준 · 취소 제외 · 검색·필터와 관계없이 월 전체 집계','공구 시작일 기준 · 취소 제외 · 검색·필터와 관계없이 월 전체 집계 · 담당 미확인 별도 표시')
markup=markup.replace('<button id="today">오늘</button>','<button id="today">오늘</button><select id="monthJump" aria-label="월 바로 선택"></select>')
markup=markup.replace('<option>취소</option></select><div class="view-switch">','<option>취소</option><option>미표기</option></select><div class="view-switch">',1)
markup=markup.replace('<div class="calendar-meta">','<div class="import-note"><span id="importSummary"></span><button id="reviewFilter" aria-pressed="false">확인 필요</button></div>\n<div class="calendar-meta">',1)
for key in ['A','B','C']:markup=markup.replace('>'+key+' 기본색</span>','>'+owner_names[key]+'</span>')
markup=markup.replace('등록한 일정과 변경한 색상은 새로고침하면 초기화됩니다.','전달 일정은 파일에 반영되어 있습니다. 화면에서 추가한 일정과 변경한 담당자·색상은 새로고침하면 초기화됩니다.')
options=''.join(f'<option value="{key}">{owner_names[key]}</option>' for key in ownerOrder if False) if False else ''.join(f'<option value="{key}">{label}</option>' for key,label in owner_names.items())
markup=markup.replace('<select name="owner"><option>A</option><option>B</option><option>C</option></select>','<select name="owner">'+options+'</select>')
markup=markup.replace('<option>페이백</option></select></label>','<option>페이백</option><option>기타</option></select></label>')
markup=markup.replace('<dl class="details" id="details"></dl>','<dl class="details" id="details"></dl><label class="detail-owner-label">담당자 / 구분<select id="detailOwner">'+options+'</select></label>')
markup=markup.replace('id="saveDetailColor">색상 저장','id="saveDetailColor">변경 저장')
source_dialog='''<dialog id="sourceDialog" class="source-dialog"><div class="dialog-head"><h2 id="sourceTitle">원본 일정 비교</h2><button id="closeSource" aria-label="원본 창 닫기">×</button></div><div class="source-scroll"><img id="sourceImage" alt="사용자가 전달한 월별 일정 원본"></div><div class="dialog-foot"><button id="closeSourceBottom">닫기</button></div></dialog>'''
markup=markup.replace('<script>\n\'use strict\';',source_dialog+'\n<script>\n\'use strict\';',1)
css='''
.page-actions{display:flex;gap:8px;flex-wrap:wrap}.month-control{flex-wrap:wrap}#monthJump{width:135px;font-size:12px}
.import-note{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 2px 10px;font-size:12px;color:#526175}.import-note button{font-size:11px;padding:3px 8px}.import-note button[aria-pressed=true]{background:#fff0d5;color:#804000;border-color:#d7a95b}
.review-badge{display:inline-block;padding:1px 5px;border:1px solid #d4b87d;background:#fff7e7;color:#805119;font-size:10px;border-radius:3px;margin-left:6px}.detail-owner-label{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12px;margin-top:19px;color:#526175}.detail-owner-label select{max-width:220px}
.weekly-table{min-width:650px}.weekly-table th:first-child{width:140px}.weekly-table .owner-label{white-space:nowrap}.legend{flex-wrap:wrap}.owner-totals strong{white-space:nowrap}.owner-label .dot{flex-shrink:0}.source-dialog{width:min(1500px,96vw)}.source-scroll{overflow:auto;max-height:78vh;padding:10px}.source-scroll img{display:block;width:100%;min-width:1000px;height:auto}.event.outside-event{border-color:color-mix(in srgb,var(--owner) 60%,#64748b)}
@media(max-width:700px){.import-note{align-items:flex-start}.page-actions{justify-content:flex-end}.legend{gap:10px}.page-head{gap:10px}.month{margin-right:3px}.weekly-table{min-width:620px}}
'''
markup=markup.replace('</style>',css+'\n</style>',1)
markup=markup.replace("function eventTitle(s){return s.title+(s.title.includes(s.type)?'':' · '+s.type)+' / '+s.status;}","function eventTitle(s){return s.imported?s.title:s.title+(s.title.includes(s.type)?'':' · '+s.type)+' / '+s.status;}")
markup=markup.replace(".textContent='담당자 '+owner+'의 일정'",".textContent=ownerCaption(owner)")
markup=markup.replace("['담당자','담당자 '+s.owner]","['담당자',ownerNames[s.owner]]")
markup=markup.replace("if(s.reason)items.push", "if(s.imported)items.push(['원본',s.sourceMonths.join(', ')+' 화면']);if(s.uncertain?.length)items.push(['확인사항',s.uncertain.join(' · ')]);$('detailOwner').value=s.owner;if(s.reason)items.push")
markup=markup.replace("const counts={A:0,B:0,C:0},weeks=", "const counts=Object.fromEntries(ownerOrder.map(o=>[o,0])),weeks=")
markup=markup.replace("counts:{A:0,B:0,C:0}","counts:Object.fromEntries(ownerOrder.map(o=>[o,0]))")
markup=markup.replace("for(const owner of ['A','B','C'])", "for(const owner of ownerOrder)")
markup=markup.replace(" const header=node('tr');", " for(const owner of ['S','U'])$('ownerTotal'+owner).hidden=!stats.counts[owner];\n const header=node('tr');",1)
markup=markup.replace("for(const owner of ownerOrder){const row=node('tr')", "for(const owner of ownerOrder.filter(o=>['A','B','C'].includes(o)||stats.counts[o]>0)){const row=node('tr')",1)
markup=markup.replace("document.createTextNode('담당자 '+owner)","document.createTextNode(ownerNames[owner])")
markup=markup.replace(" const all=schedules.filter(s=>date(s.start)<=last&&date(s.end)>=first);", " const weekCount=Math.ceil((first.getUTCDay()+last.getUTCDate())/7),gridEnd=shift(gridStart,weekCount*7-1);\n const all=schedules.filter(s=>date(s.start)<=last&&date(s.end)>=first),gridItems=schedules.filter(s=>date(s.start)<=gridEnd&&date(s.end)>=gridStart);")
markup=markup.replace(" const shown=all.filter(s=>", " const shown=gridItems.filter(s=>(!reviewOnly||s.uncertain?.length)&&")
markup=markup.replace("$('result').textContent='선택한 달의 '+all.length+'건 중 '+shown.length+'건 표시';", "$('result').textContent='월 일정 '+all.length+'건 · 달력 표시 '+shown.length+'건 (앞뒤 달 포함)';")
markup=markup.replace(" const weekCount=Math.ceil((first.getUTCDay()+last.getUTCDate())/7);\n for(let w=0;", " const currentMonth=year+'-'+String(month+1).padStart(2,'0');$('monthJump').value=sourceMonths.includes(currentMonth)?currentMonth:'';const reviewCount=gridItems.filter(s=>s.uncertain?.length).length;const importedCount=gridItems.filter(s=>s.imported).length;\n $('importSummary').textContent='전달 이미지 반영 '+importedCount+'건 · 앞뒤 달 일정 포함';$('reviewFilter').textContent='확인 필요 '+reviewCount+'건';$('reviewFilter').disabled=!reviewCount;$('reviewFilter').setAttribute('aria-pressed',String(reviewOnly));$('openSource').disabled=!sourceMonths.includes(currentMonth);\n for(let w=0;",1)
markup=markup.replace("const eventColor=scheduleColor(s);", "const outsideOnly=date(s.end)<first||date(s.start)>last;const sourceColor=scheduleColor(s),eventColor=outsideOnly?'#'+sourceColor.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*.4+255*.6).toString(16).padStart(2,'0')).join(''):sourceColor;if(outsideOnly)e.classList.add('outside-event');e.dataset.sourceColor=sourceColor;")
markup=markup.replace("node('span','담당자 '+s.owner+'의 일정','event-owner')","node('span',ownerCaption(s.owner),'event-owner')")
markup=markup.replace("e.title='담당자 '+s.owner+' | '","e.title=ownerNames[s.owner]+' | '")
markup=markup.replace("titleCell.append(btn,node('div',s.product,'subtitle'));", "titleCell.append(btn);if(s.uncertain?.length)titleCell.append(node('span','확인 필요','review-badge'));titleCell.append(node('div',s.product,'subtitle'));")
markup=markup.replace("node('td',s.owner)","node('td',ownerNames[s.owner])")
# The original title of an imported event stays verbatim; guessed type or status is not added to its bar.
markup=markup.replace("updateColorPreview('detail',$('detailColor').value,s.title,s.owner)","updateColorPreview('detail',$('detailColor').value,s.title,$('detailOwner').value)")
markup=markup.replace("s.color=$('detailColor').value;$('detailDialog').close();render();", "s.color=$('detailColor').value;s.owner=$('detailOwner').value;$('detailDialog').close();render();")
extra_js='''
$('monthJump').append(node('option','월 바로 선택'));$('monthJump').firstChild.value='';for(const value of sourceMonths){const option=node('option',value.slice(0,4)+'년 '+Number(value.slice(5))+'월');option.value=value;$('monthJump').append(option);}
$('monthJump').onchange=()=>{if(!$('monthJump').value)return;const [y,m]=$('monthJump').value.split('-').map(Number);year=y;month=m-1;reviewOnly=false;render();};
$('reviewFilter').onclick=()=>{reviewOnly=!reviewOnly;render();};
$('openSource').onclick=()=>{const value=year+'-'+String(month+1).padStart(2,'0');if(!sourceMonths.includes(value))return;$('sourceTitle').textContent=value+' 원본 일정';$('sourceImage').src='자료/2026_원본/'+value+'.png';$('sourceDialog').showModal();};
$('closeSource').onclick=$('closeSourceBottom').onclick=()=>$('sourceDialog').close();
$('detailOwner').onchange=()=>{const s=schedules.find(s=>s.id===selectedScheduleId);if(s)updateColorPreview('detail',$('detailColor').value,s.title,$('detailOwner').value);};
'''
markup=markup.replace('render();\n</script>',extra_js+'\nrender();\n</script>',1)
markup=markup.replace("$('reviewFilter').disabled=!reviewCount;", "$('reviewFilter').disabled=!reviewCount&&!reviewOnly;")
markup=markup.replace("$('detailColor').value=colors[s.owner][0];updateColorPreview('detail'", "$('detailColor').value=colors[$('detailOwner').value][0];updateColorPreview('detail'")
# Registration uses influencer and product fields to compose one final schedule title.
markup=markup.replace('placeholder="예: 거래처 D 공동구매"','placeholder="인플루언서 ex. 닉네임(이름)"')
markup=markup.replace('name="title" maxlength="80" required placeholder="인플루언서 ex. 닉네임(이름)"></label>', 'name="title" maxlength="80" required placeholder="인플루언서 ex. 닉네임(이름)" aria-describedby="titleGuide"><small class="field-hint" id="titleGuide">상품을 입력하면 닉네임(이름) - 상품 형식으로 등록됩니다.</small></label>')
markup=markup.replace('name="product" maxlength="60" placeholder="상품명"','name="product" maxlength="60" placeholder="예: 멀티보드"')
markup=markup.replace('<div class="color-preview full" id="addColorPreview"><span class="color-preview-title">','<div class="color-preview full" id="addColorPreview" aria-live="polite"><span class="generated-title-label">등록될 일정명</span><span class="color-preview-title">')
markup=markup.replace("function updateAddPreview(){const form=$('addForm');updateColorPreview('add',$('addColor').value,form.elements.title.value.trim()||'새 일정',form.elements.owner.value);}", "function composeScheduleTitle(influencer,product){return [influencer.trim(),product.trim()].filter(Boolean).join(' - ');}\nfunction updateAddPreview(){const form=$('addForm');const title=composeScheduleTitle(form.elements.title.value,form.elements.product.value);updateColorPreview('add',$('addColor').value,title||'닉네임(이름) - 상품',form.elements.owner.value);}")
markup=markup.replace("return s.imported?s.title:","return s.imported||s.autoComposed?s.title:")
markup=markup.replace("schedules.push({...f,title:f.title.trim(),id:","schedules.push({...f,influencer:f.title.trim(),product:f.product.trim(),title:composeScheduleTitle(f.title,f.product),autoComposed:true,id:")
markup=markup.replace("$('addForm').elements.title.addEventListener('input',updateAddPreview);", "$('addForm').elements.title.addEventListener('input',updateAddPreview);\n$('addForm').elements.product.addEventListener('input',updateAddPreview);")
markup=markup.replace('</style>', '.field-hint{font-size:11px;line-height:1.6;color:#526175;font-weight:400}.generated-title-label{font-size:10px;line-height:14px;opacity:.85}.color-preview.full{min-height:72px}\n</style>',1)
from apply_weekly_list import apply_weekly_list
markup,data=apply_weekly_list(markup,data)
from apply_schedule_sales import apply_schedule_sales
markup,data=apply_schedule_sales(markup,data)
from apply_server_cleanup import apply_server_cleanup
markup,data=apply_server_cleanup(markup,data)
from apply_sales_number_format import apply_sales_number_format
markup,data=apply_sales_number_format(markup,data)
from apply_schedule_refinements import apply_schedule_refinements
markup,data=apply_schedule_refinements(markup,data)
from apply_catalog_management import apply_catalog_management
markup,data=apply_catalog_management(markup,data)
from apply_work_navigation import apply_work_navigation
markup,data=apply_work_navigation(markup,data)
from apply_weekly_report import apply_weekly_report
markup,data=apply_weekly_report(markup,data)
from apply_sku_sales import apply_sku_sales
markup,data=apply_sku_sales(markup,data)
from apply_product_names import apply_product_names
markup,data=apply_product_names(markup,data)
from apply_schedule_notes import apply_schedule_notes
markup,data=apply_schedule_notes(markup,data)
from apply_settlement_calculator import apply_settlement_calculator
markup,data=apply_settlement_calculator(markup,data)
from apply_owner_labels import apply_owner_labels
markup,data=apply_owner_labels(markup,data)
from apply_schedule_csv import apply_schedule_csv
markup,data=apply_schedule_csv(markup,data)
(root/'09_이미지반영_일정데이터.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
from apply_csv_calendar import apply_csv_calendar
markup,data=apply_csv_calendar(markup,data)
from apply_popup_feedback import apply_popup_feedback
markup,data=apply_popup_feedback(markup,data)
html.write_text(markup,encoding='utf-8')
report={'records':len(data),'byStartMonth':{},'owners':{},'reviewRecords':sum(bool(s['uncertain']) for s in data)}
for s in data:
 report['byStartMonth'][s['start'][:7]]=report['byStartMonth'].get(s['start'][:7],0)+1
 report['owners'][s['owner']]=report['owners'].get(s['owner'],0)+1
(work/'integration-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))


