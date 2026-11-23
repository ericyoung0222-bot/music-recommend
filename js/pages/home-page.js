// 메인 페이지(index.html) 동작: 로그인 상태면 "구글로 로그인" 버튼 숨김
import { initLayout } from '../layout.js';
import { $ } from '../utils/dom.js';
import { onUserChanged } from '../auth.js';

// 페이지 시작
async function main() {
  await initLayout();
  const heroLogin = $('hero-login');
  onUserChanged((user) => {
    if (heroLogin) heroLogin.hidden = Boolean(user);
  });
}

main().catch((error) => console.error('[home] 초기화 실패', error));
