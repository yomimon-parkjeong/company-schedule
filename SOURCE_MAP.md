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
