// 내 평점 페이지(ratings.html) 동작 — 5단계에서 구현
import { initLayout } from '../layout.js';

// 페이지 시작
async function main() {
  await initLayout();
}

main().catch((error) => console.error('[ratings] 초기화 실패', error));
