# 보안 정리 (SECURITY)

곡찾기는 서버 없이 GitHub Pages에 올린 **정적 사이트**입니다. 브라우저가 Last.fm과 Firebase에 직접 요청하므로, "브라우저에 있는 코드는 누구나 보고 고칠 수 있다"는 전제에서 보안을 설계했습니다. 데이터 보호는 **Firestore 보안 규칙**(서버에서 실행됨)이 맡고, 화면 쪽은 **XSS 방어·CSP·주소 검사**로 피해를 줄입니다.

> 용어
> - **보안 규칙(Firestore Security Rules)**: Firebase 서버가 모든 읽기/쓰기 요청마다 검사하는 조건. 브라우저 코드를 고쳐도 피할 수 없음
> - **XSS**: 남이 넣은 글자가 HTML/스크립트로 실행되는 공격
> - **CSP(Content-Security-Policy)**: "이 페이지는 이 출처의 스크립트·이미지만 쓴다"고 브라우저에 알려 주는 목록
> - **리퍼러 제한**: API 키를 정해진 사이트 주소에서만 쓸 수 있게 하는 Google Cloud 설정

---

## 1. 적용한 보안 조치

### 1-1. Firestore 보안 규칙 (`firestore.rules`)

| 경로 | 읽기 | 쓰기 조건 |
|---|---|---|
| `users/{uid}` | 본인만 | **만들기만** 가능 (수정·삭제 금지). 필드는 `displayName`, `photoURL`, `createdAt` 정확히 3개, 문자열 200자 이하, `createdAt`은 서버 시각 |
| `users/{uid}/playlists/{id}` | 본인만 | 필드는 `name`, `createdAt`, `updatedAt`, `tracks` 정확히 4개. `name` 문자열 1~50자, `tracks` 리스트 200개 이하, 새로 담는 곡(마지막 원소)은 정해진 6개 필드·문자열 200자 이하. `updatedAt`은 서버 시각, `createdAt`은 만들 때 서버 시각·수정할 때 바꿀 수 없음. 삭제는 본인 |
| `users/{uid}/ratings/{trackKey}` | 본인만 | 필드는 `score`, `title`, `artist`, `image`, `url`, `updatedAt` 정확히 6개. `score`는 1~5 정수, 문자열 200자 이하, `updatedAt`은 서버 시각. 삭제는 본인 |
| `tracks/{trackKey}/ratings/{uid}` | **누구나** (평균 표시용) | 문서 ID가 내 uid일 때만. 필드는 `score`, `updatedAt` 정확히 2개, `score` 1~5 정수, `updatedAt` 서버 시각. 삭제는 본인 |
| 그 밖의 모든 경로 | 거부 | 거부 |

"서버 시각"은 클라이언트가 `serverTimestamp()`로 보낸 값만 통과한다는 뜻입니다(`== request.time`). 그래서 날짜를 마음대로 조작할 수 없습니다.

### 1-2. 클라이언트 코드 ↔ 보안 규칙 대조표

규칙은 "정확히 이 필드만" 허용하므로, 코드가 보내는 필드와 한 글자라도 다르면 저장이 막힙니다. 아래처럼 하나씩 맞췄습니다. (코드에서 저장 필드를 바꾸면 이 표와 `firestore.rules`를 함께 고쳐야 합니다.)

