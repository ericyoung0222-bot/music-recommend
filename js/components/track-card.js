// =====================================================================
// 곡 카드 렌더링 (템플릿: partials/templates.html의 "track-card")
// renderTrackCard(곡, { onAdd, onRemove, meta })
//  - onAdd가 있으면 "플레이리스트에 추가" 버튼 표시
//  - onRemove가 있으면 "목록에서 빼기" 버튼 표시
//  - 별점은 카드 안의 [data-js="card-rating"] 자리에 따로 붙입니다.
// =====================================================================

import { cloneTemplate } from './templates.js';
import { $, setText, setLink, setImage, setState } from '../utils/dom.js';

const DEFAULT_ALBUM_IMAGE = 'assets/default-album.svg';

// 유튜브 검색 주소 만들기
export function youtubeSearchUrl({ artist, title }) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${title}`)}`;
}

// 버튼 연결 (핸들러가 없으면 버튼을 지움)
function bindButton(card, name, handler, track, label) {
  const button = $(name, card);
  if (!button) return;
  if (typeof handler !== 'function') {
    button.remove();
    return;
  }
  button.setAttribute('aria-label', label);
  button.addEventListener('click', () => handler(track, button, card));
}

// 곡 카드 하나 만들기
export function renderTrackCard(track, { onAdd, onRemove, meta } = {}) {
  const card = cloneTemplate('track-card');

  setImage($('card-image', card), track.image, `${track.title} 앨범 이미지`, DEFAULT_ALBUM_IMAGE);
  setText(card, 'card-title', track.title);
  setText(card, 'card-artist', track.artist);

  const metaEl = setText(card, 'card-meta', meta || '');
  if (metaEl) metaEl.hidden = !meta;

  const lastfmLink = setLink(card, 'card-lastfm-link', track.url);
  lastfmLink?.setAttribute('aria-label', `${track.title} Last.fm에서 보기 (새 창)`);
  const youtubeLink = setLink(card, 'card-youtube-link', youtubeSearchUrl(track));
  youtubeLink?.setAttribute('aria-label', `${track.title} 유튜브에서 찾기 (새 창)`);

  bindButton(card, 'card-add', onAdd, track, `${track.title} 플레이리스트에 추가`);
  bindButton(card, 'card-remove', onRemove, track, `${track.title} 목록에서 빼기`);

  return card;
}

// "플레이리스트에 추가" 버튼을 "✓ 추가됨"으로 바꾸기 (added=false면 원래대로)
// 버튼은 계속 눌러서 다른 플레이리스트에도 담을 수 있음. 원래 문구는 템플릿의 것을 그대로 기억해 둠
const addButtonText = new WeakMap();
export function setCardAdded(card, track, added) {
  const button = $('card-add', card);
  if (!button) return;
  if (!addButtonText.has(button)) addButtonText.set(button, button.textContent);
  setState(button, 'is-added', Boolean(added));
  button.textContent = added ? '✓ 추가됨' : addButtonText.get(button);
  button.setAttribute('aria-label', added
    ? `${track.title} 플레이리스트에 추가됨 (다른 플레이리스트에도 추가)`
    : `${track.title} 플레이리스트에 추가`);
}

// 카드 안의 별점 자리 찾기
export function getRatingSlot(card) {
  return $('card-rating', card);
}
