/* Original CSV fields remain separate from editable calendar fields. */
const scheduleCsvRequired=['sourceId','title','start','end','owner','category','type','color','influencer','product','specialNotes','status','sourceUrl'];
const scheduleCsvCalendarFields=['title','start','end','owner','category','type','color','influencer','product','specialNotes','status','startTime','endTime','timezone','allDay','colorUnresolved','typeClassification'];
function scheduleCsvValidDate(value){return /^(19|20)\d{2}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
function scheduleCsvNormalize(raw,id,filename=''){
 const value=key=>String(raw[key]??'').trim(),sourceId=value('sourceId'),title=value('title'),start=value('start'),end=value('end'),owner=value('owner'),type=value('type'),color=value('color'),status=value('status');
 if(!sourceId||!title)throw Error('sourceId와 title은 필수입니다.');
 if(!scheduleCsvValidDate(start)||!scheduleCsvValidDate(end)||end<start)throw Error('시작일·종료일은 YYYY-MM-DD로 입력하고 종료일을 확인해주세요.');
 if(owner&&!Object.hasOwn(ownerNames,owner))throw Error('등록되지 않은 담당자 키입니다: '+owner);
 if(type&&!workTypeOrder.includes(type))throw Error('등록되지 않은 업무유형입니다: '+type);
 if(color&&!/^#[0-9a-f]{6}$/i.test(color))throw Error('색상은 #RRGGBB 형식이어야 합니다.');
 if(status&&!['취소','예정','진행','완료','미표기'].includes(status))throw Error('등록되지 않은 일정 상태입니다: '+status);
 for(const key of ['startTime','endTime'])if(value(key)&&!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value(key)))throw Error('시간은 HH:MM 또는 HH:MM:SS 형식이어야 합니다.');
 if(value('allDay')&&!['true','false'].includes(value('allDay')))throw Error('allDay는 true 또는 false여야 합니다.');
 if(start===end&&value('startTime')&&value('endTime')&&value('endTime')<value('startTime'))throw Error('종료 시간을 확인해주세요.');
 const classification=classifyCalendarType(raw);
 return {id,sourceId,title,originalTitle:raw.title,start,end,owner:owner||'U',category:value('category'),type:classification.type,color:color||'#94A3B8',colorUnresolved:!color,influencer:value('influencer'),product:value('product'),specialNotes:value('specialNotes'),status:status||'미표기',startTime:value('startTime'),endTime:value('endTime'),timezone:value('timezone'),allDay:value('allDay')?value('allDay')==='true':!(value('startTime')||value('endTime')),partner:'',related:'TimeBlocks 원본 CSV',imported:true,uncertain:[],salesCount:null,salesAmount:null,sourceFile:filename,sourceCsv:{...raw},typeClassification:classification};
}
function scheduleCsvSourceEqual(a,b){return !!a&&!!b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>a[key]===b[key]);}
function scheduleCsvPlan(parsed,filename){
 if(!parsed)throw Error('먼저 CSV를 선택해주세요.');
 if(parsed.irregular||parsed.duplicates||parsed.blank)throw Error('열 이름·열 수 오류를 수정한 뒤 반영해주세요.');
 const missing=scheduleCsvRequired.filter(key=>!parsed.headers.includes(key));
 if(missing.length)throw Error('필수 열이 없습니다: '+missing.join(', '));
 const existing=new Map();for(const item of schedules){if(!item.sourceId)continue;if(existing.has(item.sourceId))throw Error('현재 일정에 원본 ID가 중복되어 있습니다.');existing.set(item.sourceId,item);}
 const incoming=new Set(),changes=new Map(),additions=[],stats={added:0,updated:0,unchanged:0,protected:0,unassigned:0,unclassified:0,unresolved:0};
 let nextId=Math.max(1000000,...schedules.map(s=>s.id))+1;
 for(let i=0;i<parsed.records.length;i++){
  const raw=Object.fromEntries(parsed.headers.map((key,column)=>[key,parsed.records[i][column]]));let item;
  try{item=scheduleCsvNormalize(raw,0,filename);}catch(error){throw Error(parsed.recordLines[i]+'행: '+error.message);}
  if(incoming.has(item.sourceId))throw Error(parsed.recordLines[i]+'행: 같은 sourceId가 중복되어 있습니다.');incoming.add(item.sourceId);
  if(!raw.owner.trim())stats.unassigned++;if(item.type==='미분류')stats.unclassified++;if(!raw.color.trim())stats.unresolved++;
  const current=existing.get(item.sourceId);
  if(!current){item.id=nextId++;additions.push(item);stats.added++;continue;}
  if(scheduleCsvSourceEqual(current.sourceCsv,raw)){stats.unchanged++;continue;}
  const updated={...current,sourceCsv:item.sourceCsv,sourceFile:filename,originalTitle:raw.title};
  if(current.sourceCsv){
   const previous=scheduleCsvNormalize(current.sourceCsv,current.id,current.sourceFile);
   for(const field of scheduleCsvCalendarFields){
    if(JSON.stringify(current[field])===JSON.stringify(previous[field])||JSON.stringify(current[field])===JSON.stringify(item[field]))updated[field]=item[field];
    else if(JSON.stringify(previous[field])!==JSON.stringify(item[field]))stats.protected++;
   }
  }else{stats.protected++;} // Unknown provenance must not overwrite edited calendar fields.
  changes.set(current.id,updated);stats.updated++;
 }
 return {rows:schedules.map(s=>changes.get(s.id)||s).concat(additions),stats};
}
function scheduleCsvRenderPlan(){
 const box=$('scheduleCsvApplyBox');box.hidden=!scheduleCsvState.parsed;scheduleCsvState.plan=null;
 $('applyScheduleCsv').disabled=true;$('scheduleCsvApplyError').textContent='';
 if(box.hidden)return;
 try{
  const plan=scheduleCsvPlan(scheduleCsvState.parsed,scheduleCsvState.source.file.name);scheduleCsvState.plan=plan;const s=plan.stats;
  $('scheduleCsvApplySummary').textContent='신규 '+s.added.toLocaleString('ko-KR')+'건 · 원본 갱신 '+s.updated.toLocaleString('ko-KR')+'건 · 동일 '+s.unchanged.toLocaleString('ko-KR')+'건';
  $('scheduleCsvMappingNote').textContent='담당자 공란 '+s.unassigned+'건은 원래 카테고리·색상으로 표시 · 분류 미확정 '+s.unclassified+'건은 미분류'+(s.unresolved?' · 원본 색상 미확정 '+s.unresolved+'건은 회색으로 표시':'')+(s.protected?' · 직접 편집한 항목 '+s.protected+'개 유지':'');
  $('applyScheduleCsv').disabled=scheduleCsvState.busy||!(s.added+s.updated);
 }catch(error){$('scheduleCsvApplySummary').textContent='일정표 반영 조건을 확인해주세요.';$('scheduleCsvMappingNote').textContent='';$('scheduleCsvApplyError').textContent=error.message;}
}
function scheduleCsvApply(){
 if(scheduleCsvState.busy)return;
 try{
  const plan=scheduleCsvPlan(scheduleCsvState.parsed,scheduleCsvState.source.file.name),s=plan.stats;
  if(!(s.added+s.updated)){scheduleCsvRenderPlan();return;}
  schedules=plan.rows;render();scheduleCsvRenderPlan();
  $('scheduleCsvMessage').textContent='일정표에 반영했습니다. 신규 '+s.added+'건 · 갱신 '+s.updated+'건'+(s.protected?' · 직접 편집한 항목 '+s.protected+'개 유지':'')+'.';
  $('scheduleCsvError').textContent='';
 }catch(error){$('scheduleCsvError').textContent=error.message;}
}
