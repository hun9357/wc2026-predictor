import { formatKickoff, confidenceLevel, confidenceLabel, verdictFromProb } from './format.js';
import { flagPath } from './flags.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function flagImg(id, name, cls = 'flag') {
  const p = flagPath(id);
  return p ? `<img class="${cls}" src="${p}" alt="" loading="lazy">` : '';
}

export function teamCode(team, id) {
  const code = esc(team?.id ?? id);
  const p = team?.record?.pts;
  if (p === undefined || p === null) return code;
  return `${code} · ${p} ${p === 1 ? 'pt' : 'pts'}`;
}

export function verdictText(match, byId) {
  const p = match.prob || { win: 0, draw: 0, loss: 0 };
  const v = match.verdict || verdictFromProb(p);
  if (v === 'draw') return '예측: 무승부';
  const id = v === 'home_win' ? match.home : match.away;
  return `예측: ${byId.get(id)?.name ?? id} 승`;
}

export function renderProbability(prob = { win: 0, draw: 0, loss: 0 }) {
  return `<div class="probability" aria-label="승 무 패 확률">` +
    `<div class="probability-bar">` +
      `<span class="prob-segment prob-home" style="width: ${prob.win}%">${prob.win}%</span>` +
      `<span class="prob-segment prob-draw" style="width: ${prob.draw}%">${prob.draw}%</span>` +
      `<span class="prob-segment prob-away" style="width: ${prob.loss}%">${prob.loss}%</span>` +
    `</div>` +
    `<div class="prob-labels"><span>홈 승</span><span>무</span><span>원정 승</span></div>` +
  `</div>`;
}

