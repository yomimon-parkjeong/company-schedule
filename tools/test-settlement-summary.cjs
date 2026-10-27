const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'updates/v59-settlement-summary/summary.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'docs/index.html'),'utf8');
const context=vm.createContext({amountLimit:1e12});
vm.runInContext(runtime.match(/function settlementCalendarLinks\([^]*?^\}/m)[0]+'\n'+source,context);
const checks=[];
function test(label,fn){fn();checks.push(label);}
const entry=(key,basis,commission,payment)=>({key,financial:{basis,commission,payment}});
const row=(...links)=>({settlementSalesLinks:links});
test('missing differs from confirmed zero',()=>{assert.equal(context.settlementSummaryMoney(0n,0),'미등록');assert.equal(context.settlementSummaryMoney(0n,1),'0원');assert.equal(context.summarizeSettlementSales([{}]).unlinked,1);});
test('business and individual payout differ from pre-tax commission',()=>{const t=context.summarizeSettlementSales([row(entry('a',125000,18750,18750),entry('b',125000,18750,18140))]);assert.equal(t.basis,25000000n);assert.equal(t.commission,3750000n);assert.equal(t.retained,21250000n);assert.equal(t.payment,3689000n);});
test('unpaired values cannot skew net amount',()=>{const t=context.summarizeSettlementSales([row(entry('a',10000,1000,1000),entry('b',undefined,500,500),entry('c',10000,undefined,undefined)),{}]);assert.equal(t.financialKnown,1);assert.equal(t.retained,900000n);assert.equal(t.paymentKnown,2);assert.match(context.settlementSummaryCoverage(t),/일부 등록.*1\/3건.*미연결 1개/);});
test('invalid and negative money is unknown',()=>{for(const value of [null,undefined,'100',-1,Infinity,NaN,0.123,1e13])assert.equal(context.settlementSummaryCents(value),null);const t=context.summarizeSettlementSales([row(entry('x',10,11,-1))]);assert.equal(t.financialKnown,0);assert.equal(t.paymentKnown,0);});
test('legacy single link and same hash are never double-counted',()=>{const e=entry('same',10000,1000,1000),r={settlementSalesLinks:[e],settlementSalesLink:e},t=context.summarizeSettlementSales([r,row(e)]);assert.equal(t.links,1);assert.equal(t.payment,100000n);assert.equal(t.duplicates,1);});
test('different hashes remain separate records',()=>assert.equal(context.summarizeSettlementSales([row(entry('a',1,0.1,0.1),entry('b',1,0.1,0.1))]).links,2));
test('decimal sums use exact integer cents',()=>{const t=context.summarizeSettlementSales([row(entry('a',1,0.1,0.1),entry('b',1,0.2,0.2))]);assert.equal(context.settlementSummaryMoney(t.payment,t.paymentKnown),'0.3원');assert.equal(t.retained,170n);});
test('large sums retain integer precision',()=>{const t=context.summarizeSettlementSales(Array.from({length:200},(_,i)=>row(entry(String(i),1e12,0,1e12))));assert.equal(context.settlementSummaryMoney(t.payment,t.paymentKnown),'200,000,000,000,000원');});
test('read-only aggregation leaves schedules intact',()=>{const records=[{salesAmount:999999,settlementSalesLinks:[entry('a',100,10,10)]}],before=JSON.stringify(records);context.summarizeSettlementSales(records);assert.equal(JSON.stringify(records),before);});

