// =====================================================================
// 플레이리스트 상세 페이지(playlist.html?id=...) 동작
// - 로그인 필요, 곡 목록, 곡 빼기, 이름 바꾸기, 삭제(확인 모달)
// =====================================================================

import { initLayout } from '../layout.js';
import { $, setText, setBusy } from '../utils/dom.js';
import { formatDate, toDate } from '../utils/format.js';
import { protectPage } from '../auth.js';
import {
  getPlaylist, renamePlaylist, deletePlaylist, removeTrackFromPlaylist,
  getPlaylistErrorMessage, MAX_TRACKS,
} from '../playlist.js';
import { showStatus, clearStatus } from '../components/status.js';
import { showToast } from '../components/toast.js';
import { confirmModal } from '../components/modal.js';
import { renderTrackCard, getRatingSlot } from '../components/track-card.js';
import { getMyRatingsMap } from '../rating.js';
import { mountTrackRating } from '../rating-ui.js';

const el = {};
const state = { user: null, playlistId: '', playlist: null, myRatings: new Map() };

// 주소의 ?id= 값 읽기 (Firestore 자동 ID 형식만 허용)
function readPlaylistId() {
  const id = new URLSearchParams(window.location.search).get('id') || '';
  return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : '';
}

// 제목, 곡 수 표시
function renderHeader() {
  const { name, tracks, updatedAt } = state.playlist;
  setText(document, 'playlist-title', name);
  document.title = `${name} · 곡찾기`;
  const date = formatDate(updatedAt);
  setText(document, 'playlist-meta', `${tracks.length} / ${MAX_TRACKS}곡${date ? ` · ${date} 수정` : ''}`);
}

// 곡 카드 하나 만들기 (별점 포함)
function createTrackCard(track) {
  const added = formatDate(toDate(track.addedAt));
  const card = renderTrackCard(track, {
    meta: added ? `${added} 추가` : '',
    onRemove: handleRemoveTrack,
  });
  mountTrackRating(getRatingSlot(card), track, {
    user: state.user,
    myScore: state.myRatings.get(track.key)?.score ?? null,
  });
  return card;
}

// 곡 목록 그리기
function renderTracks() {
  const { tracks } = state.playlist;
  if (!tracks.length) {
    el.list.replaceChildren();
    showStatus(el.tracksStatus, {
      type: 'empty',
      message: '아직 담긴 곡이 없어요. 추천받은 곡에서 "플레이리스트에 추가"를 눌러 보세요.',
      linkText: '추천받으러 가기',
      linkHref: 'recommend.html',
    });
    return;
  }
  clearStatus(el.tracksStatus);
  el.list.replaceChildren(...tracks.map(createTrackCard));
}

// 플레이리스트 불러오기
async function loadPlaylist() {
  el.content.hidden = true;
  showStatus(el.pageStatus, { type: 'loading', message: '플레이리스트를 불러오는 중이에요…' });
  try {
    const playlist = await getPlaylist(state.user.uid, state.playlistId);
    if (!playlist) {
      showStatus(el.pageStatus, {
        type: 'error',
        message: '플레이리스트를 찾을 수 없어요. 삭제되었거나 주소가 잘못됐을 수 있어요.',
        linkText: '내 플레이리스트로',
        linkHref: 'playlists.html',
      });
      return;
    }
    state.playlist = playlist;
    try {
      state.myRatings = await getMyRatingsMap(state.user.uid);
    } catch (error) {
      console.warn('[playlist] 내 평점을 못 불러왔어요', error);
    }
    clearStatus(el.pageStatus);
    el.content.hidden = false;
    renderHeader();
    renderTracks();
  } catch (error) {
    console.error('[playlist] 불러오기 실패', error);
    showStatus(el.pageStatus, { type: 'error', message: getPlaylistErrorMessage(error), onRetry: loadPlaylist });
  }
}

