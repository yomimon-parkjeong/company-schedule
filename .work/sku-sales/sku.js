/* Product names identify the current schedule's product; no option revenue is inferred. */
let skuSalesContext='',skuWeekExpanded=new Set(),skuProductExpanded=new Set();
function skuProductName(s){return (openingFields(s).product||'상품 확인 필요').normalize('NFC').replace(/\s+/g,' ').trim()||'상품 확인 필요';}
function groupSkuSales(items){
 const groups=new Map();
 for(const s of items){const name=skuProductName(s);if(!groups.has(name))groups.set(name,{name,items:[]});groups.get(name).items.push(s);}
 return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(group=>({...group,totals:summarizeSales(group.items)}));
}
function skuToggle(label,controlId,expanded,onChange){
 const button=node('button',undefined,'sku-toggle'),arrow=node('span',expanded?'▾':'▸','sku-chevron');button.type='button';arrow.setAttribute('aria-hidden','true');
 button.append(arrow,node('span',label,'sku-toggle-title'));button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-controls',controlId);
 button.onclick=()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));arrow.textContent=open?'▾':'▸';onChange(open);};
 return button;
}
function skuCoverage(v){
 const cell=node('td',v.complete+' / '+v.total+'개 완료');
 if(v.missing)cell.append(node('small','미입력·일부 입력 '+v.missing+'개','sku-missing-note'));return cell;
}
function skuCampaignTable(items,label){
 const table=node('table',undefined,'sku-campaign-table'),caption=node('caption',label+' 공구별 매출','sr-only'),thead=node('thead'),head=node('tr'),body=node('tbody');
 for(const title of ['시작일','닉네임','담당자','주문·결제 건수','매출액']){const th=node('th',title);th.scope='col';head.append(th);}thead.append(head);
 for(const s of [...items].sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id)){
  const row=node('tr'),v=salesOf(s),name=node('td'),fields=openingFields(s),button=node('button','@'+(fields.nickname||'닉네임 확인 필요'),'sku-schedule-button');
  button.type='button';button.dataset.scheduleId=String(s.id);button.setAttribute('aria-label',openingDate(s.start)+' '+openingLine(s)+' · '+salesLabel(s));button.onclick=()=>openDetail(s);name.append(button);
  row.dataset.scheduleId=String(s.id);row.append(node('td',openingDate(s.start)),name,node('td',ownerNames[s.owner]),node('td',salesText(v.count,'건')),node('td',salesText(v.amount,'원')));body.append(row);
 }
 const total=summarizeSales(items),foot=node('tfoot'),totalRow=node('tr'),totalLabel=node('th','제품 합계');totalLabel.scope='row';totalLabel.colSpan=3;totalRow.append(totalLabel,node('td',salesText(total.count,'건')),node('td',salesText(total.amount,'원')));foot.append(totalRow);
 table.append(caption,thead,body,foot);return table;
}
function skuProductTable(items,namespace,label){
 const groups=groupSkuSales(items);
 if(!groups.length)return node('p','선택한 집계 기준에 해당하는 공동구매가 없습니다.','sku-empty');
 const table=node('table',undefined,'sku-product-table'),caption=node('caption',label+' 제품별(SKU) 매출','sr-only'),thead=node('thead'),head=node('tr'),body=node('tbody'),foot=node('tfoot');
 for(const title of ['제품(SKU)','공구 일정','주문·결제 건수','매출액','입력 현황']){const th=node('th',title);th.scope='col';head.append(th);}thead.append(head);
 groups.forEach((group,index)=>{
  const row=node('tr',undefined,'sku-product-total'),th=node('th'),v=group.totals,panel=node('tr',undefined,'sku-campaign-detail'),cell=node('td'),id='sku-'+namespace+'-product-'+index+'-detail',key=JSON.stringify([namespace,group.name]);
  row.dataset.product=group.name;th.scope='row';panel.id=id;panel.hidden=!skuProductExpanded.has(key);cell.colSpan=5;cell.append(skuCampaignTable(group.items,group.name));panel.append(cell);
  const toggle=skuToggle(group.name,id,!panel.hidden,open=>{panel.hidden=!open;if(open)skuProductExpanded.add(key);else skuProductExpanded.delete(key);});toggle.setAttribute('aria-label',group.name+' 공구별 내역');th.append(toggle);
  row.append(th,node('td',v.total+'개'),node('td',salesText(v.count,'건')),node('td',salesText(v.amount,'원')),skuCoverage(v));body.append(row,panel);
 });
 const total=summarizeSales(items),totalRow=node('tr'),totalLabel=node('th',label+' 합계');totalLabel.scope='row';totalRow.append(totalLabel,node('td',total.total+'개'),node('td',salesText(total.count,'건')),node('td',salesText(total.amount,'원')),skuCoverage(total));foot.append(totalRow);
 table.append(caption,thead,body,foot);return table;
}
function renderSkuSales(items,first){
 const context=year+'-'+month+'-'+salesScope();
 if(context!==skuSalesContext){skuSalesContext=context;skuWeekExpanded.clear();skuProductExpanded.clear();$('salesProductBreakdown').open=false;}
 const groups=groupSkuSales(items);$('salesProductCount').textContent=groups.length+'개 제품 · '+items.length+'개 공구';
 $('salesMonthlyProducts').replaceChildren(skuProductTable(items,'month',(month+1)+'월'));
 $('salesWeeklyBody').replaceChildren();
 for(const w of salesWeeks(items)){
  const v=summarizeSales(w.items),tr=node('tr',undefined,'sales-week-summary'),th=node('th'),panel=node('tr',undefined,'sku-week-detail'),cell=node('td'),id='sku-week-'+w.index+'-detail';th.scope='row';tr.dataset.week=String(w.index);panel.id=id;panel.hidden=!skuWeekExpanded.has(w.index);cell.colSpan=6;
  const toggle=skuToggle(w.index+'주차',id,!panel.hidden,open=>{panel.hidden=!open;if(open)skuWeekExpanded.add(w.index);else skuWeekExpanded.delete(w.index);});toggle.append(node('span','제품별 보기','sku-toggle-hint'));toggle.setAttribute('aria-label',w.index+'주차 제품별(SKU) 매출 보기');th.append(toggle,node('div',openingDate(w.start)+' ~ '+openingDate(w.end),'week-range'));
  const carried=w.items.filter(s=>s.start<first).length;if(carried)th.append(node('div','전월 시작 '+carried+'개 포함','sales-carry-note'));
  tr.append(th,node('td',v.total+'개'),node('td',v.complete+'개'),node('td',v.total?salesText(v.count,'건'):'공구 없음'),node('td',v.total?salesText(v.amount,'원'):'공구 없음'),node('td',v.missing+'개'));
  const content=node('div');content.append(node('h3',w.index+'주차 제품별(SKU) 매출'),node('p','제품명을 누르면 공구별 내역을 확인할 수 있습니다.','sku-help'));
  const scroll=node('div',undefined,'sku-table-scroll');scroll.append(skuProductTable(w.items,'week'+w.index,w.index+'주차'));content.append(scroll);cell.append(content);panel.append(cell);$('salesWeeklyBody').append(tr,panel);
 }
}
