from pathlib import Path
ROOT=Path(r'D:\타임블럭')
WORK=ROOT/'.work/sku-sales'

def apply_sku_sales(markup,data):
 def replace(old,new,count=1):
  nonlocal markup
  actual=markup.count(old)
  if actual!=count:raise ValueError('SKU sales anchor mismatch: '+old[:100]+' count='+str(actual))
  markup=markup.replace(old,new,count)
 replace('<th>공구</th>','<th scope="col">공구 일정</th>')
 replace('<details id="salesBreakdown">',(WORK/'sku.html').read_text(encoding='utf-8')+'\n<details id="salesBreakdown">')
 replace('</style>',(WORK/'sku.css').read_text(encoding='utf-8')+'\n</style>')
 start=markup.index(" $('salesWeeklyBody').replaceChildren();",markup.index('function renderSales(){'))
 end=markup.index(" document.querySelectorAll('.opening-sales,.opening-week-sales')",start)
 markup=markup[:start]+" renderSkuSales(items,first);\n"+markup[end:]
 replace("document.querySelectorAll('.event,.opening-item')","document.querySelectorAll('.event,.opening-item,.sku-schedule-button')")
 replace('restoreCalendarHistory();',(WORK/'sku.js').read_text(encoding='utf-8')+'\nrestoreCalendarHistory();')
 return markup,data
