// =====================================================================
// 내 평점 페이지(ratings.html) 동작
// - 로그인 필요, 내가 평가한 곡 목록
// - 최신순 / 점수순 정렬, 별을 눌러 점수 수정, "평점 삭제"로 삭제
// =====================================================================

import { initLayout } from '../layout.js';
import { $, setText } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';
import { protectPage } from '../auth.js';
import { listMyRatings } from '../rating.js';
import { mountTrackRating } from '../rating-ui.js';
import { showStatus, clearStatus } from '../components/status.js';
import { renderTrackCard, getRatingSlot } from '../components/track-card.js';

const el = {};
const state = { user: null, ratings: [], sort: 'recent' };

// 정렬된 복사본 만들기 (점수순은 점수가 같으면 최신순)
function sortRatings(list, sort) {
  const time = (r) => r.updatedAt?.getTime() ?? 0;
  const copy = [...list];
  if (sort === 'score') copy.sort((a, b) => (b.score - a.score) || (time(b) - time(a)));
  else copy.sort((a, b) => time(b) - time(a));
  return copy;
}

// 개수 표시
function renderCount() {
  setText(document, 'ratings-count', state.ratings.length ? `${state.ratings.length}곡 평가함` : '');
}

// 빈 화면
function showEmpty() {
  showStatus(el.status, {
    type: 'empty',
    message: '아직 평가한 곡이 없어요. 추천 결과에서 별을 눌러 평가해 보세요.',
    linkText: '추천받으러 가기',
    linkHref: 'recommend.html',
  });
}

// 평점 하나가 바뀌었을 때 (삭제면 목록에서 빼기)
function handleChange(rating, card, score) {
  if (score === null) {
    state.ratings = state.ratings.filter((r) => r.key !== rating.key);
    card.remove();
    renderCount();
    if (!state.ratings.length) showEmpty();
    return;
  }
  rating.score = score;
  rating.updatedAt = new Date();
}

// 목록 그리기
function renderList() {
  renderCount();
  if (!state.ratings.length) {
    el.list.replaceChildren();
    showEmpty();
    return;
  }
  clearStatus(el.status);
  const cards = sortRatings(state.ratings, state.sort).map((rating) => {
    const date = formatDate(rating.updatedAt);
    const card = renderTrackCard(rating, { meta: date ? `${date} 평가` : '' });
    mountTrackRating(getRatingSlot(card), rating, {
      user: state.user,
      myScore: rating.score,
      onChange: (score) => handleChange(rating, card, score),
    });
    return card;
  });
  el.list.replaceChildren(...cards);
}

// 불러오기
async function loadRatings() {
  el.list.replaceChildren();
  showStatus(el.status, { type: 'loading', message: '내 평점을 불러오는 중이에요…' });
  try {
    state.ratings = await listMyRatings(state.user.uid);
    renderList();
  } catch (error) {
    console.error('[ratings] 불러오기 실패', error);
    showStatus(el.status, {
      type: 'error',
      message: '평점을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
      onRetry: loadRatings,
    });
  }
}

// 페이지 시작
async function main() {
  await initLayout();
  state.user = await protectPage({ statusSlot: $('page-status'), content: $('page-content') });
  if (!state.user) return;

  el.list = $('ratings-list');
  el.status = $('ratings-status');
  el.sort = $('ratings-sort');

  el.sort.addEventListener('change', () => {
    state.sort = el.sort.value === 'score' ? 'score' : 'recent';
    renderList();
  });

  await loadRatings();
}

main().catch((error) => console.error('[ratings] 초기화 실패', error));