| 작업 (파일·함수) | 경로 | 보내는 필드 | 통과하는 규칙 조건 |
|---|---|---|---|
| 최초 로그인 (`js/auth.js` `ensureUserDoc`) | `users/{uid}` (setDoc, 처음 한 번) | `displayName`·`photoURL`(200자로 자름), `createdAt: serverTimestamp()` | create: 본인, 필드 3개, 200자, 서버 시각 |
| 플레이리스트 만들기 (`js/playlist.js` `createPlaylist`) | `users/{uid}/playlists/{자동ID}` (addDoc) | `name`(1~50자로 검사), `createdAt`·`updatedAt: serverTimestamp()`, `tracks: []` | create: 필드 4개, 이름 길이, 빈 리스트, 서버 시각 |
| 새 플레이리스트 만들며 곡 담기 (`createPlaylistWithTrack`) | 위와 같음 | 위와 같음 + `tracks: [곡 1개]` (곡 = `key`, `title`, `artist`, `image`, `url`(각 200자로 자름), `addedAt: Timestamp.now()`) | 위 + 마지막 곡 형식 검사 |
| 이름 바꾸기 (`renamePlaylist`) | 같은 문서 (updateDoc) | `name`, `updatedAt: serverTimestamp()` | update: 합쳐진 문서 기준 필드 4개, `createdAt` 그대로 |
| 곡 담기 (`addTrackToPlaylist`, 트랜잭션) | 같은 문서 (get → update) | `tracks: [...기존, 새 곡]`(200개 넘으면 앱이 먼저 막음), `updatedAt` | read 본인 + update 조건, 마지막(새) 곡 형식 |
| 곡 빼기 (`removeTrackFromPlaylist`, 트랜잭션) | 같은 문서 | `tracks: 필터한 배열`, `updatedAt` | 위와 같음 |
| 플레이리스트 삭제 (`deletePlaylist`) | 같은 문서 (deleteDoc) | — | delete: 본인 |
| 평점 저장·수정 (`js/rating.js` `saveRating`, writeBatch) | `users/{uid}/ratings/{key}` + `tracks/{key}/ratings/{uid}` | ① `score`, `title`·`artist`·`image`·`url`(200자), `updatedAt` ② `score`, `updatedAt` | 두 문서 각각 필드 고정·점수 1~5 정수·서버 시각. 하나라도 실패하면 batch 전체가 취소됨 |
| 평점 삭제 (`deleteRating`, writeBatch) | 위 두 문서 | — | 둘 다 delete: 본인 |
| 목록·필터·평균 (`listPlaylists`, `listMyRatings`, `getLowRatedKeys`, `getTrackStats`) | 읽기 | — | 내 문서는 본인, 곡별 평점 집계는 공개 읽기 |

### 1-3. XSS 방어

- 곡 제목·가수·플레이리스트 이름 등 **사용자 입력과 API 응답은 모두 `textContent`로** 화면에 넣습니다(`js/utils/dom.js` `setText`). HTML로 해석되지 않으므로 `<script>`가 들어 있어도 글자로만 보입니다.
- `innerHTML`은 우리 사이트의 고정 파일(`partials/*.html`)을 넣을 때 **한 곳만** 씁니다(`js/layout.js`).
- 링크 주소는 `http:`/`https:`만 허용합니다(`js/utils/dom.js` `safeUrl`). `javascript:` 같은 주소는 링크를 숨깁니다.
- 컴포넌트 HTML은 `partials/templates.html`의 `<template>`을 복사해 쓰므로, JS 안에서 HTML 문자열을 이어 붙이지 않습니다.

### 1-4. 로그인 후 이동 주소 검사 (열린 리다이렉트 방지)

`login.html?next=...`의 `next`는 **우리 사이트의 정해진 페이지 이름**(`index`, `recommend`, `playlists`, `playlist`, `ratings` + `.html` + 안전한 문자만 쓴 쿼리)일 때만 이동합니다(`js/utils/page.js` `isSafeNextPath`). `next=https://나쁜사이트`처럼 바깥 주소를 넣어도 홈으로 갑니다.

### 1-5. Content-Security-Policy (모든 HTML의 meta 태그)

| 지시어 | 허용한 출처 | 이유 |
|---|---|---|
| `default-src` | `'self'` | 기본은 우리 사이트만 |
| `script-src` | `'self'`, `https://www.gstatic.com`, `https://apis.google.com` | 우리 JS, Firebase SDK(CDN), 구글 로그인 팝업용 스크립트 |
| `connect-src` | `'self'`, `https://ws.audioscrobbler.com`, `https://*.googleapis.com`, `https://my-friend-claude.firebaseapp.com` | Last.fm API, Firebase 인증·Firestore API |
| `img-src` | `'self'`, `https://lastfm.freetls.fastly.net`, `https://lastfm-img.freetls.fastly.net`, `https://lh3.googleusercontent.com` | 앨범 이미지(실제 Last.fm 응답에서 확인한 도메인), 구글 프로필 사진 |
| `frame-src` | `https://my-friend-claude.firebaseapp.com` | Firebase 로그인 보조 iframe |
| `style-src`, `font-src` | `'self'` | 인라인 스타일 없음 |
| `object-src` | `'none'` | 플러그인 차단 |
| `base-uri`, `form-action` | `'self'` | `<base>` 바꿔치기, 바깥으로 폼 전송 차단 |

