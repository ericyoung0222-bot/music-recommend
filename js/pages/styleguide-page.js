// =====================================================================
// 스타일 가이드 페이지(styleguide.html) 동작
// 로그인/Firebase/Last.fm 없이, 실제 컴포넌트 함수에 가짜 데이터를 넣어 모든 상태를 보여줍니다.
// =====================================================================

import { initLayout, renderHeaderUser } from '../layout.js';
import { $, setText, setState } from '../utils/dom.js';
import { makeTrackKey } from '../utils/track-key.js';
import { cloneTemplate } from '../components/templates.js';
import { renderTrackCard, getRatingSlot } from '../components/track-card.js';
import { renderSuggestion } from '../components/suggestion.js';
import { renderChip } from '../components/chip.js';
import { createStarRating } from '../components/star-rating.js';
import { showStatus } from '../components/status.js';
import { showToast } from '../components/toast.js';
import { openModal, confirmModal } from '../components/modal.js';
import { renderPlaylistCard } from '../components/playlist-card.js';
import { renderPlaylistPicker } from '../components/playlist-picker.js';

// ---------- 가짜 데이터 ----------
const SAMPLE_IMAGE = 'assets/sample-album.svg';

// 가짜 곡 만들기
function fakeTrack(title, artist, image = SAMPLE_IMAGE) {
  return { key: makeTrackKey(artist, title), title, artist, image, url: 'https://www.last.fm/' };
}

const TRACKS = [
  fakeTrack('밤편지', '아이유'),
  fakeTrack('Ditto', 'NewJeans', ''),
  fakeTrack('Hype Boy', 'NewJeans'),
  fakeTrack('아주 아주 긴 곡 제목이 들어가면 카드가 어떻게 보이는지 확인하기 위한 예시 제목 (Feat. 아주 긴 피처링 가수 이름)', '가수 이름도 꽤 길 수 있어요'),
];

const now = Date.now();
const PLAYLISTS = [
  { id: 'demo1', name: '비 오는 날 듣는 곡', tracks: new Array(12).fill(null), updatedAt: new Date(now) },
  { id: 'demo2', name: '운동할 때', tracks: new Array(3).fill(null), updatedAt: new Date(now - 86400000 * 3) },
  { id: 'demo3', name: '아직 비어 있는 플레이리스트', tracks: [], updatedAt: new Date(now - 86400000 * 30) },
];

const FAKE_USER = { displayName: '김영서', photoURL: 'assets/default-avatar.svg' };

// ---------- 각 영역 그리기 ----------

// 헤더 로그인/로그아웃 전환
function setupHeaderDemo() {
  $('sg-login-on')?.addEventListener('click', () => renderHeaderUser(FAKE_USER));
  $('sg-login-off')?.addEventListener('click', () => renderHeaderUser(null));
}

// 자동완성 후보와 칩
function renderSearchDemo() {
  const list = $('sg-suggestions');
  const items = TRACKS.slice(0, 3).map((track, i) => renderSuggestion(track, { id: `sg-suggestion-${i}` }));
  list.replaceChildren(...items);
  setState(items[1], 'is-active', true);
  items[1].setAttribute('aria-selected', 'true');

  const chips = TRACKS.slice(0, 3).map((track) => renderChip({ label: `${track.title} — ${track.artist}` }));
  $('sg-chips').replaceChildren(...chips);

  showStatus($('sg-search-empty'), { type: 'empty', message: '검색 결과가 없어요. 영어 제목이나 다른 표기로도 검색해 보세요.' });
  showStatus($('sg-search-error'), {
    type: 'error',
    message: '인터넷 연결을 확인해 주세요. Last.fm에 연결하지 못했어요.',
    onRetry: () => showToast('(예시) 다시 시도'),
  });
}

// 데모용 별점 (누르면 화면에서만 바뀜)
function demoStars(track, { myScore = null, average = null, count = 0, loggedIn = true } = {}) {
  const rating = createStarRating({
    trackTitle: track.title,
    myScore,
    average,
    count,
    onRate: (score) => {
      if (!loggedIn) {
        showToast('로그인 후 평가할 수 있어요', { linkText: '로그인', linkHref: 'login.html' });
        return;
      }
      rating.setMyScore(score);
    },
    onClear: () => rating.setMyScore(null),
  });
  return rating;
}

// 곡 카드
function renderCardsDemo() {
  const cards = [
    renderTrackCard(TRACKS[0], { onAdd: () => showToast('(예시) 플레이리스트에 추가') }),
    renderTrackCard(TRACKS[1], { onAdd: () => showToast('(예시) 플레이리스트에 추가') }),
    renderTrackCard(TRACKS[2], { meta: '2026. 11. 23. 추가', onRemove: () => showToast('(예시) 목록에서 빼기') }),
    renderTrackCard(TRACKS[3], { onAdd: () => showToast('(예시) 플레이리스트에 추가') }),
  ];
  const ratings = [
    { myScore: null, average: 4.2, count: 12 },
    { myScore: null, average: null, count: 0 },
    { myScore: 4, average: 3.8, count: 5 },
    { myScore: 5, average: 5, count: 1 },
  ];
  cards.forEach((card, i) => {
    getRatingSlot(card).replaceChildren(demoStars(TRACKS[i], ratings[i]).el);
  });
  $('sg-cards').replaceChildren(...cards);
}

