// 곡 검색 자동완성 후보 한 줄 렌더링 (템플릿: "suggestion")
import { cloneTemplate } from './templates.js';
import { $, setText, setImage } from '../utils/dom.js';

const DEFAULT_ALBUM_IMAGE = 'assets/default-album.svg';

// 후보 한 줄 만들기 (id: aria-activedescendant 연결용)
// onSelect(track, { pointerType }): 선택했을 때. pointerType은 'mouse' / 'touch' / 'pen' / ''(알 수 없음)
export function renderSuggestion(track, { id, onSelect } = {}) {
  const item = cloneTemplate('suggestion');
  if (id) item.id = id;
  setImage($('suggestion-image', item), track.image, '', DEFAULT_ALBUM_IMAGE);
  setText(item, 'suggestion-title', track.title);
  setText(item, 'suggestion-artist', track.artist);

  // 마지막으로 누른 도구(마우스/터치)를 기억
  let lastPointerType = '';
  item.addEventListener('pointerdown', (event) => {
    lastPointerType = event.pointerType || '';
    // 마우스일 때만 입력창 포커스가 빠지지 않게 막음 (터치에서는 막아도 소용없고 선택만 방해함)
    if (event.pointerType === 'mouse') event.preventDefault();
  });
  // 선택은 항상 click에서
  item.addEventListener('click', (event) => {
    const pointerType = event.pointerType || lastPointerType;
    lastPointerType = '';
    onSelect?.(track, { pointerType });
  });
  return item;
}
