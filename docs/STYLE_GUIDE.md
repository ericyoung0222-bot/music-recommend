# 디자인 가이드 (디자이너용)

이 문서와 `styleguide.html`만 보면 JS를 몰라도 디자인 작업을 할 수 있게 정리했습니다.

- **확인하는 곳**: 로컬 서버로 `styleguide.html`을 열면 모든 컴포넌트와 상태(로딩, 빈 화면, 에러, 별점 선택됨 등)가 가짜 데이터로 보입니다. 로그인이나 API 키가 없어도 됩니다.
- **고치는 곳**: `css/` 폴더, `assets/` 폴더, 그리고 HTML의 class 이름과 문구

---

## 1. 꼭 지킬 규칙 4가지

| 규칙 | 설명 |
|---|---|
| ① `data-` 속성은 건드리지 않기 | `data-js`, `data-page`, `data-template`, `data-score`는 기능이 요소를 찾는 이름표입니다. 지우거나 바꾸면 기능이 멈춥니다. |
| ② 디자인은 class로만 | class 이름은 자유롭게 바꾸거나 추가해도 됩니다. 기능은 class를 보지 않습니다. |
| ③ 상태 클래스 이름은 그대로 | `is-loading`, `is-empty`, `is-error`, `is-active`, `is-selected`, `is-disabled`, `is-logged-in`, `is-success`, `is-added`, `is-leaving`은 JS가 붙였다 뗐다 합니다. **이름은 그대로 두고 모양만** 정하세요. |
| ④ 색·글꼴·간격은 변수로만 | `#4a4ae0` 같은 값은 `css/base.css`의 변수에만 쓰고, 다른 CSS에서는 `var(--color-primary)`처럼 변수만 씁니다. |

> `js/` 폴더는 열지 않아도 됩니다. 수정하면 안 됩니다.

### 어떤 파일을 고치나요?

| 바꾸고 싶은 것 | 파일 |
|---|---|
| 전체 색, 글꼴, 간격, 모서리, 그림자 | `css/base.css`의 `:root` 변수 |
| 버튼, 카드, 별점 등 공통 부품 모양 | `css/components.css` |
| 특정 페이지만의 모양 | `css/pages/페이지이름.css` |
| 헤더/푸터의 HTML 구조, 메뉴 문구, 로고 | `partials/header.html`, `partials/footer.html` |
| 카드·별점·토스트·모달 등의 HTML 구조 | `partials/templates.html` |
| 각 페이지 본문 구조와 문구 | 각 `*.html` 파일 |
| 로고, 기본 앨범 이미지, 파비콘 | `assets/` (파일 이름은 그대로 두고 내용만 교체) |

---

## 2. CSS 변수 목록 (`css/base.css`)

### 색

| 변수 | 쓰는 곳 |
|---|---|
| `--color-bg` | 페이지 배경 |
| `--color-surface` | 카드, 헤더, 입력창 등 표면 |
| `--color-surface-alt` | 약간 어두운 표면 (기본 버튼, 이미지 자리) |
| `--color-text` | 기본 글자 |
| `--color-text-muted` | 보조 글자 (설명, 날짜) |
| `--color-border` | 테두리 |
| `--color-primary` | 주요 색 (주요 버튼, 링크, 현재 메뉴) |
| `--color-primary-hover` | 주요 색에 마우스를 올렸을 때 |
| `--color-primary-soft` | 주요 색의 옅은 버전 (칩, 선택된 후보, 히어로 배경) |
| `--color-on-primary` | 주요 색 위의 글자 |
| `--color-star` | 채워진 별 |
| `--color-star-empty` | 빈 별 |
| `--color-danger` / `--color-danger-hover` / `--color-danger-soft` | 삭제 버튼, 에러 |
| `--color-success` / `--color-success-soft` | 성공 토스트, "✓ 추가됨" 버튼 배경 |
| `--color-success-strong` | "✓ 추가됨"·"✓ 담김" 글자 (밝은 배경 위에서 대비 4.5:1 이상 유지) |
| `--color-focus` | 키보드 포커스 테두리 |
| `--color-overlay` | 모달 뒤 어두운 배경 |
| `--color-hud-bg` | "플레이리스트에 추가됨" 확인 상자 배경 (글자는 `--color-surface`) |

### 글꼴

