# 현재 소스 위치

| 용도 | 위치 |
|---|---|
| 유일한 실행 진입점 | developer-empty/public/index.php |
| 수동 CSV 입력 자료 | developer-empty/data/calendar_import_2023-02-01_2027-01-31.csv |
| 실행·테스트 안내 | developer-empty/README.md |
| CSV 대체 판정·범위 | developer-empty/CSV대체_검토.md |
| 전달 파일 해시 | developer-empty/manifest.json |
| 이전 브라우저 검증 | quality/empty-handoff-verification.json |
| 이번 구성 정리 검증 | quality/csv-only-cleanup-verification.json |
| 이전 원본·이미지·전사·생성 소스 | archive/legacy-before-csv-test/ |

index.php에 기존 HTML/CSS/JavaScript, CSV 입력·중복 판별·일정 편집·집계·정산 코드가 들어 있습니다.
초기 schedules는 빈 배열이며 별도 JSON/이미지/CSV를 자동으로 읽지 않습니다.
현재 코드를 검토할 때는 index.php를 기준으로 합니다. archive의 패치 체인은 과거 생성 과정이므로 현재 전달본 빌드 명령으로 사용하지 않습니다.
기능을 모듈화하거나 PHP/DB API로 이관하는 후속 개발은 별도 범위입니다.

## GitHub Pages 전용 미리보기
- docs/index.html: 빈 PHP 전달본과 동일한 클라이언트 화면.
- docs/.nojekyll: Jekyll 문서 변환 없이 HTML 제공.
- tools/build-pages-preview.py: 빈 PHP에서 미리보기 생성. 초기 일정이 0건인지 검증.
- 게시 소스: main /docs. data·archive·quality 폴더를 배포하지 않음.

## 2026-10-20 1단계
- updates/2026-10-20-step1-date-click/: 날짜 클릭 기능 변경분과 회사 서버 병합 안내.
- quality/step1-date-click-verification.json: 단계별 UI 검증.
- 현재 서버의 DB 연결 코드는 GitHub 검토용 PHP에 없으므로 전체 파일 교체 금지.

## 2026-10-20 2단계
- updates/2026-10-20-step2-compact-bars/: 2단계 단독/1·2단계 통합 변경분과 회사 서버 병합 안내.
- quality/step2-compact-bars-verification.json: 가상 일정으로 바 높이·담당자 정보·1단계 유지 검증.
- 1·2·3단계 사용자 승인 완료.

## 2026-10-20 3단계
- updates/2026-10-20-step3-cancelled-settlement/: 3단계 단독/1~3단계 통합 변경분, 상태 회귀 검사와 회사 서버 병합 안내.
- quality/step3-cancelled-settlement-verification.json: 개인정보·실제 금액이 없는 검증 결과.
- 1·2·3단계 사용자 승인 완료. 실제 주문 파일과 검증 출력은 저장소 밖에 로컬 보관.

## 특이사항 표시 선택 (2026-10-20)
등록·편집에서 체크한 경우에만 일정 바와 요약에 특이사항을 표시합니다. 기존 일정·CSV는 기본 숨김이며 내용은 보존됩니다. [회사 서버 병합 안내](updates/2026-10-20-notes-visibility/README.md)를 따르세요. 기존 1~3단계는 사용자 확인 완료입니다.
