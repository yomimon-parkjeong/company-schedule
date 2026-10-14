import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile,FileBlob} from '@oai/artifact-tool';
const root='D:/타임블럭/.work/settlement-calculator';
const work='D:/타임블럭/.work/settlement-export-layout';
if(process.argv.includes('--verify-layout')){
 const report=[];
 for(const recipient of ['개인','사업자'])for(const rate of [10,15,20]){
  const name=recipient+'-'+rate;
  const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(work+'/'+name+'.xlsx'));
  const s=wb.worksheets.items[0],footer=9; wb.recalculate();
  const calc=(r)=>{const commission=300000*r/100,income=recipient==='사업자'?0:Math.floor(commission*.03/10)*10,local=recipient==='사업자'?0:Math.floor(income*.1/10)*10;return commission-income-local;};
  const payment=s.getRange('E'+(footer+7)).values[0][0];
  if(payment!==calc(rate))throw Error(name+' payment mismatch: '+payment);
  if(s.getRange('C'+(footer+3)).values[0][0]!=='취소건')throw Error('Export cancel label mismatch');
  if(s.getRange('F'+footer).formulas[0][0])throw Error('Coupon total formula should be removed');
  s.getRange('I'+(footer+2)).values=[[.2]]; wb.recalculate();
  if(s.getRange('E'+(footer+7)).values[0][0]!==calc(20))throw Error('Rate recalculation failed');
  s.getRange('E2').values=[[110000]]; wb.recalculate();
  const commission=310000*.2,income=recipient==='사업자'?0:Math.floor(commission*.03/10)*10,local=recipient==='사업자'?0:Math.floor(income*.1/10)*10;
  if(s.getRange('E'+(footer+7)).values[0][0]!==commission-income-local)throw Error('Order change recalculation failed');
  s.getRange('F2').values=[[999999]];wb.recalculate();
  if(s.getRange('E'+(footer+7)).values[0][0]!==commission-income-local)throw Error('Coupon affected payment');
  const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100}});
  report.push({name,payment,recalculatedAfterRateAndOrder:commission-income-local,errorScan:errors});
  if(rate===15){
   // Return to the exported values before creating the visual review.
   s.getRange('E2').values=[[100000]];s.getRange('F2').values=[[1000]];s.getRange('I'+(footer+2)).values=[[.15]];wb.recalculate();
   for(const [label,range] of [['orders','A1:J9'],['summary','A10:J16']]){
    const png=await wb.render({sheetName:s.name,range,scale:1,format:'png'});
    await fs.writeFile(work+'/'+recipient+'-'+label+'.png',new Uint8Array(await png.arrayBuffer()));
   }
  }
 }
 await fs.writeFile(work+'/recalculation-results.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));process.exit(0);
}
const wb=Workbook.create(),s=wb.worksheets.add('전달용_개인');
s.showGridLines=false;
const border={style:'thin',color:'#D8E1EB'};
s.getRange('A1:J20').format={font:{name:'Arial',size:10,color:'#243447'},rowHeight:28,verticalAlignment:'center',wrapText:true};
const headers=['번호','주문일자','상품명','수량','판매가','쿠폰금액','구매자','주문번호','처리현황','택배사/송장번호'];
s.getRange('A1:J1').values=[headers];
s.getRange('A1:J1').format={fill:'#203B59',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:30,horizontalAlignment:'center',borders:{bottom:{style:'medium',color:'#203B59'}}};
s.getRange('A2:J12').format={rowHeight:28,borders:{bottom:border,right:{style:'thin',color:'#EBEFF4'}}};
s.getRange('A2:B12').format.horizontalAlignment='center';
s.getRange('D2:D12').format.horizontalAlignment='center';
s.getRange('G2:I12').format.horizontalAlignment='center';
s.getRange('E2:F12').format.horizontalAlignment='right';
s.getRange('F2:F12').format={fill:'#F3F5F7',font:{name:'Arial',size:10,color:'#7B8794'}};
s.getRange('A2:J12').conditionalFormats.addCustom('OR($I2="취소",$I2="입금대기",$I2="반품완료",$I2="반품완료 - 환불완료")',{fill:'#FFF3CD',font:{color:'#B42318'}});
s.getRange('D2:F20').setNumberFormat('#,##0');
s.getRange('A13:C13').merge();s.getRange('A13').values=[['주문 내역 합계']];
s.getRange('D13').formulas=[['=SUM(D2:D12)']];s.getRange('E13').formulas=[['=SUM(E2:E12)']];
s.getRange('F13').values=[['합산 제외']];
s.getRange('A13:J13').format={fill:'#E6EDF5',font:{name:'Arial',size:10,bold:true,color:'#203B59'},rowHeight:30,borders:{top:{style:'medium',color:'#93A8BF'},bottom:border}};
s.getRange('D13:E13').format.horizontalAlignment='right';
s.getRange('F13').format={fill:'#F3F5F7',font:{name:'Arial',size:10,color:'#7B8794'},horizontalAlignment:'center'};
s.getRange('A14:B14').merge();s.getRange('A14').values=[['소득세 계산']];
s.getRange('A15:B15').values=[['소득세 3%','지방소득세 0.3%']];
s.getRange('A16').formulas=[['=IF($I$16=0,0,ROUNDDOWN(E18*0.03,-1))']];
s.getRange('B16').formulas=[['=IF($I$16=0,0,ROUNDDOWN(A16*0.1,-1))']];
s.getRange('A16:B16').setNumberFormat('#,##0');
s.getRange('A15:B16').format={fill:'#F0F5FA',horizontalAlignment:'center',borders:{bottom:border,right:border}};
s.getRange('A16:B16').format.font={name:'Arial',size:12,bold:true,color:'#203B59'};
s.getRange('A17:B17').merge();s.getRange('A17').values=[['세목별 10원 단위 버림']];
s.getRange('A17:B17').format={fill:'#F0F5FA',font:{name:'Arial',size:9,color:'#526175'},horizontalAlignment:'center',borders:{bottom:border}};
s.getRange('C14:G14').values=[['공구수수료 정산','수량','금액','안내',null]];s.getRange('F14:G14').merge();
s.getRange('C15:C20').values=['주문금액','취소건','정산 기준 매출','공구수수료','소득세·지방소득세','최종 지급액'].map(x=>[x]);
s.getRange('D15:E20').formulas=[['=D13','=E13'],['=0','=0'],['=D15-D16','=E15-E16'],['=$I$15','=E17*D18'],['=0.033','=A16+B16'],['=D17','=E18-E19']];
s.getRange('D18:D19').setNumberFormat('0.0%');
s.getRange('C15:E20').format={borders:{bottom:border,right:border}};
s.getRange('C16:E16').format={fill:'#FFF3CD',font:{name:'Arial',size:10,color:'#B42318'}};
s.getRange('C17:E17').format={fill:'#F0F5FA',font:{name:'Arial',size:10,bold:true,color:'#203B59'}};
s.getRange('D15:E20').format.horizontalAlignment='right';
s.getRange('F15:G20').merge();s.getRange('F15').values=[['일반 개인: 소득세 3%와 지방소득세 공제.\n세목별 10원 단위 버림.\n쿠폰은 원본 참고값이며 합산·차감하지 않습니다.']];
s.getRange('F15:G20').format={fill:'#F7F9FC',wrapText:true,font:{name:'Arial',size:10,color:'#526175'},borders:{bottom:border,right:border}};
s.getRange('H14:H20').values=['정산 대상','수수료율','세금 공제 적용','공구명','주문 기간','쿠폰 처리','불러온 파일'].map(x=>[x]);
for(let r=14;r<=20;r++)s.getRange('I'+r+':J'+r).merge();
s.getRange('I14:I20').values=[['일반 개인'],[.15],[1],[''],[''],['참고용 · 합산/차감 제외'],['']];
s.getRange('I15').setNumberFormat('0%');s.getRange('I16').setNumberFormat('[=0]"미적용";[=1]"적용";General');
s.getRange('H14:J20').format={wrapText:true,rowHeight:30,borders:{bottom:border}};
s.getRange('H14:H20').format={fill:'#EDF2F7',font:{name:'Arial',size:10,bold:true,color:'#526175'}};
s.getRange('I14:J16').format={fill:'#EDF4FF',font:{name:'Arial',size:10,color:'#1D4ED8'}};
s.getRange('A14:G14').format={fill:'#203B59',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:30,borders:{bottom:border}};
s.getRange('C20:E20').format={fill:'#E2F0E9',font:{name:'Arial',size:12,bold:true,color:'#146344'},rowHeight:34,borders:{top:{style:'medium',color:'#6FA58C'},bottom:{style:'medium',color:'#6FA58C'},right:border}};
s.getRange('I21').values=[['disabled-style']];s.getRange('I21:J21').format={fill:'#E5E7EB',font:{name:'Arial',size:10,color:'#6B7280'},wrapText:true,borders:{bottom:border}};
s.getRange('I22').values=[[1.25]];s.getRange('I22').setNumberFormat('#,##0.00');
s.getRange('I22').format.borders={bottom:border,right:border};
s.getRange('J22').values=[[1.25]];s.getRange('J22').setNumberFormat('#,##0.00');
s.getRange('J22').format={fill:'#E2F0E9',font:{name:'Arial',size:12,bold:true,color:'#146344'},horizontalAlignment:'right',borders:{top:{style:'medium',color:'#6FA58C'},bottom:{style:'medium',color:'#6FA58C'},right:border}};
const widths=[14,23,64,10,18,14,14,26,24,32];
widths.forEach((w,c)=>s.getRange(String.fromCharCode(65+c)+':'+String.fromCharCode(65+c)).format.columnWidth=w);
s.freezePanes.freezeRows(1);wb.recalculate();
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100}});
await fs.writeFile(work+'/template-error-scan.json',JSON.stringify(errors));
await (await SpreadsheetFile.exportXlsx(wb)).save(root+'/export-template.xlsx');
for(const [name,range] of [['tax','A14:B17'],['summary','C14:G20'],['info','H14:J20']]){
 try{const png=await wb.render({sheetName:s.name,range,scale:1,format:'png'});await fs.writeFile(work+'/template-'+name+'.png',new Uint8Array(await png.arrayBuffer()));}catch(e){console.log('Render error '+name+': '+e.message);}
}
console.log('Artifact-tool settlement export layout created.');
process.exit(0);
