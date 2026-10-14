
/* Sales use explicit entered values, never source product prices. */
const countLimit=1000000000,amountLimit=1000000000000;
function salesValue(value,limit){return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=limit?value:null;}
function salesOf(s){return {count:salesValue(s.salesCount,countLimit),amount:salesValue(s.salesAmount,amountLimit)};}
function salesComplete(s){const v=salesOf(s);return v.count!==null&&v.amount!==null;}
function summarizeSales(items){let count=0,amount=0,countEntered=0,amountEntered=0,complete=0;for(const s of items){const v=salesOf(s);if(v.count!==null){count+=v.count;countEntered++;}if(v.amount!==null){amount+=v.amount;amountEntered++;}if(salesComplete(s))complete++;}return {total:items.length,count:countEntered?count:null,amount:amountEntered?amount:null,countEntered,amountEntered,complete,missing:items.length-complete};}
function salesText(value,unit){return value===null?'미입력':value.toLocaleString('ko-KR')+unit;}
function salesLabel(s){const v=salesOf(s);return v.count===null&&v.amount===null?'매출 미입력':salesText(v.count,'건')+' · '+salesText(v.amount,'원');}
function salesMatches(s){const mode=$('salesFilter').value;return !mode||(s.type==='공동구매'&&s.status!=='취소'&&(mode==='complete'?salesComplete(s):!salesComplete(s)));}
function currentSalesItems(){const first=iso(new Date(Date.UTC(year,month,1))),last=iso(new Date(Date.UTC(year,month+1,0)));return schedules.filter(s=>s.type==='공동구매'&&s.status!=='취소'&&s.start>=first&&s.start<=last).sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id);}
function salesWeeks(items=currentSalesItems()){const first=new Date(Date.UTC(year,month,1)),last=new Date(Date.UTC(year,month+1,0)),start=shift(first,-first.getUTCDay()),n=Math.ceil((first.getUTCDay()+last.getUTCDate())/7);return Array.from({length:n},(_,i)=>{const ws=shift(start,i*7),we=shift(ws,6);return {index:i+1,start:iso(new Date(Math.max(first,ws))),end:iso(new Date(Math.min(last,we))),items:items.filter(s=>date(s.start)>=ws&&date(s.start)<=we)};});}
function renderSales(){
 const items=currentSalesItems(),v=summarizeSales(items);
 $('salesMonthTitle').textContent=(month+1)+'월 매출';
 $('salesMonthCount').textContent=salesText(v.count,'건');$('salesMonthAmount').textContent=salesText(v.amount,'원');
 $('salesCountCoverage').textContent=v.countEntered+'/'+v.total+'개 공구 입력 · 미입력 '+(v.total-v.countEntered)+'개';
 $('salesAmountCoverage').textContent=v.amountEntered+'/'+v.total+'개 공구 입력 · 미입력 '+(v.total-v.amountEntered)+'개';
 $('salesMonthComplete').textContent=v.complete+' / '+v.total+'개';
 $('salesWeeklyBody').replaceChildren();
 for(const w of salesWeeks(items)){const t=summarizeSales(w.items),tr=node('tr'),th=node('th',w.index+'주차');th.scope='row';th.append(node('div',openingDate(w.start)+' ~ '+openingDate(w.end),'week-range'));tr.append(th,node('td',t.total+'개'),node('td',t.complete+'개'),node('td',t.total?salesText(t.count,'건'):'공구 없음'),node('td',t.total?salesText(t.amount,'원'):'공구 없음'),node('td',t.missing+'개'));$('salesWeeklyBody').append(tr);}
 for(const button of document.querySelectorAll('.opening-item')){const s=schedules.find(s=>s.id===Number(button.dataset.scheduleId));if(!s||s.type!=='공동구매'||s.status==='취소')continue;const tag=node('span',salesLabel(s),'opening-sales'+(!salesComplete(s)?' missing':''));button.append(tag);button.setAttribute('aria-label',button.getAttribute('aria-label')+' · '+salesLabel(s));}
 for(const section of document.querySelectorAll('.opening-week')){const w=salesWeeks(items).find(x=>x.index===Number(section.dataset.week));if(!w)continue;const visible=[...section.querySelectorAll('.opening-item')].map(b=>schedules.find(s=>s.id===Number(b.dataset.scheduleId))),t=summarizeSales(visible);section.querySelector('.opening-week-head').append(node('span','표시 일정 매출 · '+salesText(t.count,'건')+' · '+salesText(t.amount,'원')+' · 입력 완료 '+t.complete+'/'+t.total+'개','opening-week-sales'));}
 refreshSelected();
}
function calendarTitle(s){if(s.type!=='공동구매')return s.title;const f=openingFields(s);return (s.status==='취소'?'[취소] ':'')+'@'+(f.nickname||'닉네임 확인 필요')+' : '+f.product;}
function activateSide(which){const selected=which==='selected'&&selectedScheduleId!==null;$('selectedPanel').hidden=!selected;$('filterPanel').hidden=selected;$('selectedTab').setAttribute('aria-selected',String(selected));$('filterTab').setAttribute('aria-selected',String(!selected));document.querySelector('.layout').classList.toggle('has-selection',selected);$('selectedTab').tabIndex=selected?0:-1;$('filterTab').tabIndex=selected?-1:0;}
function refreshSelected(){
 const s=schedules.find(s=>s.id===selectedScheduleId);
 $('selectedTab').disabled=!s;$('closeSelection').hidden=!s;
 document.querySelectorAll('.event,.opening-item').forEach(el=>{const on=!!s&&Number(el.dataset.scheduleId)===s.id;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));});
 if(!s){activateSide('filter');return;}
 const f=openingFields(s);$('selectedHandle').textContent=s.type==='공동구매'?'@'+(f.nickname||'닉네임 확인 필요'):s.type;$('selectedProduct').textContent=s.type==='공동구매'?f.product:s.title;
 $('selectedOwner').textContent=ownerNames[s.owner];$('selectedOwnerDot').style.background=colors[s.owner][0];
 $('selectedDetails').replaceChildren();const pairs=[['시작',s.start.replaceAll('-','.')+' '+openingDate(s.start).slice(-3)],['종료',s.end.replaceAll('-','.')+' '+openingDate(s.end).slice(-3)],['유형',s.type]];if(s.partner)pairs.push(['거래처',s.partner]);if(s.status==='취소')pairs.push(['취소',s.reason||'취소 일정']);for(const [k,v] of pairs)$('selectedDetails').append(node('dt',k),node('dd',v));
 const sales=salesOf(s);$('selectedSalesCount').textContent=salesText(sales.count,'건');$('selectedSalesAmount').textContent=salesText(sales.amount,'원');$('selectedSalesNote').textContent=s.type!=='공동구매'?'공동구매 매출 집계 대상이 아닙니다.':s.status==='취소'?'취소 일정은 매출 집계에서 제외됩니다.':salesComplete(s)?'입력 완료 · 공구 시작일 기준 집계':'편집에서 주문·결제 건수와 매출액을 입력하세요.';
 $('selectedSource').textContent=s.originalTitle||s.title;$('selectedColorDot').style.background=scheduleColor(s);$('selectedColor').textContent='일정 색상 '+scheduleColor(s).toUpperCase();
 $('selectedReview').hidden=!s.uncertain?.length;$('selectedReview').textContent=s.uncertain?.join(' · ')||'';
}
function openDetail(s){selectedScheduleId=s.id;refreshSelected();activateSide('selected');}
let editInitial=null;
function editTitleValue(s){if(s.influencer)return s.influencer;if(s.type!=='공동구매')return s.title;const f=openingFields(s);const handle=f.nickname;const match=s.title.match(/([A-Za-z0-9_.]+)\s*([（(][^）)]*[）)])/);return match&&(match[1]===handle||s.listVerifiedAt)?handle+match[2]:handle||s.title;}
function openEdit(){const s=schedules.find(s=>s.id===selectedScheduleId);if(!s)return;const f=openingFields(s);$('detailTitle').textContent=calendarTitle(s);$('details').replaceChildren();$('editTitle').value=editTitleValue(s);$('editProduct').value=s.type==='공동구매'?f.product==='상품 확인 필요'?'':f.product:s.product||'';$('editType').value=s.type;$('editStart').value=s.start;$('editEnd').value=s.end;$('editCanceled').checked=s.status==='취소';const v=salesOf(s);$('editSalesCount').value=v.count===null?'':v.count;$('editSalesAmount').value=v.amount===null?'':v.amount;$('detailOwner').value=s.owner;$('detailColor').value=scheduleColor(s);$('editError').textContent='';editInitial={id:s.id,title:$('editTitle').value,product:$('editProduct').value,type:s.type};updateColorPreview('detail',$('detailColor').value,composeScheduleTitle($('editTitle').value,$('editProduct').value),$('detailOwner').value);$('detailDialog').showModal();}
function readSalesInputs(countRaw,amountRaw){const read=(raw,limit,label)=>{if(raw.trim()==='')return null;if(!/^\d+$/.test(raw.trim()))throw new Error(label+'은 0 이상의 정수로 입력해주세요.');const n=Number(raw);if(!Number.isSafeInteger(n)||n>limit)throw new Error(label+' 입력 범위를 확인해주세요.');return n;};return {salesCount:read(countRaw,countLimit,'주문·결제 건수'),salesAmount:read(amountRaw,amountLimit,'매출액')};}
function validPeriod(start,end){return /^\d{4}-\d{2}-\d{2}$/.test(start)&&/^\d{4}-\d{2}-\d{2}$/.test(end)&&!Number.isNaN(date(start).getTime())&&!Number.isNaN(date(end).getTime())&&iso(date(start))===start&&iso(date(end))===end&&end>=start;}
function saveEdit(){const s=schedules.find(s=>s.id===selectedScheduleId);if(!s||!editInitial||editInitial.id!==s.id)return;try{const title=$('editTitle').value.trim(),product=$('editProduct').value.trim(),start=$('editStart').value,end=$('editEnd').value;if(!title)throw new Error('일정명을 입력해주세요.');if(!validPeriod(start,end))throw new Error('시작일과 종료일을 확인해주세요.');const sales=readSalesInputs($('editSalesCount').value,$('editSalesAmount').value);if(title!==editInitial.title||product!==editInitial.product||$('editType').value!==editInitial.type){if(s.imported&&!s.originalTitle)s.originalTitle=s.title;s.influencer=title;s.product=product;s.title=composeScheduleTitle(title,product);s.autoComposed=true;s.listNickname=title.replace(/^@+/,'').split(/[（(]/)[0].trim();s.listProduct=product;}Object.assign(s,sales,{owner:$('detailOwner').value,color:$('detailColor').value,type:$('editType').value,start,end,status:$('editCanceled').checked?'취소':s.status==='취소'?'미표기':s.status});$('detailDialog').close();render();activateSide('selected');}catch(err){$('editError').textContent=err.message;}}
/* Excel snapshot fills the artifact-tool-authored, embedded workbook template. */
function xmlText(value){return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function excelDate(value){return Math.round((date(value)-Date.UTC(1899,11,30))/dayMs);}
function reportData(mode){
 if(!['month','week'].includes(mode))throw new Error('집계 단위를 확인해주세요.');
 const items=currentSalesItems(),scope=year+'년 '+(month+1)+'월',summary=[];
 const add=(label,who,rows)=>{const v=summarizeSales(rows);summary.push([label,who,v.total,v.complete,v.count,v.amount,v.missing,v.total-v.countEntered,v.total-v.amountEntered]);};
 if(mode==='month'){add('월 전체','합계',items);for(const owner of ownerOrder){const rows=items.filter(s=>s.owner===owner);if(rows.length)add('월 전체',ownerNames[owner],rows);}}
 else for(const w of salesWeeks(items)){const label=w.index+'주차 ('+w.start.slice(5)+' ~ '+w.end.slice(5)+')';add(label,'합계',w.items);for(const owner of ownerOrder){const rows=w.items.filter(s=>s.owner===owner);if(rows.length)add(label,ownerNames[owner],rows);}}
 const first=date(iso(new Date(Date.UTC(year,month,1)))),gridStart=shift(first,-first.getUTCDay());
 const detail=items.map(s=>{const f=openingFields(s),v=salesOf(s),week=Math.floor((date(s.start)-gridStart)/dayMs/7)+1;return [excelDate(s.start),excelDate(s.end),week+'주차','@'+(f.nickname||'닉네임 확인 필요'),f.product,ownerNames[s.owner],v.count,v.amount,salesComplete(s)?'입력 완료':v.count!==null||v.amount!==null?'일부 입력':'미입력',scheduleColor(s),s.originalTitle||s.title,s.uncertain?.join(' · ')||''];});
 return {scope,mode,summary,detail,total:items.length};
}
function reportWorksheet(template,rows,title,scope,numericCols,dateCols=[]){
 const cell=(value,col,r,style)=>{const ref=String.fromCharCode(65+col)+r;if(value===null||value===undefined)return '<x:c r="'+ref+'" s="'+style+'"/>';if(typeof value==='number'){if(!Number.isSafeInteger(value))throw new Error('집계값의 숫자 범위를 확인해주세요.');return '<x:c r="'+ref+'" s="'+style+'"><x:v>'+value+'</x:v></x:c>';}return '<x:c r="'+ref+'" s="'+style+'" t="inlineStr"><x:is><x:t xml:space="preserve">'+xmlText(value)+'</x:t></x:is></x:c>';};
 const top=template.top.replace(/__REPORT_TITLE__/g,xmlText(title)).replace(/__REPORT_SCOPE__/g,xmlText(scope));
 const body=rows.map((row,i)=>'<x:row r="'+(i+6)+'" ht="'+(row.length>9?60:30)+'" customHeight="1">'+row.map((v,c)=>cell(v,c,i+6,dateCols.includes(c)?template.dateStyle:numericCols.includes(c)?template.numberStyle:template.bodyStyle)).join('')+'</x:row>').join('');
 return template.prefix+'<x:sheetData>'+top+body+'</x:sheetData>'+template.suffix;
}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zipWorkbook(parts){
 const encoder=new TextEncoder(),chunks=[],central=[];let offset=0,centralSize=0;
 const record=(size,write)=>{const a=new Uint8Array(size);write(new DataView(a.buffer));return a;};
 for(const [name,content] of Object.entries(parts)){const filename=encoder.encode(name),data=encoder.encode(content),crc=crc32(data);
 const head=record(30,v=>{v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(12,0x0021,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,filename.length,true);});
 const directory=record(46,v=>{v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x0800,true);v.setUint16(14,0x0021,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,filename.length,true);v.setUint32(42,offset,true);});
 chunks.push(head,filename,data);central.push(directory,filename);offset+=head.length+filename.length+data.length;centralSize+=directory.length+filename.length;
 }
 const end=record(22,v=>{v.setUint32(0,0x06054b50,true);v.setUint16(8,Object.keys(parts).length,true);v.setUint16(10,Object.keys(parts).length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);});
 const all=[...chunks,...central,end],out=new Uint8Array(offset+centralSize+22);let at=0;for(const chunk of all){out.set(chunk,at);at+=chunk.length;}return out;
}
function makeSalesWorkbook(mode){const data=reportData(mode),parts={...salesWorkbookTemplate.parts},period=data.scope+' · '+(mode==='week'?'주차별':'월별')+' · 공구 시작일 기준 · 취소 제외 · 월 전체 (화면 필터와 무관)';
 parts['xl/worksheets/sheet1.xml']=reportWorksheet(salesWorkbookTemplate.sheets[0],data.summary,'마케팅팀 공동구매 '+(mode==='week'?'주차별':'월별')+' 매출',period,[2,3,4,5,6,7,8]);
 parts['xl/worksheets/sheet2.xml']=reportWorksheet(salesWorkbookTemplate.sheets[1],data.detail,'일정별 주문·결제 매출',period,[6,7],[0,1]);
 return {bytes:zipWorkbook(parts),data,filename:'마케팅팀_'+year+'-'+String(month+1).padStart(2,'0')+'_'+(mode==='week'?'주차별':'월별')+'_매출.xlsx'};
}
function exportSales(mode){try{const report=makeSalesWorkbook(mode),url=URL.createObjectURL(new Blob([report.bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),link=node('a');link.href=url;link.download=report.filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);$('exportMessage').textContent=report.data.scope+' '+(mode==='week'?'주차별':'월별')+' 매출 '+report.data.total+'개 공구 · 미입력은 빈칸으로 내보냈습니다.';}catch(err){$('exportMessage').textContent='내보내기 오류: '+err.message;}}
