// =====================================================================
// 공통 레이아웃: 헤더/푸터 끼워 넣기, 현재 메뉴 표시, 로그인 상태에 따라 메뉴 전환
// 모든 페이지 스크립트는 맨 처음에 await initLayout()을 호출합니다.
// =====================================================================

import { $, $$, setText, safeUrl, setBusy } from './utils/dom.js';
import { buildLoginUrl, getCurrentPage, isProtectedPage } from './utils/page.js';
import { loadTemplates } from './components/templates.js';
import { showToast } from './components/toast.js';
import { ensureHudRegion } from './components/added-hud.js';

const DEFAULT_AVATAR = 'assets/default-avatar.svg';

// 파일 내용을 글자로 가져오기
async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}을(를) 불러오지 못했어요 (${response.status})`);
  return response.text();
}

// data-js 자리(slot)를 partials 파일 내용으로 교체
async function insertPartial(slotName, path) {
  const slot = $(slotName);
  if (!slot) return;
  try {
    const html = await fetchText(path); // 우리 사이트의 고정 파일이라 그대로 넣어도 안전
    const template = document.createElement('template');
    template.innerHTML = html;
    slot.replaceWith(template.content);
  } catch (error) {
    console.error(error);
    slot.textContent = '화면 일부를 불러오지 못했어요. 새로고침해 주세요.';
  }
}

// 메뉴에 없는 페이지는 부모 메뉴를 표시 (플레이리스트 상세 → 내 플레이리스트)
const NAV_PARENT = { playlist: 'playlists' };

// 현재 페이지 메뉴에 is-active와 aria-current 표시
function markActiveNav() {
  const page = NAV_PARENT[getCurrentPage()] || getCurrentPage();
  $$('nav-link').forEach((link) => {
    const active = link.dataset.page === page;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

// 로그인 상태에 맞게 헤더 바꾸기 (user가 null이면 로그아웃 상태)
export function renderHeaderUser(user) {
  document.body.classList.toggle('is-logged-in', Boolean(user));

  const loginLink = $('login-link');
  if (loginLink) {
    loginLink.hidden = Boolean(user);
    // 로그인 페이지에서는 next를 붙이지 않음
    loginLink.href = getCurrentPage() === 'login' ? 'login.html' : buildLoginUrl();
  }

  const menu = $('user-menu');
  if (!menu) return;
  menu.hidden = !user;
  if (!user) return;

  const name = user.displayName || '사용자';
  setText(menu, 'user-name', name);
  const avatar = $('user-avatar', menu);
  if (avatar) {
    avatar.alt = `${name} 프로필 사진`;
    avatar.referrerPolicy = 'no-referrer'; // 구글 프로필 사진이 리퍼러 때문에 막히는 문제 방지
    avatar.addEventListener('error', () => { avatar.src = DEFAULT_AVATAR; }, { once: true });
    avatar.src = safeUrl(user.photoURL) || DEFAULT_AVATAR;
  }
}

// 로그아웃 버튼 연결
function bindLogout(authModule) {
  const button = $('logout-button');
  if (!button) return;
  button.addEventListener('click', async () => {
    setBusy(button, true);
    try {
      await authModule.logout();
      showToast('로그아웃했어요');
      // 로그인이 필요한 페이지에 있었다면 홈으로
      if (isProtectedPage()) window.location.href = 'index.html';
    } catch (error) {
      console.error('[layout] 로그아웃 실패', error);
      showToast('로그아웃하지 못했어요. 다시 시도해 주세요.', { type: 'error' });
    } finally {
      setBusy(button, false);
    }
  });
}

// 페이지를 시작할 수 없을 때 화면 맨 위에 안내 (템플릿이 없으므로 직접 만듦)
function showBootError(message) {
  const notice = document.createElement('p');
  notice.className = 'boot-notice';
  notice.setAttribute('role', 'alert');
  notice.textContent = message;
  document.body.prepend(notice);
}

// 토스트 자리가 없으면 만들어 둠
// (푸터를 못 불러왔거나 디자인 수정 중 data-js="toast-region"이 빠져도 알림이 사라지지 않게)
function ensureToastRegion() {
  if ($('toast-region')) return;
  const region = document.createElement('div');
  region.className = 'toast-region';
  region.dataset.js = 'toast-region';
  region.setAttribute('aria-live', 'polite');
  document.body.append(region);
}

// 레이아웃 초기화: 헤더/푸터/템플릿을 불러오고 메뉴 상태를 맞춤
// withAuth: false면 Firebase를 아예 불러오지 않음 (styleguide.html용)
export async function initLayout({ withAuth = true } = {}) {
  await Promise.all([
    insertPartial('site-header', 'partials/header.html'),
    insertPartial('site-footer', 'partials/footer.html'),
    // 화면 부품 파일은 한 번 더 시도하고, 그래도 안 되면 화면 맨 위에 안내 (조용히 멈추지 않게)
    loadTemplates().catch(() => loadTemplates()).catch((error) => {
      showBootError('화면 구성 파일을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.');
      throw error;
    }),
  ]);
  ensureToastRegion();
  ensureHudRegion(); // "추가됨" 확인 표시 자리 (스크린리더가 읽도록 미리 만들어 둠)
  markActiveNav();
  renderHeaderUser(null);

  if (!withAuth) return;
  // 로그인 모듈은 기다리지 않고 따로 불러옴 → Firebase(gstatic.com)가 느리거나 막혀도
  // 페이지 기능(검색·추천 등)은 바로 동작하고, 헤더의 로그인 표시는 불러오는 대로 바뀜
  import('./auth.js')
    .then((authModule) => {
      // 다른 탭에서 로그아웃하면: 헤더를 바꾸고, 로그인이 필요한 페이지면 홈으로 이동
      // (그대로 두면 남의 눈에 내 목록이 보이고, 모든 저장이 권한 오류로 실패함)
      let wasLoggedIn = false;
      authModule.onUserChanged((user) => {
        renderHeaderUser(user);
        if (wasLoggedIn && !user && isProtectedPage()) window.location.replace('index.html');
        wasLoggedIn = Boolean(user);
      });
      bindLogout(authModule);
    })
    .catch((error) => {
      // Firebase SDK를 못 불러와도(오프라인 등) 나머지 화면은 동작하게
      console.error('[layout] 로그인 모듈을 불러오지 못했어요', error);
    });
}
