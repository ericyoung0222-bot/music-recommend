// =====================================================================
// 별점 컴포넌트에 실제 데이터 연결 (카드의 [data-js="card-rating"] 자리에 붙임)
// - 평균/인원을 불러와 표시
// - 별을 누르면 저장, "평점 삭제"를 누르면 삭제
// - 비로그인이면 "로그인 후 평가할 수 있어요" 토스트 + 로그인 링크
// =====================================================================

import {
  saveRating, deleteRating, getTrackStats, getRatingErrorMessage,
} from './rating.js';
import { makeTrackKey } from './utils/track-key.js';
import { buildLoginUrl } from './utils/page.js';
import { createStarRating } from './components/star-rating.js';
import { showToast } from './components/toast.js';

// 별점 붙이기
// user: 로그인한 사용자 또는 null, myScore: 내 점수(없으면 null)
// onChange(score): 저장/삭제 후 호출 (삭제면 null)
export function mountTrackRating(slot, track, { user = null, myScore = null, onChange } = {}) {
  if (!slot) return null;
  const key = track.key || makeTrackKey(track.artist, track.title);
  let rating = null;

  // 평균 불러오기
  async function refreshStats() {
    rating.setLoading(true);
    try {
      rating.setStats(await getTrackStats(key));
    } catch (error) {
      console.warn('[rating] 평균 조회 실패', error);
      rating.setStats(null);
    } finally {
      rating.setLoading(false);
    }
  }

  // 별 클릭 → 저장 (실패하면 원래 점수로 되돌림)
  async function handleRate(score) {
    if (!user) {
      showToast('로그인 후 평가할 수 있어요', { linkText: '로그인', linkHref: buildLoginUrl() });
      return;
    }
    if (score === rating.myScore) return;
    const previous = rating.myScore;
    rating.setMyScore(score);
    rating.setDisabled(true);
    try {
      await saveRating(user.uid, track, score);
      onChange?.(score);
      await refreshStats();
    } catch (error) {
      console.error('[rating] 저장 실패', error);
      rating.setMyScore(previous);
      showToast(getRatingErrorMessage(error), { type: 'error' });
    } finally {
      rating.setDisabled(false);
    }
  }

  // "평점 삭제" → 삭제
  async function handleClear() {
    if (!user || !rating.myScore) return;
    const previous = rating.myScore;
    rating.setDisabled(true);
    try {
      await deleteRating(user.uid, key);
      rating.setMyScore(null);
      onChange?.(null);
      showToast('평점을 삭제했어요');
      await refreshStats();
    } catch (error) {
      console.error('[rating] 삭제 실패', error);
      rating.setMyScore(previous);
      showToast(getRatingErrorMessage(error), { type: 'error' });
    } finally {
      rating.setDisabled(false);
    }
  }

  rating = createStarRating({
    trackTitle: track.title, myScore, onRate: handleRate, onClear: handleClear,
  });
  slot.replaceChildren(rating.el);
  refreshStats();
  return rating;
}
