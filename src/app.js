import { normalizeProb, validateData } from './validate.js';
import { isStale } from './format.js';
import { filterMatches } from './filters.js';
import { renderList, renderMatchDetail, renderBracket, renderKnockoutDetail, renderStatePanel, renderStandings, headerStatus, esc } from './render.js';

const PRED_URL = './data/predictions.json';
const TEAMS_URL = './data/teams.json';
const BRACKET_URL = './data/bracket.json';
const CACHE_KEY = 'wc2026.cache.v1';
const DESKTOP = '(min-width: 761px)';
const $ = id => document.getElementById(id);

const state = { predictions: { matches: [] }, teams: [], bracket: null, cached: false,
  criteria: { group: null, matchday: 'ALL', remainingOnly: true, query: '' } };

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}
async function load() {
  try {
    const [predictions, teams] = await Promise.all([fetchJson(PRED_URL), fetchJson(TEAMS_URL)]);
    let bracket = null;
    try { bracket = await fetchJson(BRACKET_URL); } catch { /* bracket optional */ }
    localStorage.setItem(CACHE_KEY, JSON.stringify({ predictions, teams, bracket }));
    return { predictions, teams, bracket, cached: false };
  } catch {
    const c = localStorage.getItem(CACHE_KEY);
    if (c) { const d = JSON.parse(c); return { predictions: d.predictions, teams: d.teams, bracket: d.bracket || null, cached: true }; }
    return { predictions: null, teams: [], bracket: null, cached: false };
  }
}
function normalizeAll(p) {
  for (const m of p.matches || []) if (m.prob) { const n = normalizeProb(m.prob); m.prob = { win: n.win, draw: n.draw, loss: n.loss }; }
  return p;
}
const groupsPresent = () => [...new Set((state.predictions.matches || []).map(m => m.group))].sort();
const matchdaysIn = g => [...new Set((state.predictions.matches || []).filter(m => g === 'ALL' || m.group === g).map(m => Number(m.matchday)))].sort((a, b) => a - b);
const hasUpcoming = g => (state.predictions.matches || []).some(m => m.group === g && m.status === 'upcoming');
const firstUpcomingMd = g => {
  const ups = (state.predictions.matches || []).filter(m => m.group === g && m.status === 'upcoming').map(m => Number(m.matchday));
  return ups.length ? Math.min(...ups) : 'ALL';
};

function renderHeaderStatus() {
  const stale = state.predictions.generated_at ? isStale(state.predictions.generated_at, new Date()) : false;
  const s = headerStatus({ stale, cached: state.cached });
  const badge = $('hero-status');
  badge.className = `badge badge-${s.variant}`;
  badge.textContent = s.label;
  const t = state.predictions.generated_at ? new Date(state.predictions.generated_at) : null;
  if (t && !Number.isNaN(t.getTime())) {
    const md = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'numeric', day: 'numeric' }).format(t);
    const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false }).format(t);
    $('hero-update-time').textContent = `${md} ${hm} CT`;
  } else {
    $('hero-update-time').textContent = '—';
  }
  $('hero-remaining').textContent = `남은 경기 ${(state.predictions.matches || []).filter(m => m.status === 'upcoming').length}`;
}
function renderTabs() {
  $('group-tabs').innerHTML = `<button class="tab${state.criteria.group === 'ALL' ? ' is-active' : ''}" type="button" data-group="ALL">전체</button>` +
    groupsPresent().map(g =>
      `<button class="tab${g === state.criteria.group ? ' is-active' : ''}" type="button" data-group="${esc(g)}">${esc(g)}</button>`).join('');
  $('md-tabs').innerHTML = `<button class="segment-tab${state.criteria.matchday === 'ALL' ? ' is-active' : ''}" type="button" data-md="ALL">전체</button>` +
    matchdaysIn(state.criteria.group).map(md =>
      `<button class="segment-tab${String(md) === String(state.criteria.matchday) ? ' is-active' : ''}" type="button" data-md="${esc(String(md))}">MD${esc(String(md))}</button>`).join('');
  const tg = $('toggle-remaining');
  tg.classList.toggle('is-active', state.criteria.remainingOnly);
  tg.setAttribute('aria-pressed', String(state.criteria.remainingOnly));
}
function renderContent() {
  const g = state.criteria.group;
  $('section-title').textContent = g === 'ALL'
    ? (state.criteria.matchday === 'ALL' ? '전체 경기' : `전체 · 매치데이 ${state.criteria.matchday}`)
    : !g ? '예측' : state.criteria.matchday === 'ALL' ? `${g}조` : `${g}조 · 매치데이 ${state.criteria.matchday}`;
  if (state.criteria.remainingOnly && g && g !== 'ALL' && !hasUpcoming(g)) {
    $('list').innerHTML = renderStatePanel({ icon: 'check', title: `${g}조 종료`, body: '남은 경기가 없는 조는 최종 순위 중심으로 전환합니다.', extraHtml: renderStandings(state.teams, g) });
    return;
  }
  const matches = filterMatches(state.predictions.matches || [], { ...state.criteria, teams: state.teams });
  if (!matches.length) { $('list').innerHTML = renderStatePanel({ icon: 'check', title: '표시할 경기가 없습니다', body: '필터 조건을 바꿔 보세요.' }); return; }
  $('list').innerHTML = renderList(matches, state.teams, new Date());
  syncDetails();
}
function syncDetails() {
  const open = window.matchMedia(DESKTOP).matches;
  document.querySelectorAll('details.details').forEach(d => { d.open = open; });
}
function renderAll() { renderHeaderStatus(); renderTabs(); renderContent(); }

