// 추천 페이지(recommend.html) 동작 — 2단계에서 구현
import { initLayout } from '../layout.js';

// 페이지 시작
async function main() {
  await initLayout();
}

main().catch((error) => console.error('[recommend] 초기화 실패', error));
