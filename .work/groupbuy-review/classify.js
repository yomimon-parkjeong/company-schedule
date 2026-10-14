/* Apply the user-confirmed title rules without editing sourceCsv. */
function classifyCalendarType(raw){
 const title=String(raw.title||'').trim(),explicit=String(raw.type||'').trim(),category=String(raw.category||'').trim();
 const result=(type,rule,parsed=null)=>({type,rule,version:calendarClassificationRules.version,...(parsed||{})});
 if(title.includes('페이백'))return result('페이백','payback-keyword');
 if(explicit&&explicit!=='미분류')return result(explicit,'explicit-type');
 if(new RegExp(calendarClassificationRules.nonSalesCategory,'i').test(category))return result('미분류','other-category');
 const match=title.match(new RegExp(calendarClassificationRules.identity,'i'));
 if(!match||!/[_a-z]/i.test(match[1])||calendarClassificationRules.rejectedNames.includes(match[2].trim()))return result('미분류','unresolved');
 if(new RegExp(calendarClassificationRules.nonSalesTitle,'i').test(title)&&!/(?:공구|공동구매)/.test(title))return result('미분류','other-work');
 const tail=match[3],productMatch=tail.match(new RegExp(calendarClassificationRules.products,'i'));
 if(!productMatch)return result('미분류','unresolved-product');
 const round=tail.match(/(\d+\s*차)/),product=String(raw.product||'').trim()||productMatch[0];
 return result('공동구매','nickname-name-product',{nickname:match[1].replace(/^@/,''),person:match[2].trim(),product,round:round?round[1].replace(/\s/g,''):''});
}
