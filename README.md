# 곡찾기 — 음악 추천 & 플레이리스트 웹사이트

좋아하는 곡 3~5개를 고르면 비슷한 곡을 추천해 주고, 구글 로그인 후 플레이리스트 저장과 별점 평가를 할 수 있는 웹사이트입니다. (교양 팀 프로젝트)

- 개발 총괄: 신원영
- CSS 디자인: 김영서, 김대욱
- 배포 주소: https://ericyoung0222-bot.github.io/music-recommend/
- 저장소: https://github.com/ericyoung0222-bot/music-recommend

## 목차

1. [기술 구성](#기술-구성)
2. [폴더 구조](#폴더-구조)
3. [로컬에서 실행하기](#로컬에서-실행하기)
4. [Last.fm API 키 발급](#lastfm-api-키-발급)
5. [Firebase 설정](#firebase-설정)
6. [GitHub Pages 배포](#github-pages-배포)
7. [팀원 안내 (CSS 담당)](#팀원-안내-css-담당)
8. [주의: 공개되는 키](#주의-공개되는-키)
9. [문제 해결](#문제-해결)
10. [사용한 오픈소스·외부 서비스](#사용한-오픈소스외부-서비스)
11. [라이선스](#라이선스)

## 기술 구성

| 구분 | 사용 기술 |
|---|---|
| 화면 | 순수 HTML / CSS / JavaScript (ES Modules), 프레임워크·빌드 도구 없음 |
| 음악 데이터 | [Last.fm API](https://www.last.fm/api) (`track.search`, `track.getSimilar`, `artist.getSimilar`, `artist.getTopTracks`, `track.getInfo`) |
| 로그인 | Firebase Authentication — 구글 로그인 (`signInWithPopup`) |
| DB | Cloud Firestore |
| Firebase SDK | 공식 CDN(gstatic) 모듈 **13.4.0** — `js/firebase.js` 한 곳에서만 import |
| 배포 | GitHub Pages |

## 폴더 구조

```
index.html          메인 (서비스 소개, 추천 시작 버튼)
recommend.html      곡 입력 + 추천 결과
playlists.html      내 플레이리스트 목록 (로그인 필요)
playlist.html       플레이리스트 상세 ?id=... (로그인 필요)
ratings.html        내가 평가한 곡 목록 (로그인 필요)
login.html          구글 로그인
styleguide.html     디자이너용: 모든 컴포넌트를 가짜 데이터로 표시
css/
  base.css          CSS 변수(색·폰트·간격·모서리·그림자), 리셋, 기본 글자
  components.css    헤더, 버튼, 카드, 입력창, 별점, 토스트, 모달, 상태 화면
  pages/*.css       페이지별 스타일
partials/
  header.html       공통 헤더 (layout.js가 모든 페이지에 끼워 넣음)
  footer.html       공통 푸터 + 토스트 알림 자리
  templates.html    JS가 복사해서 쓰는 컴포넌트 HTML (카드, 별점, 모달 등)
js/
  config.js         LASTFM_API_KEY, firebaseConfig (처음엔 자리표시자)
  firebase.js       Firebase 초기화, auth/db export
  auth.js           로그인/로그아웃, 로그인 상태 구독, 로그인 필요 페이지 보호
  layout.js         공통 헤더/푸터 삽입, 로그인 상태에 따라 메뉴 전환
  lastfm.js         Last.fm API 호출 래퍼 (sessionStorage 캐시)
  recommend.js      추천 알고리즘
  playlist.js       플레이리스트 CRUD
  playlist-modal.js "플레이리스트에 추가" 모달 동작
  rating.js         평점 저장/삭제/조회/평균
  rating-ui.js      카드에 별점 연결
  components/       카드, 별점, 토스트, 모달 등 렌더링 함수
  pages/            페이지별 동작 (recommend-page.js 등)
  utils/            곡 키 생성, 디바운스, DOM 도우미 등
assets/             로고, 파비콘, 기본 앨범/프로필 이미지
docs/STYLE_GUIDE.md 디자이너용 문서
firestore.rules     Firestore 보안 규칙
serve.json          로컬 서버(npx serve) 설정
```

### 추천 알고리즘 요약 (`js/recommend.js`)

1. 입력한 곡마다 `track.getSimilar(limit=50, autocorrect=1)` 호출
2. 결과 곡마다 match 값을 점수로 더하고, 몇 개의 입력곡에서 나왔는지 셈
3. 입력곡 자체, 그리고 (로그인했다면) 내가 2점 이하로 준 곡은 제외
4. 점수 내림차순(동점이면 등장 횟수 순), 같은 가수는 최대 2곡 → 상위 15곡
5. 5곡 미만이면 입력곡 가수의 `artist.getSimilar(limit=5)` → 그 가수들의 `artist.getTopTracks(limit=3)`으로 보충 (점수 = 가수 match × 0.3)
6. Last.fm은 곡 이미지 대신 회색 별 그림을 주는 경우가 많아서, 결과 곡은 `track.getInfo`로 앨범 이미지를 한 번 더 찾음 (없으면 기본 이미지)

곡 구분은 항상 `js/utils/track-key.js`의 `makeTrackKey(artist, title)`로 합니다. (앞뒤 공백 제거 → 연속 공백 하나로 → 소문자 → `가수::곡명` → `encodeURIComponent`)

## 로컬에서 실행하기

ES Modules는 파일을 더블클릭해서(`file://`) 열면 동작하지 않습니다. **반드시 로컬 서버로 여세요.**

1. [Node.js](https://nodejs.org/) LTS를 설치합니다.
2. 이 폴더에서 터미널(PowerShell)을 열고 실행합니다.

   ```powershell
   npx serve .
   ```

3. 터미널에 나온 주소(보통 `http://localhost:3000`)를 브라우저로 엽니다.

> 폴더의 `serve.json`은 `serve`가 주소의 `.html`을 지우면서 `?id=` 같은 값까지 날려 버리는 것을 막아 줍니다. 지우지 마세요.
> VS Code의 "Live Server" 확장으로 열어도 됩니다.

설정 없이도 열리긴 하지만, 추천에는 Last.fm 키가, 로그인·플레이리스트·평점에는 Firebase 설정이 필요합니다. 설정이 없으면 화면에 안내가 뜹니다.

## Last.fm API 키 발급

1. [Last.fm](https://www.last.fm/join)에 가입하고 로그인합니다.
2. [API 계정 만들기](https://www.last.fm/api/account/create) 페이지에서 입력합니다.
   - Application name: 예) `gokchatgi-class-project`
   - Application description: 예) `교양 수업 팀 프로젝트용 음악 추천`
   - Callback URL, Application homepage: 비워 둬도 됩니다.
3. 만들고 나면 나오는 **API key**를 복사합니다. (Shared secret은 쓰지 않습니다.)
4. `js/config.js`의 `LASTFM_API_KEY` 값을 바꿉니다.

   ```js
   export const LASTFM_API_KEY = '여기에_발급받은_키';
   ```

## Firebase 설정

### 1) 프로젝트 만들기
1. [Firebase 콘솔](https://console.firebase.google.com/)에서 **프로젝트 추가**를 누릅니다.
2. 이름을 정하고 만듭니다. (Google 애널리틱스는 꺼도 됩니다.)

### 2) 웹 앱 등록
1. 프로젝트 개요 화면에서 **웹(`</>`)** 아이콘을 누릅니다.
2. 앱 닉네임을 정하고 **앱 등록**을 누릅니다. (Firebase Hosting은 체크하지 않습니다.)
3. 화면에 나온 `firebaseConfig`의 값들을 `js/config.js`의 `firebaseConfig`에 그대로 옮깁니다.
   - 나중에 다시 보려면: 프로젝트 설정(톱니바퀴) → 일반 → 내 앱 → SDK 설정 및 구성 → 구성

### 3) 구글 로그인 사용 설정
1. 왼쪽 메뉴 **빌드 → Authentication → 시작하기**
2. **Sign-in method** 탭 → **Google** → 사용 설정 → 프로젝트 지원 이메일 선택 → 저장

### 4) Firestore 만들기
1. 왼쪽 메뉴 **빌드 → Firestore Database → 데이터베이스 만들기**
2. 위치는 `asia-northeast3 (서울)`을 추천합니다. (한 번 정하면 못 바꿉니다.)
3. **프로덕션 모드**로 시작합니다. (바로 다음 단계에서 규칙을 넣습니다.)

### 5) 보안 규칙 적용
1. Firestore Database → **규칙** 탭을 엽니다.
2. 기존 내용을 모두 지우고 이 저장소의 [`firestore.rules`](firestore.rules) 내용을 **전부 복사해 붙여넣습니다.**
3. **게시**를 누릅니다.

규칙 요약:

| 경로 | 읽기 | 쓰기 |
|---|---|---|
| `users/{uid}`, `users/{uid}/playlists/*` | 본인만 | 본인만 |
| `users/{uid}/ratings/{trackKey}` | 본인만 | 본인만, score는 1~5 정수, 허용 필드(score, title, artist, image, url, updatedAt)만 |
| `tracks/{trackKey}/ratings/{uid}` | 누구나 (평균 계산용) | 문서 ID가 본인 uid일 때만, score는 1~5 정수, 허용 필드(score, updatedAt)만 |
| 그 외 모든 경로 | 거부 | 거부 |

### 6) 승인된 도메인 추가 (배포 후 로그인에 필요)
1. Authentication → **설정** 탭 → **승인된 도메인** → **도메인 추가**
2. `ericyoung0222-bot.github.io` 를 추가합니다. (`localhost`는 처음부터 들어 있습니다.)

### Firestore 데이터 구조

```
users/{uid}                          { displayName, photoURL, createdAt }
users/{uid}/playlists/{playlistId}   { name, createdAt, updatedAt, tracks: [{ key, title, artist, image, url, addedAt }] }
users/{uid}/ratings/{trackKey}       { score, title, artist, image, url, updatedAt }
tracks/{trackKey}/ratings/{uid}      { score, updatedAt }
```

평점은 `writeBatch`로 두 곳에 함께 저장/삭제되고, 평균과 인원수는 `tracks/{trackKey}/ratings`에 집계 쿼리(`average('score')`, `count()`)로 구합니다.

## GitHub Pages 배포

1. GitHub에 **공개(public)** 저장소를 만들고 코드를 `main` 브랜치에 올립니다. (무료 계정은 공개 저장소만 Pages 가능)
2. 저장소 **Settings → Pages**
3. **Source: Deploy from a branch**, **Branch: `main` / `/ (root)`** → **Save**
4. 1~2분 뒤 https://ericyoung0222-bot.github.io/music-recommend/ 에서 열립니다.
5. Firebase **승인된 도메인**에 `ericyoung0222-bot.github.io`를 추가했는지 확인합니다. (위 6번)

모든 경로가 상대 경로라서 `/레포이름/` 아래에서도 그대로 동작합니다. `.nojekyll` 파일은 GitHub Pages가 파일을 가공하지 않도록 하는 파일이니 지우지 마세요.

## 팀원 안내 (CSS 담당)

자세한 디자인 규칙은 **[docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md)** 에 있습니다.

### CSS만 수정하는 법
- 고쳐도 되는 곳: `css/`, `assets/`, HTML의 **class 이름과 문구**, `partials/*.html`의 **class와 구조**
- 건드리면 안 되는 곳: `js/` 폴더 전체, HTML의 `data-js` · `data-page` · `data-template` · `data-score` 속성
- 색·글꼴·간격은 `css/base.css`의 변수만 바꾸면 전체에 반영됩니다.

### styleguide.html로 확인하는 법
1. 로컬 서버를 켭니다. ([로컬에서 실행하기](#로컬에서-실행하기))
2. `http://localhost:3000/styleguide.html`을 엽니다.
3. 버튼, 카드, 별점, 로딩/빈 화면/에러, 토스트, 모달 등이 모두 가짜 데이터로 보입니다. 로그인이나 API 키가 없어도 됩니다.
4. 브라우저 개발자 도구(F12)의 기기 모드로 360px 폭도 확인하세요.

### 브랜치를 만들고 PR 올리는 법
1. `main`에 바로 올리지 말고 브랜치를 만듭니다. 이름은 영어 소문자로: `design/youngseo-buttons`, `design/daewook-cards`
2. CSS를 고치고 커밋합니다. 커밋 메시지 예: `style: 추천 카드 모서리와 그림자 조정`
3. GitHub에서 **Pull Request**를 만들고, 바뀐 화면 스크린샷을 붙입니다.
4. 개발 담당(신원영)이 확인하고 합칩니다.

> 설치 없이 github.com에서 바로 수정하는 방법(방법 A)과 GitHub Desktop을 쓰는 방법(방법 B)은 **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** 에 화면 순서대로 정리되어 있습니다.

## 주의: 공개되는 키

- 이 사이트는 서버가 없는 정적 사이트라서 `js/config.js`의 값은 **누구나 볼 수 있습니다.**
- **Last.fm 키**는 과제용으로 따로 발급해서 쓰고, 과제가 끝나면 Last.fm API 계정 페이지에서 폐기하세요.
- **Firebase 설정값**은 원래 공개되어도 되는 값입니다. 데이터 보호는 `firestore.rules`가 담당합니다. 규칙을 꼭 적용하세요.

## 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| "불러오는 중…"에서 멈춤, 헤더가 안 보임 | 파일을 더블클릭해서 연 경우입니다. `npx serve .`로 여세요. |
| 추천 화면에 "Last.fm API 키가 아직 설정되지 않았어요" | `js/config.js`의 `LASTFM_API_KEY`를 넣으세요. |
| "Last.fm API 키가 올바르지 않아요" | 키를 잘못 복사했습니다. 앞뒤 공백 없이 다시 넣으세요. |
| 로그인 시 "승인된 도메인에 등록되지 않았어요" | Firebase 승인된 도메인에 지금 주소의 도메인을 추가하세요. |
| 로그인 팝업이 안 뜸 | 브라우저 주소창 옆의 팝업 차단을 해제하세요. |
| 카카오톡에서 연 링크로 로그인이 안 됨 | 구글 정책상 앱 안 브라우저에서는 로그인이 막힙니다. 화면 안내대로 Chrome/Safari로 여세요. |
| 저장할 때 "권한이 없어요" | `firestore.rules`를 게시했는지, 로그인했는지 확인하세요. |
| 국내 곡 추천 결과가 적음 | Last.fm에 정보가 적은 곡입니다. 비슷한 가수의 인기곡으로 자동 보충되며, 영어 표기 제목으로 검색하면 더 잘 찾습니다. |

## 사용한 오픈소스·외부 서비스

| 이름 | 어디에 쓰나 | 라이선스 / 이용약관 |
|---|---|---|
| [Firebase JavaScript SDK](https://github.com/firebase/firebase-js-sdk) 13.4.0 | 구글 로그인(Authentication), DB(Cloud Firestore). gstatic CDN에서 불러옴 | [Apache License 2.0](https://github.com/firebase/firebase-js-sdk/blob/main/LICENSE) |
| [Firebase](https://firebase.google.com/) (Google 서비스) | 인증 서버, Firestore 데이터 저장 | [Firebase 서비스 약관](https://firebase.google.com/terms) |
| [Last.fm API](https://www.last.fm/api) | 곡 검색, 비슷한 곡·가수, 인기곡, 앨범 이미지 | [Last.fm API 이용약관](https://www.last.fm/api/tos) (음악 데이터 출처로 Last.fm을 표시해야 함 → 푸터에 표시) |
| [Firebase CLI (firebase-tools)](https://github.com/firebase/firebase-tools) | 보안 규칙 배포 (개발 도구, 사이트에는 포함 안 됨) | [MIT License](https://github.com/firebase/firebase-tools/blob/main/LICENSE) |
| [serve](https://github.com/vercel/serve) | 로컬 테스트용 서버 (개발 도구, 사이트에는 포함 안 됨) | [MIT License](https://github.com/vercel/serve/blob/main/license.md) |
| [GitHub Pages](https://pages.github.com/) | 사이트 배포 | [GitHub Pages 이용 정책](https://docs.github.com/ko/pages/getting-started-with-github-pages/github-pages-limits) |
| YouTube 검색 링크 | 곡 카드의 "YouTube에서 찾기" (검색 결과 페이지로 연결만 함, 영상을 가져오지 않음) | [YouTube 서비스 약관](https://www.youtube.com/t/terms) |

그 밖의 코드(HTML/CSS/JS), 로고와 기본 이미지(`assets/`)는 이 팀이 직접 만들었습니다.

## 라이선스

[MIT License](LICENSE) — Copyright (c) 2026 내친구클로드 팀
