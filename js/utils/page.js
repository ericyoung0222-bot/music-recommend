// =====================================================================
// 페이지 이름 ↔ 파일 이름 변환, 로그인 후 돌아갈 주소(next) 검사
// 모든 경로는 상대 경로입니다. (GitHub Pages 하위 경로 /레포이름/ 대응)
// =====================================================================

// <body data-page="..."> 값과 실제 파일 이름
export const PAGE_FILES = {
  home: 'index.html',
  recommend: 'recommend.html',
  playlists: 'playlists.html',
  playlist: 'playlist.html',
  ratings: 'ratings.html',
  login: 'login.html',
  styleguide: 'styleguide.html',
};

// 로그인 후 돌아가도 되는 페이지 (login.html 자신은 제외)
const NEXT_ALLOWED = ['index', 'recommend', 'playlists', 'playlist', 'ratings'];

// 로그인이 필요한 페이지 (data-page 값)
export const PROTECTED_PAGES = ['playlists', 'playlist', 'ratings'];

// 지금 페이지가 로그인 필요 페이지인지
export function isProtectedPage(page = getCurrentPage()) {
  return PROTECTED_PAGES.includes(page);
}

// 현재 페이지 이름 (body의 data-page)
export function getCurrentPage() {
  return document.body.dataset.page || 'home';
}

// 현재 페이지의 상대 주소 (예: "playlist.html?id=abc")
export function getCurrentPagePath() {
  const file = PAGE_FILES[getCurrentPage()] || 'index.html';
  return file + window.location.search;
}

// next 값이 우리 사이트의 허용된 페이지인지 확인 (외부 사이트로 튕기는 공격 방지)
export function isSafeNextPath(path) {
  if (typeof path !== 'string' || path.length > 200) return false;
  const pattern = new RegExp(`^(${NEXT_ALLOWED.join('|')})\\.html(\\?[A-Za-z0-9_=&%.-]*)?$`);
  return pattern.test(path);
}

// 로그인 페이지 주소 만들기 (돌아올 주소를 next로 붙임)
export function buildLoginUrl(nextPath = getCurrentPagePath()) {
  if (!isSafeNextPath(nextPath)) return 'login.html';
  return `login.html?next=${encodeURIComponent(nextPath)}`;
}

// 로그인 후 이동할 주소 읽기 (안전하지 않으면 홈으로)
export function readNextPath() {
  const next = new URLSearchParams(window.location.search).get('next');
  return isSafeNextPath(next) ? next : 'index.html';
}
