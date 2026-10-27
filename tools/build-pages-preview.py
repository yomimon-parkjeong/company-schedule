from pathlib import Path
import re,json,hashlib
from html.parser import HTMLParser

class DialogPlacementCheck(HTMLParser):
 void={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
 def __init__(self):
  super().__init__()
  self.stack=[]
  self.sales_dialogs=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if attrs.get('id')=='salesRecordDialog':self.sales_dialogs.append(list(self.stack))
  if tag not in self.void:self.stack.append((tag,attrs))
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:
    del self.stack[i:]
    break

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'developer-empty/public/index.php'
raw=source.read_bytes()
text=raw.decode('utf-8-sig')
match=re.match(r'\A<\?php\b.*?\?>\s*',text,re.S)
if not match:raise SystemExit('Expected PHP header at start.')
page=text[match.end():].replace('\r\n','\n')
start=page.index('let schedules=')+len('let schedules=')
records,_=json.JSONDecoder().raw_decode(page[start:])
if records!=[]:raise SystemExit('Pages preview must contain zero initial schedules.')
placement=DialogPlacementCheck()
placement.feed(page)
if len(placement.sales_dialogs)!=1 or placement.sales_dialogs[0][-1][0]!='body':
 raise SystemExit('Sales records dialog must be a direct child of body, outside hidden workspaces.')
for forbidden in ['09_이미지반영_일정데이터.json','32_CSV반영_일정데이터.json','2026_원본/','<'+ '?php']:
 if forbidden in page:raise SystemExit('Unexpected runtime reference: '+forbidden)
out=ROOT/'docs'
out.mkdir(exist_ok=True)
(out/'index.html').write_bytes(page.encode('utf-8'))
(out/'.nojekyll').write_bytes(b'')
print(json.dumps({'preview':'docs/index.html','initialRecords':0,'deployedFiles':['index.html','.nojekyll'],'phpSourceSha256':hashlib.sha256(raw).hexdigest(),'htmlSha256':hashlib.sha256(page.encode('utf-8')).hexdigest(),'privateDataCopied':False},ensure_ascii=False))