function notesBlock(m) {
  const h = m.team_notes?.home, a = m.team_notes?.away;
  if (!h && !a) return '';
  return `<div class="note-grid">` +
    (h ? `<div class="note"><b>홈 지향</b> ${esc(h)}</div>` : '') +
    (a ? `<div class="note"><b>원정 지향</b> ${esc(a)}</div>` : '') +
  `</div>`;
}
function chipList(items = []) {
  return items.length ? `<div class="chip-list">${items.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : '';
}
function outcomeOf(match) {
  const r = match.result;
  if (!r || r.home_score == null || r.away_score == null) return null;
  return r.outcome || (r.home_score > r.away_score ? 'home_win' : r.home_score < r.away_score ? 'away_win' : 'draw');
}
function outcomeLabel(outcome, match, byId) {
  if (outcome === 'draw') return '무승부';
  const id = outcome === 'home_win' ? match.home : match.away;
  return `${esc(byId.get(id)?.name ?? id)} 승`;
}
function resultLine(match, byId) {
  const o = outcomeOf(match);
  if (!o) return '';
  const ok = match.verdict === o;
  return `<div class="result-line"><span class="result-score">${match.result.home_score} - ${match.result.away_score}</span>` +
    `<span class="result-outcome">${outcomeLabel(o, match, byId)}</span>` +
    `<span class="hit hit-${ok ? 'ok' : 'no'}">${ok ? '적중' : '빗나감'}</span></div>`;
}
function detailResult(match, byId) {
  const o = outcomeOf(match);
  if (!o) return '';
  const ok = match.verdict === o;
  return `<div class="detail-result"><span class="result-tag">결과</span>` +
    `<span class="result-score">${match.result.home_score} - ${match.result.away_score}</span>` +
    `<span class="result-outcome">${outcomeLabel(o, match, byId)}</span>` +
    `<span class="hit hit-${ok ? 'ok' : 'no'}">예측 ${ok ? '적중' : '빗나감'}</span></div>`;
}

export function renderCard(match, byId, now = new Date()) {
  const home = byId.get(match.home), away = byId.get(match.away);
  const k = formatKickoff(match.kickoff, now);
  const toss = confidenceLevel(match.prob) === 'toss';
  return `<article class="match-card${toss ? ' is-tossup' : ''}" data-match="${esc(match.id)}" data-group="${esc(match.group)}" data-md="${esc(match.matchday)}">` +
    `<div class="match-meta"><span class="meta-chip">${esc(match.group)}조 · MD${esc(match.matchday)}</span><span>${esc(k.label)}${match.status === 'played' ? ' · 종료' : ''}</span></div>` +
    `<div class="team-row">` +
      `<div class="team"><span class="team-name">${flagImg(match.home, home?.name)}${esc(home?.name ?? match.home)}</span><span class="team-code">${teamCode(home, match.home)}</span></div>` +
      `<span class="vs">VS</span>` +
      `<div class="team away"><span class="team-name">${flagImg(match.away, away?.name)}${esc(away?.name ?? match.away)}</span><span class="team-code">${teamCode(away, match.away)}</span></div>` +
    `</div>` +
    renderProbability(match.prob) +
    `<div class="verdict"><span>${esc(verdictText(match, byId))}</span><small>${esc(confidenceLabel(match.prob))}</small></div>` +
    (match.status === 'played' ? resultLine(match, byId) : '') +
    `<details class="details"><summary>전술 근거 보기</summary><div class="details-inner">` +
      (match.rationale ? `<p><strong>전술 근거</strong> ${esc(match.rationale)}</p>` : '') +
      notesBlock(match) + chipList(match.key_variables) +
      (match.flip_condition && match.flip_condition !== '—' ? `<p><strong>뒤집힐 조건</strong> ${esc(match.flip_condition)}</p>` : '') +
      (match.qualification_context ? `<p><strong>진출 시나리오</strong> ${esc(match.qualification_context)}</p>` : '') +
    `</div></details>` +
  `</article>`;
}

export function renderList(matches, teams, now = new Date()) {
  const byId = new Map((teams || []).map(t => [t.id, t]));
  return (matches || []).map(m => renderCard(m, byId, now)).join('\n');
}

function formMarks(form = []) {
  const cls = { W: 'form-win', D: 'form-draw', L: 'form-loss' };
  return `<div class="form-row" aria-label="최근 폼">` +
    form.map(r => `<span class="form-mark ${cls[r] ?? 'form-draw'}">${esc(r)}</span>`).join('') + `</div>`;
}
function playerRow(p) {
  const meta = [p.position, p.club].filter(Boolean).map(esc).join(' · ');
  return `<li class="player"><span class="p-name">${esc(p.name)}</span><span class="p-meta">${meta}</span></li>`;
}
function squadBlock(squad) {
  if (!squad || !squad.length) return '';
  const keys = squad.filter(p => p.key);
  const keyHtml = keys.length
    ? `<div class="squad-key"><h4>주요 선수</h4><ul class="player-list">${keys.map(playerRow).join('')}</ul></div>`
    : '';
  const POS = ['GK', 'DF', 'MF', 'FW'];
  const groups = POS.map(pos => {
    const members = squad.filter(p => (p.position || '') === pos);
    if (!members.length) return '';
    return `<div class="squad-group"><b>${pos}</b> ${members.map(p => esc(p.name) + (p.club ? ` <small>(${esc(p.club)})</small>` : '')).join(', ')}</div>`;
  }).join('');
  const allHtml = `<details class="squad-all"><summary>전체 명단 (${squad.length})</summary><div class="squad-groups">${groups}</div></details>`;
  return `<div class="squad">${keyHtml}${allHtml}</div>`;
}
export function renderTeamProfile(team) {
  if (!team) return '';
  const gd = team.record?.gd;
  const gdStr = gd === undefined || gd === null ? '—' : gd > 0 ? `+${gd}` : `${gd}`;
  return `<section class="team-profile">` +
    `<h3>${flagImg(team.id, team.name)}${esc(team.name)} · ${esc(team.id)}</h3>` +
    `<div class="profile-stat-row">` +
      `<div class="profile-stat"><span>포메이션</span><b>${esc(team.formation ?? '—')}</b></div>` +
      `<div class="profile-stat"><span>승점</span><b>${esc(team.record?.pts ?? '—')}</b></div>` +
      `<div class="profile-stat"><span>골득실</span><b>${esc(gdStr)}</b></div>` +
    `</div>` +
    (team.style ? `<p><strong>스타일</strong> ${esc(team.style)}</p>` : '') +
    (team.aimed_tactics ? `<p><strong>지향 전술</strong> ${esc(team.aimed_tactics)}</p>` : '') +
    (team.injuries?.length ? `<p><strong>부상</strong> ${esc(team.injuries.join(', '))}</p>` : '') +
    formMarks(team.form) +
    squadBlock(team.squad) +
  `</section>`;
}
export function renderProfileSheet(match, byId) {
  const home = byId.get(match.home), away = byId.get(match.away);
  const title = `${esc(home?.name ?? match.home)} vs ${esc(away?.name ?? match.away)}`;
  return `<div class="sheet-grabber"></div>` +
    `<div class="sheet-header"><div><h2>팀 프로필</h2><p>${title}</p></div>` +
    `<button class="icon-button" id="sheet-close" type="button" aria-label="닫기">` +
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M6 6l12 12M18 6 6 18"/></svg></button></div>` +
    renderTeamProfile(home) + renderTeamProfile(away);
}

