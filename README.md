# 사내 일정·공동구매 정산 — 개발자 CSV 테스트
최신 화면 수정: 2026-10-20 · 2단계 일정 바 축소 검토 중

## 현재 검토 단계
1단계 날짜 클릭 등록은 사용자 검토 완료입니다.
[2단계 일정 바 축소](updates/2026-10-20-step2-compact-bars/README.md)를 반영했습니다. 담당자 둘째 줄을 없애고 월간 34px·주차 40px로 표시합니다. 담당자 정보와 집계는 유지합니다.
3단계 취소·환불 정산은 2단계 검토 후 진행합니다.
회사 서버와 DB는 변경하지 않았습니다. 회사 서버에는 수정분만 병합해야 하며 검토용 PHP 전체로 교체하지 않습니다.

## 브라우저 미리보기
https://yomimon-parkjeong.github.io/company-schedule/

GitHub Pages는 docs/ 폴더의 빈 일정 HTML 화면만 제공합니다. 원본 CSV·과거 자료·PHP 원문은 Pages 배포 폴더에 포함하지 않습니다.
미리보기는 일정 0건으로 시작하고 CSV를 직접 선택해 반영합니다. 새로고침하면 0건으로 돌아갑니다.
PHP 실행·서버 저장을 검증하는 주소는 아닙니다.

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
저장소에는 실제 사내 원본 CSV와 과거 자료가 있습니다. 해당 자료의 공개 범위는 GitHub 저장소 공개 설정을 따릅니다. Pages 배포 폴더에서 제외하는 것만으로 저장소 자료가 비공개로 바뀌지는 않습니다.

## 미리보기 갱신
developer-empty/public/index.php를 수정한 후 다음을 실행하고 docs/ 변경도 커밋합니다.

    python tools/build-pages-preview.py

빌더는 PHP의 응답 헤더 부분만 제거하여 같은 HTML/CSS/JavaScript를 생성합니다.
초기 일정이 빈 배열이 아니면 빌드를 중단합니다. Pages 게시 소스는 main 브랜치의 /docs입니다.
