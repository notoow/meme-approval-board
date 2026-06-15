# 밈 숏폼 제작 보드

GitHub Pages와 Google Sheets로 쓰는 간단한 컨펌 보드입니다.

- `index.html`: 실제 웹 화면
- `styles.css`: 단정하고 큰 글씨 중심의 UI
- `app.js`: Google Apps Script API 연동과 화면 동작
- `apps-script/Code.gs`: Google Sheets를 API처럼 쓰는 Apps Script
- `data/sample-videos.json`: 연결 전 샘플 데이터

## 사용 흐름

1. Google Sheets를 만들고 Apps Script를 연결합니다.
2. GitHub Pages에 이 폴더를 올립니다.
3. 웹 화면의 `설정`에서 Apps Script URL, 비밀번호, 사용자 이름을 저장합니다.
4. 고용주에게 Pages 주소를 공유합니다.

## 권장 시트 컬럼

`ID`, `제목`, `원본 링크`, `썸네일`, `플랫폼`, `참고 포인트`, `담당자`, `상태`, `초안 링크`, `컨펌`, `수정 요청`, `마감일`, `예약일`, `업로드 링크`, `최종 수정일`, `최종 수정자`

Apps Script의 `setupSheet`를 실행하면 위 헤더가 자동으로 만들어집니다.

## 운영 팁

- 고용주에게는 `컨펌 대기` 탭만 보게 안내하면 됩니다.
- 수정이 필요한 경우 `수정` 버튼을 누르고 메모만 남기게 하세요.
- 인스타/틱톡은 외부 썸네일 자동 수집이 막히는 경우가 많으니, 필요하면 `썸네일 이미지 링크`에 직접 이미지 주소를 넣는 방식이 안정적입니다.