function detailCode(team, id) {
  const parts = [esc(team?.id ?? id)];
  const pts = team?.record?.pts, gd = team?.record?.gd;
  if (pts !== undefined && pts !== null) parts.push(`${pts} pts`);
  if (gd !== undefined && gd !== null) parts.push(`GD ${gd > 0 ? '+' + gd : gd}`);
  return parts.join(' · ');
}
function analysisCard(team, id, note) {
  const text = note || team?.aimed_tactics || team?.style || '';
  return `<article class="analysis-card"><h3>${flagImg(id, team?.name)}${esc(team?.name ?? id)}${team?.formation ? ` · ${esc(team.formation)}` : ''}</h3>` +
    (text ? `<p>${esc(text)}</p>` : '') + `</article>`;
}
function styleChips(team) {
  const chips = [...new Set([team?.style, team?.aimed_tactics].filter(Boolean).join(', ').split(/[,·/]/).map(s => s.trim()).filter(Boolean))].slice(0, 4);
  return chips.length ? `<div class="chip-list">${chips.map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>` : '';
}
function profileCard(team, id) {
  if (!team) return `<article class="detail-profile-card"><h3>${esc(id)}</h3><p>정보 없음</p></article>`;
  const recent = (team.form || []).join('-') || '—';
  return `<article class="detail-profile-card"><h3>${flagImg(team.id, team.name)}${esc(team.name)} · ${esc(team.id)}</h3>` +
    `<div class="profile-stat-row">` +
      `<div class="profile-stat"><span>포메이션</span><b>${esc(team.formation ?? '—')}</b></div>` +
      `<div class="profile-stat"><span>승점</span><b>${esc(team.record?.pts ?? '—')}</b></div>` +
      `<div class="profile-stat"><span>최근</span><b>${esc(recent)}</b></div>` +
    `</div>` +
    (team.aimed_tactics ? `<p><strong>지향 전술</strong> ${esc(team.aimed_tactics)}</p>` : '') +
    (team.injuries?.length ? `<p><strong>부상</strong> ${esc(team.injuries.join(', '))}</p>` : '') +
    styleChips(team) +
  `</article>`;
}
function squadCard(team) {
  const sb = team ? squadBlock(team.squad) : '';
  return sb ? `<article class="detail-profile-card squad-card"><h3>${flagImg(team.id, team.name)}${esc(team.name)} · ${esc(team.id)}</h3>${sb}</article>` : '';
}
function pathCard(team, id, allMatches, byId) {
  const ms = (allMatches || []).filter(m => m.home === id || m.away === id)
    .sort((a, b) => Number(a.matchday) - Number(b.matchday));
  const rows = ms.length ? ms.map(m => {
    const isHome = m.home === id;
    const opp = byId.get(isHome ? m.away : m.home);
    const played = m.status === 'played';
    const out = played ? (outcomeOf(m) || m.verdict) : m.verdict;
    let pick = '무';
    if (out && out !== 'draw') pick = (out === 'home_win') === isHome ? '승' : '패';
    const pc = pick === '승' ? 'win' : pick === '무' ? 'draw' : 'loss';
    const label = played ? pick : `예측 ${pick}`;
    return `<li class="path-row"><span>MD${esc(m.matchday)}</span><strong>vs ${esc(opp?.name ?? (isHome ? m.away : m.home))}</strong><span class="pick-pill pick-${pc}">${label}</span></li>`;
  }).join('') : '<li class="path-row"><span>—</span><strong>경기 없음</strong><span></span></li>';
  return `<article class="path-card"><h3>${flagImg(id, team?.name)}${esc(team?.name ?? id)}</h3><ul class="path-list">${rows}</ul></article>`;
}