function hideViews() {
  $('board').hidden = true;
  $('bracket-view').hidden = true;
  $('bracket-view').innerHTML = '';
  $('detail-view').hidden = true;
  $('detail-view').innerHTML = '';
  document.body.classList.remove('detail-page');
}
function setNav(hash) {
  const onBracket = hash === '#/bracket' || /^#\/ko\//.test(hash);
  $('nav-board').classList.toggle('is-active', !onBracket);
  $('nav-bracket').classList.toggle('is-active', onBracket);
}
function showBoard() { hideViews(); $('board').hidden = false; renderAll(); }
function showBracket() {
  hideViews();
  const v = $('bracket-view');
  v.innerHTML = renderBracket(state.bracket, state.teams, new Date());
  v.hidden = false;
  window.scrollTo(0, 0);
}
function showDetail(match) {
  hideViews();
  const dv = $('detail-view');
  dv.innerHTML = renderMatchDetail(match, state.teams, state.predictions.matches || [], new Date());
  dv.hidden = false;
  document.body.classList.add('detail-page');
  window.scrollTo(0, 0);
}
function showKoDetail(match) {
  hideViews();
  const dv = $('detail-view');
  dv.innerHTML = renderKnockoutDetail(match, state.teams, new Date());
  dv.hidden = false;
  document.body.classList.add('detail-page');
  window.scrollTo(0, 0);
}
function route() {
  const hash = location.hash;
  setNav(hash);
  if (hash === '#/bracket') { showBracket(); return; }
  const ko = hash.match(/^#\/ko\/(.+)$/);
  if (ko) { showKoDetail((state.bracket?.matches || []).find(x => x.id === decodeURIComponent(ko[1]))); return; }
  const gm = hash.match(/^#\/match\/(.+)$/);
  if (gm) {
    const match = (state.predictions.matches || []).find(x => x.id === decodeURIComponent(gm[1]));
    if (match) { showDetail(match); return; }
  }
  showBoard();
}

function wire() {
  $('group-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-group]'); if (!b) return;
    state.criteria.group = b.dataset.group;
    state.criteria.matchday = b.dataset.group === 'ALL' ? 'ALL' : firstUpcomingMd(state.criteria.group);
    renderAll();
  });
  $('md-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-md]'); if (!b) return;
    const md = b.dataset.md;
    state.criteria.matchday = md === 'ALL' ? 'ALL' : Number(md);
    renderAll();
  });
  $('toggle-remaining').addEventListener('click', () => {
    state.criteria.remainingOnly = !state.criteria.remainingOnly;
    state.criteria.matchday = state.criteria.remainingOnly ? firstUpcomingMd(state.criteria.group) : 'ALL';
    renderAll();
  });
  $('search').addEventListener('input', e => { state.criteria.query = e.target.value; renderContent(); });
  $('list').addEventListener('click', e => {
    if (e.target.closest('#retry')) { main(); return; }
    if (e.target.closest('details')) return;
    const card = e.target.closest('.match-card');
    if (card) location.hash = '#/match/' + encodeURIComponent(card.dataset.match);
  });
  $('bracket-view').addEventListener('click', e => {
    const b = e.target.closest('[data-ko]');
    if (b) location.hash = '#/ko/' + encodeURIComponent(b.dataset.ko);
  });
  window.addEventListener('hashchange', route);
  window.matchMedia(DESKTOP).addEventListener('change', syncDetails);
}

async function main() {
  const { predictions, teams, bracket, cached } = await load();
  if (!predictions) {
    $('list').innerHTML = renderStatePanel({ icon: 'alert', title: '데이터를 불러올 수 없습니다', body: '네트워크 실패 후 캐시도 없습니다. 잠시 후 다시 시도해 주세요.', actionId: 'retry', actionLabel: '다시 불러오기' });
    return;
  }
  state.predictions = normalizeAll(predictions);
  state.teams = teams || [];
  state.bracket = bracket || null;
  state.cached = cached;
  state.criteria.group = 'ALL';
  state.criteria.matchday = 'ALL';
  const res = validateData(state.predictions, state.teams);
  res.warnings.forEach(w => console.warn('[data]', w));
  res.errors.forEach(er => console.error('[data]', er));
  route();
}

wire();
main();
