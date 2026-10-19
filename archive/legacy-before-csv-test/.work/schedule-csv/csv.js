/* Read the original CSV locally; mapping and calendar writes are separate steps. */
const scheduleCsvState={source:null,parsed:null,request:0,busy:false};
const scheduleCsvLimits={bytes:10000000,rows:50001,columns:200,cells:2000000,field:1000000,preview:20};
function scheduleCsvParse(text,delimiter){
 const rows=[],lines=[];let row=[],field='',quoted=false,closed=false,line=1,recordLine=1,cells=0;
 const pushField=()=>{if(field.length>scheduleCsvLimits.field)throw Error('내용이 너무 긴 셀이 있습니다. 원본 CSV를 확인해주세요.');row.push(field);field='';closed=false;if(row.length>scheduleCsvLimits.columns)throw Error('CSV는 최대 200개 열까지 확인할 수 있습니다.');};
 const pushRow=()=>{pushField();if(row.some(value=>value!=='')){cells+=row.length;if(cells>scheduleCsvLimits.cells||rows.length>=scheduleCsvLimits.rows)throw Error('CSV 행 또는 셀 수가 너무 많습니다. 파일을 나누어 선택해주세요.');rows.push(row);lines.push(recordLine);}row=[];};
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){
   if(ch==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}
   else{field+=ch;if(ch==='\n'||ch==='\r'&&text[i+1]!=='\n')line++;}
   continue;
  }
  if(ch===delimiter){pushField();continue;}
  if(ch==='\r'||ch==='\n'){pushRow();if(ch==='\r'&&text[i+1]==='\n')i++;line++;recordLine=line;continue;}
  if(closed){if(ch===' '||ch==='\t')continue;throw Error(line+'행: 닫는 따옴표 뒤의 구분자를 확인해주세요.');}
  if(ch==='"'){if(field!=='')throw Error(line+'행: 셀 안의 따옴표 형식을 확인해주세요.');quoted=true;}else field+=ch;
 }
 if(quoted)throw Error(recordLine+'행부터 시작한 따옴표가 닫히지 않았습니다.');
 if(row.length||field!==''||closed)pushRow();
 return {rows,lines};
}
function scheduleCsvDecode(bytes,selection='auto'){
 const decode=encoding=>new TextDecoder(encoding,{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
 let encoding=selection,text;
 if(selection==='auto'){
  if(bytes[0]===255&&bytes[1]===254)encoding='utf-16le';
  else if(bytes[0]===254&&bytes[1]===255)encoding='utf-16be';
  else{try{text=decode('utf-8');encoding='utf-8';}catch{encoding='euc-kr';}}
 }
 try{if(text===undefined)text=decode(encoding);}catch{throw Error('한글을 읽을 수 없습니다. 문자 인코딩을 바꾸거나 원본을 CSV UTF-8로 저장해주세요.');}
 if(text.includes('\u0000'))throw Error('CSV 문자 형식을 확인해주세요. UTF-8 또는 한글 Windows 형식의 CSV를 선택해주세요.');
 return {text,encoding};
}
function scheduleCsvRead(bytes,encodingSelection,delimiterSelection){
 const decoded=scheduleCsvDecode(bytes,encodingSelection);let text=decoded.text,forced='';
 const separator=text.match(/^sep=([,;\t])(?:\r\n|\r|\n)/i);if(separator){forced=separator[1];text=text.slice(separator[0].length);}
 const explicit=delimiterSelection==='tab'?'\t':delimiterSelection;
 let result,delimiter;
 if(explicit!=='auto'){delimiter=explicit;result=scheduleCsvParse(text,delimiter);}
 else if(forced){delimiter=forced;result=scheduleCsvParse(text,delimiter);}
 else{
  let best=null,firstError=null;
  for(const candidate of [',',';','\t']){
   try{
    const parsed=scheduleCsvParse(text,candidate),width=parsed.rows[0]?.length||0,sample=parsed.rows.slice(1,51),consistent=sample.filter(row=>row.length===width).length;
    const score=width>1?1000+consistent*10+Math.min(width,20):0;
    if(!best||score>best.score)best={parsed,delimiter:candidate,score};
   }catch(error){firstError??=error;}
  }
  if(!best)throw firstError||Error('CSV 내용을 확인해주세요.');
  result=best.parsed;delimiter=best.delimiter;
 }
 if(!result.rows.length)throw Error('CSV 파일에 확인할 내용이 없습니다.');
 const headers=result.rows[0],records=result.rows.slice(1),recordLines=result.lines.slice(1).map(line=>line+(separator?1:0));
 if(!records.length)throw Error('열 이름 다음에 일정 데이터가 없습니다.');
 const irregular=records.reduce((count,row)=>count+Number(row.length!==headers.length),0);
 const seen=new Set();let duplicates=0,blank=0;
 for(const value of headers){const name=value.trim();if(!name)blank++;else if(seen.has(name))duplicates++;seen.add(name);}
 return {headers,records,recordLines,encoding:decoded.encoding,delimiter,irregular,duplicates,blank};
}
function scheduleCsvFormat(parsed){
 const encoding={'utf-8':'UTF-8','euc-kr':'CP949','utf-16le':'UTF-16 LE','utf-16be':'UTF-16 BE'}[parsed.encoding]||parsed.encoding;
 return encoding+' · '+({',':'쉼표',';':'세미콜론','\t':'탭'}[parsed.delimiter]||parsed.delimiter);
}
function scheduleCsvSetBusy(busy){
 scheduleCsvState.busy=busy;$('scheduleCsvDialog').setAttribute('aria-busy',String(busy));
 for(const id of ['chooseScheduleCsv','scheduleCsvEncoding','scheduleCsvDelimiter'])$(id).disabled=busy;
 scheduleCsvRenderPlan();
}
function scheduleCsvRender(){
 scheduleCsvRenderPlan();
 const source=scheduleCsvState.source,parsed=scheduleCsvState.parsed;
 $('scheduleCsvLoaded').hidden=!source;$('scheduleCsvEmpty').hidden=!!source;$('scheduleCsvHead').replaceChildren();$('scheduleCsvBody').replaceChildren();
 if(!source||!parsed)return;
 $('scheduleCsvName').textContent=source.file.name;
 $('scheduleCsvMeta').textContent=(source.bytes.length/1024).toLocaleString('ko-KR',{maximumFractionDigits:1})+' KB · 일정 원본';
 $('scheduleCsvRows').textContent=parsed.records.length.toLocaleString('ko-KR')+'행';$('scheduleCsvColumns').textContent=parsed.headers.length+'열';$('scheduleCsvFormat').textContent=scheduleCsvFormat(parsed);
 const warnings=[];
 if(parsed.irregular)warnings.push('열 수가 다른 데이터 '+parsed.irregular.toLocaleString('ko-KR')+'행이 있습니다. 원본 구조를 확인해주세요.');
 if(parsed.duplicates)warnings.push('같은 열 이름이 '+parsed.duplicates+'개 있습니다.');
 if(parsed.blank)warnings.push('이름이 없는 열이 '+parsed.blank+'개 있습니다.');
 $('scheduleCsvWarning').textContent=warnings.join(' ');$('scheduleCsvWarning').hidden=!warnings.length;
 const head=node('tr'),lineTitle=node('th','원본 행');lineTitle.scope='col';head.append(lineTitle);
 const preview=parsed.records.slice(0,scheduleCsvLimits.preview),width=Math.max(parsed.headers.length,...preview.map(row=>row.length));
 for(let i=0;i<width;i++){const label=parsed.headers[i]||'이름 없는 열 '+(i+1),th=node('th',label);th.scope='col';head.append(th);}
 $('scheduleCsvHead').append(head);
 for(let i=0;i<preview.length;i++){
  const row=preview[i],tr=node('tr',undefined,row.length!==parsed.headers.length?'has-width-warning':''),number=node('td',String(parsed.recordLines[i]));tr.append(number);
  for(let col=0;col<width;col++){const text=row[col]??'',td=node('td'),span=node('span',text);span.title=text;td.append(span);tr.append(td);}$('scheduleCsvBody').append(tr);
 }
 $('scheduleCsvPreviewNote').textContent='전체 '+parsed.records.length.toLocaleString('ko-KR')+'행 중 처음 '+preview.length+'행 표시';
}
async function scheduleCsvImport(file){
 const request=++scheduleCsvState.request;scheduleCsvSetBusy(true);$('scheduleCsvError').textContent='';$('scheduleCsvMessage').textContent='CSV 원본을 읽고 있습니다.';
 try{
  if(!file||!/\.csv$/i.test(file.name))throw Error('.csv 형식의 일정 원본 파일을 선택해주세요.');
  if(file.size>scheduleCsvLimits.bytes)throw Error('CSV 파일은 10 MB 이하로 나누어 선택해주세요.');
  if(!file.size)throw Error('비어 있는 CSV 파일입니다.');
  const bytes=new Uint8Array(await file.arrayBuffer());if(request!==scheduleCsvState.request)return;
  const parsed=scheduleCsvRead(bytes,$('scheduleCsvEncoding').value,$('scheduleCsvDelimiter').value);
  scheduleCsvState.source={file,bytes};scheduleCsvState.parsed=parsed;scheduleCsvRender();
  $('scheduleCsvMessage').textContent='CSV 원본을 읽었습니다. '+parsed.records.length.toLocaleString('ko-KR')+'행 · '+parsed.headers.length+'열';
 }catch(error){
  if(request!==scheduleCsvState.request)return;
  $('scheduleCsvError').textContent=error.message+(scheduleCsvState.source?' 이전에 확인한 CSV는 유지했습니다.':'');
  $('scheduleCsvMessage').textContent='';
 }finally{if(request===scheduleCsvState.request)scheduleCsvSetBusy(false);}
}
function scheduleCsvReparse(){
 if(!scheduleCsvState.source)return;
 try{
  const parsed=scheduleCsvRead(scheduleCsvState.source.bytes,$('scheduleCsvEncoding').value,$('scheduleCsvDelimiter').value);
  scheduleCsvState.parsed=parsed;scheduleCsvRender();$('scheduleCsvError').textContent='';$('scheduleCsvMessage').textContent='선택한 설정으로 원본을 다시 읽었습니다.';
 }catch(error){$('scheduleCsvError').textContent=error.message+' 이전 미리보기는 유지했습니다.';}
}
function scheduleCsvClear(){
 scheduleCsvState.request++;scheduleCsvState.source=null;scheduleCsvState.parsed=null;scheduleCsvSetBusy(false);
 $('scheduleCsvFile').value='';$('scheduleCsvMessage').textContent='';$('scheduleCsvError').textContent='';scheduleCsvRender();
}
$('openScheduleCsv').onclick=()=>{$('scheduleCsvDialog').showModal();$('chooseScheduleCsv').focus();};
$('closeScheduleCsv').onclick=$('finishScheduleCsv').onclick=()=>$('scheduleCsvDialog').close();
$('chooseScheduleCsv').onclick=()=>$('scheduleCsvFile').click();
$('scheduleCsvFile').onchange=event=>{const file=event.target.files[0];event.target.value='';if(file)scheduleCsvImport(file);};
$('clearScheduleCsv').onclick=scheduleCsvClear;$('scheduleCsvEncoding').onchange=$('scheduleCsvDelimiter').onchange=scheduleCsvReparse;
const scheduleCsvDrop=$('scheduleCsvDrop');
scheduleCsvDrop.addEventListener('dragover',event=>{event.preventDefault();scheduleCsvDrop.classList.add('is-dragging');});
scheduleCsvDrop.addEventListener('dragleave',event=>{if(!scheduleCsvDrop.contains(event.relatedTarget))scheduleCsvDrop.classList.remove('is-dragging');});
$('scheduleCsvDialog').addEventListener('dragover',event=>event.preventDefault());
$('scheduleCsvDialog').addEventListener('drop',event=>{
 event.preventDefault();scheduleCsvDrop.classList.remove('is-dragging');const files=event.dataTransfer?.files;
 if(!files?.length)return;if(files.length!==1){$('scheduleCsvError').textContent='CSV 원본은 한 번에 한 파일씩 선택해주세요.';return;}scheduleCsvImport(files[0]);
});

$('applyScheduleCsv').onclick=scheduleCsvApply;
