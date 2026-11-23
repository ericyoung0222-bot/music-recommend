// 메인 페이지(index.html) 동작
import { initLayout } from '../layout.js';

// 페이지 시작
async function main() {
  await initLayout();
}

main().catch((error) => console.error('[home] 초기화 실패', error));
