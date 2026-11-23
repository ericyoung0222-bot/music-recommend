// 내 평점 페이지(ratings.html) 동작 — 평점 목록은 5단계에서 구현
import { initLayout } from '../layout.js';
import { $ } from '../utils/dom.js';
import { protectPage } from '../auth.js';

// 페이지 시작
async function main() {
  await initLayout();
  const user = await protectPage({ statusSlot: $('page-status'), content: $('page-content') });
  if (!user) return;
}

main().catch((error) => console.error('[ratings] 초기화 실패', error));
