// 로그인 페이지(login.html) 동작 — 3단계에서 구현
import { initLayout } from '../layout.js';

// 페이지 시작
async function main() {
  await initLayout();
}

main().catch((error) => console.error('[login] 초기화 실패', error));
