from pathlib import Path
import json,re
ROOT=Path(r'D:\타임블럭')
WORK=ROOT/'.work/groupbuy-review'
RULES=json.loads((WORK/'classification-rules.json').read_text(encoding='utf-8'))

def classify_calendar_type(raw):
 title=raw.get('title','').strip();explicit=raw.get('type','').strip();category=raw.get('category','').strip()
 def result(kind,rule,**parsed):return dict(type=kind,rule=rule,version=RULES['version'],**parsed)
 if '페이백' in title:return result('페이백','payback-keyword')
 if explicit and explicit!='미분류':return result(explicit,'explicit-type')
 if re.search(RULES['nonSalesCategory'],category,re.I):return result('미분류','other-category')
 match=re.search(RULES['identity'],title,re.I)
 if not match or not re.search(r'[_a-z]',match[1],re.I) or match[2].strip() in RULES['rejectedNames']:return result('미분류','unresolved')
 if re.search(RULES['nonSalesTitle'],title,re.I) and not re.search(r'공구|공동구매',title):return result('미분류','other-work')
 tail=match[3];product_match=re.search(RULES['products'],tail,re.I)
 if not product_match:return result('미분류','unresolved-product')
 round_match=re.search(r'(\d+\s*차)',tail)
 return result('공동구매','nickname-name-product',nickname=match[1].lstrip('@'),person=match[2].strip(),product=raw.get('product','').strip() or product_match[0],round=re.sub(r'\s','',round_match[1]) if round_match else '')

def classification_script():
 return 'const calendarClassificationRules='+json.dumps(RULES,ensure_ascii=False,separators=(',',':'))+';\n'+(WORK/'classify.js').read_text(encoding='utf-8')

def apply_groupbuy_weekly(markup,data):
 # A count stays compact; its corresponding campaigns open below the table.
 start=markup.index('function renderGroupbuyStats(){')
 end=markup.index('\nfunction openingFields(s){',start)
 markup=markup[:start]+(WORK/'weekly-details.js').read_text(encoding='utf-8')+'\n'+markup[end:]
 panel='<div class="weekly-panel"><div class="stats-heading"><h2>주차별 담당자 공구 건수</h2><span>일요일~토요일</span></div><div class="weekly-scroll"><table class="weekly-table"><caption class="sr-only">선택한 달의 시작일 기준 담당자별 공동구매 건수</caption><thead id="weeklyHead"></thead><tbody id="weeklyBody"></tbody></table></div></div>'
 if markup.count(panel)!=1:raise ValueError('Weekly disclosure anchor mismatch')
 disclosure='<details id="weeklyGroupbuyPanel" class="weekly-panel groupbuy-disclosure"><summary id="weeklyGroupbuyToggle" class="groupbuy-disclosure-toggle" aria-controls="weeklyGroupbuyContent" aria-expanded="false"><span class="groupbuy-disclosure-title"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>주차별 담당자 공구 건수</span><span class="groupbuy-disclosure-status"><span class="groupbuy-when-closed">접힘 · 펼치기</span><span class="groupbuy-when-open">펼침 · 접기</span></span></summary><div id="weeklyGroupbuyContent" class="groupbuy-disclosure-content"><p class="groupbuy-table-period">일요일~토요일 · 공구 시작일 기준</p><div class="weekly-scroll"><table class="weekly-table"><caption class="sr-only">선택한 달의 시작일 기준 담당자별 공동구매 건수</caption><thead id="weeklyHead"></thead><tbody id="weeklyBody"></tbody></table></div>'+(WORK/'weekly-details.html').read_text(encoding='utf-8')+'</div></details>'
 markup=markup.replace(panel,disclosure,1)
 markup=markup.replace('</style>',(WORK/'weekly-details.css').read_text(encoding='utf-8')+'\n</style>',1)
 # Use a parsed product for an inferred historical record without rewriting its source field.
 markup=markup.replace("let product=s.listProduct||s.product?.trim()||'';","let product=s.listProduct||s.product?.trim()||s.typeClassification?.product||'';",1)
 markup=markup.replace("document.querySelectorAll('.event,.opening-item,.sku-schedule-button')","document.querySelectorAll('.event,.opening-item,.sku-schedule-button,.groupbuy-schedule-button')")
 markup=markup.replace("if(s.category)pairs.push(['카테고리',s.category]);","if(s.typeClassification?.type===s.type&&s.typeClassification.rule==='payback-keyword')pairs.push(['분류 근거','페이백 포함']);if(s.typeClassification?.type===s.type&&s.typeClassification.rule==='nickname-name-product')pairs.push(['분류 근거','닉네임(이름) + 상품·차수']);if(s.category)pairs.push(['카테고리',s.category]);")
 return markup,data
