// Isolated browser regression against generated preview files on loopback only.
// Run with Playwright available, TEMP/TMP and TEST_OUTPUT_DIR on the project drive.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=process.env.TEST_OUTPUT_DIR;
if(!out)throw new Error('Set TEST_OUTPUT_DIR to a local project test-output directory.');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.end(fs.readFileSync(path.join(root,'docs/index.html')));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.TEST_BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-first-run','--disk-cache-dir='+path.join(out,'cache'),'--crash-dumps-dir='+path.join(out,'crashes')]});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const origin='http://127.0.0.1:'+server.address().port;
  await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/?month=2026-10');
  assert.equal(await page.evaluate(()=>schedules.length),0);
  await page.locator('#add').click();
  await page.locator('#addForm [name=title]').fill('sample_a');
  await page.locator('#addForm [name=product]').fill('멀티보드');
  await page.locator('#addForm [name=start]').fill('2026-10-27');
  await page.locator('#addForm [name=end]').fill('2026-10-29');
  await page.locator('#addForm [name=salesCount]').fill('5');
  await page.locator('#addForm [name=salesAmount]').fill('146300');
  await page.locator('#addForm button[type=submit]').click();
  await page.locator('.event').first().click();
  await page.locator('#editNotes').fill('저장 전 메모 A');
  await page.locator('#editSalesAmount').fill('200000');
  const saved=await page.evaluate(()=>JSON.stringify(schedules));
  await page.locator('#openSalesRecords').click();
  const scroll=await page.locator('#detailDialog .dialog-body').evaluate(el=>el.scrollTop);
  const state=await page.locator('#salesRecordDialog').evaluate(el=>({open:el.open,visible:el.checkVisibility(),parent:el.parentElement.tagName,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
  assert.equal(state.open,true);assert.equal(state.visible,true);assert.equal(state.parent,'BODY');
  assert.match(await page.locator('#salesRecordSummary').innerText(),/146,300원/);
  assert.match(await page.locator('#salesRecordRows').innerText(),/정산 이력 미등록/);
  assert.match(await page.locator('#salesRecordRows').innerText(),/5건/);
  await page.locator('#salesRecordCurrent').click();
  await page.locator('#salesRecordAll').click();
  for(const close of ['X','outside','Escape','return']){
   if(close==='X')await page.locator('#closeSalesRecords').click();
   if(close==='outside')await page.mouse.click(5,5);
   if(close==='Escape')await page.keyboard.press('Escape');
   if(close==='return')await page.locator('#returnSalesRecords').click();
   assert.equal(await page.locator('#salesRecordDialog').evaluate(el=>el.open),false,close);
   assert.equal(await page.locator('#detailDialog').evaluate(el=>el.open),true,close);
   assert.equal(await page.locator('#editNotes').inputValue(),'저장 전 메모 A',close);
   assert.equal(await page.locator('#editSalesAmount').inputValue(),'200,000',close);
   assert.equal(await page.locator('#detailDialog .dialog-body').evaluate(el=>el.scrollTop),scroll,close);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'openSalesRecords',close);
   assert.equal(await page.evaluate(()=>JSON.stringify(schedules)),saved,close);
   await page.locator('#openSalesRecords').click();
  }
  // Anonymize existing UI labels only for the local screenshot.
  await page.evaluate(()=>{
   const labels=['김태수','박정','손안나'],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){const text=walker.currentNode;if(text.parentElement.closest('script,style'))continue;for(let i=0;i<labels.length;i++)text.textContent=text.textContent.replaceAll(labels[i],['A','B','C'][i]);}
  });
  await page.screenshot({path:path.join(out,'manual-sales-popup.png')});
  await page.setViewportSize({width:375,height:812});
  assert.equal(await page.locator('#salesRecordDialog').evaluate(el=>el.checkVisibility()),true);
  await page.locator('#closeSalesRecords').click();
  assert.equal(await page.locator('#detailDialog').evaluate(el=>el.open),true);
  assert.deepEqual(errors,[]);
  const result={passed:true,browser:'isolated headless Chromium',source:'generated docs/index.html on loopback',manualSales:true,visibleDialog:state,closeMethods:['X','outside','Escape','return'],draftsScrollFocusAndStoredDataPreserved:true,mobileViewport:true,javascriptErrors:errors,productionAccessed:false};
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
