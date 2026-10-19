from pathlib import Path
import re,json,hashlib
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
for forbidden in ['09_이미지반영_일정데이터.json','32_CSV반영_일정데이터.json','2026_원본/','<'+ '?php']:
 if forbidden in page:raise SystemExit('Unexpected runtime reference: '+forbidden)
out=ROOT/'docs'
out.mkdir(exist_ok=True)
(out/'index.html').write_bytes(page.encode('utf-8'))
(out/'.nojekyll').write_bytes(b'')
print(json.dumps({'preview':'docs/index.html','initialRecords':0,'deployedFiles':['index.html','.nojekyll'],'phpSourceSha256':hashlib.sha256(raw).hexdigest(),'htmlSha256':hashlib.sha256(page.encode('utf-8')).hexdigest(),'privateDataCopied':False},ensure_ascii=False))