// 별점 상태 목록
function renderStarsDemo() {
  const track = TRACKS[0];
  const examples = [];

  const add = (label, rating) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.append(rating.el);
    examples.push(dt, dd);
  };

  add('평가 없음', demoStars(track));
  add('내 점수 4점 + 평균', demoStars(track, { myScore: 4, average: 3.8, count: 12 }));

  const loading = demoStars(track, { myScore: 2 });
  loading.setLoading(true);
  add('평균 불러오는 중 (is-loading)', loading);

  const saving = demoStars(track, { myScore: 3, average: 4, count: 2 });
  saving.setDisabled(true);
  add('저장 중 (is-disabled)', saving);

  const failed = demoStars(track, { myScore: 5 });
  failed.setStats(null);
  add('평균 불러오기 실패', failed);

  add('로그인 안 됨 (눌러 보세요)', demoStars(track, { average: 4.5, count: 8, loggedIn: false }));

  $('sg-stars').replaceChildren(...examples);
}

// 상태 화면 3종
function renderStatusDemo() {
  showStatus($('sg-status-loading'), { type: 'loading', message: '고른 곡과 비슷한 곡을 찾는 중이에요…' });
  showStatus($('sg-status-empty'), {
    type: 'empty',
    message: '아직 플레이리스트가 없어요.',
    linkText: '추천받으러 가기',
    linkHref: '#sg-status',
  });
  showStatus($('sg-status-error'), {
    type: 'error',
    message: 'Last.fm에서 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.',
    onRetry: () => showToast('(예시) 다시 시도'),
  });
}

// 토스트: 버튼 + 고정 예시
function renderToastDemo() {
  $('sg-toast-basic')?.addEventListener('click', () => showToast('로그아웃했어요'));
  $('sg-toast-success')?.addEventListener('click', () => showToast('"비 오는 날 듣는 곡"에 담았어요', { type: 'success' }));
  $('sg-toast-error')?.addEventListener('click', () => showToast('평점을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', { type: 'error' }));
  $('sg-toast-link')?.addEventListener('click', () => showToast('로그인 후 평가할 수 있어요', { linkText: '로그인', linkHref: 'login.html' }));

  const samples = [
    { message: '로그아웃했어요' },
    { message: '"비 오는 날 듣는 곡"에 담았어요', type: 'success', link: '보러 가기' },
    { message: '평점을 저장하지 못했어요.', type: 'error' },
  ].map(({ message, type, link }) => {
    const toast = cloneTemplate('toast');
    if (type) toast.classList.add(`is-${type}`);
    setText(toast, 'toast-message', message);
    const linkEl = $('toast-link', toast);
    if (link && linkEl) {
      linkEl.textContent = link;
      linkEl.href = '#sg-toast';
      linkEl.hidden = false;
    }
    return toast;
  });
  $('sg-toast-samples').replaceChildren(...samples);
}

// 가짜 플레이리스트 선택 화면 만들기
function fakePicker(onDone) {
  const picker = renderPlaylistPicker({
    trackLabel: `${TRACKS[0].title} — ${TRACKS[0].artist}`,
    onSelect: (playlist) => onDone(`(예시) "${playlist.name}"에 담았어요`),
    onCreate: (name) => onDone(`(예시) "${name || '이름 없음'}" 만들고 담았어요`),
  });
  picker.setPlaylists(PLAYLISTS);
  return picker;
}

// 모달
function setupModalDemo() {
  $('sg-modal-picker')?.addEventListener('click', () => {
    let modal = null;
    const picker = fakePicker((message) => {
      modal?.close();
      showToast(message, { type: 'success' });
    });
    modal = openModal({ title: '플레이리스트에 추가', body: picker.el });
  });

  $('sg-modal-confirm')?.addEventListener('click', async () => {
    const ok = await confirmModal({
      title: '플레이리스트 삭제',
      message: '"비 오는 날 듣는 곡" 플레이리스트를 삭제할까요? 담긴 12곡도 함께 사라지고 되돌릴 수 없어요.',
      confirmText: '삭제',
    });
    showToast(ok ? '(예시) 삭제를 눌렀어요' : '(예시) 취소를 눌렀어요');
  });
}

// 플레이리스트 카드와 펼쳐 놓은 선택 화면
function renderPlaylistDemo() {
  $('sg-playlist-cards').replaceChildren(...PLAYLISTS.map(renderPlaylistCard));
  const picker = fakePicker((message) => showToast(message, { type: 'success' }));
  $('sg-picker').replaceChildren(picker.el);
}

// 페이지 시작 (Firebase를 불러오지 않음)
async function main() {
  await initLayout({ withAuth: false });
  setupHeaderDemo();
  renderSearchDemo();
  renderCardsDemo();
  renderStarsDemo();
  renderStatusDemo();
  renderToastDemo();
  setupModalDemo();
  renderPlaylistDemo();
}

main().catch((error) => console.error('[styleguide] 초기화 실패', error));
