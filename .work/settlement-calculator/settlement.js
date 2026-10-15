
/* Settlement imports remain separate; calendar sales are applied only through explicit confirmation. */
const settlementState={recipient:null,rate:null,book:null,busy:false};
let settlementRateAction='import',settlementPendingRate=null;
const settlementHeaders=['번호','주문일자','상품명','수량','판매가','구매자','주문번호','처리현황','택배사/송장번호'];
const settlementRecipients={business:'사업자',individual:'일반 개인'};
const settlementXlsxMime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function settlementMoney(value){return value.toLocaleString('ko-KR',{maximumFractionDigits:2})+'원';}
function settlementNotice(message,error=false){$('settleMessage').textContent=message;$('settleMessage').classList.toggle('error',error);}
function settlementXml(source){const xml=new DOMParser().parseFromString(source,'application/xml');if(xml.getElementsByTagName('parsererror').length)throw new Error('엑셀 내부 자료를 읽을 수 없습니다. 파일을 다시 저장해주세요.');return xml;}
function settlementElements(element,name){return Array.from(element.getElementsByTagNameNS('*',name));}
function settlementZipPath(base,target){const pieces=(target.startsWith('/')?target.slice(1):base+target).split('/'),out=[];for(const p of pieces){if(!p||p==='.')continue;if(p==='..'){if(!out.length)throw new Error('엑셀 파일 경로가 올바르지 않습니다.');out.pop();}else out.push(p);}return out.join('/');}
async function settlementUnzip(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder('utf-8',{fatal:true});
 if(bytes.length<22||view.getUint32(0,true)!==0x04034b50)throw new Error('암호가 없는 .xlsx 파일을 넣어주세요.');
 let end=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(view.getUint32(p,true)===0x06054b50&&p+22+view.getUint16(p+20,true)===bytes.length){end=p;break;}
 if(end<0)throw new Error('엑셀 파일이 손상됐거나 지원하지 않는 형식입니다.');
 const count=view.getUint16(end+10,true),centralSize=view.getUint32(end+12,true),centralOffset=view.getUint32(end+16,true);
 if(count>2000||count===65535||centralOffset+centralSize>end)throw new Error('엑셀 파일 구조 또는 크기를 확인해주세요.');
 const parts={};let p=centralOffset,total=0;
 for(let i=0;i<count;i++){
  if(p+46>bytes.length||view.getUint32(p,true)!==0x02014b50)throw new Error('엑셀 파일 목록을 읽을 수 없습니다.');
  const flags=view.getUint16(p+8,true),method=view.getUint16(p+10,true),checksum=view.getUint32(p+16,true),packed=view.getUint32(p+20,true),unpacked=view.getUint32(p+24,true),nameSize=view.getUint16(p+28,true),extraSize=view.getUint16(p+30,true),commentSize=view.getUint16(p+32,true),offset=view.getUint32(p+42,true);
  if(flags&1)throw new Error('암호가 없는 .xlsx 파일을 넣어주세요.');
  if(unpacked>40000000||(total+=unpacked)>80000000||p+46+nameSize+extraSize+commentSize>bytes.length)throw new Error('엑셀 파일이 너무 큽니다. 공구별로 나누어 넣어주세요.');
  const name=decoder.decode(bytes.subarray(p+46,p+46+nameSize));p+=46+nameSize+extraSize+commentSize;
  if(!(/(^xl\/.*\.xml$)|(^xl\/_rels\/workbook\.xml\.rels$)/.test(name)))continue;
  if(offset+30>bytes.length||view.getUint32(offset,true)!==0x04034b50)throw new Error('엑셀 자료 위치를 확인할 수 없습니다.');
  const at=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);
  if(at+packed>bytes.length)throw new Error('엑셀 자료가 일부 누락됐습니다.');
  const compressed=bytes.slice(at,at+packed);let data;
  if(method===0)data=compressed;
  else if(method===8){
   if(typeof DecompressionStream!=='function')throw new Error('이 브라우저에서는 엑셀을 읽을 수 없습니다. 최신 Edge 또는 Chrome을 사용해주세요.');
   const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw')),reader=stream.getReader(),chunks=[];let length=0;
   for(;;){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.length;if(length>unpacked){await reader.cancel();throw new Error('엑셀 압축 자료의 크기가 올바르지 않습니다.');}chunks.push(chunk.value);}
   data=new Uint8Array(length);let pos=0;for(const c of chunks){data.set(c,pos);pos+=c.length;}
  }else throw new Error('지원하지 않는 엑셀 압축 형식입니다.');
  if(data.length!==unpacked||crc32(data)!==checksum)throw new Error('엑셀 파일의 일부 자료가 손상됐습니다.');
  parts[name]=decoder.decode(data);
 }
 return parts;
}
function settlementSheetRows(xml,shared){
 const rows=[];
 for(const row of settlementElements(xml,'row')){
  const values=[];for(const cell of settlementElements(row,'c')){
   const ref=cell.getAttribute('r')||'',col=ref.match(/^[A-Z]+/);if(!col)continue;let index=0;for(const c of col[0])index=index*26+c.charCodeAt(0)-64;index--;
   if(index>9)continue;
   const type=cell.getAttribute('t')||'n',v=settlementElements(cell,'v')[0]?.textContent??'';
   let value;if(type==='s'){const n=Number(v);if(!Number.isInteger(n)||n<0||n>=shared.length)throw new Error('엑셀 문자열 자료가 누락됐습니다.');value=shared[n];}
   else if(type==='inlineStr')value=settlementElements(cell,'t').map(n=>n.textContent).join('');
   else if(type==='e')throw new Error('엑셀에 계산 오류가 있습니다: '+ref);
   else value=v;
   values[index]={value,type};
  }
  rows.push({number:Number(row.getAttribute('r')),cells:values});
  if(rows.length>25020)throw new Error('주문 상세가 너무 많습니다. 공구별로 나누어 넣어주세요.');
 }
 return rows;
}
function settlementNumber(raw,label,row){
 const text=String(raw??'').trim().replace(/,/g,'').replace(/\s*원$/,'');
 if(!/^\d+(?:\.0+)?$/.test(text))throw new Error(row+'행 '+label+'을 확인해주세요. 빈칸과 오류값은 0으로 계산하지 않습니다.');
 const value=Number(text);if(!Number.isSafeInteger(value)||value<0||value>1000000000000)throw new Error(row+'행 '+label+'의 숫자 범위를 확인해주세요.');
 return value;
}
function settlementStatus(value){
 // Keep the original status in the source sheet; classify each complete status in a compound label.
 const states=String(value??'').normalize('NFKC').replace(/\s/g,'').split(/[-\u2010-\u2015\u2212]/);
 const included=['발송완료','배송완료','배송중','배송준비중','배송준비','배송대기','상품준비중','결제완료','배송전','교환완료'];
 const excluded=['취소','취소완료','환불완료','반품완료','반품처리완료','입금대기','결제대기','미입금'];
 if(states.every(status=>included.includes(status)||excluded.includes(status)))return states.some(status=>excluded.includes(status))?'excluded':'included';
 throw new Error('처리현황 "'+value+'"는 정산 포함 여부를 확인해야 합니다. 부분 취소·환불은 차감 수량·금액이 있는 자료로 확인해주세요.');
}
function settlementDate(cell,epoch1904){
 const value=String(cell?.value??'').trim();
 if(cell?.type==='n'&&/^\d+(?:\.\d+)?$/.test(value)){
  const d=new Date((epoch1904?Date.UTC(1904,0,1):Date.UTC(1899,11,30))+Math.round(Number(value)*86400000));
  if(Number.isNaN(d.getTime()))throw new Error('주문일자를 확인해주세요.');
  return d.toISOString().slice(0,19).replace('T',' ');
 }
 if(!/^\d{4}[-/.]\d{2}[-/.]\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(value))throw new Error('주문일자는 YYYY-MM-DD 형식의 자료가 필요합니다.');
 const normalized=value.replaceAll('/','-').replaceAll('.','-').replace('T',' '),day=normalized.slice(0,10),dt=new Date(day+'T00:00:00Z');
 if(Number.isNaN(dt.getTime())||dt.toISOString().slice(0,10)!==day)throw new Error('존재하지 않는 주문일자가 있습니다.');
 return normalized;
}
async function settlementReadWorkbook(bytes){
 const parts=await settlementUnzip(bytes);
 if(!parts['xl/workbook.xml']||!parts['xl/_rels/workbook.xml.rels'])throw new Error('일반 .xlsx 엑셀 파일을 넣어주세요.');
 const workbook=settlementXml(parts['xl/workbook.xml']),relations=settlementElements(settlementXml(parts['xl/_rels/workbook.xml.rels']),'Relationship'),epoch1904=['1','true'].includes(settlementElements(workbook,'workbookPr')[0]?.getAttribute('date1904'));
 const shared=parts['xl/sharedStrings.xml']?settlementElements(settlementXml(parts['xl/sharedStrings.xml']),'si').map(si=>settlementElements(si,'t').map(t=>t.textContent).join('')):[];
 const candidates=[];
 for(const sheet of settlementElements(workbook,'sheet')){
  const rid=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'),relation=relations.find(r=>r.getAttribute('Id')===rid);
  if(!relation||relation.getAttribute('TargetMode')==='External')continue;
  const target=settlementZipPath('xl/',relation.getAttribute('Target')||'');
  if(!parts[target])continue;
  const rows=settlementSheetRows(settlementXml(parts[target]),shared);
  let columnMap=null;
  const headerIndex=rows.findIndex(row=>{
   const names=row.cells.map(c=>String(c?.value??'').replace(/\s/g,''));
   const indices=settlementHeaders.map(h=>names.indexOf(h.replace(/\s/g,'')));
   if(indices.some(i=>i<0)||new Set(indices).size!==settlementHeaders.length)return false;
   columnMap=indices;return true;
  });
  if(headerIndex>=0)candidates.push({name:sheet.getAttribute('name'),rows:rows.slice(headerIndex+1),columnMap});
 }
 if(candidates.length!==1)throw new Error(candidates.length?'주문 내역 시트가 여러 개입니다. 정산할 시트 하나만 남긴 파일을 넣어주세요.':'DB 주문 엑셀의 번호·주문일자·상품명·수량·판매가·구매자·주문번호·처리현황·택배사/송장번호 열을 확인해주세요.');
 const detail=[];
 for(const source of candidates[0].rows){
  const raw=candidates[0].columnMap.map(i=>source.cells[i]?.value??'');
  if(raw.every(v=>String(v).trim()===''))continue;
  if(!String(raw[6]).trim()){
   if(raw.slice(0,3).some(v=>/합계|소득세 계산|공구수수료 정산/.test(String(v))))break;
   throw new Error(source.number+'행 주문번호가 비어 있습니다.');
  }
  const quantity=settlementNumber(raw[3],'수량',source.number),sales=settlementNumber(raw[4],'판매가',source.number);
  if(quantity===0)throw new Error(source.number+'행 수량은 1 이상이어야 합니다.');
  const status=settlementStatus(String(raw[7]).trim());
  raw[1]=settlementDate(source.cells[candidates[0].columnMap[1]],epoch1904);raw[3]=quantity;raw[4]=sales;
  raw[6]=String(raw[6]).trim();if(!String(raw[2]).trim())throw new Error(source.number+'행 상품명이 비어 있습니다.');
  detail.push({values:raw,quantity,sales,order:raw[6],excluded:status==='excluded'});
 }
 if(!detail.length)throw new Error('정산할 주문 상세가 없습니다.');
 const sum=(rows,key)=>rows.reduce((a,r)=>a+r[key],0),excluded=detail.filter(r=>r.excluded),active=detail.filter(r=>!r.excluded);
 const book={rows:detail,sheet:candidates[0].name,gross:sum(detail,'sales'),grossQuantity:sum(detail,'quantity'),excludedSales:sum(excluded,'sales'),excludedQuantity:sum(excluded,'quantity'),orderCount:new Set(detail.map(r=>r.order)).size,activeOrderCount:new Set(active.map(r=>r.order)).size};
 if(!Number.isSafeInteger(book.gross)||book.gross>1000000000000)throw new Error('총 매출의 계산 범위를 확인해주세요.');
 const dates=detail.map(r=>r.values[1].slice(0,10)).sort();book.start=dates[0];book.end=dates.at(-1);
 // The calendar keeps an opaque import identity, never the customer/order details.
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(detail.map(r=>r.values))));
 book.calendarSalesKey=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 return book;
}
function settlementCalculate(book,recipient,rate){
 if(!Object.hasOwn(settlementRecipients,recipient)||![10,15,20].includes(rate))throw new Error('정산 대상과 수수료율을 선택해주세요.');
 const basis=book.gross-book.excludedSales,quantity=book.grossQuantity-book.excludedQuantity;
 const hundredths=BigInt(basis)*BigInt(rate),commission=Number(hundredths)/100;
 const income=recipient==='business'?0:Number((hundredths*3n/100000n)*10n),local=recipient==='business'?0:Number((BigInt(income)/100n)*10n),tax=income+local;
 return {basis,quantity,commission,income,local,tax,payment:commission-tax};
}
function settlementRender(){
 const state=settlementState,business=state.recipient==='business';
 $('settleImport').disabled=state.busy;$('settleDropZone').classList.toggle('is-busy',state.busy);$('settleDropZone').setAttribute('aria-busy',String(state.busy));
 $('settleResult').hidden=!state.book;$('settleEmpty').hidden=!!state.book;
 settlementRenderCalendarLink();
 if(!state.book)return;
 const b=state.book,m=settlementCalculate(b,state.recipient,state.rate);
 $('settleOrders').textContent=b.activeOrderCount.toLocaleString('ko-KR')+'건';$('settleQuantity').textContent=m.quantity.toLocaleString('ko-KR')+'개';$('settleBasis').textContent=settlementMoney(m.basis);$('settlePayment').textContent=settlementMoney(m.payment);
 for(const [id,value] of [['settleGross',b.gross],['settleExcluded',b.excludedSales],['settleNet',m.basis],['settleCommission',m.commission],['settleFinal',m.payment]])$(id).textContent=settlementMoney(value);
 for(const [id,value] of [['settleGrossQuantity',b.grossQuantity],['settleExcludedQuantity',b.excludedQuantity],['settleNetQuantity',m.quantity]])$(id).textContent=value.toLocaleString('ko-KR')+'개';
 $('settleRateBadge').textContent=state.rate+'%';$('settleTaxTotal').textContent=business?'미부과':settlementMoney(m.tax);$('settleTaxTotalRow').classList.toggle('is-disabled',business);
 $('settleIncomeTax').textContent=business?'미부과':settlementMoney(m.income);$('settleLocalTax').textContent=business?'미부과':settlementMoney(m.local);
 $('settleTaxPanel').classList.toggle('is-disabled',business);$('settleTaxPanel').setAttribute('aria-disabled',String(business));$('settleTaxState').textContent=business?'미적용':'3.3% 적용';
 $('settleTaxNote').textContent=business?'사업자 정산은 소득세·지방소득세를 공제하지 않습니다. 다른 계산 기준은 동일합니다.':'소득세 3%를 계산한 뒤 그 세액의 10%를 지방소득세로 계산합니다. 첨부 파일과 동일하게 세목별 10원 단위로 버립니다.';
 $('settlePeriod').textContent=b.start+' ~ '+b.end+' · '+settlementRecipients[state.recipient]+' · 수수료 '+state.rate+'%';
 $('settleSheetName').textContent=business?'전달용_사업자':'전달용_개인';$('settleOutputNote').textContent=business?'선택한 사업자 시트를 출력합니다. 세금 영역은 회색으로 표시합니다.':'선택한 개인 시트를 출력합니다. 소득세·지방소득세와 지급액을 표시합니다.';
 $('settleDetailCount').textContent=b.rows.length+'행 · 주문번호 '+b.orderCount+'건';
 $('settleRateChange').disabled=state.busy;$('settleDownload').disabled=state.busy;
}
function settlementRenderOrders(book){
 const head=node('tr');for(const text of settlementHeaders)head.append(node('th',text));$('settleOrderHead').replaceChildren(head);
 const fragment=document.createDocumentFragment();
 for(const row of book.rows){const tr=node('tr');if(row.excluded)tr.classList.add('excluded');for(let i=0;i<settlementHeaders.length;i++)tr.append(node('td',typeof row.values[i]==='number'?row.values[i].toLocaleString('ko-KR'):String(row.values[i])));fragment.append(tr);}
 $('settleOrderBody').replaceChildren(fragment);
}
async function settlementImportFile(file,rate,recipient=settlementState.recipient){
 if(!file)return;
 const previous=settlementState.book;
 try{
  if(!Object.hasOwn(settlementRecipients,recipient)||![10,15,20].includes(rate))throw new Error('정산 대상과 수수료율을 선택해주세요.');
  if(!/\.xlsx$/i.test(file.name))throw new Error('.xlsx 형식의 주문 엑셀을 넣어주세요.');
  if(file.size>20000000)throw new Error('파일이 너무 큽니다. 공구별로 나누어 넣어주세요.');
  settlementState.busy=true;settlementRender();settlementNotice('엑셀 주문 내역을 확인하고 있습니다.');
  const book=await settlementReadWorkbook(new Uint8Array(await file.arrayBuffer()));
  book.filename=file.name;settlementState.book=book;settlementState.rate=rate;settlementState.recipient=recipient;
  $('settleFileName').textContent=file.name;
  $('settleCampaign').value=file.name.replace(/\.xlsx$/i,'').replace(/_공구.*$/,'')||'공동구매';
  settlementRenderOrders(book);settlementNotice('주문 상세 '+book.rows.length+'행을 불러왔습니다. 수수료 '+rate+'%를 적용했습니다.');
 }catch(error){settlementNotice(error.message+(previous?' 이전에 불러온 정산은 유지했습니다.':''),true);}
 finally{settlementState.busy=false;settlementRender();$('settleFile').value='';}
}
function settlementWorkbook(){
 const state=settlementState;if(!state.book||state.busy)throw new Error('정산할 엑셀을 먼저 넣어주세요.');
 const b=state.book,m=settlementCalculate(b,state.recipient,state.rate),business=state.recipient==='business',template=settlementWorkbookTemplate,parts={...template.parts},delta=b.rows.length-11,at=n=>n+delta;
 const cell=(ref,value,style,formula='')=>{
  const f=formula?'<x:f>'+xmlText(formula.replace(/^=/,''))+'</x:f>':'';
  if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('정산값을 확인해주세요.');return '<x:c r="'+ref+'" s="'+style+'">'+f+'<x:v>'+value+'</x:v></x:c>';}
  if(value===null||value===undefined||value==='')return '<x:c r="'+ref+'" s="'+style+'"/>';
  return '<x:c r="'+ref+'" s="'+style+'" t="inlineStr"><x:is><x:t xml:space="preserve">'+xmlText(value)+'</x:t></x:is></x:c>';
 };
 const rows=['<x:row r="1" ht="30" customHeight="1">'+settlementHeaders.map((v,c)=>cell(String.fromCharCode(65+c)+'1',v,template.headerStyles[c])).join('')+'</x:row>'];
 // Compact by default; keep long raw product names readable without clipping.
 const widths=template.columnWidths;
 const lineCount=(value,width)=>String(value??'').split(/\r?\n/).reduce((sum,line)=>sum+Math.max(1,Math.ceil(Array.from(line).reduce((n,ch)=>n+(ch.charCodeAt(0)>255?2:1),0)/Math.max(1,width-2))),0);
 b.rows.forEach((row,i)=>{const height=Math.max(28,...row.values.map((v,c)=>lineCount(v,widths[c])*14+4));rows.push('<x:row r="'+(i+2)+'" ht="'+height+'" customHeight="1">'+row.values.map((v,c)=>cell(String.fromCharCode(65+c)+(i+2),v,template.bodyStyles[c])).join('')+'</x:row>');});
 const exclude=(col)=>{const statuses=[...new Set(b.rows.filter(r=>r.excluded).map(r=>String(r.values[7])))],last=b.rows.length+1;if(statuses.length>200)throw new Error('처리현황 표기가 너무 많습니다. 동일 상태의 표기를 정리해주세요.');return statuses.length?'SUM('+statuses.map(status=>'SUMIF($H$2:$H$'+last+',"'+status.replaceAll('"','""')+'",$'+col+'$2:$'+col+'$'+last+')').join(',')+')':'0';};
 const formulas={'D13':'SUM(D2:D'+(b.rows.length+1)+')','E13':'SUM(E2:E'+(b.rows.length+1)+')',
 'A16':'IF($I$'+at(16)+'=0,0,ROUNDDOWN(E'+at(18)+'*0.03,-1))','B16':'IF($I$'+at(16)+'=0,0,ROUNDDOWN(A'+at(16)+'*0.1,-1))',
 'D15':'D'+at(13),'E15':'E'+at(13),'D16':exclude('D'),'E16':exclude('E'),'D17':'D'+at(15)+'-D'+at(16),'E17':'E'+at(15)+'-E'+at(16),
 'D18':'$I$'+at(15),'E18':'E'+at(17)+'*D'+at(18),'E19':'A'+at(16)+'+B'+at(16),'D20':'D'+at(17),'E20':'E'+at(18)+'-E'+at(19)};
 const values={'A13':'주문 내역 합계','D13':b.grossQuantity,'E13':b.gross,'A14':'소득세 계산','A15':'소득세 3%','B15':'지방소득세 0.3%','A16':m.income,'B16':m.local,'A17':business?'사업자: 세금 미적용':'세목별 10원 단위 버림',
 'C14':'공구수수료 정산','D14':'수량','E14':'금액','D15':b.grossQuantity,'E15':b.gross,'C16':'취소건','D16':b.excludedQuantity,'E16':b.excludedSales,'D17':m.quantity,'E17':m.basis,'D18':state.rate/100,'E18':m.commission,'D19':business?'미적용':0.033,'E19':m.tax,'D20':m.quantity,'E20':m.payment,
 'F15':business?'사업자 정산: 소득세·지방소득세 미부과.':'일반 개인: 소득세 3%와 지방소득세 공제.\n세목별 10원 단위 버림.',
 'I14':settlementRecipients[state.recipient],'I15':state.rate/100,'I16':business?0:1,'I17':$('settleCampaign').value.trim(),'I18':b.start+' ~ '+b.end,'I20':b.filename};
 for(const original of template.footer){
  const nr=at(original.row);
  const cells=original.cells.map(c=>{
   const ref=c.ref.replace(/\d+$/,String(nr)),inactive=business&&((original.row>=14&&original.row<=17&&/^[AB]/.test(c.ref))||original.row===19&&/^[CDE]/.test(c.ref)||c.ref==='F15');
   const value=Object.hasOwn(values,c.ref)?values[c.ref]:c.value;const moneyCell=['E13','A16','B16','E15','E16','E17','E18','E19','E20'].includes(c.ref);const style=inactive?template.disabledStyle:moneyCell&&typeof value==='number'&&!Number.isInteger(value)?(c.ref==='E20'?template.finalDecimalStyle:template.decimalStyle):c.style;return cell(ref,value,style,formulas[c.ref]||'');
  });
  const meta=values['I'+original.row],height=Math.max(original.row===20?38:32,[17,20].includes(original.row)?lineCount(meta,widths[8])*14+4:0);
  rows.push('<x:row r="'+nr+'" ht="'+height+'" customHeight="1">'+cells.join('')+'</x:row>');
 }
 const shiftRef=ref=>ref.replace(/([A-Z]+)(\d+)/g,(_,col,row)=>col+(Number(row)>=13?at(Number(row)):row));
 const statuses=[...new Set(b.rows.filter(r=>r.excluded).map(r=>String(r.values[7])))];
 // Use the exact same excluded status values as the financial SUMIF formulas.
 const cancelFormula=statuses.length?'OR('+statuses.map(status=>'$H2="'+status.replaceAll('"','""')+'"').join(',')+')':'FALSE';
 const suffix=template.suffix.replace(/<x:conditionalFormatting[\s\S]*?<\/x:conditionalFormatting>/g,block=>block.replace(/sqref="[^"]+"/,'sqref="A2:I'+(b.rows.length+1)+'"').replace(/<x:formula>[\s\S]*?<\/x:formula>/,'<x:formula>'+xmlText(cancelFormula)+'</x:formula>')).replace(/(?<!sq)ref="([^"]+)"/g,(_,ref)=>'ref="'+shiftRef(ref)+'"');
 parts['xl/worksheets/sheet1.xml']=template.prefix.replace(/<x:dimension[^>]*\/>/,'<x:dimension ref="A1:I'+at(20)+'"/>')+'<x:sheetData>'+rows.join('')+'</x:sheetData>'+suffix;
 const sheetName=business?'전달용_사업자':'전달용_개인';
 parts['xl/workbook.xml']=parts['xl/workbook.xml'].replace(/name="전달용_개인"/,'name="'+sheetName+'"');
 const campaign=($('settleCampaign').value.trim()||'공동구매').replace(/[\\/:*?"<>|]/g,'_');
 return {bytes:zipWorkbook(parts),filename:campaign+'_공구정산_'+settlementRecipients[state.recipient]+'_'+state.rate+'%.xlsx',model:m,sheetName};
}
function settlementDownload(){
 try{const result=settlementWorkbook(),url=URL.createObjectURL(new Blob([result.bytes],{type:settlementXlsxMime})),link=node('a');link.href=url;link.download=result.filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);settlementNotice(result.sheetName+' 시트를 다운로드했습니다. 지급액 '+settlementMoney(result.model.payment));}
 catch(error){settlementNotice(error.message,true);}
}
settlementRender();

document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('view')==='settlement')switchWorkView('settlement');},{once:true});
