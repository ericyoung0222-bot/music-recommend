// =====================================================================
// "플레이리스트에 추가" 모달 안의 내용 (템플릿: "playlist-picker", "playlist-picker-item")
// 화면만 담당하고, 실제 저장은 js/playlist-modal.js가 합니다. (styleguide에서도 사용)
// =====================================================================

import { cloneTemplate } from './templates.js';
import { $, $$, setText, setDisabled, setBusy } from '../utils/dom.js';
import { showStatus, clearStatus } from './status.js';

// 선택 화면 만들기
// onSelect(playlist): 기존 플레이리스트를 골랐을 때
// onCreate(name): 새 플레이리스트 이름을 입력하고 제출했을 때
export function renderPlaylistPicker({ trackLabel, onSelect, onCreate } = {}) {
  const el = cloneTemplate('playlist-picker');
  const list = $('picker-list', el);
  const statusSlot = $('picker-status', el);
  const form = $('picker-create-form', el);
  const input = $('picker-create-input', el);
  const submit = $('picker-create-submit', el);

  setText(el, 'picker-track', trackLabel ? `담을 곡: ${trackLabel}` : '');

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    onCreate?.(input.value);
  });

  // 목록 그리기
  function setPlaylists(playlists) {
    clearStatus(statusSlot);
    const items = playlists.map((playlist) => {
      const item = cloneTemplate('playlist-picker-item');
      setText(item, 'picker-name', playlist.name);
      setText(item, 'picker-count', `${playlist.tracks?.length ?? 0}곡`);
      $('picker-option', item)?.addEventListener('click', () => onSelect?.(playlist));
      return item;
    });
    list.replaceChildren(...items);
    if (!playlists.length) {
      showStatus(statusSlot, { type: 'empty', message: '아직 플레이리스트가 없어요. 아래에서 새로 만들어 보세요.' });
      input?.focus();
    }
  }

  return {
    el,
    setPlaylists,
    // 상태 메시지 (모달 위에서는 토스트가 가려지므로 여기에 표시)
    setStatus(type, message, onRetry) {
      if (type === 'loading') list.replaceChildren();
      showStatus(statusSlot, { type, message, onRetry });
    },
    clearStatus() {
      clearStatus(statusSlot);
    },
    // 저장 중에는 버튼을 못 누르게
    setBusy(busy) {
      $$('picker-option', el).forEach((button) => setDisabled(button, busy));
      setDisabled(input, busy);
      setBusy(submit, busy);
    },
    resetForm() {
      if (input) input.value = '';
    },
  };
}
