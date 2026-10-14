from pathlib import Path
import json,re
ROOT=Path(r'D:\타임블럭')
WORK=ROOT/'.work/settlement-calculator'
def apply_settlement_calculator(markup,data):
 old=re.search(r'<section id="settlementWorkspace".*?</section>',markup,re.S)
 if not old:raise ValueError('Settlement workspace not found')
 markup=markup[:old.start()]+(WORK/'panel.html').read_text(encoding='utf-8')+markup[old.end():]
 if markup.count('</style>')!=1:raise ValueError('Settlement CSS anchor mismatch')
 markup=markup.replace('</style>',(WORK/'settlement.css').read_text(encoding='utf-8')+'\n'+(WORK/'schedule-link.css').read_text(encoding='utf-8')+'\n</style>',1)
 template=json.loads((WORK/'template.json').read_text(encoding='utf-8'))
 # Serialize the immutable template once; it contains no imported customer data.
 code='const settlementWorkbookTemplate='+json.dumps(template,ensure_ascii=False).replace('</','<\\/')+';\n'+(WORK/'settlement.js').read_text(encoding='utf-8')
 initialization='\nsettlementRender();\n\n'
 if code.count(initialization)!=1:raise ValueError('Settlement link initialization anchor mismatch')
 code=code.replace(initialization,'\n'+(WORK/'schedule-link.js').read_text(encoding='utf-8')+'\nsettlementRender();\n\n',1)
 anchor='restoreCalendarHistory();\nrender();'
 if markup.count(anchor)!=1:raise ValueError('Settlement initialization anchor mismatch')
 markup=markup.replace(anchor,code+'\n'+anchor,1)
 # Keep calendar sales labels and spreadsheet headers consistent with the user's sales-count standard.
 for old,new in [('주문·결제 건수','판매건수'),('주문결제 건수','판매건수'),('주문·결제','판매'),('주문결제','판매')]:markup=markup.replace(old,new)
 return markup,data
