import re
def apply_schedule_notes(markup,data):
 def replace(old,new):
  nonlocal markup
  if markup.count(old)!=1:raise ValueError('Notes anchor missing or ambiguous: '+old[:100])
  markup=markup.replace(old,new,1)
 sales='<fieldset class="sales-fields"><legend>매출</legend>'
 if markup.count(sales)!=2:raise ValueError('Expected add and edit sales fields')
 notes=lambda attrs: '<label class="full notes-field">특이사항<textarea '+attrs+' rows="2" maxlength="200" placeholder="예: 수수료 협의" aria-describedby="notesGuide'+('Edit' if 'editNotes' in attrs else 'Add')+'"></textarea><small class="field-hint" id="notesGuide'+('Edit' if 'editNotes' in attrs else 'Add')+'">입력한 경우에만 일정명 끝에 표시됩니다.</small></label>'
 markup=markup.replace(sales,notes('id="editNotes"')+sales,1)
 # Second occurrence is in the registration form.
 add=markup.index('<form id="addForm">')
 markup=markup[:add]+markup[add:].replace(sales,notes('name="specialNotes" id="addNotes"')+sales,1)
 replace("function composeScheduleTitle(influencer,product){return [influencer.trim(),product.trim()].filter(Boolean).join(' - ');}", """function notesSuffix(value){const text=(typeof value==='string'?value:'').trim().replace(/\\s+/g,' ');return text?' - '+text:'';}
function appendScheduleNotes(title,value){return title+notesSuffix(value);}
function scheduleTitleBase(s){const suffix=notesSuffix(s.specialNotes);return suffix&&s.title.endsWith(suffix)?s.title.slice(0,-suffix.length):s.title;}
function composeScheduleTitle(influencer,product,specialNotes=''){return appendScheduleNotes([influencer.trim(),product.trim()].filter(Boolean).join(' - '),specialNotes);}""")
 # Both registration handlers compose the same model; the final binding handles validation.
 markup=markup.replace('title:composeScheduleTitle(f.title,f.product)','specialNotes:(f.specialNotes||"").trim(),title:composeScheduleTitle(f.title,f.product,f.specialNotes)')
 replace('const title=composeScheduleTitle(form.elements.title.value,form.elements.product.value);','const title=composeScheduleTitle(form.elements.title.value,form.elements.product.value,form.elements.specialNotes.value);')
 replace("$('addForm').elements.product.addEventListener('input',updateAddPreview);","$('addForm').elements.product.addEventListener('input',updateAddPreview);\n$('addForm').elements.specialNotes.addEventListener('input',updateAddPreview);")
 markup=markup.replace("composeScheduleTitle($('editTitle').value,$('editProduct').value)","composeScheduleTitle($('editTitle').value,$('editProduct').value,$('editNotes').value)")
 replace("for(const id of ['editTitle','editProduct'])","for(const id of ['editTitle','editProduct','editNotes'])")
 replace("$('editCanceled').checked=s.status==='취소';const v=salesOf(s);","$('editCanceled').checked=s.status==='취소';$('editNotes').value=s.specialNotes||'';const v=salesOf(s);")
 replace("product:$('editProduct').value,type:s.type};","product:$('editProduct').value,type:s.type,notes:$('editNotes').value};")
 replace("if(s.type!=='공동구매')return s.title;const f=openingFields(s);const handle=","if(s.type!=='공동구매')return scheduleTitleBase(s);const f=openingFields(s);const handle=")
 replace("handle||s.title;}","handle||scheduleTitleBase(s);}")
 replace("product=$('editProduct').value.trim(),start=","product=$('editProduct').value.trim(),notes=$('editNotes').value.trim(),start=")
 replace("s.title=composeScheduleTitle(title,product);","s.title=composeScheduleTitle(title,product,notes);")
 replace("s.listProduct=product;}Object.assign(s,sales,{owner:","s.listProduct=product;}else if(notes!==editInitial.notes){if(s.imported&&!s.originalTitle)s.originalTitle=s.title;s.title=appendScheduleNotes(scheduleTitleBase(s),notes);}Object.assign(s,sales,{specialNotes:notes,owner:")
 replace("+' : '+f.product;}","+' : '+f.product+notesSuffix(s.specialNotes);}")
 replace("return '@'+(fields.nickname||'닉네임 확인 필요')+' : '+fields.product+' - '+ownerNames[s.owner];","return '@'+(fields.nickname||'닉네임 확인 필요')+' : '+fields.product+notesSuffix(s.specialNotes)+' - '+ownerNames[s.owner];")
 replace("node('span',fields.product,'opening-product'),document.createTextNode(' - '),","node('span',fields.product,'opening-product'),node('span',notesSuffix(s.specialNotes),'opening-notes'),document.createTextNode(' - '),")
 replace("if(s.partner)pairs.push(['거래처',s.partner]);","if(s.partner)pairs.push(['거래처',s.partner]);if(s.specialNotes?.trim())pairs.push(['특이사항',s.specialNotes.trim()]);")
 replace('</style>',""".notes-field textarea{font:inherit;width:100%;min-height:64px;resize:vertical;border:1px solid #d5dce5;border-radius:5px;background:#fff;padding:8px 10px;color:var(--ink);line-height:1.5}.notes-field textarea:focus-visible{outline:3px solid #8eb8ff;outline-offset:2px}.opening-notes:empty{display:none}#selectedDetails dd{overflow-wrap:anywhere;white-space:pre-line}
</style>""")
 return markup,data
