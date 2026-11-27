# 기여 안내 (CSS 디자인 담당용)

이 문서는 **코딩을 몰라도** 순서대로 따라 하면 디자인 작업을 GitHub에 올릴 수 있게 정리한 안내서입니다.
디자인 규칙(어떤 class가 어디에 쓰이는지, CSS 변수 목록 등)은 [STYLE_GUIDE.md](STYLE_GUIDE.md)에 있으니 함께 보세요.

- 레포 주소: `https://github.com/ericyoung0222-bot/music-recommend`
- 개발 총괄(질문 받는 사람): **신원영**
- CSS 디자인: 김영서, 김대욱

> 화면에 보이는 GitHub 버튼 이름은 영어 그대로 **(괄호 안에)** 적었습니다. 화면에서 그 글자를 찾아 누르면 됩니다. 프로그램 버전에 따라 글자가 조금 다를 수 있으니 비슷한 이름을 찾으세요.

## 목차

1. [먼저 알아 둘 말 5개](#1-먼저-알아-둘-말-5개)
2. [시작 전 준비](#2-시작-전-준비)
3. [고쳐도 되는 것 / 건드리면 안 되는 것](#3-고쳐도-되는-것--건드리면-안-되는-것)
4. [방법 A: 설치 없이 GitHub 웹사이트에서 고치기](#4-방법-a-설치-없이-github-웹사이트에서-고치기)
5. [방법 B: GitHub Desktop으로 고치기 (추천)](#5-방법-b-github-desktop으로-고치기-추천)
6. [PR을 올린 뒤](#6-pr을-올린-뒤)
7. [커밋 이메일 주의 (잔디가 안 심어질 때)](#7-커밋-이메일-주의-잔디가-안-심어질-때)
8. [커밋 메시지와 PR 작성 규칙](#8-커밋-메시지와-pr-작성-규칙)
9. [자주 하는 실수와 해결](#9-자주-하는-실수와-해결)
10. [막히면](#10-막히면)

---

## 1. 먼저 알아 둘 말 5개

| 말 | 쉽게 말하면 |
|---|---|
| **레포(repository)** | 우리 프로젝트 파일이 모두 들어 있는 GitHub의 폴더 |
| **main** | 실제 사이트에 올라가는 "원본" 줄기. **여기에 직접 고치지 않습니다.** |
| **브랜치(branch)** | 원본을 복사해서 만든 "내 작업용 사본". 여기서 마음껏 고칩니다. |
| **커밋(commit)** | "여기까지 고쳤음" 하고 저장하는 것 (메모를 붙여서 저장) |
| **PR (Pull Request)** | "내 브랜치에서 고친 걸 main에 합쳐 주세요"라는 요청서. 신원영이 확인하고 합칩니다. |

전체 흐름은 항상 같습니다.

```
이슈 확인 → 브랜치 만들기 → CSS 고치기 → 커밋 → PR 올리기 → 리뷰 반영 → 신원영이 합침(merge)
```

---

## 2. 시작 전 준비

### 2-1. GitHub 가입

1. <https://github.com> 에 접속해 오른쪽 위 **(Sign up)** 을 누릅니다.
2. 이메일, 비밀번호, 아이디(username)를 정하고 안내대로 가입합니다.
   - 아이디는 영어로 짓고, 나중에 신원영에게 알려 주세요. (초대할 때 필요)
3. 가입 중이나 가입 후에 이메일로 온 **인증 코드(또는 인증 메일)** 로 이메일 인증을 마칩니다.
4. 가입 후 **2단계 인증(2FA)** 설정 안내가 뜨면 화면 안내대로 직접 설정하세요. (휴대폰 인증 앱 등)

### 2-2. 레포 초대(Collaborator) 수락

신원영이 레포에 여러분을 **Collaborator(공동 작업자)** 로 초대합니다. 초대를 수락해야 파일을 고칠 수 있습니다.

1. 가입한 이메일함에서 GitHub가 보낸 초대 메일을 엽니다. (제목에 `invited you to` 가 들어 있음)
2. 메일 안의 **(View invitation)** 을 누릅니다.
3. 열린 화면에서 초록색 **(Accept invitation)** 을 누릅니다.

메일이 안 보이면:
- GitHub에 로그인한 상태에서 주소창에 `https://github.com/ericyoung0222-bot/music-recommend/invitations` 를 직접 입력합니다.
- 초대는 **7일이 지나면 만료**됩니다. 만료됐으면 신원영에게 다시 초대해 달라고 하세요.

> 초대를 수락하지 않은 상태에서 파일을 고치려고 하면 "Fork this repository"(내 계정에 복사하기) 같은 문구가 뜹니다. 이건 누르지 말고 초대부터 수락하세요.

### 2-3. 내 이슈(할 일) 찾는 법

할 일은 **이슈(Issue)** 로 정리되어 있습니다. 이슈 하나 = 작업 하나입니다.

1. 레포 페이지 `https://github.com/ericyoung0222-bot/music-recommend` 에 들어갑니다.
2. 위쪽 탭에서 **(Issues)** 를 누릅니다.
3. 목록 위의 **(Assignee)** 필터를 눌러 내 아이디를 고릅니다.
   - 또는 검색창에 `is:issue is:open assignee:@me` 를 입력하고 Enter.
4. 제목을 눌러 내용을 읽습니다. 제목 옆의 **`#12`** 같은 숫자가 **이슈 번호**입니다. PR 올릴 때 필요하니 기억해 두세요.
5. 작업을 시작할 때 이슈 아래 댓글 칸에 "작업 시작할게요"라고 남기고 **(Comment)** 를 누르면 다른 사람과 겹치지 않습니다.

> 이슈에 "styleguide.html의 `#sg-buttons` 섹션 확인" 같은 말이 있으면, styleguide 페이지에서 그 부분을 보면 된다는 뜻입니다. ([styleguide 섹션 목록](#styleguidehtml-섹션-바로가기))

---

## 3. 고쳐도 되는 것 / 건드리면 안 되는 것

### 고쳐도 되는 것

| 파일·폴더 | 고쳐도 되는 내용 |
|---|---|
| `css/base.css` | `:root` 안의 색·글꼴·간격·모서리·그림자 **변수 값**. `#4a4ae0` 같은 색 코드는 **이 파일에만** 씁니다. |
| `css/components.css` | 버튼, 카드, 별점, 토스트, 모달 등 공통 부품 모양 |
| `css/pages/*.css` | 페이지별 모양 (예: `css/pages/home.css`) |
| `assets/` | 로고, 기본 앨범 이미지, 파비콘. **파일 이름은 그대로 두고** 내용만 바꿉니다. |
| 각 페이지 `*.html` | **class 이름**과 화면에 보이는 **문구** |
| `partials/header.html`, `partials/footer.html`, `partials/templates.html` | **class 이름**, **문구**, 태그 구조 (단, `data-js`, `data-page`, `data-template`, `data-score`가 붙은 요소는 지우지 않기) |

### 건드리면 안 되는 것

| 파일·속성 | 이유 |
|---|---|
| `js/` 폴더 전체 | 사이트 기능(추천, 로그인, 플레이리스트, 별점)이 들어 있습니다. 열 필요도 없습니다. |
| `js/config.js` | API 키와 Firebase 설정이 들어 있습니다. 특히 절대 고치지 마세요. |
| HTML의 `data-` 로 시작하는 속성 전부 (`data-js`, `data-page`, `data-template`, `data-score` 등) | 기능이 요소를 찾는 **이름표**입니다. 지우거나 바꾸면 버튼이 안 눌리거나 화면이 안 나옵니다. |
| 상태 클래스 **이름** (`is-loading`, `is-empty`, `is-error`, `is-active`, `is-selected`, `is-disabled`, `is-logged-in`, `is-success`, `is-added`, `is-leaving`) | JS가 붙였다 뗐다 합니다. **이름은 그대로, 모양(CSS)만** 정하세요. |
| `firestore.rules` | 데이터베이스 보안 규칙 |
| `serve.json` | 로컬 서버 설정 |
| `.nojekyll` | GitHub Pages 배포에 필요한 빈 파일 (지우면 사이트가 깨질 수 있음) |
| `.gitignore`, `.gitattributes`, `.github/` | 프로젝트 설정 파일 |

### 웬만하면 그대로 두는 것

HTML 안의 `id`, `for`, `aria-`로 시작하는 속성, `hidden`, `type`, `href`, `src`, 그리고 `<script>`, `<link>` 줄은 기능이나 접근성(화면 읽어 주는 프로그램)에 쓰입니다. 바꿔야 할 것 같으면 먼저 신원영에게 물어보세요.
새 CSS 파일을 만들고 싶을 때도 HTML에 연결이 필요하니 먼저 말해 주세요.

> **헷갈리면 이렇게 기억하세요:** `class="..."` 와 화면에 보이는 글자는 OK, `data-...="..."` 는 손대지 않기, `js/` 폴더는 열지 않기.

---

## 4. 방법 A: 설치 없이 GitHub 웹사이트에서 고치기

프로그램 설치 없이 브라우저만으로 고치는 방법입니다.

> **한계:** 이 방법으로는 고친 결과 화면을 **미리 볼 수 없습니다.** (CSS가 실제로 어떻게 보이는지 확인 불가)
> 그래서 **색 변수 값 하나 바꾸기, 문구 수정, 간격 숫자 조정 같은 작은 수정**에만 쓰세요.
> 레이아웃을 바꾸거나 여러 곳을 크게 고칠 때는 [방법 B](#5-방법-b-github-desktop으로-고치기-추천)를 쓰세요.

### 4-1. 파일 하나 고치고 PR 올리기

1. 레포 페이지 `https://github.com/ericyoung0222-bot/music-recommend` 에 들어갑니다.
2. 파일 목록 위의 **브랜치 선택 버튼**(나뭇가지 아이콘 옆에 `main`이라고 적힌 버튼)이 `main`인지 확인합니다.
3. 파일 목록에서 고칠 파일을 찾아 누릅니다. 예: `css` → `components.css`
4. 파일 내용 오른쪽 위의 **연필 아이콘 (Edit this file)** 을 누릅니다.
5. 편집 화면에서 내용을 고칩니다.
   - 색은 `#코드`로 직접 쓰지 말고 `var(--color-primary)`처럼 변수만 쓰세요. (색 코드는 `css/base.css`에만)
6. 오른쪽 위 초록색 **(Commit changes...)** 를 누릅니다.
7. 뜨는 창에서:
   1. **(Commit message)** 칸에 무엇을 바꿨는지 적습니다. 예: `style: 주요 버튼 모서리를 더 둥글게`
   2. 아래 두 가지 중 **(Create a new branch for this commit and start a pull request)** 를 고릅니다.
      - ⚠️ **(Commit directly to the `main` branch)** 는 고르지 마세요.
   3. 브랜치 이름 칸에 자동으로 적힌 `아이디-patch-1` 같은 이름을 지우고 **`design/이름-작업`** 형식으로 바꿉니다.
      - 예: `design/youngseo-buttons`, `design/daewook-card`
      - 영어 소문자, 띄어쓰기 대신 `-` 를 쓰세요. (README에는 한글 예시가 있지만, 브랜치 이름은 영어로 통일합니다)
   4. **(Propose changes)** 를 누릅니다.
8. **(Open a pull request)** 화면이 열립니다.
   - 위쪽에 `base: main` ← `compare: design/youngseo-buttons` 처럼 되어 있는지 확인합니다.
   - 제목을 확인하고, 설명 칸에 자동으로 나온 **PR 템플릿**을 채웁니다. ([5-9 PR 템플릿 채우기](#5-9-pr-템플릿-채우기) 참고)
9. 초록색 **(Create pull request)** 를 누르면 끝입니다.

### 4-2. 같은 PR에서 파일 여러 개 고치기

PR을 만든 뒤 다른 파일도 같은 작업에 포함하고 싶으면, **같은 브랜치**에서 이어서 고치면 됩니다. 그러면 기존 PR에 자동으로 추가됩니다.

1. 레포 첫 화면으로 돌아갑니다. (`https://github.com/ericyoung0222-bot/music-recommend`)
2. 파일 목록 위의 **브랜치 선택 드롭다운**(`main`이라고 적힌 버튼)을 누릅니다.
3. 검색칸에 내 브랜치 이름(예: `design/youngseo-buttons`)을 입력해 고릅니다.
   - 이제 버튼에 `main` 대신 내 브랜치 이름이 보여야 합니다.
4. 고칠 파일을 열고 **연필 아이콘 (Edit this file)** → 수정 → **(Commit changes...)**
5. 이번에는 창에서 **(Commit directly to the `design/youngseo-buttons` branch)** 를 고릅니다. (내 브랜치 이름이 적힌 쪽)
6. **(Commit changes)** 를 누릅니다.
7. PR 페이지의 **(Files changed)** 탭에서 고친 파일이 모두 들어 있는지 확인합니다.

> 웹 편집은 커밋할 때 자동으로 내 GitHub 계정 이메일이 쓰이므로 [7장 이메일 문제](#7-커밋-이메일-주의-잔디가-안-심어질-때)는 신경 쓰지 않아도 됩니다.

---

## 5. 방법 B: GitHub Desktop으로 고치기 (추천)

내 컴퓨터로 파일을 받아서 고치고, **고친 화면을 바로 확인**한 뒤 올리는 방법입니다. 처음 한 번만 설치하면 됩니다.

### 5-1. 설치와 로그인 (처음 한 번)

1. <https://desktop.github.com> 에서 GitHub Desktop을 내려받아 설치합니다.
2. 실행하면 나오는 화면에서 **(Sign in to GitHub.com)** 을 누릅니다.
3. 브라우저가 열리면 GitHub에 로그인하고 **(Authorize desktop)** 을 누릅니다. 브라우저가 GitHub Desktop을 열지 물으면 허용합니다.
4. **(Configure Git)** 화면에서 이름과 이메일을 확인하고 **(Finish)** 를 누릅니다.
   - 이메일은 반드시 **GitHub 계정에 등록된 이메일**이어야 합니다. ([7장](#7-커밋-이메일-주의-잔디가-안-심어질-때) 참고)
5. 코드 편집기 **VS Code**도 설치합니다: <https://code.visualstudio.com>
   - GitHub Desktop 메뉴 **File → Options → Integrations** 에서 **External editor** 를 **Visual Studio Code** 로 고르고 **(Save)**.

### 5-2. 레포 받기 (Clone, 처음 한 번)

1. GitHub Desktop 메뉴 **File → (Clone repository...)** 를 누릅니다.
2. **(GitHub.com)** 탭에서 `ericyoung0222-bot/music-recommend` 을 고릅니다.
   - 목록에 없으면 초대를 아직 수락하지 않은 것입니다. ([2-2](#2-2-레포-초대collaborator-수락))
3. **(Local path)** 에서 저장할 폴더를 확인하고 **(Clone)** 을 누릅니다.

### 5-3. 작업 브랜치 만들기 (작업마다)

1. 위쪽 가운데 **(Current Branch)** 가 `main`인지 확인합니다. 아니면 눌러서 `main`을 고릅니다.
2. 위쪽 오른쪽 **(Fetch origin)** 을 누르고, **(Pull origin)** 으로 바뀌면 한 번 더 누릅니다. (최신 main 받기)
3. **(Current Branch)** → **(New Branch)** 를 누릅니다.
4. 이름에 **`design/이름-작업`** 을 입력합니다.
   - 예: `design/youngseo-buttons`, `design/daewook-card`
   - 영어 소문자, 띄어쓰기 대신 `-`.
5. **(Create Branch)** 를 누릅니다. 이제 **(Current Branch)** 에 내 브랜치 이름이 보입니다.

### 5-4. CSS 고치기

1. 메뉴 **Repository → (Open in Visual Studio Code)** 를 누릅니다. (단축키 `Ctrl + Shift + A`)
2. VS Code 왼쪽 파일 목록에서 `css/` 폴더의 파일을 열어 고치고 `Ctrl + S` 로 저장합니다.
3. [3장](#3-고쳐도-되는-것--건드리면-안-되는-것)의 "건드리면 안 되는 것"을 다시 한 번 떠올리세요.

### 5-5. 고친 화면 미리 보기

파일을 더블클릭해서 열면 사이트가 동작하지 않습니다. 아래 두 방법 중 **하나**로 여세요.

> **어느 방법을 쓸까?** 로그인이 필요한 화면(플레이리스트, 내 평점)까지 실제로 보려면 **방법 ②(주소 `localhost:5173`)** 를 쓰세요. 로그인은 보안 설정상 `http://localhost:5173` 에서만 됩니다. 방법 ①은 styleguide와 로그인 없이 보이는 페이지(메인, 추천받기)만 확인할 때 편합니다.

**방법 ① VS Code Live Server 확장 (쉬움, 로그인 안 됨)**

1. VS Code 왼쪽 **확장(Extensions)** 아이콘(네모 4개)을 누릅니다.
2. `Live Server` 를 검색해 **(Install)** 합니다.
3. 왼쪽 파일 목록에서 `styleguide.html` 을 오른쪽 클릭 → **(Open with Live Server)**.
4. 브라우저에 `http://127.0.0.1:5500/styleguide.html` 같은 주소가 열립니다.
5. CSS를 저장할 때마다 화면이 자동으로 새로고침됩니다.

**방법 ② Node.js로 서버 켜기 (로그인까지 확인 가능)**

1. <https://nodejs.org> 에서 **LTS** 버전을 설치합니다.
2. VS Code 메뉴 **Terminal → New Terminal** 을 엽니다.
3. 아래를 입력하고 Enter.

   ```powershell
   npx serve . -l 5173
   ```

   처음에 `Ok to proceed? (y)` 가 나오면 `y` 를 입력하고 Enter.
   - "이 시스템에서 스크립트를 실행할 수 없으므로" 라는 빨간 오류가 나오면 `npx.cmd serve . -l 5173` 로 입력하거나, 방법 ①을 쓰세요.
4. 브라우저에서 `http://localhost:5173/styleguide.html` 을 엽니다.
5. 다 쓰면 터미널에서 `Ctrl + C` 로 끕니다.

#### 360px(작은 휴대폰) 화면 확인

1. 브라우저(Chrome/Edge)에서 `F12` → `Ctrl + Shift + M` (기기 모드)
2. 위쪽 크기 칸의 가로 폭을 `360` 으로 입력합니다.
3. 가로 스크롤이 생기지 않는지, 글자가 잘리지 않는지 확인합니다.

#### styleguide.html 섹션 바로가기

주소 뒤에 아래를 붙이면 그 부분으로 바로 갑니다. 예: `http://localhost:5173/styleguide.html#sg-buttons`

| 주소 뒤에 붙일 것 | 보이는 것 | 주로 관련된 파일 |
|---|---|---|
| `#sg-colors` | 색 | `css/base.css` |
| `#sg-type` | 글자(글꼴·크기) | `css/base.css` |
| `#sg-tokens` | 간격·모서리·그림자 | `css/base.css` |
| `#sg-header` | 헤더 (로그인 상태 전환 버튼 있음) | `partials/header.html`, `css/components.css` |
| `#sg-buttons` | 버튼 | `css/components.css` |
| `#sg-forms` | 입력창 | `css/components.css` |
| `#sg-search` | 곡 검색·칩 | `css/components.css`, `css/pages/recommend.css`, `partials/templates.html` |
| `#sg-cards` | 곡 카드 | `css/components.css`, `partials/templates.html` |
| `#sg-stars` | 별점 | `css/components.css`, `partials/templates.html` |
| `#sg-status` | 상태 화면 (로딩·빈 화면·에러) | `css/components.css`, `partials/templates.html` |
| `#sg-toast` | 토스트 알림 | `css/components.css`, `partials/templates.html` |
| `#sg-modal` | 모달 | `css/components.css`, `partials/templates.html` |
| `#sg-playlists` | 플레이리스트 | `css/components.css`, `css/pages/playlists.css`, `partials/templates.html` |
| `#sg-hud` | "플레이리스트에 추가됨" 확인 표시 ("확인 표시 띄우기" 버튼) | `css/components.css`, `partials/templates.html`, `partials/footer.html` |
| `#sg-notice` | 안내 상자 (login.html에서 쓰임) | `css/components.css` |

styleguide 확인이 끝나면 실제 페이지(`index.html`, `recommend.html`, `login.html`)도 한 번씩 열어 보세요.

### 5-6. 커밋하기

1. GitHub Desktop으로 돌아오면 왼쪽 **(Changes)** 탭에 고친 파일 목록이 보입니다.
2. 파일을 눌러 오른쪽에서 바뀐 부분(빨간 줄 = 지운 것, 초록 줄 = 추가한 것)을 확인합니다.
   - ⚠️ 목록에 `js/` 폴더 파일이나 내가 고친 기억이 없는 파일이 있으면 체크를 **해제**하고 신원영에게 물어보세요.
3. 왼쪽 아래 **(Summary)** 칸에 커밋 메시지를 적습니다. 예: `style: 주요 버튼 모서리를 더 둥글게`
4. 아래의 파란 **커밋 버튼**을 누릅니다. 버튼 글자는 **(Commit to design/youngseo-buttons)** 나 **(Commit 1 file to design/youngseo-buttons)** 처럼 **끝에 내 브랜치 이름**이 적혀 있어야 합니다. `main`이라고 적혀 있으면 누르지 마세요!

### 5-7. GitHub에 올리기 (Push)

- 이 브랜치를 처음 올릴 때: 위쪽 오른쪽 **(Publish branch)** 를 누릅니다.
- 그다음부터: 커밋한 뒤 **(Push origin)** 을 누릅니다.

### 5-8. PR 만들기

1. 올리고 나면 가운데에 PR을 만들라는 안내가 나옵니다. **(Preview Pull Request)** → **(Create pull request)** 를 누르거나, 메뉴 **Branch → (Create Pull Request)** (단축키 `Ctrl + R`)를 누릅니다.
2. 브라우저에서 GitHub의 **(Open a pull request)** 화면이 열립니다.
3. 위쪽이 `base: main` ← `compare: design/youngseo-buttons` 인지 확인합니다.
4. 제목을 적고, 설명 칸의 PR 템플릿을 채웁니다. (아래 5-9)
5. 초록색 **(Create pull request)** 를 누릅니다.

### 5-9. PR 템플릿 채우기

PR 설명 칸에는 템플릿이 자동으로 들어 있습니다. `<!--` 로 시작해 `-->` 로 끝나는 부분은 작성 요령입니다. PR을 만든 뒤 화면에는 보이지 않으니 그대로 둬도 되고 지워도 됩니다.

1. **작업 내용**: 무엇을 왜 바꿨는지 한두 줄로.
2. **관련 이슈**: `Closes #12` 처럼 이슈 번호를 적습니다.
3. **스크린샷**: 바꾸기 전/후를 데스크톱과 360px 폭으로 찍어 붙입니다.
   - 캡처: Windows는 `Win + Shift + S`, Mac은 `Cmd + Shift + 4`
   - 캡처한 뒤 표의 칸을 클릭하고 `Ctrl + V` (Mac은 `Cmd + V`)로 붙여 넣으면 이미지가 올라갑니다.
   - "바꾸기 전" 화면은 [사이트 배포 주소](../README.md)에서 찍거나, 고치기 전에 미리 찍어 두세요.
4. **체크리스트**: 확인한 항목은 `[ ]` 를 `[x]` 로 바꿉니다. PR을 만든 뒤에는 체크박스를 직접 클릭해도 됩니다.

---

## 6. PR을 올린 뒤

### 6-0. 자동 검사 결과 보기 (초록 ✓ / 빨간 ✗)

PR을 올리면 GitHub가 몇십 초 동안 **자동 검사**를 돌립니다. 디자인을 고치다 기능에 필요한 부분을 실수로 건드리지 않았는지 확인하는 검사입니다.

- PR 화면 아래쪽에 **초록 ✓ (All checks have passed)** 가 뜨면 통과입니다.
- **빨간 ✗** 가 뜨면 **(Details)** 를 눌러 ✘ 로 시작하는 줄을 읽어 보세요. 어느 파일의 무엇이 문제인지 한국어로 적혀 있습니다. 예:
  - `data-js="seed-count"를 찾는데 … 어디에도 없어요` → `data-js` 속성을 지웠거나 이름을 바꿨어요. 되돌려 주세요.
  - `data-js="status-retry"에 hidden이 빠졌어요` → 그 태그의 `hidden` 을 다시 넣어 주세요.
  - `<div style="..."> (CSP가 막음 → class와 CSS로)` → `style=""` 대신 class를 만들고 CSS 파일에 써 주세요.
  - `[hidden] 규칙이 없거나 바뀌었어요` → `css/base.css`의 `[hidden] { display: none !important; }` 를 되돌려 주세요.
- 무슨 뜻인지 모르겠으면 PR 코멘트로 물어보세요. 직접 컴퓨터에서 확인하려면 `node tests/contract.test.mjs` 를 실행하면 같은 결과가 나옵니다.

### 6-1. 리뷰 코멘트 반영하기

1. 신원영이 PR에 코멘트를 남기면 이메일이나 GitHub 알림(종 아이콘)으로 알려 줍니다.
2. PR 페이지의 **(Conversation)** 탭에서 코멘트를 읽습니다. **(Files changed)** 탭에서는 어느 줄에 대한 코멘트인지 볼 수 있습니다.
3. 고칠 때는 **새 PR을 만들지 않습니다.** 같은 브랜치에서 다시 고치고 커밋하면 기존 PR에 **자동으로 반영**됩니다.
   - 방법 A: [4-2](#4-2-같은-pr에서-파일-여러-개-고치기) 순서대로 내 브랜치를 골라 고치고 커밋
   - 방법 B: **(Current Branch)** 가 내 브랜치인지 확인 → VS Code로 고치기 → 커밋 → **(Push origin)**
4. 코멘트에 "반영했어요"라고 답글을 달고 **(Comment)** 를 누릅니다.
5. ⚠️ PR 아래의 **(Merge pull request)** 버튼은 누르지 마세요. 합치는 건 신원영이 합니다.

### 6-2. main의 최신 내용 받기

다른 사람의 PR이 먼저 합쳐지면 내 브랜치가 옛날 상태가 됩니다. 이럴 때 최신 main을 내 브랜치로 가져옵니다.

**GitHub Desktop (방법 B)**

1. **(Current Branch)** 가 내 브랜치인지 확인합니다.
2. **(Fetch origin)** 을 누릅니다.
3. 메뉴 **Branch → (Update from main)** 을 누릅니다.
4. 문제없이 끝나면 **(Push origin)** 을 누릅니다.
5. 충돌(conflict) 창이 뜨면 [9장 충돌](#충돌conflict이-났어요)을 보세요.

**웹 (방법 A)**

PR 페이지 아래쪽에 **(Update branch)** 버튼이 보이면 누릅니다. 버튼이 안 보이면 그대로 두면 됩니다. 충돌이 있다고 나오면 신원영에게 알려 주세요.

### 6-3. PR이 합쳐진 뒤 (다음 작업 시작 전)

1. 이슈는 `Closes #번호` 덕분에 자동으로 닫힙니다.
2. 1~2분 뒤 배포 사이트 `https://ericyoung0222-bot.github.io/music-recommend/` 에 반영됩니다.
3. GitHub Desktop에서는 **(Current Branch)** 를 `main` 으로 바꾸고 **(Fetch origin)** → **(Pull origin)** 을 누릅니다.
4. 다음 작업은 다시 [5-3](#5-3-작업-브랜치-만들기-작업마다)부터 **새 브랜치**를 만들어 시작합니다. 이미 합쳐진 브랜치에 이어서 작업하지 마세요.

---

## 7. 커밋 이메일 주의 (잔디가 안 심어질 때)

GitHub 프로필의 기여 기록(초록색 칸, "잔디")에 커밋이 표시되려면 **커밋에 기록된 이메일이 내 GitHub 계정에 등록된 이메일**이어야 합니다.
팀플에서 누가 무엇을 했는지 보여 주는 기록이니 꼭 확인하세요.

- **방법 A (웹 편집)**: 자동으로 내 계정 이메일이 쓰입니다. 따로 할 일 없음.
- **방법 B (GitHub Desktop)**: 아래를 확인하세요.

### 7-1. GitHub Desktop의 이메일 확인

1. 메뉴 **File → Options** (Mac은 **GitHub Desktop → Settings**) → **(Git)** 탭
2. **(Email)** 칸의 이메일을 확인합니다.
3. 이 이메일이 GitHub 계정에 등록된 이메일 중 하나여야 합니다. 아니면 목록에서 등록된 이메일로 바꾸고 **(Save)**.

### 7-2. GitHub 계정에 이메일 추가하기

Desktop에 적힌 이메일을 계속 쓰고 싶다면 그 이메일을 계정에 추가합니다.

1. github.com 오른쪽 위 내 프로필 사진 → **(Settings)**
2. 왼쪽 메뉴 **(Emails)**
3. **(Add email address)** 칸에 이메일을 입력하고 **(Add)**
4. 그 이메일로 온 인증 메일에서 인증을 마칩니다.

### 7-3. 내 이메일을 공개하고 싶지 않다면 (noreply 이메일)

커밋 기록은 레포를 보는 누구나 볼 수 있어서, 개인 이메일을 숨기고 싶을 수 있습니다.

1. **(Settings)** → **(Emails)** 에서 **(Keep my email addresses private)** 를 체크합니다.
2. 그 아래에 `숫자+아이디@users.noreply.github.com` 형식의 주소가 보입니다. 이 주소를 복사합니다.
3. GitHub Desktop **File → Options → (Git)** 의 **(Email)** 칸에 이 noreply 주소를 넣고 **(Save)**.
4. 이 주소로 커밋해도 잔디가 정상적으로 남습니다.

> 이미 다른 이메일로 커밋했다면, 그 이메일을 [7-2](#7-2-github-계정에-이메일-추가하기)처럼 계정에 추가하고 인증하면 지난 커밋도 내 기록으로 잡힙니다. (`이름@컴퓨터이름.local` 처럼 실제로 메일을 받을 수 없는 주소는 추가할 수 없으니, 그럴 땐 신원영에게 말해 주세요.)
> 커밋 칸은 PR이 main에 **합쳐진 뒤**에 채워집니다. 합쳐지기 전에는 안 보여도 정상입니다. (PR이나 이슈를 연 기록은 바로 표시됩니다.)

---

## 8. 커밋 메시지와 PR 작성 규칙

### 커밋 메시지

디자인 작업은 맨 앞에 `style:` 을 붙이고, 무엇을 바꿨는지 짧게 한국어로 씁니다.

```
style: 주요 버튼 모서리를 더 둥글게
style: 추천 카드 그림자와 간격 조정
style: 360px에서 헤더 메뉴가 두 줄로 넘치지 않게 수정
style: 기본 색을 보라색 계열로 변경
style: 로고 이미지 교체
```

- 커밋은 작게 여러 번 해도 괜찮습니다. "버튼 고침", "카드 고침"처럼 나눠서 저장하면 나중에 되돌리기 쉽습니다.
- `수정`, `ㅁㄴㅇㄹ` 처럼 내용을 알 수 없는 메시지는 피해 주세요.

### PR 규칙

- **한 PR에는 이슈 하나 범위의 작업만** 담습니다. 버튼 작업과 카드 작업은 PR을 따로 만드세요.
- PR 설명에 **`Closes #이슈번호`** 를 꼭 적습니다. (예: `Closes #12`) PR이 합쳐지면 이슈가 자동으로 닫힙니다.
  - 제목이 아니라 **설명 칸**에 적어야 동작합니다.
- 바뀐 화면 스크린샷(데스크톱 + 360px, 전/후)을 붙입니다.
- PR 템플릿의 체크리스트를 모두 확인합니다.

---

## 9. 자주 하는 실수와 해결

### `data-js` 를 지워서 기능이 고장 났어요

**증상:** 버튼을 눌러도 반응이 없음, 검색 결과가 안 뜸, 별점이 안 눌림, 헤더가 안 보임

**원인:** HTML에서 `data-js="..."`, `data-page`, `data-template`, `data-score` 같은 속성을 지우거나 이름을 바꿨거나, 그 속성이 붙은 태그 자체를 지웠습니다.

**해결:**
1. PR의 **(Files changed)** 탭이나 GitHub Desktop의 **(Changes)** 탭에서 빨간 줄(지운 부분) 중 `data-` 가 들어간 줄을 찾습니다.
2. 원래대로 되돌립니다.
   - GitHub Desktop: 파일 이름을 오른쪽 클릭 → **(Discard changes...)** 로 그 파일 변경을 통째로 취소할 수도 있습니다. (그 파일의 내 수정이 모두 사라지니 주의)
3. 모르겠으면 그대로 PR을 올리고 신원영에게 "data-js 건드린 것 같아요"라고 말해 주세요.

### 색을 `#코드` 로 직접 썼어요

**잘못된 예 (`css/components.css`)**

```css
.btn--primary { background: #ff5a5f; }
```

**올바른 예**

```css
/* css/base.css 의 :root 안 */
--color-primary: #ff5a5f;

/* css/components.css */
.btn--primary { background: var(--color-primary); }
```

**해결:** 색 코드(`#코드`, `rgb(...)`), 글자 크기, 간격, 모서리, 그림자 값은 `css/base.css` 의 변수로만 정하고, 다른 파일에서는 `var(--변수이름)` 으로 가져다 씁니다. (예: 간격은 `var(--space-4)`, 모서리는 `var(--radius-md)`)
마음에 드는 변수가 없으면 `css/base.css` 의 `:root` 안에 새 변수를 추가해도 됩니다. 변수 목록은 [STYLE_GUIDE.md 2장](STYLE_GUIDE.md#2-css-변수-목록-cssbasecss)에 있습니다.

### main에 바로 커밋했어요

> `main`은 **보호 브랜치**로 설정되어 있어서, 팀원 계정으로는 main에 직접 올릴 수 없습니다. PR + 자동 검사 통과 + 신원영 승인을 거쳐야만 합쳐집니다. 그래서 실수해도 사이트가 바로 바뀌지는 않으니 안심하세요.

**방법 A에서:** 커밋 창에 **(Commit directly to the `main` branch)** 가 아예 없거나 눌리지 않으면 정상입니다. **(Create a new branch ...)** 쪽을 고르세요.

**방법 B에서 Push할 때 `protected branch` 같은 오류가 났다면:** main에 커밋한 것입니다. 아래 "아직 Push 전이라면" 순서대로 커밋을 취소하고 새 브랜치로 옮기세요.

**방법 B에서 아직 Push 전이라면 (또는 위 오류가 났다면):**
1. GitHub Desktop 왼쪽 **(History)** 탭에서 방금 커밋을 오른쪽 클릭 → **(Undo commit)** 을 누릅니다. 고친 내용은 그대로 남습니다.
2. [5-3](#5-3-작업-브랜치-만들기-작업마다)처럼 새 브랜치를 만듭니다. 고친 내용을 어디에 둘지 묻는 창이 뜨면 **새 브랜치로 가져가기(Bring my changes to ...)** 를 고릅니다.
3. 다시 커밋합니다.

> 예방법: 커밋 버튼 글자 끝이 **main** 이면 누르지 마세요. **(Commit ... to design/...)** 처럼 내 브랜치 이름이어야 합니다.

### 충돌(conflict)이 났어요

**뜻:** 나와 다른 사람이 같은 파일의 같은 줄을 서로 다르게 고쳐서, GitHub가 어느 쪽을 쓸지 모르는 상태입니다.

**증상:**
- GitHub Desktop에서 **(Update from main)** 후 "Resolve conflicts before merging" 창이 뜸
- PR 페이지에 "This branch has conflicts that must be resolved" 가 보임
- 파일 안에 `<<<<<<<`, `=======`, `>>>>>>>` 같은 줄이 생김

**해결:**
1. 당황하지 말고, GitHub Desktop 창이 떴다면 **(Abort merge)** 를 눌러 원래 상태로 돌립니다.
2. 신원영에게 "PR #번호에서 충돌 났어요"라고 알려 주세요. 같이 해결합니다.
3. 파일 안의 `<<<<<<<` 줄을 직접 지우며 해결하려 하지 마세요. 잘못 지우면 CSS가 통째로 깨집니다.

**예방법:**
- 작업 시작 전 항상 **(Fetch origin)** → **(Pull origin)** 으로 최신 main을 받고 브랜치를 만듭니다.
- PR은 작게, 빨리 올립니다. 오래 붙잡고 있을수록 충돌이 잘 납니다.
- 두 사람이 같은 파일(특히 `css/base.css`)을 동시에 크게 고치지 않도록 이슈를 나눠 맡습니다.

### 그 밖에

| 증상 | 해결 |
|---|---|
| 파일을 더블클릭해서 열었더니 "불러오는 중…"에서 멈춤 | 로컬 서버로 여세요. ([5-5](#5-5-고친-화면-미리-보기)) |
| `npx serve . -l 5173` 을 쳤더니 "스크립트를 실행할 수 없으므로" 오류 | `npx.cmd serve . -l 5173` 로 입력하거나 Live Server(방법 ①)를 쓰세요. |
| CSS를 고쳤는데 화면이 그대로 | `Ctrl + S` 로 저장했는지, 브라우저에서 `Ctrl + Shift + R` (강력 새로고침) 해 보세요. |
| 로그인이 필요한 페이지(플레이리스트, 내 평점)가 안 보임 | 로그인해야 보입니다. `http://localhost:5173` 으로 열었는지 확인하고([5-5](#5-5-고친-화면-미리-보기) 방법 ②) 본인 구글 계정으로 로그인하세요. 로그인 없이 부품만 볼 때는 `styleguide.html` 의 `#sg-playlists`, `#sg-cards`, `#sg-stars` 를 쓰세요. |
| 로컬에서 로그인 버튼을 눌렀더니 오류가 뜨거나 로그인이 안 됨 | 주소가 `localhost:5173` 인지 확인하세요. Live Server(`127.0.0.1:5500`)나 다른 포트에서는 로그인이 막힙니다. 방법 ②로 다시 여세요. |
| GitHub Desktop에 `js/` 파일이 바뀌었다고 나옴 | 그 파일 체크를 해제하고 오른쪽 클릭 → **(Discard changes...)** 로 되돌린 뒤 신원영에게 알려 주세요. |
| 연필 아이콘이 회색이거나 "Fork" 이야기가 나옴 | 레포 초대를 아직 수락하지 않았습니다. ([2-2](#2-2-레포-초대collaborator-수락)) |

---

## 10. 막히면

- 어디서든 막히면 **혼자 오래 고민하지 말고 신원영에게 물어보세요.** 잘못 누른 것도 대부분 되돌릴 수 있습니다.
- 물어볼 때 함께 보내 주면 빨리 해결됩니다.
  1. 어떤 방법으로 작업 중인지 (방법 A 웹 / 방법 B GitHub Desktop)
  2. 무엇을 하려고 했는지
  3. 화면 캡처 (`Win + Shift + S`)
  4. 관련 이슈나 PR 번호 (예: `#12`)
- 이슈나 PR 댓글에 질문을 남겨도 됩니다. 이때 질문 내용 앞에 신원영의 GitHub 아이디를 `@아이디` 형식으로 적으면 알림이 갑니다.

관련 문서: [디자인 가이드 (STYLE_GUIDE.md)](STYLE_GUIDE.md) · [README](../README.md) · [PR 템플릿](../.github/pull_request_template.md)
