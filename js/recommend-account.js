// =====================================================================
// 추천 페이지에서 쓰는 로그인·평점·플레이리스트 기능 모음
// recommend-page.js가 필요할 때 import()로 불러옵니다.
// → Firebase(gstatic.com)를 못 불러와도(학교·회사 방화벽, 광고 차단 등)
//   곡 검색과 추천은 그대로 동작하고, 별점·플레이리스트만 빠집니다.
// =====================================================================

export { isAuthAvailable, getCurrentUser } from './auth.js';
export { getLowRatedKeys, getMyRatingsMap } from './rating.js';
export { mountTrackRating } from './rating-ui.js';
export { openAddToPlaylistModal } from './playlist-modal.js';
export { listPlaylists } from './playlist.js';
