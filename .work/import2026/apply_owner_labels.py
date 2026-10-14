import re

OWNER_NAME_ALIASES={
 '김태수 부장(레몬트리)':'김태수',
 '김태수 차장':'김태수',
 '박정 주임':'박정',
 '손안나 알바':'손안나',
}
DISPLAY_HELPER="""const legacyOwnerLabels={A:['김태수 부장(레몬트리)','김태수 차장'],B:['박정 주임'],C:['손안나 알바']};
function ownerDisplayName(id,name){
 const names={A:'김태수',B:'박정',C:'손안나'};
 return legacyOwnerLabels[id]?.includes(name)?names[id]:name;
}
"""

def apply_owner_labels(markup,data):
 script=re.search(r'<script>(.*?)</script>',markup,re.S)
 if not script:raise ValueError('Owner labels: main script not found')
 prefix=markup[:script.start()]
 for old,new in OWNER_NAME_ALIASES.items():prefix=prefix.replace(old,new)
 code=script.group(1)
 declaration=re.search(r'const ownerNames=\{.*?\};',code)
 if not declaration:raise ValueError('Owner names declaration not found')
 updated=declaration.group(0)
 for old,new in OWNER_NAME_ALIASES.items():updated=updated.replace(old,new)
 code=code[:declaration.start()]+updated+code[declaration.end():]
 anchor='function applyCatalogSettings(settings){'
 if code.count(anchor)!=1:raise ValueError('Owner display helper anchor mismatch')
 code=code.replace(anchor,DISPLAY_HELPER+anchor,1)
 anchor='ownerNames[row.id]=row.name;colors[row.id]='
 if code.count(anchor)!=1:raise ValueError('Owner settings restore anchor mismatch')
 code=code.replace(anchor,'ownerNames[row.id]=ownerDisplayName(row.id,row.name);colors[row.id]=',1)
 code=code.replace("kind==='owner'?'예: 이름 직급':'업무유형 이름'","kind==='owner'?'예: 성함':'업무유형 이름'")
 return prefix+'<script>'+code+'</script>'+markup[script.end():],data
