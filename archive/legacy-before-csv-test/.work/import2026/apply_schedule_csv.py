from pathlib import Path
from apply_groupbuy_classification import classification_script
ROOT=Path(r'D:\타임블럭')
WORK=ROOT/'.work/schedule-csv'

def apply_schedule_csv(markup,data):
 old='<button id="manageCatalog" type="button">담당자 · 업무유형 관리</button>'
 if markup.count(old)!=1:raise ValueError('CSV management button anchor mismatch')
 button='<button id="openScheduleCsv" type="button"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M6 3h8l5 5v13H5V3h1Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 3v6h5M8 14h8M8 17h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span>일정 원본 CSV</span></button>'
 markup=markup.replace(old,'<div class="schedule-header-actions">'+old+button+'</div>',1)
 if markup.count('</style>')!=1 or markup.count('<script>')!=1:raise ValueError('CSV script or style anchor mismatch')
 markup=markup.replace('</style>',(WORK/'style.css').read_text(encoding='utf-8')+'\n</style>',1)
 markup=markup.replace('<script>',(WORK/'panel.html').read_text(encoding='utf-8')+'\n<script>',1)
 anchor='const settlementWorkbookTemplate=' if 'const settlementWorkbookTemplate=' in markup else 'restoreCalendarHistory();\nrender();'
 if markup.count(anchor)!=1:raise ValueError('CSV initialization anchor mismatch')
 markup=markup.replace(anchor,classification_script()+'\n'+(WORK/'calendar-import.js').read_text(encoding='utf-8')+'\n'+(WORK/'csv.js').read_text(encoding='utf-8')+'\n'+anchor,1)
 return markup,data
