import json,re,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(r'D:\타임블럭')
WORK=ROOT/'.work/schedule-sales'
def workbook_template():
 with zipfile.ZipFile(WORK/'export-template.xlsx') as z:
  parts={n:z.read(n).decode('utf-8') for n in z.namelist()}
 sheets=[]
 for i in range(2):
  xml=parts[f'xl/worksheets/sheet{i+1}.xml']
  match=re.search(r'<x:sheetData>(.*?)</x:sheetData>',xml)
  top=''.join(re.findall(r'<x:row\b[^>]*>.*?</x:row>',match.group(1))[:5])
  top=re.sub(r'(<x:c r="A1"[^>]*>).*?(</x:c>)',r'\1<x:v>__REPORT_TITLE__</x:v>\2',top)
  top=re.sub(r'(<x:c r="A2"[^>]*>).*?(</x:c>)',r'\1<x:v>__REPORT_SCOPE__</x:v>\2',top)
  root=ET.fromstring(xml);ns={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
  styles={c.attrib['r']:c.attrib.get('s','0') for c in root.findall('.//x:c',ns)}
  sheets.append({'prefix':xml[:match.start()],'suffix':xml[match.end():],'top':top,'bodyStyle':styles['C6' if i else 'A6'],'numberStyle':styles['G6' if i else 'C6'],'dateStyle':styles['A6'] if i else '0'})
 return {'parts':parts,'sheets':sheets}
def apply_schedule_sales(markup,data):
 read=lambda name:(WORK/name).read_text(encoding='utf-8')
 markup=markup.replace('</style>',read('sales.css')+'\n</style>',1)
 markup=markup.replace('<aside aria-label="일정 필터">','<aside aria-label="일정 정보와 필터" class="schedule-sidebar">'+read('panel.html'),1)
 markup=markup.replace('</aside>','</div></aside>',1)
 markup=markup.replace('<div class="toolbar">',read('summary.html')+'\n<div class="toolbar">',1)
 old='<select id="status" aria-label="상태 필터"><option value="">모든 상태</option><option>예정</option><option>진행</option><option>완료</option><option>취소</option><option>미표기</option></select>'
 markup=markup.replace(old,'<select id="status" hidden aria-hidden="true" tabindex="-1"><option value=""></option></select><select id="salesFilter" aria-label="매출 입력 필터"><option value="">전체 매출</option><option value="complete">매출 입력 완료</option><option value="missing">매출 미입력 / 일부 입력</option></select>',1)
 markup=markup.replace('<h2>일정 상세</h2>','<h2>일정 편집</h2>',1)
 markup=markup.replace('<dl class="details" id="details"></dl>','<dl class="details" id="details" hidden></dl>'+read('edit-fields.html'),1)
 markup=markup.replace('<label class="full">상태<select name="status"><option>예정</option><option>진행</option><option>완료</option><option>취소</option></select></label>',read('add-fields.html')+'<label class="full cancel-field"><input type="checkbox" name="cancelled">취소 일정</label>',1)
 markup=markup.replace('<footer>일정을 클릭하면 상세 내용을 확인할 수 있습니다. 전달 일정은 파일에 반영되어 있습니다. 화면에서 추가한 일정과 변경한 담당자·색상은 새로고침하면 초기화됩니다.</footer>','<footer>일정을 클릭하면 왼쪽에서 상세 내용과 매출을 확인하고 편집할 수 있습니다. 현재 HTML 시안에서 추가·편집한 일정과 매출은 새로고침하면 초기화됩니다. 필요한 입력값은 엑셀로 내보내세요.</footer>',1)
 markup=re.sub(r'^function openDetail\(s\)\{[^\n]*\}\n','',markup,count=1,flags=re.M)
 template=json.dumps(workbook_template(),ensure_ascii=False).replace('</','<\\/')
 markup=markup.replace('function render(){','const salesWorkbookTemplate='+template+';\n'+read('sales.js')+'\nfunction render(){',1)
 markup=markup.replace("&&owners.includes(s.owner)&&types.includes(s.type)","&&salesMatches(s)&&owners.includes(s.owner)&&types.includes(s.type)",1)
 markup=markup.replace("node('span',eventTitle(s),'event-title')","node('span',calendarTitle(s),'event-title')",1)
 markup=markup.replace("Math.max(138,80+lanes.length*50)","Math.max(144,84+lanes.length*62)",1)
 markup=markup.replace("const listInfo=renderOpeningList(shown);","const listInfo=renderOpeningList(shown);renderSales();",1)
 markup=markup.replace('const requestedMonth=',read('bindings.js')+'\nconst requestedMonth=',1)
 markup=markup.replace("updateColorPreview('detail',$('detailColor').value,s.title,$('detailOwner').value)","updateColorPreview('detail',$('detailColor').value,composeScheduleTitle($('editTitle').value,$('editProduct').value),$('detailOwner').value)")
 markup=markup.replace("render();if(location.hash==='#list')setView(true);","render();if(location.hash==='#list')setView(true);\nconst requestedSchedule=Number(new URLSearchParams(location.search).get('schedule'));const previewSchedule=schedules.find(s=>s.id===requestedSchedule);if(previewSchedule)openDetail(previewSchedule);",1)

 for s in data:
  s.setdefault('salesCount',None);s.setdefault('salesAmount',None)
 match=re.search(r'let schedules=(\[.*?\]);',markup,re.S)
 if not match:raise RuntimeError('Missing schedule block')
 markup=markup[:match.start(1)]+json.dumps(data,ensure_ascii=False,indent=2)+markup[match.end(1):]
 return markup,data