async function browserChecks(){
 const {chromium}=require('playwright');
 const out=process.env.TEST_OUTPUT_DIR;if(!out)throw Error('Set TEST_OUTPUT_DIR on the project drive.');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(runtime);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.TEST_BROWSER_EXECUTABLE||undefined,headless:true});
  const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const origin='http://127.0.0.1:'+server.address().port;await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await page.goto(origin+'/?month=2026-10');
  assert.equal(await page.evaluate(()=>schedules.length),0);
  await page.locator('#toggleSalesSummary').click();assert.equal(await page.locator('#settlementSummaryCommission').innerText(),'미등록');checks.push('empty public preview shows unknown rather than zero');
  if(process.env.TEST_SETTLEMENT_XLSX){
   await page.locator('#add').click();for(const [name,value]of Object.entries({title:'sample_flow',product:'멀티보드',start:'2026-10-06',end:'2026-10-10'}))await page.locator('#addForm [name='+name+']').fill(value);
   await page.locator('#addForm button[type=submit]').click();await page.locator('[data-work-view=settlement]').click();
   const bytes=Array.from(fs.readFileSync(process.env.TEST_SETTLEMENT_XLSX));
   await page.evaluate(bytes=>settlementStageFiles([new File([new Uint8Array(bytes)],'sample-a.xlsx')]),bytes);
   await page.locator('input[name=settleRateRecipient][value=business]').check();await page.locator('#settleRateBusinessName').fill('예시사업자A(주)');await page.locator('input[name=settleRate][value="15"]').check();await page.locator('#settleRateContinue').click();await page.waitForFunction(()=>settlementState.book&&!settlementState.busy);
   await page.locator('#settleCalendarApply').click();await page.locator('[data-settle-schedule]').first().click();await page.locator('#settleCalendarYes').click();await page.locator('[data-work-view=all]').click();
   assert.equal(await page.locator('#salesMonthAmount').innerText(),'175,000원');assert.equal(await page.locator('#settlementSummaryBasis').innerText(),'125,000원');assert.equal(await page.locator('#settlementSummaryCommission').innerText(),'18,750원');assert.equal(await page.locator('#settlementSummaryRetained').innerText(),'106,250원');checks.push('fresh XLSX settlement flow immediately updates paired summary without changing gross');
  }
  await page.evaluate(()=>{
   const link=(key,basis,commission,payment)=>({key,financial:{basis,commission,payment},paymentStatus:'pending'});
   const campaign=(id,nickname,product,start,end,salesAmount,links,status='미표기')=>({id,title:nickname+' - '+product,influencer:nickname,product,owner:'A',type:'공동구매',start,end,salesCount:salesAmount===null?null:1,salesAmount,settlementSalesLinks:links,status});
   schedules=[
    campaign(1,'sample_a','멀티보드','2026-10-28','2026-11-04',800000,[{...link('a',450000,67500,67500),start:'2026-10-28',end:'2026-10-31'},{...link('b',250000,37500,36270),start:'2026-11-01',end:'2026-11-04'}]),
    campaign(2,'sample_b','와우펜','2026-10-06','2026-10-10',175000,[link('c',125000,18750,18140)]),
    campaign(3,'sample_c','멀티보드','2026-10-20','2026-10-22',10000,[{key:'old'}]),
    campaign(4,'sample_d','와우펜','2026-10-05','2026-10-07',null,[]),
    campaign(5,'sample_e','멀티보드','2026-10-06','2026-10-10',999999,[link('cancel',999999,100000,100000)],'취소'),
    campaign(6,'sample_f','멀티보드','2026-09-29','2026-10-02',10000,[link('carry',10000,1000,1000)])
   ];year=2026;month=9;$('salesScope').value='active';render();
  });
  const saved=await page.evaluate(()=>JSON.stringify(schedules));
  assert.equal(await page.locator('#salesMonthAmount').innerText(),'995,000원');assert.equal(await page.locator('#settlementSummaryBasis').innerText(),'835,000원');assert.equal(await page.locator('#settlementSummaryCommission').innerText(),'124,750원');assert.equal(await page.locator('#settlementSummaryRetained').innerText(),'710,250원');assert.match(await page.locator('#settlementSummaryCoverage').innerText(),/일부 등록.*4\/5건.*미연결 1개/);assert.match(await page.locator('#settlementSummaryNote').innerText(),/전체 정산 이력|주문일·지급일별 월 분할이 아니/);checks.push('active-month totals pair basis and fee, exclude cancellation, and mark partial coverage');
  await page.locator('#salesProductBreakdown summary').click();
  const product=page.locator('#salesMonthlyProducts .sku-product-total').filter({hasText:'멀티보드'});assert.match(await product.innerText(),/104,770원/);await product.locator('button').click();
  const campaignTable=page.locator('#salesMonthlyProducts .sku-campaign-table').first();
  const headings=await campaignTable.locator('thead th').allTextContents();assert.equal(headings[5],'매출액');assert.match(headings[6],/최종 지급수수료.*세금 공제 후.*지급 예정/);
  assert.match(await campaignTable.locator('tbody tr').filter({hasText:'@sample_a'}).innerText(),/103,770원/);assert.match(await campaignTable.locator('tbody tr').filter({hasText:'@sample_c'}).innerText(),/미등록/);assert.match(await campaignTable.locator('tfoot').innerText(),/104,770원/);assert.match(await page.locator('#salesMonthlyProducts>.sku-product-table>tfoot').innerText(),/122,910원/);checks.push('individual, SKU and footer payouts align to saved after-tax estimates; missing stays unknown');
  await page.locator('#salesScope').selectOption('start');assert.equal(await page.locator('#settlementSummaryCommission').innerText(),'123,750원');assert.equal(await page.locator('#settlementSummaryRetained').innerText(),'701,250원');checks.push('start-month selection removes carried campaign consistently');
  await page.evaluate(()=>{weeklyAnchor='2026-10-04';switchWorkView('week');});assert.equal(await page.locator('#settlementSummaryCommission').innerText(),'18,750원');assert.equal(await page.locator('#settlementSummaryRetained').innerText(),'106,250원');assert.match(await page.locator('#settlementSummaryTitle').innerText(),/2주차/);checks.push('week view sums only selected-week campaigns');
  assert.equal(await page.evaluate(()=>JSON.stringify(schedules)),saved);checks.push('all view and scope changes leave schedule and settlement data unchanged');
  await page.evaluate(()=>{switchWorkView('all');$('salesScope').value='active';render();});
  await page.locator('#salesProductBreakdown summary').click();await page.locator('#salesMonthlyProducts .sku-product-total').filter({hasText:'멀티보드'}).locator('button').click();
  await page.evaluate(()=>{const labels=['김태수','박정','손안나'],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const text=walker.currentNode;if(text.parentElement.closest('script,style'))continue;for(let i=0;i<labels.length;i++)text.textContent=text.textContent.replaceAll(labels[i],['A','B','C'][i]);}});
  const toastClose=page.locator('.schedule-toast button');if(await toastClose.count())await toastClose.click();
  await page.screenshot({path:path.join(out,'summary-and-sku.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.sales-settlement-summary').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);assert.equal(await page.locator('#salesMonthlyProducts').evaluate(el=>el.scrollWidth>el.clientWidth),true);await page.screenshot({path:path.join(out,'summary-mobile.png'),fullPage:true});checks.push('mobile summary fits while wide SKU table scrolls horizontally');
  assert.deepEqual(errors,[]);checks.push('no JavaScript errors');
  const result={passed:true,checks,actualBrowser:'isolated headless Edge',fixtureImportTest:!!process.env.TEST_SETTLEMENT_XLSX,productionAccessed:false};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
if(process.argv.includes('--browser'))browserChecks().catch(e=>{console.error(e);process.exitCode=1;});else console.log(JSON.stringify({passed:true,checks}));
