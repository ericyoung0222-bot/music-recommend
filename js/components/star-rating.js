// =====================================================================
// 별점 컴포넌트 (템플릿: "star-rating")
// 화면만 담당합니다. 저장/불러오기는 js/rating-ui.js가 연결합니다. (styleguide에서도 사용)
//
// createStarRating({ trackTitle, myScore, average, count, onRate, onClear })
//  - 별 5개는 각각 button → Tab으로 이동, Enter/Space로 선택
//  - 별 위에서 ←→(또는 ↑↓) 키로 별 사이를 이동, Home/End로 처음/끝
//  - "내 점수 N점"과 "★평균 (N명)" 표시
// =====================================================================

import { cloneTemplate } from './templates.js';
import { $, $$, setText, setState } from '../utils/dom.js';

// 평균 글자 만들기
function formatAverage(average, count) {
  if (!count) return '아직 평가가 없어요';
  return `★${Number(average).toFixed(1)} (${count}명)`;
}

// 별점 하나 만들기
export function createStarRating({
  trackTitle = '', myScore = null, average = null, count = 0, onRate, onClear,
} = {}) {
  const el = cloneTemplate('star-rating');
  const stars = $$('star', el);
  const clearButton = $('star-clear', el);
  const api = { el, myScore: null };
  // 저장 중 여부: 버튼을 disabled로 만들면 키보드 포커스가 사라지므로,
  // aria-disabled + 이 값으로 클릭만 무시함 (포커스는 누른 별에 그대로)
  let busy = false;

  $('star-group', el)?.setAttribute('aria-label', `${trackTitle} 별점 주기`);
  clearButton?.setAttribute('aria-label', `${trackTitle} 내 평점 삭제`);

  // 별마다 접근성 이름과 이벤트 연결
  stars.forEach((star, index) => {
    const score = Number(star.dataset.score);
    star.setAttribute('aria-label', `${score}점`);
    star.addEventListener('click', () => { if (!busy) onRate?.(score); });
    star.addEventListener('pointerenter', () => previewTo(score));
    star.addEventListener('keydown', (event) => moveFocus(event, index));
  });
  $('star-group', el)?.addEventListener('pointerleave', () => previewTo(0));
  clearButton?.addEventListener('click', () => { if (!busy) onClear?.(); });

  // 마우스를 올린 별까지 is-active (미리 보기)
  function previewTo(score) {
    stars.forEach((star) => setState(star, 'is-active', Number(star.dataset.score) <= score));
  }

  // 키보드로 별 사이 이동
  function moveFocus(event, index) {
    const last = stars.length - 1;
    const keyMap = {
      ArrowRight: Math.min(index + 1, last),
      ArrowUp: Math.min(index + 1, last),
      ArrowLeft: Math.max(index - 1, 0),
      ArrowDown: Math.max(index - 1, 0),
      Home: 0,
      End: last,
    };
    if (!(event.key in keyMap)) return;
    event.preventDefault();
    stars[keyMap[event.key]].focus();
  }

  // 내 점수 표시 (null이면 평가 안 함)
  api.setMyScore = (score) => {
    api.myScore = score || null;
    stars.forEach((star) => {
      const value = Number(star.dataset.score);
      setState(star, 'is-selected', Boolean(api.myScore) && value <= api.myScore);
      star.setAttribute('aria-pressed', String(value === api.myScore));
    });
    setText(el, 'star-mine', api.myScore ? `내 점수 ${api.myScore}점` : '');
    if (clearButton) {
      const hadFocus = clearButton === document.activeElement;
      clearButton.hidden = !api.myScore;
      // 누른 "평점 삭제" 버튼이 숨겨지면 포커스를 첫 별로 옮김 (키보드 사용자가 위치를 잃지 않게)
      if (hadFocus && clearButton.hidden) stars[0]?.focus();
    }
  };

  // 평균/인원 표시 (stats가 null이면 불러오기 실패)
  api.setStats = (stats) => {
    if (!stats) {
      setText(el, 'star-average', '평균을 불러오지 못했어요');
      return;
    }
    setText(el, 'star-average', formatAverage(stats.average, stats.count));
  };

  // 평균 불러오는 중
  api.setLoading = (loading) => {
    setState(el, 'is-loading', loading);
    if (loading) setText(el, 'star-average', '평균 불러오는 중…');
  };

  // 저장 중에는 못 누르게
  api.setDisabled = (disabled) => {
    busy = Boolean(disabled);
    setState(el, 'is-disabled', busy);
    el.setAttribute('aria-busy', String(busy));
    stars.forEach((star) => star.setAttribute('aria-disabled', String(busy)));
    clearButton?.setAttribute('aria-disabled', String(busy));
  };

  api.setMyScore(myScore);
  api.setStats({ average, count });
  return api;
}
