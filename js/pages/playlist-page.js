// 플레이리스트 상세 페이지(playlist.html) 동작 — 4단계에서 구현
import { initLayout } from '../layout.js';

// 페이지 시작
async function main() {
  await initLayout();
}

main().catch((error) => console.error('[playlist] 초기화 실패', error));
