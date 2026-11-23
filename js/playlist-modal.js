// =====================================================================
// "플레이리스트에 추가" 모달 동작 (추천 카드에서 사용)
// 내 플레이리스트 목록 + "새 플레이리스트 만들기"를 보여주고, 고르면 곡을 저장
// =====================================================================

import { getCurrentUser } from './auth.js';
import {
  listPlaylists, createPlaylist, addTrackToPlaylist, getPlaylistErrorMessage,
} from './playlist.js';
import { buildLoginUrl } from './utils/page.js';
import { openModal } from './components/modal.js';
import { showToast } from './components/toast.js';
import { renderPlaylistPicker } from './components/playlist-picker.js';

// 모달 열기 (비로그인이면 로그인 안내 토스트)
export async function openAddToPlaylistModal(track) {
  const user = await getCurrentUser();
  if (!user) {
    showToast('로그인 후 플레이리스트에 담을 수 있어요', { linkText: '로그인', linkHref: buildLoginUrl() });
    return;
  }

  let busy = false;
  let modal = null;

  // 저장 성공 → 모달 닫고 토스트
  function done(playlistId, playlistName) {
    modal?.close();
    showToast(`"${playlistName}"에 담았어요`, {
      type: 'success',
      linkText: '보러 가기',
      linkHref: `playlist.html?id=${encodeURIComponent(playlistId)}`,
    });
  }

  // 저장 작업을 한 번에 하나만 실행하고, 에러는 모달 안에 표시
  async function runOnce(task) {
    if (busy) return;
    busy = true;
    picker.setBusy(true);
    picker.clearStatus();
    try {
      await task();
    } catch (error) {
      console.error('[playlist-modal] 저장 실패', error);
      picker.setStatus('error', getPlaylistErrorMessage(error));
    } finally {
      busy = false;
      picker.setBusy(false);
    }
  }

  const picker = renderPlaylistPicker({
    trackLabel: `${track.title} — ${track.artist}`,
    onSelect: (playlist) => runOnce(async () => {
      await addTrackToPlaylist(user.uid, playlist.id, track);
      done(playlist.id, playlist.name);
    }),
    onCreate: (name) => runOnce(async () => {
      const id = await createPlaylist(user.uid, name);
      const cleanName = String(name).trim().replace(/\s+/g, ' ');
      await addTrackToPlaylist(user.uid, id, track);
      picker.resetForm();
      done(id, cleanName);
    }),
  });

  modal = openModal({ title: '플레이리스트에 추가', body: picker.el });

  // 목록 불러오기 (실패하면 다시 시도 버튼)
  async function load() {
    picker.setStatus('loading', '플레이리스트를 불러오는 중이에요…');
    try {
      picker.setPlaylists(await listPlaylists(user.uid));
    } catch (error) {
      console.error('[playlist-modal] 목록 불러오기 실패', error);
      picker.setStatus('error', getPlaylistErrorMessage(error), load);
    }
  }
  load();
}