- GitHub Pages는 응답 헤더를 바꿀 수 없어서 `<meta http-equiv>`로 넣었습니다. meta에서는 무시되는 `frame-ancestors`, `report-uri`, `sandbox`는 넣지 않았습니다.
- 인라인 `<script>`나 `onclick=` 같은 인라인 이벤트가 하나도 없어서 `'unsafe-inline'` 없이 동작합니다.

### 1-6. 외부 링크

새 창으로 여는 외부 링크(Last.fm, YouTube 검색, 소스 코드, Firebase)는 모두 `rel="noopener noreferrer"`를 붙여, 열린 페이지가 우리 페이지를 조작하거나 주소를 넘겨받지 못하게 했습니다.

### 1-7. API 키 제한 (Google Cloud 콘솔)

Firebase 웹 API 키(`Browser key (auto created by Firebase)`)에 **HTTP 리퍼러 제한**을 걸었습니다.

- 허용: `https://ericyoung0222-bot.github.io/*`, `http://localhost:5173/*`(로컬 테스트), `https://my-friend-claude.firebaseapp.com/*`(로그인 처리 페이지)
- 효과: 키를 복사해도 다른 사이트에서는 우리 Firebase 프로젝트를 호출할 수 없습니다.
- 그래서 로컬 테스트는 `npx serve . -l 5173`처럼 **5173 포트**로 해야 합니다.

### 1-8. 그 밖의 설정

- Firebase Authentication **승인된 도메인**: `ericyoung0222-bot.github.io`(배포), `localhost`(개발)
- 로그인 방법은 구글 로그인 하나만 사용
- `js/config.js`의 Firebase 설정값은 공개되어도 되는 값이며, 데이터 보호는 보안 규칙이 담당합니다.

---

## 2. 테스트 결과

### 2-1. 보안 규칙 자동 테스트 (Firestore 에뮬레이터, 2026-11-23)

`tests/firestore-rules.test.mjs` — 실제 DB가 아닌 에뮬레이터에서, 클라이언트 코드와 **같은 필드**로 읽기/쓰기를 시도합니다. **49개 모두 기대대로 동작**했습니다. (실행 방법은 파일 맨 위 주석)

**허용되어야 하는 것 (17개, 모두 허용됨)**
사용자 문서 만들기·읽기, 플레이리스트 만들기(빈 것/곡 1개와 함께), 이름 바꾸기, 곡 담기·빼기(트랜잭션), 목록 정렬 조회, 200곡 저장, 삭제, 평점 저장·수정(batch), 내 평점 목록, 2점 이하 필터, 곡 평균·인원 집계(다른 사용자·비로그인), 평점 삭제(batch)

**막혀야 하는 것 (32개, 모두 거부됨)**

| 시도 | 결과 |
|---|---|
| 다른 사람의 사용자 문서·플레이리스트·평점 읽기 | 거부 |
| 다른 사람의 플레이리스트에 쓰기 | 거부 |
| 로그인 없이 곡별 평점 쓰기 / 남의 uid로 곡별 평점 쓰기 | 거부 |
| 점수 6, 0, 3.5, 문자열 "5" | 거부 |
| 평점에 허용 안 된 필드 추가 / 필드 빠뜨리기 / 제목 201자 | 거부 |
| `updatedAt`을 클라이언트 시각으로 보내기 | 거부 |
| 플레이리스트 이름 빈 문자열 / 51자, 곡 201개, `tracks`가 리스트가 아님, 추가 필드 | 거부 |
| `createdAt` 위조 / 수정 때 `createdAt` 바꾸기 / `updatedAt` 클라이언트 시각 | 거부 |
| 새로 담는 곡에 허용 안 된 필드 / 제목 201자 / 곡 대신 문자열 | 거부 |
| 사용자 문서 수정 / 삭제(지우고 다시 만들기 우회) / 추가 필드 / 이름 201자 | 거부 |
| 규칙에 없는 경로(`admin/config`, `users/{uid}/secrets/x`) 쓰기 | 거부 |

### 2-2. 독립 검토

규칙과 코드를 서로 다른 관점(기능 호환성, 공격자, 규칙 문법)의 검토자 3명이 따로 읽고, 나온 지적은 다시 반박 검증을 거쳤습니다. 확인된 지적 중 "사용자 문서 삭제 후 재생성으로 수정 금지 우회"는 규칙에서 삭제를 막아 고쳤고, 나머지는 아래 "남은 한계"에 적었습니다.

### 2-3. 배포 사이트 수동 확인 (2026-11-23, 모두 통과)

