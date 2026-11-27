// =====================================================================
// "플레이리스트에 추가됨" 확인 표시 (템플릿: "added-hud")
// 담기에 성공하면 화면 가운데에 잠깐 떴다 사라집니다. (애플 뮤직의 "추가됨" 표시처럼)
// 사용법: showAddedHud({ name: '비 오는 날 듣는 곡' })
// - 화면을 가리지 않고(클릭이 그대로 통과) 스크린리더에는 aria-live로 읽어 줍니다.
// =====================================================================

import { cloneTemplate } from './templates.js';
import { $, setText, setState } from '../utils/dom.js';

const SHOW_MS = 1600;  // 보여 주는 시간
const LEAVE_MS = 250;  // 사라지는 애니메이션 시간

// 표시 자리 (없으면 만듦). 스크린리더가 놓치지 않도록 페이지 시작 때 미리 만들어 둠 (layout.js)
export function ensureHudRegion() {
  let region = $('hud-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'hud-region';
    region.dataset.js = 'hud-region';
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  return region;
}

// 확인 표시 띄우기 (이미 떠 있으면 새 것으로 바꿈)
export function showAddedHud({ title = '플레이리스트에 추가됨', name = '' } = {}) {
  const region = ensureHudRegion();
  const el = cloneTemplate('added-hud');
  setText(el, 'added-hud-title', title);
  const nameEl = setText(el, 'added-hud-name', name ? `"${name}"` : '');
  if (nameEl) nameEl.hidden = !name;
  region.replaceChildren(el);

  window.setTimeout(() => {
    setState(el, 'is-leaving', true);
    window.setTimeout(() => el.remove(), LEAVE_MS);
  }, SHOW_MS);
  return el;
}
