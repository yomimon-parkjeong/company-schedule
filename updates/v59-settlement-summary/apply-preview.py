from pathlib import Path
import json

MODULE=Path(__file__).resolve().parent
ROOT=MODULE.parents[1]

def apply(source):
    if 'id="settlementSummaryBasis"' in source:
        return source
    def change(old,new,count=1):
        nonlocal source
        if source.count(old)!=count:raise RuntimeError(f'Anchor count {source.count(old)} != {count}: {old[:90]}')
        source=source.replace(old,new)
    change('</style>',(MODULE/'summary.css').read_text('utf-8')+'\n</style>')
    markup='''<section class="sales-settlement-summary" aria-labelledby="settlementSummaryTitle"><div class="settlement-summary-head"><h3 id="settlementSummaryTitle">공구 정산 요약</h3><span id="settlementSummaryCoverage" role="status"></span></div><div class="settlement-summary-metrics"><div class="settlement-summary-metric"><span>정산 기준 매출</span><strong id="settlementSummaryBasis">미등록</strong><small>매출·수수료가 함께 확인된 정산</small></div><div class="settlement-summary-metric"><span>수수료 합계</span><strong id="settlementSummaryCommission">미등록</strong><small>세전 수수료 기준</small></div><div class="settlement-summary-metric"><span>수수료 차감 후 금액</span><strong id="settlementSummaryRetained">미등록</strong><small>정산 기준 매출 − 세전 수수료</small></div></div><p id="settlementSummaryNote" class="settlement-summary-note"></p></section>'''
    change('<details id="salesProductBreakdown"',markup+'<details id="salesProductBreakdown"')
    change(' renderSkuSales(items,first);',' renderSettlementSalesSummary(context);\n renderSkuSales(items,first);')
    change("for(const title of ['시작일','닉네임','사업자명','담당자','판매건수','매출액']){const th=node('th',title);th.scope='col';head.append(th);}thead.append(head);", "for(const title of ['시작일','닉네임','사업자명','담당자','판매건수','매출액']){const th=node('th',title);th.scope='col';head.append(th);}head.append(settlementPayoutHeading());thead.append(head);")
    change("node('td',salesText(v.amount,'원')));body.append(row);", "node('td',salesText(v.amount,'원')),settlementPayoutCell([s]));body.append(row);")
    change("totalLabel.colSpan=4;totalRow.append(totalLabel,node('td',salesText(total.count,'건')),node('td',salesText(total.amount,'원')));", "totalLabel.colSpan=4;totalRow.append(totalLabel,node('td',salesText(total.count,'건')),node('td',salesText(total.amount,'원')),settlementPayoutCell(items));")
    change("for(const title of ['제품(SKU)','공구 일정','판매건수','매출액','입력 현황']){const th=node('th',title);th.scope='col';head.append(th);}thead.append(head);", "for(const title of ['제품(SKU)','공구 일정','판매건수','매출액']){const th=node('th',title);th.scope='col';head.append(th);}head.append(settlementPayoutHeading(),node('th','입력 현황'));thead.append(head);")
    change('cell.colSpan=5;cell.append(skuCampaignTable(group.items,group.name));','cell.colSpan=6;cell.append(skuCampaignTable(group.items,group.name));')
    change("node('td',salesText(v.amount,'원')),skuCoverage(v));body.append(row,panel);", "node('td',salesText(v.amount,'원')),settlementPayoutCell(group.items),skuCoverage(v));body.append(row,panel);")
    change("node('td',salesText(total.amount,'원')),skuCoverage(total));foot.append(totalRow);", "node('td',salesText(total.amount,'원')),settlementPayoutCell(items),skuCoverage(total));foot.append(totalRow);")
    change('</script>','\n'+(MODULE/'summary.js').read_text('utf-8')+'\n</script>')
    return source

if __name__=='__main__':
    path=ROOT/'developer-empty/public/index.php'
    with path.open('r',encoding='utf-8-sig',newline='') as f:source=f.read()
    # Preserve original line endings on all unmodified lines.
    result=apply(source)
    path.write_bytes(result.encode('utf-8'))
    print(json.dumps({'updated':str(path.relative_to(ROOT)),'initialSchedulesEmpty':'let schedules=[];' in result}))
