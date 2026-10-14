/* Grouping separators are display-only; schedules and Excel keep numeric values. */
function formatSalesInput(input){
 const raw=input.value,start=input.selectionStart??raw.length,end=input.selectionEnd??start;
 if(!/^[0-9,]*$/.test(raw))return;
 const digits=raw.replaceAll(',','').replace(/^0+(?=\d)/,'');
 const formatted=digits.replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const position=old=>{const count=raw.slice(0,old).replace(/\D/g,'').length;let seen=0,i=0;while(i<formatted.length&&seen<count){if(/\d/.test(formatted[i]))seen++;i++;}return i;};
 input.value=formatted;input.setSelectionRange(position(start),position(end));
}
for(const input of document.querySelectorAll('[data-sales-number]')){
 input.addEventListener('input',()=>formatSalesInput(input));
 input.addEventListener('blur',()=>formatSalesInput(input));
}
