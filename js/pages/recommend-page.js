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
import { renderSuggestion } from '../components/suggestion.js';
import { renderChip } from '../components/chip.js';
import { renderTrackCard } from '../components/track-card.js';

const MIN_SEEDS = 3;
const MAX_SEEDS = 5;
const SEARCH_LIMIT = 8;
const MIN_QUERY_LENGTH = 1;
const SEEDS_STORAGE_KEY = 'recommend:seeds';

// 페이지 상태
const state = {
  seeds: [],          // 선택한 곡 [{ key, title, artist, image, url }]
  suggestions: [],    // 지금 보이는 검색 후보
  activeIndex: -1,    // 키보드로 고른 후보 번호
  searchToken: 0,     // 늦게 도착한 옛 검색 결과를 무시하기 위한 번호
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

  setDisabled(el.submit, count < MIN_SEEDS || !isLastfmConfigured());

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
  renderSeeds();
  return true;
}

// 곡 빼기
function removeSeed(key) {
  state.seeds = state.seeds.filter((seed) => seed.key !== key);
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
  }
}

// 후보 목록 그리기
function renderSuggestions(tracks) {
  state.suggestions = tracks;
  state.activeIndex = -1;
  const items = tracks.map((track, index) => renderSuggestion(track, {
    id: `suggestion-${index}`,
    onSelect: () => selectSuggestion(index),
  }));
  el.suggestions.replaceChildren(...items);
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

// 후보 선택 → 칩 추가
function selectSuggestion(index) {
  const track = state.suggestions[index];
  if (!track) return;
  addSeed(track);
  el.searchInput.value = '';
  state.searchToken += 1; // 진행 중인 검색 무시
  setState(el.searchWrap, 'is-loading', false);
  setSuggestionsOpen(false);
  clearStatus(el.searchStatus);
  if (!el.searchInput.disabled) el.searchInput.focus();
}

// 검색 실행 (입력 후 300ms 동안 추가 입력이 없을 때)
const runSearch = debounce(async (query) => {
  state.searchToken += 1;
  const token = state.searchToken;
  setState(el.searchWrap, 'is-loading', true);
  clearStatus(el.searchStatus);

  try {
    const results = await searchTracks(query, SEARCH_LIMIT);
    if (token !== state.searchToken) return; // 그 사이 새 검색이 시작됨
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
function handleSearchInput() {
  const query = el.searchInput.value.trim();
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
      if (!state.suggestions.length) return;
      event.preventDefault();
      if (!open) setSuggestionsOpen(true);
      setActiveSuggestion(state.activeIndex + 1);
      break;
    case 'ArrowUp':
      if (!open) return;
      event.preventDefault();
      setActiveSuggestion(state.activeIndex - 1);
      break;
    case 'Enter':
      // 입력창에서 Enter는 폼 제출이 아니라 후보 선택
      event.preventDefault();
      if (open) selectSuggestion(state.activeIndex >= 0 ? state.activeIndex : 0);
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

// 결과에서 뺄 곡 키 (5단계: 로그인 시 내가 2점 이하로 준 곡)
async function getExcludeKeys() {
  return new Set();
}

// 추천 카드의 "플레이리스트에 추가" (4단계에서 연결)
function handleAddToPlaylist() {
  showToast('플레이리스트 기능은 곧 연결돼요');
}

// 결과 카드 그리기
function renderResults(tracks) {
  const cards = tracks.map((track) => renderTrackCard(track, { onAdd: handleAddToPlaylist }));
  el.resultsList.replaceChildren(...cards);
}

// 추천 실행
async function runRecommend() {
  if (state.seeds.length < MIN_SEEDS) return;

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
    const excludeKeys = await getExcludeKeys();
    const { tracks, usedFallback, failedSeeds } = await getRecommendations(state.seeds, { excludeKeys });

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
    if (usedFallback) notes.push('비슷한 곡 정보가 적어서 비슷한 가수의 인기곡도 함께 담았어요.');
    if (failedSeeds) notes.push(`고른 곡 중 ${failedSeeds}곡은 정보를 가져오지 못했어요.`);
    setText(el.resultsSection, 'results-summary', notes.join(' '));
    renderResults(tracks);
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
    setBusy(el.submit, false);
    setDisabled(el.submit, state.seeds.length < MIN_SEEDS);
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
  el.resultsStatus = $('results-status');
  el.resultsList = $('results-list');
}

// 이벤트 연결
function bindEvents() {
  el.searchInput.addEventListener('input', handleSearchInput);
  el.searchInput.addEventListener('keydown', handleSearchKeydown);
  el.searchInput.addEventListener('blur', () => setSuggestionsOpen(false));
  el.searchInput.addEventListener('focus', () => {
    if (state.suggestions.length && el.searchInput.value.trim()) setSuggestionsOpen(true);
  });

  el.form.addEventListener('submit', (event) => {
    event.preventDefault();
    runRecommend();
  });

  el.reset.addEventListener('click', () => {
    state.seeds = [];
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
}

main().catch((error) => console.error('[recommend] 초기화 실패', error));
