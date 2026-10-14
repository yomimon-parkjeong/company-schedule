from pathlib import Path
import json,re,zipfile,xml.etree.ElementTree as ET
root=Path(r'D:\타임블럭\.work\settlement-calculator')
ns={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(root/'export-template.xlsx') as z:
 parts={n:z.read(n).decode('utf-8') for n in z.namelist()}
sheet=parts['xl/worksheets/sheet1.xml'];xml=ET.fromstring(sheet)
strings=[''.join(si.itertext()) for si in ET.fromstring(parts['xl/sharedStrings.xml']).findall('x:si',ns)]
def value(c):
 v=c.find('x:v',ns)
 if c.attrib.get('t')=='s':return strings[int(v.text)]
 if c.attrib.get('t')=='inlineStr':return ''.join(t.text or '' for t in c.findall('.//x:t',ns))
 if v is None:return None
 if c.attrib.get('t')=='str':return v.text or ''
 return float(v.text) if '.' in v.text else int(v.text)
rows={int(r.attrib['r']):r for r in xml.find('x:sheetData',ns)}
template={'parts':parts,'prefix':sheet.split('<x:sheetData>')[0],
'suffix':sheet.split('</x:sheetData>')[1],
'headerStyles':[c.attrib.get('s','0') for c in rows[1]],
'bodyStyles':[c.attrib.get('s','0') for c in rows[2]],
'columnWidths':[14,23,64,10,18,14,14,26,24,32],
'disabledStyle':rows[21][0].attrib.get('s','0'),
'decimalStyle':rows[22][0].attrib.get('s','0'),
'finalDecimalStyle':rows[22][1].attrib.get('s','0'),
'footer':[{'row':r,'cells':[{'ref':c.attrib['r'],'style':c.attrib.get('s','0'),'value':value(c)} for c in rows[r]]} for r in range(13,21)]}
# Placeholder row is not present in generated delivery sheets.
(root/'template.json').write_text(json.dumps(template,ensure_ascii=False),encoding='utf-8')
print('Prepared template styles, formula layout and XLSX package.')