| 변수 | 값 |
|---|---|
| `--font-family-base` | 본문 글꼴 |
| `--font-family-heading` | 제목 글꼴 (기본은 본문과 같음) |
| `--font-size-xs` ~ `--font-size-3xl` | 12 / 14 / 16 / 18 / 22 / 28 / 36px |
| `--font-weight-regular`, `--font-weight-bold` | 400, 700 |
| `--line-height-tight`, `--line-height-base` | 제목 1.3, 본문 1.6 |

> 웹폰트(예: Pretendard)를 쓰고 싶으면 글꼴 파일(`.woff2`)을 `assets/fonts/`에 넣고, `css/base.css` 맨 위에 `@font-face`로 연결한 뒤 `--font-family-base`만 바꾸면 됩니다.
> ⚠️ **외부 주소(CDN)의 글꼴·CSS는 보안 설정(CSP)이 항상 막습니다.** `@import url("https://...")`를 넣으면 글꼴이 안 바뀌고 콘솔에 빨간 에러가 뜨며, PR 자동 검사도 실패합니다. 꼭 외부 주소를 써야 하면 개발 담당에게 먼저 말해 주세요.

### 간격 · 모서리 · 그림자 · 기타

| 변수 | 값 |
|---|---|
| `--space-1` ~ `--space-8` | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px |
| `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill` | 6 / 10 / 16px / 완전 둥글게 |
| `--shadow-sm`, `--shadow-md`, `--shadow-lg` | 작은 / 중간 / 큰 그림자 |
| `--container-max` | 본문 최대 너비 (1080px) |
| `--transition-fast` | 짧은 애니메이션 시간 |

---

## 3. 상태 클래스

JS가 붙였다 뗐다 하는 클래스입니다. 이름은 바꾸지 말고 모양만 정하세요.

| 클래스 | 붙는 곳 | 뜻 |
|---|---|---|
| `is-loading` | `.status`, `.status-slot`, `.btn`, `.search-box__input-wrap`, `.star-rating`, `.results` | 불러오는 중 / 처리 중 |
| `is-empty` | `.status`, `.status-slot`, `.results` | 결과 없음 |
| `is-error` | `.status`, `.status-slot`, `.toast`, `.results` | 에러 |
| `is-success` | `.toast` | 성공 알림 |
| `is-active` | `.site-nav__link`(현재 페이지), `.suggestion`(키보드로 고른 후보), `.star-rating__star`(마우스를 올린 별까지) | 활성 |
| `is-selected` | `.star-rating__star` | 내 점수 이하의 채워진 별 |
| `is-disabled` | `.btn`, `.input`, `.picker__button`, `.star-rating` | 지금은 누를 수 없음 |
| `is-logged-in` | `<body>` | 로그인한 상태 (페이지 전체 모양을 바꾸고 싶을 때) |
| `is-added` | `.btn`(곡 카드의 "✓ 추가됨"), `.picker__button`(이미 이 곡이 담긴 플레이리스트) | 플레이리스트에 담은 곡 |
| `is-leaving` | `.added-hud` | "플레이리스트에 추가됨" 확인 표시가 사라지는 중 (0.25초 뒤 지워짐) |

> `hidden` 속성이 붙은 요소는 CSS와 상관없이 항상 숨겨집니다. (예: 로그아웃 상태의 프로필 메뉴)

---

## 4. 컴포넌트별 구조

아래 HTML에서 `data-js`가 붙은 줄은 **지우면 안 되는 요소**입니다. 그 외 태그와 class는 바꿔도 됩니다.
JS로 그려지는 컴포넌트는 모두 `partials/templates.html`에 원본이 있습니다.

### 4-1. 헤더 (`partials/header.html`)

```html
<header class="site-header">
  <div class="site-header__inner container">
    <a class="site-header__logo" href="index.html">…</a>
    <nav class="site-nav">
      <ul class="site-nav__list">
        <li><a class="site-nav__link" data-js="nav-link" data-page="home">홈</a></li> …
      </ul>
      <div class="site-header__auth">
        <a class="btn btn--primary btn--small" data-js="login-link">로그인</a>
        <div class="user-menu" data-js="user-menu" hidden>
          <img class="user-menu__avatar" data-js="user-avatar">
          <span class="user-menu__name" data-js="user-name"></span>
          <button class="btn btn--ghost btn--small" data-js="logout-button">로그아웃</button>
        </div>
      </div>
    </nav>
  </div>
</header>
```

