<!--
  PR(Pull Request) 작성 요령
  - 이런 안내 글(지금 읽고 있는 이 글)은 PR을 만든 뒤 화면에는 보이지 않습니다. 그대로 둬도 됩니다.
  - 아래 항목을 위에서부터 순서대로 채워 주세요.
  - 한 PR에는 이슈 하나 범위의 작업만 담아 주세요.
  - 자세한 방법: docs/CONTRIBUTING.md
-->

## 작업 내용

<!--
  무엇을, 왜 바꿨는지 한두 줄로 적어 주세요. 고친 파일도 적어 주면 좋아요.
  예) 주요 버튼 모서리를 더 둥글게 하고, 마우스를 올렸을 때 색이 진해지도록 바꿨어요.
      (css/base.css 변수 --radius-md 값 변경, css/components.css .btn--primary 수정)
-->

-

## 관련 이슈

<!--
  "Closes #" 뒤에 이슈 번호를 붙여 주세요. (예: Closes #12)
  이 PR이 main에 합쳐지면 그 이슈가 자동으로 닫혀요.
  이슈 번호는 Issues 탭에서 이슈 제목 옆의 #숫자예요.
-->

Closes #

## 스크린샷

<!--
  바꾸기 전 / 바꾼 후 화면을 데스크톱과 모바일(360px) 폭으로 찍어 붙여 주세요.
  - 캡처: Windows는 Win + Shift + S, Mac은 Cmd + Shift + 4
  - 붙이기: 아래 표에서 "여기에 붙여 넣기" 글자를 지우고 그 자리에 Ctrl + V (Mac은 Cmd + V) 하면 이미지가 올라가요.
  - 360px 화면: 브라우저에서 F12 → Ctrl + Shift + M (기기 모드) → 가로 폭에 360 입력
  - 바뀐 부분이 잘 보이게 styleguide.html의 해당 섹션(예: styleguide.html#sg-buttons)을 찍으면 좋아요.
  - 화면이 바뀌지 않는 작업(예: 문구 수정)이면 "해당 없음"이라고 적어 주세요.
-->

### 데스크톱

| 바꾸기 전 | 바꾼 후 |
|---|---|
| 여기에 붙여 넣기 | 여기에 붙여 넣기 |

### 모바일 (360px)

| 바꾸기 전 | 바꾼 후 |
|---|---|
| 여기에 붙여 넣기 | 여기에 붙여 넣기 |

## 확인한 화면

<!--
  확인한 곳의 [ ] 를 [x] 로 바꿔 주세요. (PR을 만든 뒤에는 체크박스를 직접 클릭해도 돼요)
  styleguide.html 섹션 이름: #sg-colors #sg-type #sg-tokens #sg-header #sg-buttons #sg-forms #sg-search
                              #sg-cards #sg-stars #sg-status #sg-toast #sg-modal #sg-playlists #sg-notice
-->

- [ ] styleguide.html (확인한 섹션: `#sg-` )
- [ ] index.html
- [ ] recommend.html
- [ ] login.html

## 체크리스트

<!--
  PR을 올리기 전에 하나씩 확인하고 [ ] 를 [x] 로 바꿔 주세요.
  잘 모르겠는 항목이 있으면 체크하지 말고 아래 "리뷰어에게"에 적어 주세요.
  - "Files changed" 탭에서 내가 고친 파일 목록을 보면 확인하기 쉬워요.
-->

- [ ] HTML의 `data-` 속성(`data-js`, `data-page`, `data-template`, `data-score`)을 지우거나 바꾸지 않았어요
- [ ] `js/` 폴더의 파일을 건드리지 않았어요 (`firestore.rules`, `serve.json`, `.nojekyll`도 그대로예요)
- [ ] 색·글꼴·간격·모서리·그림자는 `css/base.css`의 변수(`var(--...)`)로만 썼어요 (`#코드`는 `css/base.css` 안에만 있어요)
- [ ] 상태 클래스 이름(`is-loading`, `is-active` 등)은 바꾸지 않고 모양만 정했어요
- [ ] `styleguide.html`에서 바뀐 부분을 직접 확인했어요
- [ ] 360px 폭에서 가로 스크롤이 생기지 않고 글자가 잘리지 않는 것을 확인했어요

## 리뷰어에게

<!--
  궁금한 점, 확신이 없는 부분, 특히 봐 줬으면 하는 부분을 자유롭게 적어 주세요.
  없으면 비워 둬도 돼요.
  ⚠️ PR 아래의 "Merge pull request" 버튼은 누르지 마세요. 확인 후 신원영이 합쳐요.
-->
