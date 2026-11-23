// 플레이리스트 카드 렌더링 (템플릿: "playlist-card") — 내 플레이리스트 목록 페이지용
import { cloneTemplate } from './templates.js';
import { $, setText } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';

// 카드 하나 만들기 (playlist: { id, name, tracks, updatedAt })
export function renderPlaylistCard(playlist) {
  const item = cloneTemplate('playlist-card');
  const link = $('playlist-link', item);
  if (link) link.href = `playlist.html?id=${encodeURIComponent(playlist.id)}`;

  setText(item, 'playlist-name', playlist.name);
  const count = playlist.tracks?.length ?? 0;
  const date = formatDate(playlist.updatedAt);
  setText(item, 'playlist-meta', date ? `${count}곡 · ${date} 수정` : `${count}곡`);
  return item;
}
