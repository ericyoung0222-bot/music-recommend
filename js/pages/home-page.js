// 메인 페이지(index.html) 동작: 로그인 상태면 "구글로 로그인" 버튼 숨김
import { initLayout } from '../layout.js';
import { $ } from '../utils/dom.js';

// 페이지 시작
async function main() {
  await initLayout();
  const heroLogin = $('hero-login');
  // 로그인 기능은 따로 불러옴: Firebase를 못 불러와도 메인 화면과 메뉴는 그대로 보이게
  try {
    const { onUserChanged } = await import('../auth.js');
    onUserChanged((user) => {
      if (heroLogin) heroLogin.hidden = Boolean(user);
    });
  } catch (error) {
    console.warn('[home] 로그인 기능을 불러오지 못했어요', error);
  }
}

main().catch((error) => console.error('[home] 초기화 실패', error));
