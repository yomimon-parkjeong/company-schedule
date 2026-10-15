/* Catalog keys stay stable when display names are edited. */
const workTypeOrder=['공동구매','행사','발송','페이백','기타'];
const workTypeNames={'공동구매':'공동구매','행사':'행사','발송':'상품 발송','페이백':'페이백','기타':'기타 / 연락'};
const catalogStorageKey='company-schedule.catalog.v1';
const salesExpandedKey='company-schedule.sales-expanded.v1';
let catalogDraft=null;
function workTypeLabel(key){return workTypeNames[key]||key;}
function catalogSettings(){return {version:1,owners:ownerOrder.map(id=>({id,name:ownerNames[id],color:colors[id][0]})),types:workTypeOrder.map(id=>({id,name:workTypeNames[id]}))};}
const defaultCatalogSettings=catalogSettings();
function validateCatalog(settings){
 if(!settings||settings.version!==1||!Array.isArray(settings.owners)||!Array.isArray(settings.types)||settings.owners.length>100||settings.types.length>100)throw Error('설정 항목을 확인해주세요.');
 const validate=(rows,kind,required)=>{
  const ids=new Set(),names=new Set();for(const row of rows){
   if(!row||typeof row.id!=='string'||ids.has(row.id))throw Error('설정 항목을 확인해주세요.');
   if(kind==='담당자'?!/^(A|B|C|S|U|OWNER_[1-9][0-9]*)$/.test(row.id):!required.includes(row.id)&&!/^TYPE_[1-9][0-9]*$/.test(row.id))throw Error('설정 항목을 확인해주세요.');
   if(typeof row.name!=='string')throw Error(kind+' 이름을 입력해주세요.');
   row.name=row.name.trim();if(!row.name)throw Error(kind+' 이름을 입력해주세요.');if(row.name.length>(kind==='담당자'?50:40))throw Error(kind+' 이름의 길이를 확인해주세요.');
   const name=row.name.normalize('NFKC').replace(/\s+/g,' ').toLocaleLowerCase('ko-KR');if(names.has(name))throw Error('같은 '+kind+' 이름이 있습니다.');
   if(kind==='담당자'&&(typeof row.color!=='string'||!/^#[0-9a-f]{6}$/i.test(row.color)))throw Error('담당자 기본 색상을 확인해주세요.');
   ids.add(row.id);names.add(name);
  }
  if(required.some(id=>!ids.has(id)))throw Error('기존 '+kind+' 항목을 확인해주세요.');
 };
 validate(settings.owners,'담당자',['A','B','C','S','U']);validate(settings.types,'업무유형',['공동구매','행사','발송','페이백','기타']);return settings;
}
function applyCatalogSettings(settings){
 for(const id of Object.keys(ownerNames))delete ownerNames[id];for(const id of Object.keys(colors))delete colors[id];
 ownerOrder.splice(0,ownerOrder.length,...settings.owners.map(row=>row.id));
 for(const row of settings.owners){ownerNames[row.id]=row.name;colors[row.id]=[row.color,row.color];}
 for(const id of Object.keys(workTypeNames))delete workTypeNames[id];workTypeOrder.splice(0,workTypeOrder.length,...settings.types.map(row=>row.id));
 for(const row of settings.types)workTypeNames[row.id]=row.name;
 for(const [id,key] of [['A','--a'],['B','--b'],['C','--c']])document.documentElement.style.setProperty(key,colors[id][0]);
}
function restoreCatalogSettings(){
 try{const raw=localStorage.getItem(catalogStorageKey);if(raw&&raw.length<100000)applyCatalogSettings(validateCatalog(JSON.parse(raw)));}catch{}
}
function catalogOptionList(select,rows){
 const previous=select.value;select.replaceChildren(...rows.map(({id,name})=>{const option=node('option',name);option.value=id;return option;}));
 if(rows.some(row=>row.id===previous))select.value=previous;
}
function renderCatalogControls(){
 const ownerInputs=[...document.querySelectorAll('.owner-filter')],oldOwners=new Map(ownerInputs.map(input=>[input.value,input.checked]));
 const typeInputs=[...document.querySelectorAll('.type-filter')],oldTypes=new Map(typeInputs.map(input=>[input.value,input.checked]));
 $('ownerFilters').replaceChildren();$('typeFilters').replaceChildren();
 for(const owner of ownerOrder){
  const label=node('label',undefined,'check'),input=node('input');input.type='checkbox';input.className='owner-filter';input.value=owner;input.checked=oldOwners.get(owner)??true;input.addEventListener('change',render);
  const dot=node('span',undefined,'dot');dot.style.background=colors[owner][0];const count=node('span',undefined,'owner-count');count.id='count'+owner;
  label.append(input,dot,node('span',ownerNames[owner],'catalog-name'),count);$('ownerFilters').append(label);
 }
 for(const type of workTypeOrder){
  const label=node('label',undefined,'check'),input=node('input');input.type='checkbox';input.className='type-filter';input.value=type;input.checked=oldTypes.get(type)??true;input.addEventListener('change',render);
  label.append(input,node('span',workTypeLabel(type),'catalog-name'));$('typeFilters').append(label);
 }
 const settings=catalogSettings();catalogOptionList($('detailOwner'),settings.owners);catalogOptionList($('addForm').elements.owner,settings.owners);
 catalogOptionList($('editType'),settings.types);catalogOptionList($('addForm').elements.type,settings.types);
 const totals=document.querySelector('.owner-totals');totals.replaceChildren();
 for(const owner of ownerOrder){
  const row=node('div');row.id='ownerTotal'+owner;const label=node('span',undefined,'owner-label'),dot=node('i',undefined,'dot');dot.style.background=colors[owner][0];label.append(dot,node('span',ownerNames[owner]));
  const total=node('strong','0건');total.id='groupbuy'+owner;row.append(label,total);totals.append(row);
 }
 const legend=document.querySelector('.calendar-bottom .legend');legend.replaceChildren();
 for(const owner of ownerOrder.filter(id=>!['S','U'].includes(id))){const item=node('span'),dot=node('i',undefined,'dot');dot.style.background=colors[owner][0];item.append(dot,node('span',ownerNames[owner]));legend.append(item);}
}
function catalogTab(kind){
 const owner=kind==='owners';$('catalogOwners').hidden=!owner;$('catalogTypes').hidden=owner;
 for(const [id,active] of [['catalogOwnerTab',owner],['catalogTypeTab',!owner]]){$(id).setAttribute('aria-selected',String(active));$(id).tabIndex=active?0:-1;}
}
function syncCatalogDraft(){
 if(!catalogDraft)return;
 for(const input of document.querySelectorAll('#catalogDialog [data-catalog-kind]')){
  const rows=input.dataset.catalogKind==='owner'?catalogDraft.owners:catalogDraft.types,row=rows.find(row=>row.id===input.dataset.catalogId);
  if(row)row[input.dataset.catalogField]=input.value;
 }
}
function catalogRow(row,kind){
 const box=node('div',undefined,'catalog-row'+(kind==='type'?' type-row':''));box.dataset.catalogId=row.id;
 const label=node('label',kind==='owner'?'담당자 이름':'업무유형 이름'),name=node('input');name.type='text';name.value=row.name;name.maxLength=kind==='owner'?50:40;name.placeholder=kind==='owner'?'예: 이름 직급':'업무유형 이름';
 name.dataset.catalogKind=kind;name.dataset.catalogId=row.id;name.dataset.catalogField='name';name.setAttribute('aria-label',(row.name||'새 '+(kind==='owner'?'담당자':'업무유형'))+' 이름');label.append(name);box.append(label);
 if(kind==='owner'){const colorLabel=node('label','기본 색상'),color=node('input');color.type='color';color.value=row.color;color.dataset.catalogKind=kind;color.dataset.catalogId=row.id;color.dataset.catalogField='color';color.setAttribute('aria-label',(row.name||'새 담당자')+' 기본 색상');colorLabel.append(color);box.append(colorLabel);}
 const count=schedules.filter(s=>kind==='owner'?s.owner===row.id:s.type===row.id).length;box.append(node('span','연결된 일정 '+count+'건'+(kind==='type'&&row.id==='공동구매'?' · 공구·매출 집계 대상':''),'catalog-usage'));return box;
}
function renderCatalogDraft(){
 $('catalogOwnerRows').replaceChildren(...catalogDraft.owners.map(row=>catalogRow(row,'owner')));
 $('catalogTypeRows').replaceChildren(...catalogDraft.types.map(row=>catalogRow(row,'type')));
}
function openCatalog(kind='owners'){
 catalogDraft=catalogSettings();$('catalogError').textContent='';$('catalogStorageNote').textContent='';renderCatalogDraft();catalogTab(kind);$('catalogDialog').showModal();
}
function addCatalogRow(kind){
 syncCatalogDraft();const owner=kind==='owner',rows=owner?catalogDraft.owners:catalogDraft.types;
 if(rows.length>=100){$('catalogError').textContent='항목은 최대 100개까지 추가할 수 있습니다.';return;}
 const prefix=owner?'OWNER_':'TYPE_';let number=1;while(rows.some(row=>row.id===prefix+number))number++;
 const row={id:prefix+number,name:''};if(owner)row.color='#3fa9f5';rows.push(row);renderCatalogDraft();catalogTab(owner?'owners':'types');
 const container=owner?$('catalogOwnerRows'):$('catalogTypeRows');container.lastChild.querySelector('input[type=text]').focus();$('catalogError').textContent='';
}
function saveCatalog(){
 try{
  syncCatalogDraft();const settings=validateCatalog(catalogDraft);applyCatalogSettings(settings);renderCatalogControls();render();
  let stored=true;try{localStorage.setItem(catalogStorageKey,JSON.stringify(settings));}catch{stored=false;}
  if(stored){$('catalogDialog').close();catalogDraft=null;}else{$('catalogStorageNote').textContent='현재 화면에 반영했지만 브라우저 저장에 실패했습니다.';$('catalogStorageNote').classList.add('catalog-storage-error');}
 }catch(error){$('catalogError').textContent=error.message;}
}
function updateSalesCollapsedSummary(){
 const total=summarizeSales(salesViewContext().items);$('salesCollapsedSummary').textContent='주문·결제 '+salesText(total.count,'건')+' · 매출 '+salesText(total.amount,'원');
}
function setSalesSummaryExpanded(expanded,persist=true){
 $('salesSummaryBody').hidden=!expanded;$('monthSalesSummary').classList.toggle('sales-collapsed',!expanded);
 $('toggleSalesSummary').setAttribute('aria-expanded',String(expanded));$('salesToggleText').textContent=expanded?'매출 접기':'매출 펼치기';$('salesToggleArrow').textContent=expanded?'▴':'▾';
 if(persist)try{localStorage.setItem(salesExpandedKey,expanded?'1':'0');}catch{}
}
function restoreSalesSummaryExpanded(){let expanded=false;try{expanded=localStorage.getItem(salesExpandedKey)==='1';}catch{}setSalesSummaryExpanded(expanded,false);}
$('manageCatalog').onclick=$('manageOwners').onclick=()=>openCatalog('owners');$('manageTypes').onclick=()=>openCatalog('types');
$('catalogOwnerTab').onclick=()=>catalogTab('owners');$('catalogTypeTab').onclick=()=>catalogTab('types');
for(const tab of [$('catalogOwnerTab'),$('catalogTypeTab')])tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const owner=event.key==='Home'||event.key!=='End'&&event.currentTarget===$('catalogTypeTab');catalogTab(owner?'owners':'types');$(owner?'catalogOwnerTab':'catalogTypeTab').focus();}});
for(const button of document.querySelectorAll('.close-catalog'))button.onclick=()=>{$('catalogDialog').close();catalogDraft=null;};
$('catalogDialog').addEventListener('cancel',()=>{catalogDraft=null;});
$('addCatalogOwner').onclick=()=>addCatalogRow('owner');$('addCatalogType').onclick=()=>addCatalogRow('type');$('saveCatalog').onclick=saveCatalog;
$('toggleSalesSummary').onclick=()=>setSalesSummaryExpanded($('salesSummaryBody').hidden);
restoreCatalogSettings();renderCatalogControls();restoreSalesSummaryExpanded();
