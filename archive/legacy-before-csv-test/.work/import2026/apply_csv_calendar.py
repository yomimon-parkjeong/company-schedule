from pathlib import Path
import csv,json,re,datetime
from apply_groupbuy_classification import classify_calendar_type,apply_groupbuy_weekly
ROOT=Path(r'D:\타임블럭')
SOURCE='자료/CSV_원본/calendar_import_2023-02-01_2027-01-31.csv'

def normalize(raw,identifier):
 v=lambda key:raw.get(key,'').strip()
 assert v('sourceId') and v('title')
 for key in ['start','end']:assert datetime.date.fromisoformat(v(key)).isoformat()==v(key)
 assert v('end')>=v('start')
 assert v('owner') in ['','A','B','C','S','U']
 assert v('type') in ['','공동구매','행사','발송','페이백','기타','미분류']
 assert not v('color') or re.fullmatch(r'#[0-9a-fA-F]{6}',v('color'))
 assert v('status') in ['','취소','예정','진행','완료','미표기']
 assert v('allDay') in ['','true','false']
 classification=classify_calendar_type(raw)
 return dict(id=identifier,sourceId=v('sourceId'),title=v('title'),originalTitle=raw['title'],start=v('start'),end=v('end'),owner=v('owner') or 'U',category=v('category'),type=classification['type'],color=v('color') or '#94A3B8',colorUnresolved=not bool(v('color')),influencer=v('influencer'),product=v('product'),specialNotes=v('specialNotes'),status=v('status') or '미표기',startTime=v('startTime'),endTime=v('endTime'),timezone=v('timezone'),allDay=v('allDay')=='true' if v('allDay') else not bool(v('startTime') or v('endTime')),partner='',related='TimeBlocks 원본 CSV',imported=True,uncertain=[],salesCount=None,salesAmount=None,sourceFile=Path(SOURCE).name,sourceCsv=raw,typeClassification=classification)

def replace(markup,old,new):
 if old not in markup:raise ValueError('CSV calendar anchor missing: '+old[:100])
 return markup.replace(old,new)

def apply_csv_calendar(markup,image_data,write_outputs=True):
 with (ROOT/SOURCE).open(encoding='utf-8-sig',newline='') as f:
  rows=list(csv.DictReader(f))
 assert len({s['sourceId'] for s in rows})==len(rows)
 mapping_path=ROOT/'.work/schedule-csv/source-id-map.json'
 mapping=json.loads(mapping_path.read_text(encoding='utf-8')) if mapping_path.exists() else {}
 next_id=max([1000000]+list(mapping.values()))+1
 for row in rows:
  if row['sourceId'] not in mapping:mapping[row['sourceId']]=next_id;next_id+=1
 assert len(set(mapping.values()))==len(mapping)
 data=[normalize(row,mapping[row['sourceId']]) for row in rows]
 data.sort(key=lambda s:(s['start'],s['end'],s['sourceId']))
 if write_outputs:
  mapping_path.write_text(json.dumps(mapping,ensure_ascii=False,indent=2),encoding='utf-8')
  (ROOT/'32_CSV반영_일정데이터.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
 serialized=json.dumps(data,ensure_ascii=False,indent=2).replace('<',r'\u003c')
 markup,n=re.subn(r'let schedules=\[.*?\n\];',lambda m:'let schedules='+serialized+';',markup,count=1,flags=re.S)
 assert n==1
 markup=replace(markup,"const calendarMonths=Array.from({length:60},(_,i)=>(2026+Math.floor(i/12))","const calendarMonths=Array.from({length:96},(_,i)=>(2023+Math.floor(i/12))")
 markup=replace(markup,"const workTypeOrder=['공동구매','행사','발송','페이백','기타'];","const workTypeOrder=['공동구매','행사','발송','페이백','기타','미분류'];")
 markup=replace(markup,"'기타':'기타 / 연락'};","'기타':'기타 / 연락','미분류':'미분류'};")
 # Upgrade previously saved catalogs without losing staff, custom labels, or work types.
 anchor=" const validate=(rows,kind,required)=>{"
 markup=replace(markup,anchor," if(!settings.types.some(row=>row.id==='미분류'))settings.types.push({id:'미분류',name:'미분류'});\n"+anchor)
 markup=replace(markup,"validate(settings.types,'업무유형',['공동구매','행사','발송','페이백','기타'])","validate(settings.types,'업무유형',['공동구매','행사','발송','페이백','기타','미분류'])")
 # Event-level category captions, never person-by-color inference.
 markup=markup.replace('ownerNames[s.owner]','scheduleOwnerName(s)').replace('ownerCaption(s.owner)','scheduleOwnerCaption(s)')
 helper="""function scheduleOwnerName(s){return s.owner==='U'&&s.category?s.category+' · 담당자 미지정':ownerNames[s.owner]||'담당자 미지정';}
function scheduleOwnerCaption(s){return s.owner==='U'?scheduleOwnerName(s):ownerCaption(s.owner);}
"""
 markup=replace(markup,'function scheduleColor(s){',helper+'function scheduleColor(s){')
 markup=replace(markup,"$('selectedOwnerDot').style.background=colors[s.owner][0]","$('selectedOwnerDot').style.background=scheduleColor(s)")
 markup=replace(markup,"if(s.partner)pairs.push(['거래처',s.partner]);","if(s.category)pairs.push(['카테고리',s.category]);if(!s.allDay&&(s.startTime||s.endTime))pairs.push(['시간',[s.startTime,s.endTime].filter(Boolean).join(' ~ ')+(s.timezone?' ('+s.timezone+')':'')]);if(s.colorUnresolved)pairs.push(['원본 색상','색상 코드 '+(s.sourceCsv?.sourceColorCode||'미확인')+' · 미확정']);if(s.partner)pairs.push(['거래처',s.partner]);")
 markup=markup.replace('담당자 확인 필요','담당자 미지정')
 # Current source replaces image transcription; comparison data remains in its own JSON.
 return apply_groupbuy_weekly(markup,data)
