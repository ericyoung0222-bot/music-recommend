// =====================================================================
// 추천 페이지(recommend.html) 동작
// - 곡 검색 자동완성 (300ms 디바운스, 최대 8개, 키보드 ↑↓ Enter Esc 지원)
// - 선택한 곡을 칩으로 표시 (3~5곡)
// - 추천 실행 → 로딩 / 결과 없음 / 에러 / 결과 카드 표시
// =====================================================================

import { initLayout } from '../layout.js';
import { $, $$, setText, setState, setDisabled, setBusy } from '../utils/dom.js';
import { debounce } from '../utils/debounce.js';
import { isLastfmConfigured } from '../config.js';
import { searchTracks, getLastfmErrorMessage } from '../lastfm.js';
import { getRecommendations } from '../recommend.js';
import { showStatus, clearStatus } from '../components/status.js';
import { showToast } from '../components/toast.js';
// ?v=: 폰 브라우저가 고치기 전 파일을 캐시에서 계속 쓰지 않도록 (바꿀 때마다 숫자 갱신)
import { renderSuggestion, bindSuggestionList } from '../components/suggestion.js?v=20261123c';
import { renderChip } from '../components/chip.js';
// ?v=: 새 기능(setCardAdded)을 쓰므로 폰에 남은 옛 파일 대신 새 파일을 받게 함
import { renderTrackCard, getRatingSlot, setCardAdded } from '../components/track-card.js?v=20261127a';
import { makeTrackKey } from '../utils/track-key.js';

const MIN_SEEDS = 3;
const MAX_SEEDS = 5;
const SEARCH_LIMIT = 8;
const MIN_QUERY_LENGTH = 1;
const SEEDS_STORAGE_KEY = 'recommend:seeds';
// 추천 결과를 보여 준 상태인지 (로그인하고 돌아오거나 새로고침하면 결과를 다시 보여 주기 위해)
const RESULTS_FLAG_KEY = 'recommend:showResults';

// 페이지 상태
const state = {
  seeds: [],          // 선택한 곡 [{ key, title, artist, image, url }]
  suggestions: [],    // 지금 보이는 검색 후보
  activeIndex: -1,    // 키보드로 고른 후보 번호
  searchToken: 0,     // 늦게 도착한 옛 검색 결과를 무시하기 위한 번호
  ignoreQuery: '',    // 곡을 고르며 지운 검색어 (한글 입력기가 글자를 되살려도 다시 검색하지 않기 위해)
  ignoreUntil: 0,
  recommending: false, // 추천 실행 중인지
  defaultPlaceholder: '',
};

// 자주 쓰는 요소 (main에서 채움)
const el = {};

// ---------------------------------------------------------------------
// 선택한 곡 (칩)
// ---------------------------------------------------------------------

// 새로고침해도 선택한 곡이 남도록 sessionStorage에서 읽기
function loadSeeds() {
  try {
    const list = JSON.parse(window.sessionStorage.getItem(SEEDS_STORAGE_KEY) || '[]');
    if (!Array.isArray(list)) return [];
    return list
      .filter((s) => s && typeof s.key === 'string' && typeof s.title === 'string' && typeof s.artist === 'string')
      .slice(0, MAX_SEEDS);
  } catch {
    return [];
  }
}

// 선택한 곡 저장
function saveSeeds() {
  try {
    window.sessionStorage.setItem(SEEDS_STORAGE_KEY, JSON.stringify(state.seeds));
  } catch {
    /* 저장 못 해도 동작에는 문제 없음 */
  }
}

// 결과 표시 상태 기록/지우기 (곡 목록이 바뀌면 지움 → 다른 곡의 옛 결과를 자동으로 띄우지 않게)
function setResultsFlag(on) {
  try {
    if (on) window.sessionStorage.setItem(RESULTS_FLAG_KEY, '1');
    else window.sessionStorage.removeItem(RESULTS_FLAG_KEY);
  } catch {
    /* 저장 못 해도 동작에는 문제 없음 */
  }
}

