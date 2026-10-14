from pathlib import Path
import re
ROOT=Path(r'D:\타임블럭')
def apply_sales_number_format(markup,data):
 def replace(old,new,count=1):
  nonlocal markup
  if markup.count(old)!=count:raise ValueError('Sales format anchor mismatch '+old[:100])
  markup=markup.replace(old,new,count)
 for attr,field,unit in [('id','editSalesCount','건'),('id','editSalesAmount','원'),('name','salesCount','건'),('name','salesAmount','원')]:
  pattern=r'<input type="number" '+attr+'="'+field+r'"[^>]*>|<input '+attr+'="'+field+r'" type="number"[^>]*>'
  replacement='<span class="number-entry"><input type="text" '+attr+'="'+field+'" data-sales-number inputmode="numeric" autocomplete="off" maxlength="20" pattern="[0-9]+|[0-9]{1,3}(,[0-9]{3})+" placeholder="미입력"><span class="number-unit" aria-hidden="true">'+unit+'</span></span>'
  markup,n=re.subn(pattern,replacement,markup)
  if n!=1:raise ValueError('Sales input mismatch '+field)
 replace("$('editSalesCount').value=v.count===null?'':v.count;$('editSalesAmount').value=v.amount===null?'':v.amount;",
         "$('editSalesCount').value=v.count===null?'':v.count.toLocaleString('ko-KR');$('editSalesAmount').value=v.amount===null?'':v.amount.toLocaleString('ko-KR');")
 pattern=r'function readSalesInputs\(countRaw,amountRaw\)\{.*?\n'
 replacement=r"""function readSalesInputs(countRaw,amountRaw){
 const read=(raw,limit,label)=>{
  const value=raw.trim();if(value==='')return null;
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value))throw new Error(label+'은 0 이상의 정수로 입력해주세요.');
  const n=Number(value.replaceAll(',',''));
  if(!Number.isSafeInteger(n)||n>limit)throw new Error(label+' 입력 범위를 확인해주세요.');
  return n;
 };
 return {salesCount:read(countRaw,countLimit,'주문·결제 건수'),salesAmount:read(amountRaw,amountLimit,'매출액')};
}
"""
 markup,n=re.subn(pattern,lambda _:replacement,markup)
 if n!=1:raise ValueError('Sales parser mismatch')
 replace('주문·결제 건수를 입력합니다. 빈칸은 미입력이며, 실적이 0이면 0을 입력하세요.',
         '천 단위 쉼표가 자동으로 표시됩니다. 빈칸은 미입력이며, 실적이 0이면 0을 입력하세요.',2)
 styles=""".number-entry{position:relative;display:block;min-width:0}.number-entry input{padding-right:38px;text-align:right;font-variant-numeric:tabular-nums}.number-unit{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:600;color:#526175;pointer-events:none}
@media(max-width:480px){.sales-fields{grid-template-columns:1fr}}
"""
 replace('</style>',styles+'\n</style>')
 scripts=(ROOT/'.work/settlement-analysis/sales-number-input.js').read_text(encoding='utf-8')
 replace('const requestedMonth=',scripts+'\nconst requestedMonth=')
 return markup,data
