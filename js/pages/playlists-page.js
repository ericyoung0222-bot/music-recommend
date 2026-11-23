// 내 플레이리스트 페이지(playlists.html) 동작 — 목록 기능은 4단계에서 구현
import { initLayout } from '../layout.js';
import { $ } from '../utils/dom.js';
import { protectPage } from '../auth.js';

// 페이지 시작
async function main() {
  await initLayout();
  const user = await protectPage({ statusSlot: $('page-status'), content: $('page-content') });
  if (!user) return;
}

main().catch((error) => console.error('[playlists] 초기화 실패', error));
