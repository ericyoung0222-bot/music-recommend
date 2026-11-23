// 플레이리스트 상세 페이지(playlist.html) 동작 — 상세 기능은 4단계에서 구현
import { initLayout } from '../layout.js';
import { $ } from '../utils/dom.js';
import { protectPage } from '../auth.js';

// 페이지 시작
async function main() {
  await initLayout();
  const user = await protectPage({ statusSlot: $('page-status'), content: $('page-content') });
  if (!user) return;
}

main().catch((error) => console.error('[playlist] 초기화 실패', error));
