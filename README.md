# 사내 일정·공동구매 정산 — 개발자 CSV 테스트
최신 전달 기준: 2026-10-19

## 실행할 파일
[developer-empty/public/index.php](developer-empty/public/index.php) 하나를 사용합니다. **처음에는 일정 0건**입니다.

    cd developer-empty
    php -S 127.0.0.1:8080 -t public

브라우저에서 http://127.0.0.1:8080/ 를 엽니다.
상단 '일정 원본 CSV'에서 [수동 입력용 원본 CSV](developer-empty/data/calendar_import_2023-02-01_2027-01-31.csv)를 선택하고 미리보기 후 반영합니다.
CSV 1,679건은 코드에 내장하지 않았으며 자동 로딩하지 않습니다.

## 전달 구성
- [개발자 실행·검증 안내](developer-empty/README.md)
- [CSV 대체 검토](developer-empty/CSV대체_검토.md)
- [소스 위치 안내](SOURCE_MAP.md)
- [후속 개발 범위](README_개발자인계.md)

## 과거 자료
기존 채워진 HTML, 이미지 전사 일정, 스크린샷, 재생성 과정과 이전 설명서는 [archive/legacy-before-csv-test](archive/legacy-before-csv-test/)에 모았습니다.
과거 비교 자료이며 현재 실행 경로나 자동 입력 대상이 아닙니다. 개발자에게 실행 폴더만 전달하려면 developer-empty/만 전달합니다.

## 현재 한계
PHP는 기존 클라이언트 시안을 제공하는 진입점입니다. 서버 DB·로그인·권한·공용 저장은 아직 구현되지 않았습니다.
CSV 반영·일정 수정·매출·정산 이력은 현재 페이지 메모리에만 유지되며 새로고침하면 일정 0건으로 돌아갑니다.
원본 CSV는 상품명 전체 교정 완료본이 아닙니다.
실제 사내 원본 CSV를 포함하므로 이 저장소는 비공개로 관리합니다.