export function renderMatchDetail(match, teams, allMatches = [], now = new Date()) {
  if (!match) return `<main class="container content"><a class="back-link" href="#"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M15 18l-6-6 6-6"/></svg>목록으로</a>` +
    renderStatePanel({ icon: 'alert', title: '경기를 찾을 수 없습니다', body: '목록으로 돌아가세요.' }) + `</main>`;
  const byId = new Map((teams || []).map(t => [t.id, t]));
  const home = byId.get(match.home), away = byId.get(match.away);
  const k = formatKickoff(match.kickoff, now);
  const prob = match.prob || { win: 0, draw: 0, loss: 0 };
  const v = match.verdict || verdictFromProb(prob);
  const homeName = esc(home?.name ?? match.home), awayName = esc(away?.name ?? match.away);
  const pickPct = v === 'home_win' ? prob.win : v === 'away_win' ? prob.loss : prob.draw;
  const pickLabel = v === 'draw' ? '무승부' : `${v === 'home_win' ? homeName : awayName} 승`;
  const conf = confidenceLabel(prob);
  const statusLabel = match.status === 'played' ? '종료 경기' : '예정 경기';
  const meta = [];
  if (v !== 'home_win') meta.push(`${homeName} 승 ${prob.win}%`);
  if (v !== 'draw') meta.push(`무 ${prob.draw}%`);
  if (v !== 'away_win') meta.push(`${awayName} 승 ${prob.loss}%`);
  const metaStr = meta.join(' · ');
  const inj = [...(home?.injuries || []).map(i => `${home.name}: ${i}`), ...(away?.injuries || []).map(i => `${away.name}: ${i}`)];
  const srcs = (match.sources || []).filter(s => /^https?:\/\//.test(s));

  const hero = `<header class="hero"><div class="container hero-content"><div>` +
    `<a class="back-link" href="#" aria-label="목록으로 돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M15 18l-6-6 6-6"/></svg>목록으로</a>` +
    `<p class="kicker">${esc(match.group)}조 · Matchday ${esc(match.matchday)} · ${esc(k.label)}</p>` +
    `<h1 class="title">${homeName} vs ${awayName}</h1>` +
    `<p class="hero-copy">승·무·패 분포, 전술 매치업, 키포인트, 양 팀 명단과 조별리그 경로를 한 화면에 모았습니다.</p>` +
    `<div class="status-row"><span class="badge badge-live">${esc(statusLabel)}</span><span class="badge">홈 관점 확률</span><span class="badge">${esc(conf)}</span></div>` +
    `</div><aside class="update-panel" aria-label="예측 요약"><p class="update-label">예측 평결</p><p class="update-time">${esc(pickLabel)} ${pickPct}%</p><p class="update-meta">${esc(metaStr)}</p></aside></div></header>`;

  const main = `<main class="container content match-detail-layout"><section class="detail-main" aria-label="매치 상세">` +
    `<article class="matchup-card">` +
      `<div class="matchup-meta"><span class="meta-chip">${esc(match.group)}조 · MD${esc(match.matchday)}</span><span>${esc(k.label)}</span><span>America/Chicago</span></div>` +
      `<div class="matchup-teams">` +
        `<div class="detail-team"><span class="detail-team-name">${flagImg(match.home, home?.name, 'detail-flag')}${homeName}</span><span class="detail-team-code">${detailCode(home, match.home)}</span></div>` +
        `<span class="detail-vs">VS</span>` +
        `<div class="detail-team away"><span class="detail-team-name">${flagImg(match.away, away?.name, 'detail-flag')}${awayName}</span><span class="detail-team-code">${detailCode(away, match.away)}</span></div>` +
      `</div>` +
      renderProbability(prob) +
      `<div class="verdict"><span>${esc(verdictText(match, byId))}</span><small>${esc(conf)}</small></div>` +
      (match.status === 'played' ? detailResult(match, byId) : '') +
    `</article>` +
    `<section class="detail-section"><h2>전술 분석</h2>` +
      (match.rationale ? `<p>${esc(match.rationale)}</p>` : '') +
      `<div class="analysis-grid">${analysisCard(home, match.home, match.team_notes?.home)}${analysisCard(away, match.away, match.team_notes?.away)}</div>` +
    `</section>` +
    `<section class="detail-section"><h2>키포인트</h2>` +
      (match.key_variables?.length ? `<ul class="insight-list">${match.key_variables.map((kv, i) => `<li><span class="insight-index">${i + 1}</span><span>${esc(kv)}</span></li>`).join('')}</ul>` : '') +
      (match.flip_condition && match.flip_condition !== '—' ? `<div class="risk-callout"><b>뒤집힐 조건</b><p>${esc(match.flip_condition)}</p></div>` : '') +
      (match.qualification_context ? `<p>🎯 진출 시나리오: ${esc(match.qualification_context)}</p>` : '') +
      (inj.length ? `<p>🩹 부상: ${esc(inj.join(' / '))}</p>` : '') +
    `</section>` +
    `<section class="detail-section"><h2>양 팀 프로필</h2><div class="detail-profile-grid">${profileCard(home, match.home)}${profileCard(away, match.away)}</div></section>` +
    `<section class="detail-section"><h2>양 팀 명단</h2><div class="detail-profile-grid">${squadCard(home)}${squadCard(away)}</div></section>` +
    `<section class="detail-section"><h2>조별리그 경로</h2><div class="path-grid">${pathCard(home, match.home, allMatches, byId)}${pathCard(away, match.away, allMatches, byId)}</div></section>` +
    `</section>` +
    `<aside class="detail-rail" aria-label="요약"><div class="detail-summary-card">` +
      `<p class="summary-eyebrow">Quick Read</p>` +
      `<div class="summary-pick"><b>${esc(pickLabel)}</b><span>최고 확률 ${pickPct}% · ${esc(conf)}</span></div>` +
      `<div class="summary-stat-grid"><div class="summary-stat"><span>홈</span><b>${prob.win}</b></div><div class="summary-stat"><span>무</span><b>${prob.draw}</b></div><div class="summary-stat"><span>원정</span><b>${prob.loss}</b></div></div>` +
      (match.key_variables?.length ? `<div class="chip-list">${match.key_variables.slice(0, 4).map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>` : '') +
      (srcs.length ? `<div class="source-row"><span>Sources</span>${srcs.map((s, i) => `<a href="${esc(s)}" target="_blank" rel="noopener">출처 ${i + 1}</a>`).join('')}</div>` : '') +
    `</div></aside>` +
    `</main>`;

  const bar = `<aside class="mobile-detail-bar" aria-label="예측 요약"><div><b>${esc(pickLabel)} ${pickPct}%</b><span>${esc(metaStr)}</span></div><a class="segment-tab" href="#">목록</a></aside>`;

  return hero + main + bar;
}

const STATE_ICONS = {
  alert: '<path fill="none" stroke="currentColor" stroke-width="2" d="M12 9v4m0 4h.01M10.3 4.5 2.8 18a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 4.5a2 2 0 0 0-3.4 0Z"/>',
  check: '<path fill="none" stroke="currentColor" stroke-width="2" d="m5 13 4 4L19 7"/>',
  refresh: '<path fill="none" stroke="currentColor" stroke-width="2" d="M21 12a9 9 0 1 1-2.6-6.4M21 4v6h-6"/>',
};
export function renderStatePanel({ icon = 'alert', title, body, actionId, actionLabel, extraHtml = '' }) {
  return `<section class="state-grid"><article class="state-panel">` +
    `<svg viewBox="0 0 24 24" aria-hidden="true">${STATE_ICONS[icon] ?? STATE_ICONS.alert}</svg>` +
    `<h2>${esc(title)}</h2><p>${esc(body)}</p>` +
    (actionId ? `<button class="segment-tab is-active" id="${esc(actionId)}" type="button">${esc(actionLabel)}</button>` : '') +
    extraHtml + `</article></section>`;
}
export function renderStandings(teams, group) {
  const rows = (teams || []).filter(t => t.group === group)
    .sort((a, b) => (b.record?.pts ?? 0) - (a.record?.pts ?? 0) || (b.record?.gd ?? 0) - (a.record?.gd ?? 0));
  if (!rows.length) return '';
  return `<div class="table-preview" aria-label="최종 순위">` +
    rows.map(t => `<div class="table-row"><span>${esc(t.name)}</span><b>${esc(t.record?.pts ?? 0)} pts</b></div>`).join('') + `</div>`;
}

export function headerStatus({ stale = false, cached = false } = {}) {
  if (cached) return { variant: 'danger', label: '캐시 데이터' };
  if (stale) return { variant: 'warning', label: '업데이트 지연' };
  return { variant: 'live', label: '데이터 정상' };
}

// ===== Knockout bracket =====
const KO_LABEL = { R32: '32강', R16: '16강', QF: '8강', SF: '4강', Final: '결승' };

function advanceBar(adv = { home: 50, away: 50 }) {
  return `<div class="probability" aria-label="진출 확률">` +
    `<div class="probability-bar adv-bar">` +
      `<span class="prob-segment prob-home" style="width: ${adv.home}%">${adv.home}%</span>` +
      `<span class="prob-segment prob-away" style="width: ${adv.away}%">${adv.away}%</span>` +
    `</div><div class="prob-labels adv-labels"><span>홈 진출</span><span>원정 진출</span></div></div>`;
}
function bracketCard(m, byId, now) {
  const home = byId.get(m.home), away = byId.get(m.away);
  const k = m.kickoff ? formatKickoff(m.kickoff, now) : null;
  const played = m.status === 'played' && m.result;
  const homeWin = played && m.result.outcome === 'home_win';
  // bracket shows the matchup only — no prediction (%/winner). Played matches show the actual score.
  const row = (id, team, win, score) =>
    `<span class="bk-team${win ? ' bk-win' : ''}">${flagImg(id, team?.name)}<span class="bk-name">${esc(team?.name ?? id ?? '미정')}</span>` +
    (score != null ? `<b class="bk-score">${esc(score)}</b>` : '') + `</span>`;
  return `<button class="bk-match${played ? ' is-played' : ''}" type="button" data-ko="${esc(m.id)}">` +
    `<span class="bk-meta">${k ? `${esc(k.rel)} ${esc(k.time)}` : esc(m.id)}${played ? ' · 종료' : ''}</span>` +
    row(m.home, home, homeWin, played ? m.result.home_score : null) +
    row(m.away, away, played && !homeWin, played ? m.result.away_score : null) + `</button>`;
}
export function renderBracket(bracket, teams, now = new Date()) {
  if (!bracket || !bracket.matches || !bracket.matches.length) {
    return `<main class="container content">${renderStatePanel({ icon: 'alert', title: '토너먼트 대진이 아직 없습니다', body: '조별리그가 끝나면 자동으로 채워집니다.' })}</main>`;
  }
  const byId = new Map((teams || []).map(t => [t.id, t]));
  const champ = byId.get(bracket.champion);
  const cols = ['R32', 'R16', 'QF', 'SF', 'Final'].map(r => {
    const ms = bracket.matches.filter(m => m.round === r);
    return ms.length ? `<div class="bracket-round"><h3 class="bk-round-title">${KO_LABEL[r]}</h3><div class="bracket-col">${ms.map(m => bracketCard(m, byId, now)).join('')}</div></div>` : '';
  }).join('');
  return `<header class="hero"><div class="container hero-content"><div>` +
    `<p class="kicker">FIFA World Cup 2026 · Knockout Bracket</p>` +
    `<h1 class="title">토너먼트 브래킷</h1>` +
    `<p class="hero-copy">32강부터 결승까지 진출 확률 예측과 예상 우승팀. 경기를 누르면 상세 분석이 열립니다.</p>` +
    `<div class="status-row"><span class="badge badge-live">🏆 예상 우승 ${esc(champ?.name ?? bracket.champion ?? '—')}</span></div>` +
    `</div><aside class="update-panel" aria-label="예상 우승"><p class="update-label">🏆 예상 우승</p>` +
    `<p class="update-time">${flagImg(bracket.champion, champ?.name, 'detail-flag')}${esc(champ?.name ?? bracket.champion ?? '—')}</p>` +
    `<p class="update-meta">결승까지 전체 예측</p></aside></div></header>` +
    `<main class="container content"><div class="bracket" aria-label="토너먼트 브래킷">${cols}</div></main>`;
}
function detailResultKO(match, byId) {
  const r = match.result;
  if (!r || r.home_score == null || r.away_score == null) return '';
  const o = r.outcome || (r.home_score > r.away_score ? 'home_win' : 'away_win');
  const winId = o === 'home_win' ? match.home : match.away;
  const ok = match.winner === winId;
  return `<div class="detail-result"><span class="result-tag">결과</span><span class="result-score">${esc(r.home_score)} - ${esc(r.away_score)}</span>` +
    `<span class="result-outcome">${esc(byId.get(winId)?.name ?? winId)} 진출</span>` +
    `<span class="hit hit-${ok ? 'ok' : 'no'}">예측 ${ok ? '적중' : '빗나감'}</span></div>`;
}
export function renderKnockoutDetail(match, teams, factors = [], now = new Date()) {
  if (!match) return `<main class="container content"><a class="back-link" href="#/bracket"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M15 18l-6-6 6-6"/></svg>브래킷으로</a>` +
    renderStatePanel({ icon: 'alert', title: '경기를 찾을 수 없습니다', body: '브래킷으로 돌아가세요.' }) + `</main>`;
  const byId = new Map((teams || []).map(t => [t.id, t]));
  const home = byId.get(match.home), away = byId.get(match.away);
  const adv = match.advance || { home: 50, away: 50 };
  const winId = match.winner || (adv.home >= adv.away ? match.home : match.away);
  const winName = esc(byId.get(winId)?.name ?? winId);
  const winPct = winId === match.home ? adv.home : adv.away;
  const homeName = esc(home?.name ?? match.home), awayName = esc(away?.name ?? match.away);
  const round = KO_LABEL[match.round] || match.round;
  const k = match.kickoff ? formatKickoff(match.kickoff, now) : null;
  const played = match.status === 'played' && match.result;
  return `<header class="hero"><div class="container hero-content"><div>` +
    `<a class="back-link" href="#/bracket" aria-label="브래킷으로"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M15 18l-6-6 6-6"/></svg>브래킷으로</a>` +
    `<p class="kicker">토너먼트 · ${esc(round)}${k ? ` · ${esc(k.label)}` : ''}</p>` +
    `<h1 class="title">${homeName} vs ${awayName}</h1>` +
    `<p class="hero-copy">녹아웃은 무승부가 없습니다 — 각 팀의 진출 확률과 전술 분석입니다.</p>` +
    `<div class="status-row"><span class="badge badge-live">${played ? '종료' : '예정'}</span><span class="badge">${esc(round)}</span></div>` +
    `</div><aside class="update-panel" aria-label="진출 예측"><p class="update-label">진출 예측</p><p class="update-time">${winName} ${winPct}%</p><p class="update-meta">${homeName} ${adv.home}% · ${awayName} ${adv.away}%</p></aside></div></header>` +
    `<main class="container content match-detail-layout"><section class="detail-main">` +
      `<article class="matchup-card">` +
        `<div class="matchup-meta"><span class="meta-chip">${esc(round)}</span><span>${k ? esc(k.label) : ''}</span></div>` +
        `<div class="matchup-teams">` +
          `<div class="detail-team"><span class="detail-team-name">${flagImg(match.home, home?.name, 'detail-flag')}${homeName}</span><span class="detail-team-code">${detailCode(home, match.home)}</span></div>` +
          `<span class="detail-vs">VS</span>` +
          `<div class="detail-team away"><span class="detail-team-name">${flagImg(match.away, away?.name, 'detail-flag')}${awayName}</span><span class="detail-team-code">${detailCode(away, match.away)}</span></div>` +
        `</div>` + advanceBar(adv) +
        `<div class="verdict"><span>진출 예측: ${winName}</span><small>${winPct}%</small></div>` +
        (played ? detailResultKO(match, byId) : '') +
      `</article>` +
      `<section class="detail-section"><h2>전술 분석</h2>` + (match.rationale ? `<p>${esc(match.rationale)}</p>` : '') +
        `<div class="analysis-grid">${analysisCard(home, match.home, null)}${analysisCard(away, match.away, null)}</div></section>` +
      (match.key_point ? `<section class="detail-section"><h2>키포인트</h2><div class="risk-callout"><b>핵심 변수</b><p>${esc(match.key_point)}</p></div></section>` : '') +
      ((factors && factors.length) ? `<section class="detail-section"><h2>이번 대회 중점 요소</h2><ul class="insight-list">${factors.map((f, i) => `<li><span class="insight-index">${i + 1}</span><span>${esc(f)}</span></li>`).join('')}</ul></section>` : '') +
      `<section class="detail-section"><h2>양 팀 프로필</h2><div class="detail-profile-grid">${profileCard(home, match.home)}${profileCard(away, match.away)}</div></section>` +
      `<section class="detail-section"><h2>양 팀 명단</h2><div class="detail-profile-grid">${squadCard(home)}${squadCard(away)}</div></section>` +
    `</section>` +
    `<aside class="detail-rail"><div class="detail-summary-card"><p class="summary-eyebrow">Quick Read</p>` +
      `<div class="summary-pick"><b>${winName} 진출</b><span>진출 확률 ${winPct}%</span></div>` +
      `<div class="summary-stat-grid"><div class="summary-stat"><span>홈</span><b>${adv.home}</b></div><div class="summary-stat"><span>원정</span><b>${adv.away}</b></div></div>` +
      (match.key_point ? `<div class="chip-list"><span class="chip">${esc(match.key_point)}</span></div>` : '') +
    `</div></aside></main>` +
    `<aside class="mobile-detail-bar"><div><b>${winName} 진출 ${winPct}%</b><span>${homeName} ${adv.home} · ${awayName} ${adv.away}</span></div><a class="segment-tab" href="#/bracket">브래킷</a></aside>`;
}
