// =====================================================================
// 내 플레이리스트 페이지(playlists.html) 동작
// - 로그인 필요, 목록 보기(최근 수정 순), 새 플레이리스트 만들기
// =====================================================================

import { initLayout } from '../layout.js';
import { $, setBusy } from '../utils/dom.js';
import { protectPage } from '../auth.js';
import { listPlaylists, createPlaylist, getPlaylistErrorMessage } from '../playlist.js';
import { showStatus, clearStatus } from '../components/status.js';
import { showToast } from '../components/toast.js';
import { renderPlaylistCard } from '../components/playlist-card.js';

const el = {};
let currentUser = null;

// 목록 불러와서 그리기
async function loadPlaylists() {
  el.list.replaceChildren();
  showStatus(el.status, { type: 'loading', message: '플레이리스트를 불러오는 중이에요…' });
  try {
    const playlists = await listPlaylists(currentUser.uid);
    if (!playlists.length) {
      showStatus(el.status, {
        type: 'empty',
        message: '아직 플레이리스트가 없어요. 위에서 새로 만들거나, 추천받은 곡을 담아 보세요.',
        linkText: '추천받으러 가기',
        linkHref: 'recommend.html',
      });
      return;
    }
    clearStatus(el.status);
    el.list.replaceChildren(...playlists.map(renderPlaylistCard));
  } catch (error) {
    console.error('[playlists] 목록 불러오기 실패', error);
    showStatus(el.status, { type: 'error', message: getPlaylistErrorMessage(error), onRetry: loadPlaylists });
  }
}

// 새 플레이리스트 만들기
async function handleCreate(event) {
  event.preventDefault();
  setBusy(el.createSubmit, true);
  try {
    await createPlaylist(currentUser.uid, el.createInput.value);
    el.createInput.value = '';
    showToast('플레이리스트를 만들었어요', { type: 'success' });
    await loadPlaylists();
  } catch (error) {
    console.error('[playlists] 만들기 실패', error);
    showToast(getPlaylistErrorMessage(error), { type: 'error' });
    el.createInput.focus();
  } finally {
    setBusy(el.createSubmit, false);
  }
}

// 페이지 시작
async function main() {
  await initLayout();
  currentUser = await protectPage({ statusSlot: $('page-status'), content: $('page-content') });
  if (!currentUser) return;

  el.list = $('playlist-list');
  el.status = $('playlists-status');
  el.createForm = $('playlist-create-form');
  el.createInput = $('playlist-create-input');
  el.createSubmit = $('playlist-create-submit');

  el.createForm.addEventListener('submit', handleCreate);
  await loadPlaylists();
}

main().catch((error) => console.error('[playlists] 초기화 실패', error));
