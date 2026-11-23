// 곡 검색 자동완성 후보: 한 줄 렌더링 + 목록 전체의 선택 처리 (템플릿: "suggestion")
//
// 선택 방식
// - 터치: 손가락을 뗄 때(touchend) 바로 선택하고 preventDefault
//   → 브라우저가 뒤따라 만드는 mousedown(입력창 포커스 이동)·click이 생기지 않음
//   (폰에서는 mousedown 때 포커스가 <main tabindex="-1">로 옮겨 가며 목록이 먼저 닫혀
//    click이 곡이 아닌 아래 요소에 떨어지는 문제가 있었음. iOS Safari는 누르는 사이
//    후보가 다시 그려지면 click 자체를 버리기도 함)
// - 마우스·펜·키보드 보조기기: click으로 선택 (mousedown은 막아서 입력창 포커스 유지)
// - 이벤트는 목록(ul)에 한 번만 연결하고, 곡 정보는 후보 요소에 묶어 둠
//   → 목록이 다시 그려져도 누른 곡이 그대로 선택됨

import { cloneTemplate } from './templates.js';
import { $, setText, setImage } from '../utils/dom.js';

const DEFAULT_ALBUM_IMAGE = 'assets/default-album.svg';
const TAP_SLOP = 10;          // px: 이보다 많이 움직이면 탭이 아니라 스크롤
const SCROLL_SETTLE_MS = 150; // 스크롤 직후의 탭은 "스크롤 멈추기"로 보고 선택하지 않음
const CLICK_DEDUPE_MS = 800;  // 터치로 고른 직후 따라오는 click은 무시
const TOUCH_RECENT_MS = 1000; // 이 시간 안에 터치가 있었으면 click도 터치로 취급

// 후보 요소 → 곡
const trackByItem = new WeakMap();

// 후보 한 줄 만들기 (id: aria-activedescendant 연결용)
// onSelect는 예전 방식 호환용(캐시에 남은 옛 페이지 코드가 이 파일의 새 버전을 불러올 때).
// 지금은 bindSuggestionList로 목록 전체에 한 번만 연결하므로 넘기지 않음
export function renderSuggestion(track, { id, onSelect } = {}) {
  const item = cloneTemplate('suggestion');
  if (id) item.id = id;
  setImage($('suggestion-image', item), track.image, '', DEFAULT_ALBUM_IMAGE);
  setText(item, 'suggestion-title', track.title);
  setText(item, 'suggestion-artist', track.artist);
  trackByItem.set(item, track);
  if (onSelect) {
    item.addEventListener('click', (event) => onSelect(track, { pointerType: event.pointerType || '' }));
  }
  return item;
}

// 이벤트 대상에서 후보 요소 찾기 (목록 안의 것만)
function itemFrom(list, target) {
  const item = target instanceof Element ? target.closest('[data-js="suggestion"]') : null;
  return item && list.contains(item) ? item : null;
}

function findTouch(touches, id) {
  for (let i = 0; i < touches.length; i += 1) {
    if (touches[i].identifier === id) return touches[i];
  }
  return null;
}

const movedTooFar = (touch, start) => Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > TAP_SLOP;

// 후보 목록(ul)에 선택 처리를 한 번만 연결
// onSelect(track, { pointerType }): pointerType은 'touch' / 'mouse' / 'pen'
export function bindSuggestionList(list, { onSelect } = {}) {
  let tap = null;
  let lastScrollAt = 0;
  let lastTouchAt = 0;
  let ignoreClickUntil = 0;
  const now = () => performance.now();

  // 목록이나 페이지가 스크롤(관성 포함) 중인지 기록
  document.addEventListener('scroll', () => { lastScrollAt = now(); }, { capture: true, passive: true });

  // 손가락을 뗄 때 처리
  function endTap(event, current) {
    lastTouchAt = now();
    const touch = findTouch(event.changedTouches, current.id);
    if (!touch || movedTooFar(touch, current) || now() - lastScrollAt < SCROLL_SETTLE_MS) return;
    if (!event.cancelable) return; // 취소할 수 없으면 click 쪽에 맡김
    event.preventDefault();        // 뒤따르는 mousedown·click 막기
    ignoreClickUntil = now() + CLICK_DEDUPE_MS;
    onSelect?.(current.track, { pointerType: 'touch' });
  }

  // 누를 때 그 요소에 move/end/cancel을 직접 연결
  // (누르는 사이 목록이 다시 그려져 그 요소가 화면에서 빠지면, 이벤트가 목록까지 올라오지 않음)
  list.addEventListener('touchstart', (event) => {
    lastTouchAt = now();
    tap?.stop();
    tap = null;
    if (event.touches.length !== 1 || now() - lastScrollAt < SCROLL_SETTLE_MS) return;
    const item = itemFrom(list, event.target);
    const touch = event.changedTouches[0];
    const track = item && trackByItem.get(item);
    if (!track || !touch) return;

    const controller = new AbortController();
    const current = {
      id: touch.identifier, x: touch.clientX, y: touch.clientY, track,
      stop: () => controller.abort(),
    };
    tap = current;
    const finish = () => {
      controller.abort();
      if (tap === current) tap = null;
    };
    const { signal } = controller;
    const target = event.target;
    target.addEventListener('touchmove', (e) => {
      const moved = findTouch(e.changedTouches, current.id);
      if (moved && movedTooFar(moved, current)) finish();
    }, { passive: true, signal });
    target.addEventListener('touchend', (e) => {
      finish();
      endTap(e, current);
    }, { passive: false, signal });
    target.addEventListener('touchcancel', finish, { signal });
  }, { passive: true });

  // 마우스로 누르는 동안 입력창 포커스가 빠지지 않게
  list.addEventListener('mousedown', (event) => event.preventDefault());

  // 마우스·펜, 또는 터치 이벤트를 쓸 수 없을 때의 선택
  list.addEventListener('click', (event) => {
    if (now() < ignoreClickUntil) return;
    const item = itemFrom(list, event.target);
    const track = item && trackByItem.get(item);
    if (!track) return;
    const pointerType = now() - lastTouchAt < TOUCH_RECENT_MS ? 'touch' : (event.pointerType || 'mouse');
    onSelect?.(track, { pointerType });
  });
}
