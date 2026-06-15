import { normalizeProb, validateData } from './validate.js';
import { isStale } from './format.js';
import { filterMatches } from './filters.js';
import { renderList, renderProfileSheet, renderStatePanel, renderStandings, headerStatus } from './render.js';

const PRED_URL = './data/predictions.json';
const TEAMS_URL = './data/teams.json';
const CACHE_KEY = 'wc2026.cache.v1';
const DESKTOP = '(min-width: 761px)';
const $ = id => document.getElementById(id);

const state = { predictions: { matches: [] }, teams: [], cached: false,
  criteria: { group: null, matchday: 'ALL', remainingOnly: true, query: '' } };

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}
async function load() {
  try {
    const [predictions, teams] = await Promise.all([fetchJson(PRED_URL), fetchJson(TEAMS_URL)]);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ predictions, teams }));
    return { predictions, teams, cached: false };
  } catch {
    const c = localStorage.getItem(CACHE_KEY);
    if (c) { const d = JSON.parse(c); return { predictions: d.predictions, teams: d.teams, cached: true }; }
    return { predictions: null, teams: [], cached: false };
  }
}
function normalizeAll(p) {
  for (const m of p.matches || []) if (m.prob) { const n = normalizeProb(m.prob); m.prob = { win: n.win, draw: n.draw, loss: n.loss }; }
  return p;
}
const groupsPresent = () => [...new Set((state.predictions.matches || []).map(m => m.group))].sort();
const matchdaysIn = g => [...new Set((state.predictions.matches || []).filter(m => m.group === g).map(m => Number(m.matchday)))].sort((a, b) => a - b);
const hasUpcoming = g => (state.predictions.matches || []).some(m => m.group === g && m.status === 'upcoming');

function renderHeaderStatus() {
  const stale = state.predictions.generated_at ? isStale(state.predictions.generated_at, new Date()) : false;
  const s = headerStatus({ stale, cached: state.cached });
  const badge = $('hero-status');
  badge.className = `badge badge-${s.variant}`;
  badge.textContent = s.label;
  const t = state.predictions.generated_at ? new Date(state.predictions.generated_at) : null;
  $('hero-update-time').textContent = t
    ? new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Chicago', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(t) + ' CT'
    : '—';
  $('hero-remaining').textContent = `남은 경기 ${(state.predictions.matches || []).filter(m => m.status === 'upcoming').length}`;
}
function renderTabs() {
  $('group-tabs').innerHTML = groupsPresent().map(g =>
    `<button class="tab${g === state.criteria.group ? ' is-active' : ''}" type="button" data-group="${g}">${g}</button>`).join('');
  $('md-tabs').innerHTML = matchdaysIn(state.criteria.group).map(md =>
    `<button class="segment-tab${String(md) === String(state.criteria.matchday) ? ' is-active' : ''}" type="button" data-md="${md}">MD${md}</button>`).join('');
  const tg = $('toggle-remaining');
  tg.classList.toggle('is-active', state.criteria.remainingOnly);
  tg.setAttribute('aria-pressed', String(state.criteria.remainingOnly));
}
function renderContent() {
  const g = state.criteria.group;
  $('section-title').textContent = !g ? '예측' : state.criteria.matchday === 'ALL' ? `${g}조` : `${g}조 · 매치데이 ${state.criteria.matchday}`;
  if (state.criteria.remainingOnly && g && !hasUpcoming(g)) {
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

function openSheet(matchId) {
  const m = (state.predictions.matches || []).find(x => x.id === matchId);
  if (!m) return;
  const byId = new Map(state.teams.map(t => [t.id, t]));
  $('profile-sheet').innerHTML = renderProfileSheet(m, byId);
  $('profile-sheet').hidden = false;
  $('scrim').hidden = false;
}
function closeSheet() { $('profile-sheet').hidden = true; $('scrim').hidden = true; }

function wire() {
  $('group-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-group]'); if (!b) return;
    state.criteria.group = b.dataset.group;
    const mds = matchdaysIn(state.criteria.group);
    state.criteria.matchday = mds.length ? mds[0] : 'ALL';
    renderAll();
  });
  $('md-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-md]'); if (!b) return;
    state.criteria.matchday = Number(b.dataset.md); renderAll();
  });
  $('toggle-remaining').addEventListener('click', () => { state.criteria.remainingOnly = !state.criteria.remainingOnly; renderAll(); });
  $('search').addEventListener('input', e => { state.criteria.query = e.target.value; renderContent(); });
  $('list').addEventListener('click', e => {
    if (e.target.closest('#retry')) { main(); return; }
    if (e.target.closest('details.details')) return;
    const card = e.target.closest('.match-card'); if (card) openSheet(card.dataset.match);
  });
  $('profile-sheet').addEventListener('click', e => { if (e.target.closest('#sheet-close')) closeSheet(); });
  $('scrim').addEventListener('click', closeSheet);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  window.matchMedia(DESKTOP).addEventListener('change', syncDetails);
}

async function main() {
  const { predictions, teams, cached } = await load();
  if (!predictions) {
    $('list').innerHTML = renderStatePanel({ icon: 'alert', title: '데이터를 불러올 수 없습니다', body: '네트워크 실패 후 캐시도 없습니다. 잠시 후 다시 시도해 주세요.', actionId: 'retry', actionLabel: '다시 불러오기' });
    return;
  }
  state.predictions = normalizeAll(predictions);
  state.teams = teams || [];
  state.cached = cached;
  const groups = groupsPresent();
  state.criteria.group = groups.find(hasUpcoming) || groups[0] || null;
  const mds = matchdaysIn(state.criteria.group);
  state.criteria.matchday = mds.length ? mds[0] : 'ALL';
  const res = validateData(state.predictions, state.teams);
  res.warnings.forEach(w => console.warn('[data]', w));
  res.errors.forEach(er => console.error('[data]', er));
  renderAll();
}

wire();
main();
