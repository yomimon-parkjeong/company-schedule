const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const page=fs.readFileSync(path.join(root,'developer-empty/public/index.php'),'utf8').replace(/\r\n/g,'\n');
const begin=page.indexOf('function settlementStatus('),end=page.indexOf('function settlementDate(',begin);
assert(begin>=0&&end>begin);
const context={};vm.createContext(context);vm.runInContext(page.slice(begin,end),context);
const report=JSON.parse(fs.readFileSync(path.join(root,'quality/step3-cancelled-settlement-verification.json'),'utf8'));
for(const item of report.statusTests){
 if(item.expected==='error')assert.throws(()=>context.settlementStatus(item.status),/확인해야/);
 else assert.equal(context.settlementStatus(item.status),item.expected);
}
console.log('상태 회귀 검사 '+report.statusTests.length+'건 통과');
