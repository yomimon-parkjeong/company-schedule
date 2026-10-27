# 사내 일정·공동구매 정산 — 개발자 CSV 테스트
최신 화면 수정: 2026-10-27 · v59 사업자명·상세 매출 기록·수수료 요약

## 현재 검토 단계
정산 사업자명 입력과 일정 상세 편집창의 **상세 매출 기록** 팝업을 검토합니다. 매출 아래 버튼에서 열고, ×·바깥 클릭·ESC로 닫으면 편집 중인 상세창으로 돌아옵니다. [v59 변경 내용과 검증 범위](updates/v59-business-name/README.md)를 확인하세요.

누락 보완 미리보기: 월 매출 종합 아래에 **정산 기준 매출·수수료 합계·수수료 차감 후 금액**, SKU/인플루언서 매출액 오른쪽에 **최종 지급수수료(세금 공제 후 지급 예정액)**를 표시합니다. 미등록·일부 등록을 구분하며 기존 매출은 유지합니다. [집계 기준과 적용 범위](updates/v59-settlement-summary/README.md)를 확인하세요. 이번 보완은 GitHub 미리보기만 적용하며 사내 운영 PHP/Firebase는 변경하지 않습니다.

회사 운영은 별도로 전달해 사용자가 정상 적용을 확인한 Firebase 연결 v59 통합본입니다. GitHub 미리보기 PHP는 메모리 전용이므로 운영 서버에 통째로 덮어쓰지 않습니다. 전체 기간 부분 일치 검색과 기존 기능은 유지합니다.

1~3단계 사용자 검토와 v58.1 삭제·v58.2 이름 표시를 유지합니다. 이번 공개 반영은 GitHub 미리보기이며 회사 서버·DB에는 적용하지 않았습니다.

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

## 특이사항 표시 선택 (2026-10-20)
등록·편집에서 체크한 경우에만 일정 바와 요약에 특이사항을 표시합니다. 기존 일정·CSV는 기본 숨김이며 내용은 보존됩니다. [회사 서버 병합 안내](updates/2026-10-20-notes-visibility/README.md)를 따르세요. 기존 1~3단계는 사용자 확인 완료입니다.

## CSV 담당자 공동구매·서버 호환 (2026-10-20)
[업데이트 병합 안내](updates/2026-10-20-csv-owner-groupbuy/README.md): 사이트 행사·미지정 외 담당 CSV 일정은 공동구매, allDay 대소문자 호환, PHP/XML 짧은 태그 충돌 방지. 실제 CSV는 공개 업데이트에 포함하지 않습니다.

## v58.1 일정 삭제
기존 일정 편집 창 하단의 삭제→경고→취소/삭제→완료 흐름을 추가했습니다. [v58 기준 변경분과 DB 삭제 연결 안내](updates/v58.1-delete-schedule/README.md)를 따릅니다. 회사 서버에는 직접 적용하지 않았습니다.

## v58.2 닉네임(이름) 표시
CSV에 저장된 이름을 화면 제목에서 생략하던 표시를 수정했습니다. 내부 계정 매칭은 유지합니다. [변경분과 운영 병합 안내](updates/v58.2-influencer-name/README.md)를 확인하세요.
