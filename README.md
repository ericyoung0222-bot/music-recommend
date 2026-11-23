# 곡찾기 — 음악 추천 & 플레이리스트 웹사이트

좋아하는 곡 3~5개를 고르면 비슷한 곡을 추천해 주고, 구글 로그인 후 플레이리스트 저장과 별점 평가를 할 수 있는 웹사이트입니다. (교양 팀 프로젝트)

- 개발 총괄: 신원영
- CSS 디자인: 김영서, 김대욱
- 배포 주소: `https://[깃허브아이디].github.io/[레포이름]/`

> 이 README는 단계마다 채워집니다. (지금은 1단계 초안)

## 기술 구성

| 구분 | 사용 기술 |
|---|---|
| 화면 | 순수 HTML / CSS / JavaScript (ES Modules), 빌드 도구 없음 |
| 음악 데이터 | [Last.fm API](https://www.last.fm/api) |
| 로그인 | Firebase Authentication (구글 로그인) |
| DB | Cloud Firestore |
| 배포 | GitHub Pages |

## 폴더 구조

```
index.html / recommend.html / playlists.html / playlist.html / ratings.html / login.html / styleguide.html
css/
  base.css          CSS 변수(색·폰트·간격·모서리·그림자), 리셋
  components.css    공통 컴포넌트 스타일
  pages/*.css       페이지별 스타일
partials/
  header.html       공통 헤더 (layout.js가 모든 페이지에 끼워 넣음)
  footer.html       공통 푸터 + 토스트 알림 자리
  templates.html    카드·별점·토스트·모달 등 컴포넌트 HTML 템플릿
js/
  config.js         API 키, Firebase 설정 (자리표시자)
  layout.js         공통 헤더/푸터, 로그인 상태에 따른 메뉴 전환
  components/       템플릿을 복사해 채우는 렌더링 함수
  pages/            페이지별 동작
  utils/            공용 도우미 함수
assets/             로고, 기본 이미지
docs/               디자이너용 문서
```

## 로컬에서 실행하기

ES Modules는 파일을 더블클릭해서(`file://`) 열면 동작하지 않습니다. 반드시 로컬 서버로 여세요.

1. [Node.js](https://nodejs.org/) LTS를 설치합니다.
2. 이 폴더에서 터미널을 열고 실행합니다.

   ```powershell
   npx serve .
   ```

3. 터미널에 나온 주소(보통 `http://localhost:3000`)를 브라우저로 엽니다.

> VS Code를 쓴다면 "Live Server" 확장으로 열어도 됩니다.

## 설정 (단계마다 추가 예정)

- Last.fm API 키 발급 → 2단계
- Firebase 설정 → 3단계
- Firestore 보안 규칙 → 6단계
- GitHub Pages 배포 → 7단계

## 디자인과 기능 분리 규칙 (중요)

- **JS는 `data-js` 속성으로만 요소를 찾습니다.** class 이름을 바꿔도 기능이 깨지지 않습니다.
- **디자인은 class로만 합니다.** `data-js`, `data-page`, `data-template`, `data-score` 속성은 지우거나 바꾸지 마세요.
- **상태는 `is-` 클래스로 표현합니다.** (`is-loading`, `is-empty`, `is-error`, `is-active`, `is-selected`, `is-disabled`, `is-logged-in`)
- **색·폰트·간격은 `css/base.css`의 변수만 씁니다.**