function readResultsFlag() {
  try {
    return window.sessionStorage.getItem(RESULTS_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

// 칩 목록, 개수 안내, 버튼 상태 다시 그리기
function renderSeeds() {
  const chips = state.seeds.map((seed) => renderChip({
    label: `${seed.title} — ${seed.artist}`,
    removeLabel: `${seed.title} 선택 취소`,
    onRemove: () => removeSeed(seed.key),
  }));
  el.seedList.replaceChildren(...chips);

  const count = state.seeds.length;
  el.seedCount.textContent = count >= MAX_SEEDS
    ? `${count} / ${MAX_SEEDS}곡 선택 완료`
    : `${count} / ${MAX_SEEDS}곡 선택 (최소 ${MIN_SEEDS}곡)`;

  // 추천 중에는 곡을 바꿔도 버튼이 다시 켜지지 않게 (두 번 실행되어 결과가 뒤섞이는 것 방지)
  setDisabled(el.submit, count < MIN_SEEDS || !isLastfmConfigured() || state.recommending);

  const full = count >= MAX_SEEDS;
  setDisabled(el.searchInput, full || !isLastfmConfigured());
  el.searchInput.placeholder = full ? `${MAX_SEEDS}곡을 모두 골랐어요` : state.defaultPlaceholder;

  saveSeeds();
}

// 곡 추가 (중복, 최대 개수 확인)
function addSeed(track) {
  if (state.seeds.length >= MAX_SEEDS) {
    showToast(`최대 ${MAX_SEEDS}곡까지 고를 수 있어요`);
    return false;
  }
  if (state.seeds.some((seed) => seed.key === track.key)) {
    showToast('이미 고른 곡이에요');
    return false;
  }
  const { key, title, artist, image, url } = track;
  state.seeds.push({ key, title, artist, image, url });
  setResultsFlag(false);
  renderSeeds();
  return true;
}

// 곡 빼기
function removeSeed(key) {
  state.seeds = state.seeds.filter((seed) => seed.key !== key);
  setResultsFlag(false);
  renderSeeds();
  el.searchInput.focus();
}

// ---------------------------------------------------------------------
// 검색 자동완성
// ---------------------------------------------------------------------

// 후보 목록 열기/닫기
function setSuggestionsOpen(open) {
  el.suggestions.hidden = !open;
  el.searchInput.setAttribute('aria-expanded', String(open));
  if (!open) {
    state.activeIndex = -1;
    el.searchInput.removeAttribute('aria-activedescendant');
    // 키보드로 고르던 표시도 지움 (같은 결과로 다시 열릴 때 엉뚱한 줄이 강조되지 않게)
    $$('suggestion', el.suggestions).forEach((item) => {
      setState(item, 'is-active', false);
      item.setAttribute('aria-selected', 'false');
    });
  }
}

// 후보 목록 그리기
function renderSuggestions(tracks) {
  // 결과가 같으면 다시 그리지 않음 (누르고 있는 후보가 중간에 바뀌면 iOS가 탭을 버림)
  const same = tracks.length === state.suggestions.length
    && tracks.every((track, i) => track.key === state.suggestions[i].key)
    && el.suggestions.children.length === tracks.length;
  state.suggestions = tracks;
  if (!same) {
    state.activeIndex = -1;
    const items = tracks.map((track, index) => renderSuggestion(track, { id: `suggestion-${index}` }));
    el.suggestions.replaceChildren(...items);
  }
  setSuggestionsOpen(tracks.length > 0);
}

// 키보드로 고른 후보 표시 (is-active)
function setActiveSuggestion(index) {
  const items = $$('suggestion', el.suggestions);
  if (!items.length) return;
  const next = (index + items.length) % items.length; // 끝에서 처음으로 돌기
  state.activeIndex = next;
  items.forEach((item, i) => {
    const active = i === next;
    setState(item, 'is-active', active);
    item.setAttribute('aria-selected', String(active));
  });
  el.searchInput.setAttribute('aria-activedescendant', items[next].id);
  items[next].scrollIntoView({ block: 'nearest' });
}

// 후보 선택 → 칩 추가 (곡 정보를 직접 받음: 목록이 다시 그려져도 누른 곡 그대로)
// 터치(touch/pen)로 고르면 입력창 포커스를 빼서 폰 키보드를 내리고 칩이 보이게 함
function selectTrack(track, { pointerType = '' } = {}) {
  if (!track) return;
  const input = el.searchInput;
  const byTouch = pointerType === 'touch' || pointerType === 'pen';
  const typed = input.value.trim();
  // 먼저 blur: 조합 중인 한글을 입력기가 확정하게 함
  // (값을 비운 뒤에 확정되면 글자가 되살아나 목록이 다시 열림)
  if (byTouch && document.activeElement === input) input.blur();
  addSeed(track);
  input.value = '';
  // 터치로 골랐을 때만: 입력기가 지운 글자를 되살려도 1초 동안은 다시 검색하지 않음
  // (마우스·키보드는 입력창에 그대로 있어 바로 다음 곡을 칠 수 있어야 하므로 켜지 않음)
  state.ignoreQuery = byTouch ? typed : '';
  state.ignoreUntil = byTouch ? performance.now() + 1000 : 0;
  runSearch.cancel();
  state.searchToken += 1;     // 진행 중인 검색 무시
  state.suggestions = [];     // 입력창에 다시 들어올 때 옛 목록(고른 곡 포함)이 열리지 않게
  el.suggestions.replaceChildren();
  setState(el.searchWrap, 'is-loading', false);
  setSuggestionsOpen(false);
  clearStatus(el.searchStatus);
  if (!byTouch && !input.disabled) input.focus();
}

// 검색 영역(입력창 + 후보 목록) 안의 요소인지
function isInSearchArea(node) {
  return node instanceof Node && (el.searchWrap.contains(node) || el.suggestions.contains(node));
}

// 검색 실행 (입력 후 300ms 동안 추가 입력이 없을 때)
const runSearch = debounce(async (query) => {
  // 그 사이 입력창 내용이 바뀌었으면(곡 선택으로 비워짐 등) 옛 검색어로 찾지 않음
  if (el.searchInput.value.trim() !== query) return;
  state.searchToken += 1;
  const token = state.searchToken;
  setState(el.searchWrap, 'is-loading', true);
  clearStatus(el.searchStatus);

  try {
    const results = await searchTracks(query, SEARCH_LIMIT);
    if (token !== state.searchToken) return; // 그 사이 새 검색이 시작됨
    if (el.searchInput.value.trim() !== query) return; // 그 사이 입력창이 바뀜
    const chosen = new Set(state.seeds.map((seed) => seed.key));
    const fresh = results.filter((track) => !chosen.has(track.key));
    renderSuggestions(fresh);
    if (!fresh.length) {
      showStatus(el.searchStatus, { type: 'empty', message: '검색 결과가 없어요. 영어 제목이나 다른 표기로도 검색해 보세요.' });
    }
  } catch (error) {
    if (token !== state.searchToken) return;
    setSuggestionsOpen(false);
    showStatus(el.searchStatus, {
      type: 'error',
      message: getLastfmErrorMessage(error),
      onRetry: () => runSearch(query),
    });
  } finally {
    if (token === state.searchToken) setState(el.searchWrap, 'is-loading', false);
  }
}, 300);

// 입력할 때마다
function handleSearchInput(event) {
  const query = el.searchInput.value.trim();
  // 곡을 고른 직후 한글 입력기가 지운 글자(전체 또는 마지막 음절)를 되살린 경우 무시
  if (query && performance.now() < state.ignoreUntil && state.ignoreQuery.includes(query)) {
    if (!event?.isComposing) el.searchInput.value = '';
    return;
  }
  if (query.length < MIN_QUERY_LENGTH) {
    runSearch.cancel();
    state.searchToken += 1;
    setState(el.searchWrap, 'is-loading', false);
    setSuggestionsOpen(false);
    clearStatus(el.searchStatus);
    return;
  }
  runSearch(query);
}

// 키보드 조작: ↓↑ 이동, Enter 선택, Esc 닫기
function handleSearchKeydown(event) {
  const open = !el.suggestions.hidden && state.suggestions.length > 0;
  switch (event.key) {
    case 'ArrowDown':
      if (event.isComposing || !state.suggestions.length) return;
      event.preventDefault();
      if (!open) setSuggestionsOpen(true);
      setActiveSuggestion(state.activeIndex + 1);
      break;
    case 'ArrowUp':
      if (event.isComposing || !open) return;
      event.preventDefault();
      setActiveSuggestion(state.activeIndex - 1);
      break;
    case 'Enter':
      // 입력창에서 Enter는 폼 제출이 아니라 후보 선택
      event.preventDefault();
      if (event.isComposing) break; // 한글 조합을 끝내는 Enter는 선택하지 않음
      if (open) selectTrack(state.suggestions[state.activeIndex >= 0 ? state.activeIndex : 0], { pointerType: 'keyboard' });
      break;
    case 'Escape':
      if (open) {
        event.preventDefault();
        setSuggestionsOpen(false);
      }
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------
// 추천 결과
// ---------------------------------------------------------------------

// 로그인·평점·플레이리스트 기능 불러오기 (한 번만, 실패하면 null → 그 기능만 빠지고 추천은 계속)
let accountPromise = null;
function loadAccount() {
  if (!accountPromise) {
    accountPromise = import('../recommend-account.js').catch((error) => {
      console.warn('[recommend] 로그인 기능을 불러오지 못했어요 (검색·추천은 계속 동작)', error);
      accountPromise = null; // 다음에 다시 시도
      return null;
    });
  }
  return accountPromise;
}

// 결과에서 뺄 곡 키: 로그인했다면 내가 2점 이하로 준 곡 (실패해도 추천은 계속)
async function getExcludeKeys(user, account) {
  if (!user || !account) return new Set();
  try {
    return await account.getLowRatedKeys(user.uid);
  } catch (error) {
    console.warn('[recommend] 저평가 곡 목록을 못 불러와서 제외 없이 추천해요', error);
    return new Set();
  }
}

// 지금 로그인한 사용자 (Firebase 설정이 없으면 null)
async function getUserIfAny(account) {
  if (!account?.isAuthAvailable()) return null;
  try {
    return await account.getCurrentUser();
  } catch {
    return null;
  }
}

// 내 평점 표 (없거나 실패하면 빈 표)
async function getMyRatings(user, account) {
  if (!user || !account) return new Map();
  try {
    return await account.getMyRatingsMap(user.uid);
  } catch (error) {
    console.warn('[recommend] 내 평점을 못 불러왔어요', error);
    return new Map();
  }
}

// 추천 카드의 "플레이리스트에 추가" → 플레이리스트 선택 모달
function handleAddToPlaylist(track, _button, card) {
  loadAccount()
    .then((account) => {
      if (!account) throw new Error('로그인 기능을 불러오지 못했어요');
      // 담기에 성공하면 카드 버튼을 "✓ 추가됨"으로 (확인 표시는 모달 쪽에서 띄움)
      return account.openAddToPlaylistModal(track, { onAdded: () => setCardAdded(card, track, true) });
    })
    .catch((error) => {
      console.error('[recommend] 플레이리스트 모달 오류', error);
      showToast('플레이리스트를 열지 못했어요. 인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요.', { type: 'error' });
    });
}

// 결과 카드 그리기 (카드마다 별점 붙이기, 로그인 기능을 못 불러왔으면 별점 없이)
function renderResults(tracks, { user, myRatings, account }) {
  const cards = tracks.map((track) => {
    const card = renderTrackCard(track, { onAdd: handleAddToPlaylist });
    account?.mountTrackRating(getRatingSlot(card), track, {
      user,
      myScore: myRatings.get(track.key)?.score ?? null,
    });
    return card;
  });
  el.resultsList.replaceChildren(...cards);
  if (user && account) markAlreadyAdded(tracks, cards, { user, account });
}

// 이미 내 플레이리스트 어딘가에 담긴 곡은 처음부터 "✓ 추가됨"으로 표시 (못 불러와도 추천 화면은 그대로)
async function markAlreadyAdded(tracks, cards, { user, account }) {
  try {
    const playlists = await account.listPlaylists(user.uid);
    const added = new Set(playlists.flatMap((p) => (p.tracks || []).map((t) => t?.key)));
    tracks.forEach((track, i) => {
      if (cards[i].isConnected && added.has(makeTrackKey(track.artist, track.title))) setCardAdded(cards[i], track, true);
    });
  } catch (error) {
    console.warn('[recommend] 담긴 곡 표시를 못 했어요', error);
  }
}

// 추천 실행
async function runRecommend() {
  if (state.recommending || state.seeds.length < MIN_SEEDS) return;
  state.recommending = true;
  // 시작할 때의 곡 목록으로 고정 (도중에 곡을 더하거나 빼도 이번 추천에는 영향 없음)
  const seeds = state.seeds.slice();

  el.resultsSection.hidden = false;
  setState(el.resultsSection, 'is-loading', true);
  setState(el.resultsSection, 'is-error', false);
  setState(el.resultsSection, 'is-empty', false);
  el.resultsList.replaceChildren();
  setText(el.resultsSection, 'results-summary', '');
  setBusy(el.submit, true);
  showStatus(el.resultsStatus, { type: 'loading', message: '고른 곡과 비슷한 곡을 찾는 중이에요…' });
  el.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const account = await loadAccount();
    const user = await getUserIfAny(account);
    const excludeKeys = await getExcludeKeys(user, account);
    const {
      tracks, usedFallback, augmentedSeeds, failedSeeds,
    } = await getRecommendations(seeds, { excludeKeys });

    if (!tracks.length) {
      setState(el.resultsSection, 'is-empty', true);
      showStatus(el.resultsStatus, {
        type: 'empty',
        message: '비슷한 곡을 찾지 못했어요. 더 알려진 곡이나 다른 곡을 골라 보세요.',
      });
      return;
    }

    clearStatus(el.resultsStatus);
    const notes = [`${tracks.length}곡을 추천해요.`];
    if (usedFallback || augmentedSeeds) {
      notes.push('Last.fm에 비슷한 곡 정보가 적은 곡이 있어서, 그 가수와 비슷한 가수의 인기곡도 함께 담았어요.');
    }
    if (failedSeeds) notes.push(`고른 곡 중 ${failedSeeds}곡은 정보를 가져오지 못했어요.`);
    if (excludeKeys.size) notes.push('내가 2점 이하로 평가한 곡은 뺐어요.');
    setText(el.resultsSection, 'results-summary', notes.join(' '));
    renderResults(tracks, { user, account, myRatings: await getMyRatings(user, account) });
    // 같은 곡 목록이면 새로고침·로그인 후에도 결과를 다시 보여 줌 (시작할 때의 곡 목록 그대로일 때만)
    setResultsFlag(seeds.length === state.seeds.length && seeds.every((s, i) => s.key === state.seeds[i].key));
  } catch (error) {
    console.error('[recommend] 추천 실패', error);
    setState(el.resultsSection, 'is-error', true);
    showStatus(el.resultsStatus, {
      type: 'error',
      message: getLastfmErrorMessage(error),
      onRetry: runRecommend,
    });
  } finally {
    setState(el.resultsSection, 'is-loading', false);
    state.recommending = false;
    setBusy(el.submit, false);
    setDisabled(el.submit, state.seeds.length < MIN_SEEDS || !isLastfmConfigured());
  }
}

// ---------------------------------------------------------------------
// 시작
// ---------------------------------------------------------------------

// 요소 찾아 두기
function cacheElements() {
  el.form = $('seed-form');
  el.searchInput = $('search-input');
  el.searchWrap = $('search-input-wrap');
  el.suggestions = $('suggestions');
  el.searchStatus = $('search-status');
  el.seedList = $('seed-list');
  el.seedCount = $('seed-count');
  el.submit = $('recommend-submit');
  el.reset = $('seed-reset');
  el.configStatus = $('config-status');
  el.resultsSection = $('results-section');
  // 결과 요약 문장을 스크린리더가 읽어 주도록 (HTML을 고쳐도 빠지지 않게 JS에서 지정)
  $('results-summary', el.resultsSection)?.setAttribute('role', 'status');
  el.resultsStatus = $('results-status');
  el.resultsList = $('results-list');
}

// 이벤트 연결
function bindEvents() {
  el.searchInput.addEventListener('input', handleSearchInput);
  el.searchInput.addEventListener('keydown', handleSearchKeydown);
  bindSuggestionList(el.suggestions, { onSelect: selectTrack });
  // 후보 목록 닫기: blur로 닫으면 터치에서 click보다 먼저 닫혀 선택이 안 되므로,
  // ① 검색 영역 밖을 눌렀을 때 ② 키보드(Tab)로 포커스가 검색 영역 밖으로 나갔을 때만 닫음
  document.addEventListener('pointerdown', (event) => {
    if (!isInSearchArea(event.target)) setSuggestionsOpen(false);
  });
  [el.searchWrap, el.suggestions].forEach((area) => {
    area.addEventListener('focusout', (event) => {
      // relatedTarget이 없으면(빈 곳 터치 등) 위의 pointerdown이 처리하므로 여기서는 닫지 않음
      // 후보(포커스 불가)를 누르면 포커스가 검색 영역을 감싼 조상(<main tabindex="-1">)으로 가는데,
      // 이건 검색 영역을 떠난 게 아니므로 닫지 않음 (닫으면 폰에서 click이 곡에 닿지 않음)
      const next = event.relatedTarget;
      if (next && !isInSearchArea(next) && !next.contains(el.suggestions)) setSuggestionsOpen(false);
    });
  });
  el.searchInput.addEventListener('focus', () => {
    state.ignoreUntil = 0; // 사용자가 입력창에 다시 들어오면 새로 치는 글자는 모두 검색
    if (state.suggestions.length && el.searchInput.value.trim()) setSuggestionsOpen(true);
  });

  el.form.addEventListener('submit', (event) => {
    event.preventDefault();
    runRecommend();
  });

  el.reset.addEventListener('click', () => {
    state.seeds = [];
    setResultsFlag(false);
    renderSeeds();
    el.searchInput.focus();
  });
}

// 페이지 시작
async function main() {
  await initLayout();
  cacheElements();
  state.defaultPlaceholder = el.searchInput.placeholder;

  if (!isLastfmConfigured()) {
    showStatus(el.configStatus, {
      type: 'error',
      message: 'Last.fm API 키가 아직 설정되지 않았어요. README의 "Last.fm API 키 발급"을 보고 js/config.js에 키를 넣어 주세요.',
    });
  }

  state.seeds = loadSeeds();
  renderSeeds();
  bindEvents();

  // 로그인하고 돌아왔거나 새로고침한 경우: 보던 추천 결과를 다시 보여 줌
  // (Last.fm 응답은 이 탭에 저장해 둔 것을 다시 쓰므로 추가 요청은 거의 없음)
  if (readResultsFlag() && state.seeds.length >= MIN_SEEDS && isLastfmConfigured()) runRecommend();
  // 로그인·평점 기능은 미리 불러 두기 (실패해도 검색·추천은 그대로)
  loadAccount();
}

main().catch((error) => console.error('[recommend] 초기화 실패', error));
