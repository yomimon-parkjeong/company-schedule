/* Read-only totals for the same campaigns as the existing sales view. */
function settlementSummaryCents(value){
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>amountLimit)return null;
 const cents=Math.round(value*100);
 return Number.isSafeInteger(cents)&&Math.abs(value-cents/100)<=0.0001?BigInt(cents):null;
}
function settlementSummaryMoney(cents,known){
 if(!known)return '미등록';
 const whole=cents/100n,fraction=String(cents%100n).padStart(2,'0').replace(/0+$/,'');
 return whole.toLocaleString('ko-KR')+(fraction?'.'+fraction:'')+'원';
}
function summarizeSettlementSales(items){
 const totals={campaigns:items.length,unlinked:0,links:0,financialKnown:0,paymentKnown:0,duplicates:0,basis:0n,commission:0n,retained:0n,payment:0n},seen=new Set();
 for(const schedule of items){
  const links=settlementCalendarLinks(schedule);if(!links.length)totals.unlinked++;
  for(const link of links){
   if(!link||typeof link!=='object'){totals.links++;continue;}
   if(typeof link.key==='string'&&link.key){if(seen.has(link.key)){totals.duplicates++;continue;}seen.add(link.key);}
   totals.links++;
   const basis=settlementSummaryCents(link.financial?.basis),commission=settlementSummaryCents(link.financial?.commission),payment=settlementSummaryCents(link.financial?.payment);
   // Match basis and fee on each record; partial metadata must not skew subtraction.
   if(basis!==null&&commission!==null&&commission<=basis){totals.financialKnown++;totals.basis+=basis;totals.commission+=commission;totals.retained+=basis-commission;}
   if(payment!==null){totals.paymentKnown++;totals.payment+=payment;}
  }
 }
 return totals;
}
function settlementSummaryCoverage(totals,kind='financial'){
 const known=kind==='payment'?totals.paymentKnown:totals.financialKnown;
 return (known<totals.links||totals.unlinked?'일부 등록 · ':'')+'정산 '+known+'/'+totals.links+'건 확인 · 미연결 '+totals.unlinked+'개 공구'+(totals.duplicates?' · 중복 자료 '+totals.duplicates+'건 제외':'');
}
function renderSettlementSalesSummary(context){
 const totals=summarizeSettlementSales(context.items);
 $('settlementSummaryTitle').textContent=context.label+' 공구 정산 요약';
 $('settlementSummaryCoverage').textContent=settlementSummaryCoverage(totals);
 $('settlementSummaryBasis').textContent=settlementSummaryMoney(totals.basis,totals.financialKnown);
 $('settlementSummaryCommission').textContent=settlementSummaryMoney(totals.commission,totals.financialKnown);
 $('settlementSummaryRetained').textContent=settlementSummaryMoney(totals.retained,totals.financialKnown);
 $('settlementSummaryNote').textContent='위 매출과 같은 공구 대상 · 해당 공구의 전체 정산 이력 중 매출·수수료가 함께 등록된 내역만 합산합니다. 주문일·지급일별 월 분할이 아니며, 미등록 내역은 0원으로 계산하지 않습니다.';
}
function settlementPayoutCell(items){
 const totals=summarizeSettlementSales(items),cell=node('td',settlementSummaryMoney(totals.payment,totals.paymentKnown),'settlement-payout-cell');
 cell.append(node('small',settlementSummaryCoverage(totals,'payment'),'settlement-payout-coverage'));
 cell.title='최종 지급수수료: 세금 공제 후 지급 예정액이며 실제 송금 완료액이 아닙니다.';
 return cell;
}
function settlementPayoutHeading(){
 const cell=node('th','최종 지급수수료');cell.scope='col';
 cell.append(node('small','세금 공제 후 · 지급 예정','settlement-payout-coverage'));
 return cell;
}
