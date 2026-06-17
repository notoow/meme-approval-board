# Apps Script 설치 순서

1. Google Sheets에서 새 스프레드시트를 만듭니다.
2. 확장 프로그램 > Apps Script를 엽니다.
3. `Code.gs` 내용을 붙여넣고 저장합니다.
4. Apps Script 편집기에서 `setupSheet`를 한 번 실행합니다.
5. 실행 로그에 나온 `웹앱 설정에 입력할 접속 비밀번호`를 복사합니다.
6. 배포 > 새 배포 > 웹 앱을 선택합니다.
7. 실행 계정은 `나`, 액세스 권한은 `Anyone`으로 설정합니다.
8. 배포 URL과 접속 비밀번호를 웹앱의 설정 창에 입력합니다.

GitHub Pages에서는 일반 `fetch`가 막히는 환경을 대비해 JSONP 방식도 같이 지원합니다. 같은 배포 URL을 그대로 쓰면 됩니다.

빠른 등록 속도를 높이기 위해 `batchUpsert` 액션을 지원합니다. 설정 창의 `연결 테스트`에서 일괄 저장 가능 여부를 확인할 수 있습니다. `apps-script/Code.gs`를 바꾼 뒤에는 Apps Script에서 저장하고 웹 앱 배포를 새 버전으로 다시 배포하세요.

비밀번호 확인은 Apps Script 안에서 처리됩니다. GitHub Pages 코드에는 비밀번호가 저장되지 않습니다.

원하는 비밀번호로 바꾸고 싶으면 `changeApiSecret` 함수 안의 문구를 수정한 뒤 실행하세요.

독립형 Apps Script 프로젝트로 만들었다면 `connectSpreadsheet` 함수 안에 스프레드시트 ID를 붙여넣고 한 번 실행하세요. Google Sheets 안에서 Apps Script를 열어 만든 경우에는 보통 필요 없습니다.