| 항목 | 결과 |
|---|---|
| 새 규칙 배포 후: 구글 로그인, 플레이리스트 만들며 담기·기존 플레이리스트에 담기·빼기·이름 변경·삭제, 별점 주기·수정·삭제, 평균 표시, 내 평점 정렬 | 통과 |
| CSP 적용 후: 콘솔에 CSP 위반·`permission-denied` 없음 | 통과 |
| API 키 리퍼러 제한 후: 로그아웃 → 재로그인, 별점·플레이리스트 저장 | 통과 |
| 로그아웃 상태로 `playlists.html` 직접 접속 → 로그인 페이지로 이동 | 통과 |

---

## 3. 남은 한계와 이유

| 한계 | 왜 남았나 | 줄이는 방법 |
|---|---|---|
| **Last.fm API 키가 공개됨** | 서버가 없는 정적 사이트라 브라우저가 Last.fm을 직접 불러야 하고, 그러려면 키가 브라우저 코드에 있어야 함 | 과제용 키를 따로 발급했고, 과제가 끝나면 폐기. 키가 새도 Last.fm 공개 정보 조회만 가능(계정·결제 정보 없음) |
| **곡별 평점은 계정 ID(uid)와 점수가 공개 읽기** | 평균과 인원수를 누구나 볼 수 있으려면 `tracks/{곡}/ratings`를 공개해야 함. 문서 ID가 uid라서 "어떤 uid가 몇 점 줬는지"가 보임 | uid는 무작위 문자열이라 이름·이메일과 바로 연결되지 않음(사용자 문서는 본인만 읽기). 완전히 숨기려면 Cloud Functions(서버)로 평균만 따로 계산해야 함 |
| 여러 계정을 만들면 한 곡의 평균을 조작할 수 있음 | 계정마다 1표인 구조라, 구글 계정을 여러 개 쓰는 사람은 막을 수 없음 | App Check(아래), 서버에서 이상 패턴 감지 |
| 플레이리스트 `tracks` 배열 **안쪽 전체**는 검사하지 못함 | 보안 규칙 언어에 반복문이 없어서 배열 원소를 하나씩 검사할 수 없음. 새로 담는 마지막 곡만 검사 | 곡을 배열 대신 하위 컬렉션(`playlists/{id}/tracks/{key}`)으로 바꾸면 곡마다 검사 가능 |
| 두 평점 문서(내 평점 ↔ 곡별 평점)가 항상 짝이 맞는지는 규칙이 보장하지 않음 | 앱은 writeBatch로 항상 같이 쓰지만, 직접 API를 부르는 사람은 한쪽만 쓸 수 있음 | 규칙에 `getAfter()`로 짝 검사 추가 가능(쓰기마다 읽기 1회 과금) |
| 웹 API 키 자체는 공개 | Firebase 웹 앱 구조상 정상. 리퍼러 제한과 보안 규칙으로 보호 | — |

---

## 4. 추가로 할 수 있는 보안 조치 (이번에는 적용하지 않음)

- **Firebase App Check (reCAPTCHA v3)**: 우리 사이트에서 온 정상 요청인지 Google이 확인해 주는 기능. 봇이나 다른 프로그램이 Firestore를 직접 부르는 것을 막을 수 있습니다.
  - 이번에 적용하지 않은 이유: reCAPTCHA 키 발급이 필요하고, 설정을 잘못하면 정상 사용자까지 막혀 발표 직전에 사이트가 멈출 수 있음
  - 적용 순서(나중에): ① reCAPTCHA v3 사이트 키 발급 → ② Firebase 콘솔 App Check에 등록 → ③ 코드에 `initializeAppCheck` 추가(CSP에 `https://www.google.com`, `https://www.gstatic.com/recaptcha/` 허용 필요) → ④ **모니터링 모드**로 며칠 지켜보며 정상 요청 비율 확인 → ⑤ 문제없으면 Firestore에 **적용(enforce)**
- 평점 짝 검사(`getAfter`) 규칙 추가
- 플레이리스트 곡을 하위 컬렉션으로 바꿔 곡마다 검사
- Cloud Functions로 평균을 서버에서 계산하고 곡별 평점을 비공개로 전환
- 과제 종료 후: Last.fm 키 폐기, Firebase 승인된 도메인에서 `localhost` 제거, API 키 리퍼러에서 `http://localhost:5173/*` 제거
