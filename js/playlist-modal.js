// =====================================================================
// "플레이리스트에 추가" 모달 동작 (추천 카드에서 사용)
// 내 플레이리스트 목록 + "새 플레이리스트 만들기"를 보여주고, 고르면 곡을 저장
// =====================================================================

import { getCurrentUser } from './auth.js';
import {
  listPlaylists, createPlaylistWithTrack, addTrackToPlaylist, normalizeName, getPlaylistErrorMessage,
} from './playlist.js';
import { buildLoginUrl } from './utils/page.js';
import { openModal } from './components/modal.js';
import { showToast } from './components/toast.js';
import { renderPlaylistPicker } from './components/playlist-picker.js';
import { showAddedHud } from './components/added-hud.js';
import { makeTrackKey } from './utils/track-key.js';

// 모달 열기 (비로그인이면 로그인 안내 토스트)
// onAdded({ id, name }): 담기에 성공했을 때 (예: 카드 버튼을 "✓ 추가됨"으로 바꾸기)
export async function openAddToPlaylistModal(track, { onAdded } = {}) {
  const user = await getCurrentUser();
  if (!user) {
    showToast('로그인 후 플레이리스트에 담을 수 있어요', { linkText: '로그인', linkHref: buildLoginUrl() });
    return;
  }

  let busy = false;
  let modal = null;

  // 저장 성공 → 모달 닫고 화면 가운데에 "플레이리스트에 추가됨" 표시 (애플 뮤직처럼)
  // 저장은 이미 끝났으므로 여기서 생긴 오류는 "저장 실패"로 보이지 않게 따로 처리
  function done({ id, name }) {
    modal?.close();
    try {
      showAddedHud({ name });
    } catch (error) {
      // 예: 폰에 옛 화면 부품 파일이 남아 확인 표시 템플릿이 없을 때 → 예전 알림으로 대신
      console.warn('[playlist-modal] 확인 표시를 못 띄웠어요', error);
      showToast(`"${name}"에 담았어요`, { type: 'success' });
    }
    try {
      onAdded?.({ id, name });
    } catch (error) {
      console.warn('[playlist-modal] 담은 뒤 처리 실패', error);
    }
  }

  // 저장 작업을 한 번에 하나만 실행하고, 에러는 모달 안에 표시. 성공하면 done()
  async function runOnce(task) {
    if (busy) return;
    busy = true;
    picker.setBusy(true);
    picker.clearStatus();
    let saved = null;
    try {
      saved = await task();
    } catch (error) {
      console.error('[playlist-modal] 저장 실패', error);
      const message = getPlaylistErrorMessage(error);
      // 저장 중에 모달을 닫았으면 화면에 남아 있는 토스트로 알림 (조용히 실패하지 않게)
      if (modal?.dialog.isConnected) picker.setStatus('error', message);
      else showToast(message, { type: 'error' });
    } finally {
      busy = false;
      picker.setBusy(false);
    }
    if (saved) done(saved);
  }

  const picker = renderPlaylistPicker({
    trackLabel: `${track.title} — ${track.artist}`,
    onSelect: (playlist) => runOnce(async () => {
      await addTrackToPlaylist(user.uid, playlist.id, track);
      return { id: playlist.id, name: playlist.name };
    }),
    onCreate: (name) => runOnce(async () => {
      const cleanName = normalizeName(name); // 이름이 비었거나 너무 길면 여기서 에러 → 모달 안에 안내
      const id = await createPlaylistWithTrack(user.uid, cleanName, track);
      picker.resetForm();
      return { id, name: cleanName };
    }),
  });

  modal = openModal({ title: '플레이리스트에 추가', body: picker.el });

  // 목록 불러오기 (실패하면 다시 시도 버튼)
  async function load() {
    picker.setStatus('loading', '플레이리스트를 불러오는 중이에요…');
    try {
      // 이미 이 곡이 담긴 플레이리스트는 "✓ 담김"으로 표시 (저장할 때와 같은 곡 키로 비교)
      picker.setPlaylists(await listPlaylists(user.uid), { trackKey: makeTrackKey(track.artist, track.title) });
    } catch (error) {
      console.error('[playlist-modal] 목록 불러오기 실패', error);
      picker.setStatus('error', getPlaylistErrorMessage(error), load);
    }
  }
  load();
}
