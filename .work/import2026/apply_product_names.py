from pathlib import Path
import json,re,difflib,copy
ROOT=Path(r'D:\타임블럭')
WORK=ROOT/'.work'/'product-names'

def apply_product_names(markup,data):
 catalog=json.loads((ROOT/'23_제품명_기준_검토.json').read_text(encoding='utf-8-sig'))
 inventory=json.loads((WORK/'inventory.json').read_text(encoding='utf-8-sig'))
 baseline={row['id']:row for group in inventory for row in group['rows']}
 canonical=set(catalog['canonical'])
 preserved={rid for group in catalog['preserved'] for rid in group['ids']}
 aliases={row['from']:row for row in catalog['aliases'] if 'ids' not in row}
 direct={rid:row for row in catalog['aliases'] if 'ids' in row for rid in row['ids']}
 audit=[]
 if len(data)!=len(baseline):raise ValueError('Product review record count changed')
 for row in data:
  old=baseline.get(row['id'])
  if old is None or row['title']!=old['title'] or row['start']!=old['start']:raise ValueError('Product review record identity changed')
  before=copy.deepcopy(row)
  source=old['product']
  if row['id'] in preserved:
   audit.append({'id':row['id'],'month':row['start'][:7],'before':source,'after':source,'decision':'keep','basis':'사용자가 기존 이름 유지로 지정'})
   continue
  rule=direct.get(row['id']) or aliases.get(source)
  target=rule['to'] if rule else source if source in canonical else None
  basis=rule['basis'] if rule else '기준 제품명과 일치'
  if target is None:
   if re.search(r'키즈(?:점프|점|챔프|챔)\s*프로',row['title']):
    target='키즈탭프로';basis='원문에서 띄어 쓴 키즈·프로 제품명 확인'
   elif '그리고지우고' in row['title']:
    target='그리고지우고북';basis='원문의 그리고지우고 제품 어근과 기준명 일치'
  if target is None:
   continue
  if target not in canonical:raise ValueError('Unknown canonical product')
  title=row['title']
  if row['id'] in direct:
   pattern=r'플레이(?:5|도|돌)\s*믹스' if direct[row['id']].get('mode')=='mix' else r'플레이\s*10\s*중\s*택|플레이(?=[\s(（\-]|$)'
   title,n=re.subn(pattern,target,title,count=1)
   if n!=1:raise ValueError('Directly confirmed product anchor not found')
  else:
   for title_rule in catalog['titleRules']:
    title=re.sub(title_rule['pattern'],title_rule['to'],title,flags=re.I)
  changed=source!=target or title!=row['title']
  if title!=row['title']:
   row.setdefault('originalTitle',row['title'])
   row['title']=title
  row['product']=target
  row['listProduct']=target
  row['productNameReview']={'source':source,'canonical':target,'basis':basis,'reviewedAt':catalog['reviewedAt']}
  if changed:
   normalize=lambda value:re.sub(r'\s+','',value).lower().replace('max','맥스')
   score=round(difflib.SequenceMatcher(None,normalize(source),normalize(target)).ratio(),3)
   audit.append({'id':row['id'],'month':row['start'][:7],'before':source,'after':target,'decision':'correct','basis':basis,'textSimilarity':score,'titleBefore':before['title'],'titleAfter':row['title'],'originalProductField':before.get('product'),'originalListProductField':before.get('listProduct')})
  else:
   audit.append({'id':row['id'],'month':row['start'][:7],'before':source,'after':target,'decision':'standard','basis':basis})
 serialized=json.dumps(data,ensure_ascii=False,indent=2).replace('<','\\u003c')
 markup,count=re.subn(r'let schedules=\[.*?\n\];',lambda m:'let schedules='+serialized+';',markup,count=1,flags=re.S)
 if count!=1:raise ValueError('Schedule serialization anchor missing')
 # Existing legacy names stay available; the approved catalog matches before shorter prefixes.
 anchor="if(!product){const known=s.title.match(/"
 if markup.count(anchor)!=1:raise ValueError('Product extraction anchor missing')
 pattern=r'플레이돌\s*맥스|그리고지우고북|키즈탭프로|세탁볼|'
 markup=markup.replace(anchor,anchor+pattern,1)
 # Native product suggestions avoid introducing a separate settings screen or rejecting legacy names.
 a='<input type="text" name="product" maxlength="60" placeholder="예: 멀티보드">'
 b='<input id="editProduct" type="text" maxlength="120">'
 if markup.count(a)!=1 or markup.count(b)!=1:raise ValueError('Product input anchor missing')
 markup=markup.replace(a,a[:-1]+' list="scheduleProductNames">',1)
 markup=markup.replace(b,b[:-1]+' list="scheduleProductNames">',1)
 options=''.join('<option value="'+name+'"></option>' for name in catalog['canonical'])
 markup=markup.replace('</body>','<datalist id="scheduleProductNames">'+options+'</datalist>\n</body>',1)
 corrected=[row for row in audit if row['decision']=='correct']
 report={'reviewedAt':catalog['reviewedAt'],'records':len(data),'standardizedRecords':sum('productNameReview' in row for row in data),'correctedRecords':len(corrected),'displayNameChanged':sum(row['before']!=row['after'] for row in corrected),'titleChanged':sum(row['titleBefore']!=row['titleAfter'] for row in corrected),'preservedRecords':len(preserved),'byMonth':{},'byChange':{},'audit':audit}
 for row in corrected:
  report['byMonth'][row['month']]=report['byMonth'].get(row['month'],0)+1
  key=row['before']+' → '+row['after'];report['byChange'][key]=report['byChange'].get(key,0)+1
 (ROOT/'23_제품명_변경이력.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({key:value for key,value in report.items() if key!='audit'},ensure_ascii=False))
 return markup,data
