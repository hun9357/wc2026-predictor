import { formatKickoff, confidenceLevel, confidenceLabel, verdictFromProb } from './format.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

export function renderCard(match, byId, now = new Date()) {
  const home = byId.get(match.home), away = byId.get(match.away);
  const k = formatKickoff(match.kickoff, now);
  const toss = confidenceLevel(match.prob) === 'toss';
  return `<article class="match-card${toss ? ' is-tossup' : ''}" data-match="${esc(match.id)}" data-group="${esc(match.group)}" data-md="${esc(match.matchday)}">` +
    `<div class="match-meta"><span class="meta-chip">${esc(match.group)}조 · MD${esc(match.matchday)}</span><span>${esc(k.label)}</span></div>` +
    `<div class="team-row">` +
      `<div class="team"><span class="team-name">${esc(home?.name ?? match.home)}</span><span class="team-code">${teamCode(home, match.home)}</span></div>` +
      `<span class="vs">VS</span>` +
      `<div class="team away"><span class="team-name">${esc(away?.name ?? match.away)}</span><span class="team-code">${teamCode(away, match.away)}</span></div>` +
    `</div>` +
    renderProbability(match.prob) +
    `<div class="verdict"><span>${esc(verdictText(match, byId))}</span><small>${esc(confidenceLabel(match.prob))}</small></div>` +
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
export function renderTeamProfile(team) {
  if (!team) return '';
  const gd = team.record?.gd;
  const gdStr = gd === undefined || gd === null ? '—' : gd > 0 ? `+${gd}` : `${gd}`;
  return `<section class="team-profile">` +
    `<h3>${esc(team.name)} · ${esc(team.id)}</h3>` +
    `<div class="profile-stat-row">` +
      `<div class="profile-stat"><span>포메이션</span><b>${esc(team.formation ?? '—')}</b></div>` +
      `<div class="profile-stat"><span>승점</span><b>${esc(team.record?.pts ?? '—')}</b></div>` +
      `<div class="profile-stat"><span>골득실</span><b>${esc(gdStr)}</b></div>` +
    `</div>` +
    (team.style ? `<p><strong>스타일</strong> ${esc(team.style)}</p>` : '') +
    (team.aimed_tactics ? `<p><strong>지향 전술</strong> ${esc(team.aimed_tactics)}</p>` : '') +
    (team.injuries?.length ? `<p><strong>부상</strong> ${esc(team.injuries.join(', '))}</p>` : '') +
    formMarks(team.form) +
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
