// 곡 검색 자동완성 후보 한 줄 렌더링 (템플릿: "suggestion")
import { cloneTemplate } from './templates.js';
import { $, setText, setImage } from '../utils/dom.js';

const DEFAULT_ALBUM_IMAGE = 'assets/default-album.svg';

// 후보 한 줄 만들기 (id: aria-activedescendant 연결용, onSelect: 선택했을 때)
export function renderSuggestion(track, { id, onSelect } = {}) {
  const item = cloneTemplate('suggestion');
  if (id) item.id = id;
  setImage($('suggestion-image', item), track.image, '', DEFAULT_ALBUM_IMAGE);
  setText(item, 'suggestion-title', track.title);
  setText(item, 'suggestion-artist', track.artist);

  // 마우스로 누를 때 입력창 포커스가 빠지지 않게 막고, 클릭으로 선택
  item.addEventListener('pointerdown', (event) => event.preventDefault());
  item.addEventListener('click', () => onSelect?.(track));
  return item;
}