// 곡 빼기
async function handleRemoveTrack(track, button) {
  setBusy(button, true);
  const index = state.playlist.tracks.findIndex((t) => t.key === track.key);
  try {
    state.playlist.tracks = await removeTrackFromPlaylist(state.user.uid, state.playlistId, track.key);
    state.playlist.updatedAt = new Date();
    renderHeader();
    renderTracks();
    focusAfterRemove(index);
    showToast(`"${track.title}"을(를) 뺐어요`);
  } catch (error) {
    console.error('[playlist] 곡 빼기 실패', error);
    if (handleMissingPlaylist(error)) return;
    showToast(getPlaylistErrorMessage(error), { type: 'error' });
    setBusy(button, false);
  }
}

// 곡을 뺀 뒤 키보드 포커스를 같은 자리의 다음 곡 "빼기" 버튼으로 (없으면 목록 안내로)
function focusAfterRemove(index) {
  const cards = el.list.children;
  const next = cards[Math.min(Math.max(index, 0), cards.length - 1)];
  const target = next && $('card-remove', next);
  if (target) {
    target.focus();
    return;
  }
  el.tracksStatus.tabIndex = -1;
  el.tracksStatus.focus();
}

// 다른 탭·기기에서 이미 삭제된 플레이리스트면 "찾을 수 없음" 화면으로 바꿈
function handleMissingPlaylist(error) {
  if (error?.code !== 'not-found') return false;
  loadPlaylist();
  return true;
}

// 이름 바꾸기 폼 열기/닫기
function setRenameOpen(open) {
  el.renameForm.hidden = !open;
  el.renameOpen.hidden = open;
  if (open) {
    el.renameInput.value = state.playlist.name;
    el.renameInput.focus();
    el.renameInput.select();
  } else {
    el.renameOpen.focus();
  }
}

// 이름 저장
async function handleRename(event) {
  event.preventDefault();
  setBusy(el.renameSubmit, true);
  try {
    state.playlist.name = await renamePlaylist(state.user.uid, state.playlistId, el.renameInput.value);
    state.playlist.updatedAt = new Date();
    renderHeader();
    setRenameOpen(false);
    showToast('이름을 바꿨어요', { type: 'success' });
  } catch (error) {
    console.error('[playlist] 이름 바꾸기 실패', error);
    if (handleMissingPlaylist(error)) return;
    showToast(getPlaylistErrorMessage(error), { type: 'error' });
  } finally {
    setBusy(el.renameSubmit, false);
  }
}

// 플레이리스트 삭제 (확인 모달)
async function handleDelete() {
  const { name, tracks } = state.playlist;
  const confirmed = await confirmModal({
    title: '플레이리스트 삭제',
    message: `"${name}" 플레이리스트를 삭제할까요? 담긴 ${tracks.length}곡도 함께 사라지고 되돌릴 수 없어요.`,
    confirmText: '삭제',
  });
  if (!confirmed) return;

  setBusy(el.deleteButton, true);
  try {
    await deletePlaylist(state.user.uid, state.playlistId);
    window.location.href = 'playlists.html';
  } catch (error) {
    console.error('[playlist] 삭제 실패', error);
    showToast(getPlaylistErrorMessage(error), { type: 'error' });
    setBusy(el.deleteButton, false);
  }
}

// 페이지 시작
async function main() {
  await initLayout();
  el.pageStatus = $('page-status');
  el.content = $('page-content');

  state.user = await protectPage({ statusSlot: el.pageStatus });
  if (!state.user) return;

  state.playlistId = readPlaylistId();
  if (!state.playlistId) {
    showStatus(el.pageStatus, {
      type: 'error',
      message: '잘못된 주소예요. 플레이리스트 목록에서 다시 골라 주세요.',
      linkText: '내 플레이리스트로',
      linkHref: 'playlists.html',
    });
    return;
  }

  el.list = $('track-list');
  el.tracksStatus = $('tracks-status');
  el.renameOpen = $('rename-open');
  el.renameForm = $('rename-form');
  el.renameInput = $('rename-input');
  el.renameSubmit = $('rename-submit');
  el.deleteButton = $('playlist-delete');

  el.renameOpen.addEventListener('click', () => setRenameOpen(true));
  $('rename-cancel').addEventListener('click', () => setRenameOpen(false));
  el.renameForm.addEventListener('submit', handleRename);
  el.deleteButton.addEventListener('click', handleDelete);

  await loadPlaylist();
}

main().catch((error) => console.error('[playlist] 초기화 실패', error));
