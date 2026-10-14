from pathlib import Path
import re
ROOT=Path(r'D:\타임블럭')
WORK=ROOT/'.work/catalog-management'

def apply_catalog_management(markup,data):
 def replace(old,new,count=1):
  nonlocal markup
  if markup.count(old)!=count:raise ValueError('Catalog anchor mismatch: '+old[:100]+' count='+str(markup.count(old)))
  markup=markup.replace(old,new,count)
 for title,kind,button in [('담당자','ownerFilters','manageOwners'),('업무 유형','typeFilters','manageTypes')]:
  pattern=r'<div class="filter-group"><div class="filter-heading">'+title+r'</div>(.*?)</div>'
  replacement='<div class="filter-group"><div class="catalog-heading"><div class="filter-heading">'+title+'</div><button id="'+button+'" type="button">편집</button></div><div id="'+kind+'">\\1</div></div>'
  markup,n=re.subn(pattern,replacement,markup,count=1,flags=re.S)
  if n!=1:raise ValueError('Filter group missing '+title)
 replace('<p class="subtitle">담당자별 공동구매 일정과 주차·월별 매출을 관리합니다.</p></div></div>',
         '<p class="subtitle">담당자별 공동구매 일정과 주차·월별 매출을 관리합니다.</p></div><button id="manageCatalog" type="button">담당자 · 업무유형 관리</button></div>')
 # Retain the existing live sales metrics inside the collapsible body.
 start=markup.index('<section class="sales-summary"')
 end=markup.index('</section>',start)+len('</section>')
 section=markup[start:end]
 section,n=re.subn(r'<h2 id="salesMonthTitle">.*?</h2>','',section,count=1,flags=re.S)
 if n!=1:raise ValueError('Sales heading missing')
 content=section[section.index('>')+1:-len('</section>')]
 folded='<section class="sales-summary sales-collapsed" id="monthSalesSummary" aria-label="월별 주차별 매출 집계"><div class="sales-fold-head"><div><h2 id="salesMonthTitle">월 매출 종합</h2><p id="salesCollapsedSummary"></p></div><button id="toggleSalesSummary" type="button" aria-expanded="false" aria-controls="salesSummaryBody"><span id="salesToggleText">매출 펼치기</span><span id="salesToggleArrow" aria-hidden="true">▾</span></button></div><div id="salesSummaryBody" hidden>'+content+'</div></section>'
 markup=markup[:start]+folded+markup[end:]
 replace('</style>',(WORK/'manager.css').read_text(encoding='utf-8')+'\n</style>')
 replace('<script>',(WORK/'manager.html').read_text(encoding='utf-8')+'\n<script>')
 replace("const ownerCaption=owner=>['A','B','C'].includes(owner)?ownerNames[owner]+'의 일정':ownerNames[owner];",
         "const ownerCaption=owner=>!['S','U'].includes(owner)?ownerNames[owner]+'의 일정':ownerNames[owner];")
 replace("ownerOrder.filter(o=>['A','B','C'].includes(o)||stats.counts[o]>0)",
         "ownerOrder.filter(o=>!['S','U'].includes(o)||stats.counts[o]>0)")
 replace("['유형',s.type]","['유형',workTypeLabel(s.type)]")
 replace("s.type==='공동구매'?'@'+(f.nickname||'닉네임 확인 필요'):s.type",
         "s.type==='공동구매'?'@'+(f.nickname||'닉네임 확인 필요'):workTypeLabel(s.type)")
 replace('[s.title,s.product,s.partner,openingFields(s).nickname,openingFields(s).product,ownerNames[s.owner]]',
         '[s.title,s.product,s.partner,openingFields(s).nickname,openingFields(s).product,ownerNames[s.owner],workTypeLabel(s.type)]')
 replace("const sales=readSalesInputs($('editSalesCount').value,$('editSalesAmount').value);",
         "if(!ownerOrder.includes($('detailOwner').value)||!workTypeOrder.includes($('editType').value))throw new Error('담당자와 업무유형을 확인해주세요.');const sales=readSalesInputs($('editSalesCount').value,$('editSalesAmount').value);")
 replace('const sales=readSalesInputs(f.salesCount,f.salesAmount);',
         "if(!ownerOrder.includes(f.owner)||!workTypeOrder.includes(f.type))throw new Error('담당자와 업무유형을 확인해주세요.');const sales=readSalesInputs(f.salesCount,f.salesAmount);")
 # Update the compact summary even while the sales panel is hidden.
 replace('function renderSales(){\n const items=', 'function renderSales(){\n updateSalesCollapsedSummary();\n const items=')
 replace('restoreCalendarHistory();',(WORK/'manager.js').read_text(encoding='utf-8')+'\nrestoreCalendarHistory();')
 replace('마지막으로 본 월은 같은 PC·브라우저에서 기억합니다.',
         '마지막으로 본 월과 담당자·업무유형 설정은 같은 PC·브라우저에서 기억합니다.')
 return markup,data
