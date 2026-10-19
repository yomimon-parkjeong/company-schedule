# 소스 안내

- 실행본: 03_사내일정관리_시안.html
- 현재 데이터: 32_CSV반영_일정데이터.json (1,679건, HTML에도 동일 배열 내장)
- 원본 CSV: 자료/CSV_원본/
- 이미지 대조 데이터: 09_이미지반영_일정데이터.json (222건, 현재 달력에 중복 합치지 않음)
- 기본 담당자: owners.seed.json (DB 이관 참고용. HTML이 실시간으로 읽지 않음)
- 전체 재생성: .work/import2026/integrate_import.py
- 기능 적용 단계: .work/import2026/apply_*.py
- 담당자 표시명 관리: .work/import2026/apply_owner_labels.py
- 담당자·업무유형 편집: .work/catalog-management/manager.js
- 일정 원본 CSV 선택·미리보기·반영: .work/schedule-csv/
- 기준 CSV 데이터·카테고리 표시: .work/import2026/apply_csv_calendar.py
- 제목 형식 분류·주차별 상세: .work/groupbuy-review/, .work/import2026/apply_groupbuy_classification.py
- 고정 sourceId 숫자 대응: .work/schedule-csv/source-id-map.json
- 일정 편집·매출: .work/schedule-sales/
- 월 이력·집계 기준: .work/schedule-refinement/
- 월·주차·정산 메뉴: .work/work-navigation/
- 기존 주차별 보고 소스(현재 삽입 중단): .work/weekly-report/
- 제품별 매출: .work/sku-sales/
- 정산 계산·엑셀: .work/settlement-calculator/settlement.js, template.json
- 전달용 엑셀 서식: .work/settlement-calculator/build-template.mjs, prepare-template.py (서식 재작성에 @oai/artifact-tool 필요, 브라우저 실행에는 불필요)
- 정산에서 일정 매출 합산: .work/settlement-calculator/schedule-link.js
- 원문 이미지: 자료/2026_원본/
- 이미지 전사 자료: .work/import2026/jan-apr.json, may-aug.json, sep-jan.json
- 제품명 교정: .work/import2026/apply_product_names.py와 검토·변경이력 JSON

재생성 스크립트는 현재 D:\타임블럭을 루트로 사용합니다. 다른 경로에서 개발할 때는 Python 모듈의 ROOT를 같은 프로젝트 폴더로 통일하세요. 인계 검증에서 별도 D드라이브 폴더로 ROOT를 바꾸어 전달 소스만으로 재생성했고, HTML과 JSON이 현재 실행본과 바이트 단위로 동일했습니다.

일반 실행에는 Python이나 빌드가 필요하지 않습니다. 재생성에만 Python 3 표준 라이브러리가 필요합니다.

Edge 프로필·캐시·Git·실주문 원본 엑셀·실주문 검증 HTML은 포함하지 않았습니다. quality는 검사 결과이며 구매자 상세를 담지 않습니다. export-template.xlsx는 원본 주문 데이터가 없는 서식 템플릿입니다.