- 현재 페이지 메뉴: `.site-nav__link.is-active`
- 로그인하면 `login-link`가 숨겨지고 `user-menu`가 보입니다. styleguide의 "로그인 상태로 보기" 버튼으로 확인하세요.

### 4-2. 푸터 (`partials/footer.html`)

`.site-footer`, `.site-footer__inner`, `.site-footer__text`. 아래의 두 자리는 지우면 안 됩니다.

- `<div class="toast-region" data-js="toast-region">` — 토스트가 뜨는 자리
- `<div class="hud-region" data-js="hud-region">` — "플레이리스트에 추가됨" 확인 표시가 뜨는 자리 ([4-13](#4-13-플레이리스트에-추가됨-표시)). `class="hud-region"`도 그대로 두세요.

### 4-3. 버튼

| class | 모양 |
|---|---|
| `.btn` | 기본 버튼 (a, button 모두 가능) |
| `.btn--primary` / `.btn--secondary` / `.btn--ghost` / `.btn--danger` | 주요 / 보조 / 테두리 없는 / 삭제 |
| `.btn--small` | 작은 버튼 |
| `.btn--block` | 가로 꽉 채움 |
| 상태 | `:disabled`, `.is-disabled`, `.is-loading` (앞에 도는 표시) |

### 4-4. 입력창

```html
<label class="field">
  <span class="field__label">이름</span>
  <input class="input">
  <span class="field__hint">보조 설명</span>
</label>
```

`.select`(선택 상자), `.form-row`(입력창과 버튼을 한 줄에)

### 4-5. 곡 검색 자동완성 + 칩 (recommend.html)

```html
<div class="search-box">
  <div class="search-box__input-wrap" data-js="search-input-wrap">   ← 검색 중 is-loading
    <input class="input" data-js="search-input">
  </div>
  <ul class="suggestions" data-js="suggestions">
    <li class="suggestion" data-js="suggestion">                     ← 키보드로 고르면 is-active
      <img class="suggestion__image" data-js="suggestion-image">
      <span class="suggestion__text">
        <span class="suggestion__title" data-js="suggestion-title"></span>
        <span class="suggestion__artist" data-js="suggestion-artist"></span>
      </span>
    </li>
  </ul>
</div>

<ul class="chip-list" data-js="seed-list">
  <li class="chip" data-js="chip">
    <span class="chip__label" data-js="chip-label"></span>
    <button class="chip__remove" data-js="chip-remove">×</button>
  </li>
</ul>
```

### 4-6. 곡 카드 (추천 결과, 플레이리스트 상세, 내 평점)

```html
<li class="card-grid__item">
  <article class="card">
    <img class="card__image" data-js="card-image">
    <div class="card__body">
      <h3 class="card__title" data-js="card-title"></h3>
      <p class="card__subtitle" data-js="card-artist"></p>
      <p class="card__meta" data-js="card-meta"></p>                 ← 날짜 (없으면 숨김)
      <p class="card__links">
        <a class="card__link" data-js="card-lastfm-link">Last.fm</a>
        <a class="card__link" data-js="card-youtube-link">YouTube에서 찾기</a>
      </p>
      <div class="card__rating" data-js="card-rating"></div>        ← 별점이 들어가는 자리
      <div class="card__actions">
        <button class="btn …" data-js="card-add">플레이리스트에 추가</button>
        <button class="btn …" data-js="card-remove">목록에서 빼기</button>
      </div>
    </div>
  </article>
</li>
```

- 카드 목록은 `<ul class="card-grid">` 안에 들어갑니다.
- 페이지마다 필요 없는 버튼은 JS가 지웁니다. (추천: 추가만, 플레이리스트 상세: 빼기만, 내 평점: 버튼 없음)
- 페이지별로 카드 모양을 다르게 하고 싶으면 페이지 CSS에서 `.playlist-header ~ section .card`처럼 범위를 좁혀 쓰세요.

### 4-7. 별점

```html
<div class="star-rating" data-js="star-rating">                    ← 평균 불러오는 중 is-loading, 저장 중 is-disabled
  <div class="star-rating__stars" data-js="star-group">
    <button class="star-rating__star" data-js="star" data-score="1">★</button>   ← is-selected, is-active
    … (2~5)
  </div>
  <p class="star-rating__summary">
    <span class="star-rating__mine" data-js="star-mine"></span>     ← "내 점수 4점"
    <span class="star-rating__average" data-js="star-average"></span> ← "★3.8 (12명)"
  </p>
  <button class="star-rating__clear" data-js="star-clear">평점 삭제</button>
</div>
```

- 별 글자(★)는 다른 아이콘으로 바꿔도 됩니다. 단, 버튼 5개와 `data-score`는 그대로 두세요.
- 키보드 포커스 테두리(`:focus-visible`)는 지우지 마세요.

### 4-8. 상태 화면 (로딩 / 빈 화면 / 에러)

```html
<div class="status-slot" data-js="…">                               ← 상태에 따라 is-loading / is-empty / is-error
  <div class="status is-loading" data-js="status">
    <span class="status__icon"></span>                               ← 로딩일 때 도는 동그라미
    <p class="status__message" data-js="status-message"></p>
    <div class="status__actions">
      <a class="btn …" data-js="status-link">추천받으러 가기</a>
      <button class="btn …" data-js="status-retry">다시 시도</button>
    </div>
  </div>
</div>
```

자리요소에 `status-slot--compact`가 있으면 작은 한 줄 모양입니다. (검색창 아래, 모달 안)

### 4-9. 토스트

```html
<div class="toast-region" data-js="toast-region">                   ← 화면 아래 고정 영역
  <div class="toast is-success" data-js="toast">                    ← is-success / is-error
    <p class="toast__message" data-js="toast-message"></p>
    <a class="toast__action" data-js="toast-link">로그인</a>
    <button class="toast__close" data-js="toast-close">×</button>
  </div>
</div>
```

### 4-10. 모달

브라우저 기본 `<dialog>`를 씁니다. 뒤 배경은 `.modal::backdrop`으로 꾸밉니다.

```html
<dialog class="modal" data-js="modal">
  <div class="modal__panel">
    <div class="modal__header">
      <h2 class="modal__title" data-js="modal-title"></h2>
      <button class="modal__close" data-js="modal-close">×</button>
    </div>
    <div class="modal__body" data-js="modal-body"></div>
  </div>
</dialog>
```

삭제 확인 모달 내용:

```html
<div class="confirm">
  <p class="confirm__message" data-js="confirm-message"></p>
  <div class="modal__actions">
    <button class="btn btn--secondary" data-js="confirm-cancel">취소</button>
    <button class="btn btn--danger" data-js="confirm-ok">확인</button>
  </div>
</div>
```

### 4-11. 플레이리스트

목록 카드 (playlists.html):

```html
<ul class="playlist-list">
  <li class="playlist-list__item">
    <a class="playlist-card" data-js="playlist-link">
      <span class="playlist-card__name" data-js="playlist-name"></span>
      <span class="playlist-card__meta" data-js="playlist-meta"></span>   ← "12곡 · 2026. 11. 23. 수정"
    </a>
  </li>
</ul>
```

"플레이리스트에 추가" 모달 내용:

```html
<div class="picker" data-js="picker">
  <p class="picker__track" data-js="picker-track"></p>
  <div class="status-slot status-slot--compact" data-js="picker-status"></div>
  <ul class="picker__list" data-js="picker-list">
    <li class="picker__item">
      <button class="picker__button" data-js="picker-option">          ← 저장 중 is-disabled, 이미 담긴 플레이리스트 is-added
        <span class="picker__name" data-js="picker-name"></span>
        <span class="picker__count" data-js="picker-count"></span>
      </button>
    </li>
  </ul>
  <form class="picker__form form-row" data-js="picker-create-form">
    <label class="field">
      <span class="field__label">새 플레이리스트 만들기</span>
      <input class="input" data-js="picker-create-input">
    </label>
    <button class="btn btn--primary" data-js="picker-create-submit">만들고 추가</button>
  </form>
</div>
```

이미 이 곡이 담긴 플레이리스트 줄에는 `is-added`가 붙고, 개수 자리에 "✓ 담김 · N곡"이 들어갑니다.

### 4-12. 안내 상자 (login.html, 카카오톡 등 앱 안 브라우저일 때)

`.notice`, `.notice__title`, `.notice__text`, `.notice__actions`

### 4-13. "플레이리스트에 추가됨" 표시

곡을 플레이리스트에 담으면 화면 가운데에 약 1.6초 떴다 사라지는 확인 상자입니다. styleguide.html `#sg-hud`에서 "확인 표시 띄우기"로 볼 수 있습니다.

```html
<div class="hud-region" data-js="hud-region">                 ← footer.html. 화면 전체를 덮는 투명한 자리
  <div class="added-hud" data-js="added-hud">                  ← 사라질 때 is-leaving (0.25초 뒤 지워짐)
    <span class="added-hud__icon">✓</span>
    <p class="added-hud__title" data-js="added-hud-title">플레이리스트에 추가됨</p>
    <p class="added-hud__name" data-js="added-hud-name"></p>   ← "플레이리스트 이름"
  </div>
</div>
```

- ⚠️ `.hud-region`의 `pointer-events: none`은 **지우지 마세요.** 지우면 표시가 뜬 동안 화면 전체가 안 눌립니다. (PR 자동 검사가 확인합니다)
- 등장·퇴장 애니메이션은 `@keyframes hud-in` / `hud-out`이고, 모양·위치·애니메이션은 자유롭게 바꿔도 됩니다. 단, 퇴장 애니메이션은 0.25초 안에 끝나야 자연스럽습니다.
- 함께 쓰는 상태: 곡 카드 버튼 `.btn.is-added`("✓ 추가됨"), 선택 창 줄 `.picker__button.is-added`("✓ 담김")

---

## 5. 페이지별 클래스

| 페이지 | CSS 파일 | 주요 class |
|---|---|---|
| index.html | `pages/home.css` | `.hero`, `.hero__title`, `.hero__desc`, `.hero__actions`, `.steps__list`, `.steps__item`, `.steps__title`, `.steps__desc` |
| recommend.html | `pages/recommend.css` | `.seed-panel`, `.seed-form`, `.seed-form__count`, `.seed-form__actions`, `.results`, `.results__summary` |
| login.html | `pages/login.css` | `.login-panel`, `.login-panel__title`, `.login-panel__desc`, `.login-panel__google`, `.login-panel__note` |
| playlists.html | `pages/playlists.css` | `.create-form` |
| playlist.html | `pages/playlist.css` | `.back-link`, `.playlist-header`, `.playlist-header__actions`, `.rename-form` |
| ratings.html | `pages/ratings.css` | `.toolbar`, `.toolbar__field`, `.toolbar__count` |
| 공통 | `components.css` | `.page`, `.page-header`, `.page-header__title`, `.page-header__desc`, `.section`, `.section__title` |
| 공통 | `base.css` | `.container`, `.visually-hidden`, `.skip-link`("본문으로 건너뛰기"), `.boot-notice`(헤더가 늦게 뜨거나 파일을 못 불러올 때 안내 — JS도 이 class 이름으로 만들어서 이름은 그대로) |

> 로그인이 필요한 페이지(playlists, playlist, ratings)는 로그인해야 본문이 보입니다. 로컬 서버를 **`http://localhost:5173`** 으로 열고 본인 구글 계정으로 로그인하면 실제 화면을 볼 수 있어요. (다른 포트나 Live Server 주소에서는 로그인이 안 됩니다) 로그인 없이 부품만 볼 때는 styleguide.html을 쓰세요.

---

## 6. 접근성 체크 (디자인할 때 지켜 주세요)

- 글자와 배경의 대비를 충분히 (회색 글자를 너무 옅게 하지 않기)
- `:focus-visible` 포커스 테두리를 지우지 않기 (Tab 키로 이동할 때 필요)
- 버튼과 링크는 손가락으로 누르기 쉽게 높이 36~44px 이상
- `.visually-hidden`은 화면에 안 보이지만 스크린리더가 읽는 글자입니다. 지우지 마세요.
- 360px 폭(작은 휴대폰)에서 가로 스크롤이 생기지 않게 확인하기 (브라우저 개발자 도구 → 기기 모드)

---

## 7. 작업 순서 추천

1. `styleguide.html`을 열어 둡니다.
2. `css/base.css` 변수부터 바꿔서 전체 분위기를 맞춥니다.
3. `css/components.css`에서 부품을 다듬습니다.
4. 페이지별 CSS로 레이아웃을 다듬습니다.
5. styleguide.html과 실제 페이지(index, recommend, login)를 데스크톱과 360px 폭에서 확인합니다.
6. 브랜치를 만들어 PR을 올립니다. (방법은 README의 "팀원 안내" 참고)
