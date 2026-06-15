import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, teamCode, verdictText, renderProbability, renderCard, renderList, renderTeamProfile, renderProfileSheet, renderStatePanel, renderStandings, headerStatus, flagImg, renderMatchDetail } from '../src/render.js';

const teams = [
  { id: 'MEX', name: '멕시코', group: 'A', formation: '4-3-3', style: '압박', aimed_tactics: '측면 과부하', record: { w: 1, d: 1, l: 0, pts: 4, gd: 2 }, form: ['W', 'D'], injuries: [] },
  { id: 'POL', name: '폴란드', group: 'A', formation: '3-4-2-1', style: '블록', aimed_tactics: '세트피스', record: { w: 0, d: 1, l: 1, pts: 1, gd: -2 }, form: ['L', 'D'], injuries: ['CB 의심'] },
];
const byId = new Map(teams.map(t => [t.id, t]));
const match = { id: 'A-MD3-1', group: 'A', matchday: 3, kickoff: '2026-06-24T17:00:00-05:00', status: 'upcoming', home: 'MEX', away: 'POL', prob: { win: 56, draw: 24, loss: 20 }, verdict: 'home_win', rationale: '측면 과부하.', team_notes: { home: '빠른 전환', away: '수비 블록' }, key_variables: ['CB 의심'], flip_condition: '선제 실점 시', qualification_context: '무승부면 진출' };
const NOW = new Date('2026-06-24T09:00:00-05:00');

test('esc escapes html', () => {
  assert.equal(esc('<b>&"\'</b>'), '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
});
test('teamCode shows id and pluralized points', () => {
  assert.equal(teamCode(teams[0], 'MEX'), 'MEX · 4 pts');
  assert.equal(teamCode({ id: 'X', record: { pts: 1 } }, 'X'), 'X · 1 pt');
  assert.equal(teamCode(undefined, 'ZZZ'), 'ZZZ');
});
test('verdictText names winner or draw (no percentage)', () => {
  assert.equal(verdictText(match, byId), '예측: 멕시코 승');
  assert.equal(verdictText({ ...match, verdict: 'draw' }, byId), '예측: 무승부');
  assert.equal(verdictText({ ...match, verdict: 'away_win' }, byId), '예측: 폴란드 승');
});
test('renderProbability emits three design segments + labels', () => {
  const h = renderProbability({ win: 56, draw: 24, loss: 20 });
  assert.ok(h.includes('prob-home') && h.includes('prob-draw') && h.includes('prob-away'));
  assert.ok(h.includes('width: 56%') && h.includes('56%') && h.includes('24%') && h.includes('20%'));
  assert.ok(h.includes('홈 승') && h.includes('원정 승'));
});
test('renderCard reproduces design markup', () => {
  const h = renderCard(match, byId, NOW);
  assert.ok(h.includes('class="match-card"'));
  assert.ok(h.includes('멕시코') && h.includes('MEX · 4 pts') && h.includes('폴란드'));
  assert.ok(h.includes('A조 · MD3') && h.includes('오늘 17:00 CT'));
  assert.ok(h.includes('예측: 멕시코 승') && h.includes('중간 확신'));
  assert.ok(h.includes('<details class="details"') && h.includes('details-inner'));
  assert.ok(h.includes('CB 의심'));
  assert.ok(h.includes('data-match="A-MD3-1"'));
});
test('renderCard marks toss-ups', () => {
  const h = renderCard({ ...match, prob: { win: 39, draw: 31, loss: 30 }, verdict: 'home_win' }, byId, NOW);
  assert.ok(h.includes('match-card is-tossup'));
  assert.ok(h.includes('접전'));
});
test('renderList renders one article per match', () => {
  const h = renderList([match, match], teams, NOW);
  assert.equal((h.match(/class="match-card/g) || []).length, 2);
});
test('renderTeamProfile shows formation/pts/gd, tactics, form marks', () => {
  const h = renderTeamProfile(teams[0]);
  assert.ok(h.includes('멕시코 · MEX') && h.includes('4-3-3'));
  assert.ok(h.includes('form-win') && h.includes('form-draw'));
  assert.ok(h.includes('+2'));
  assert.ok(h.includes('측면 과부하'));
});
test('renderProfileSheet includes both teams and close button', () => {
  const h = renderProfileSheet(match, byId);
  assert.ok(h.includes('멕시코 vs 폴란드'));
  assert.ok(h.includes('id="sheet-close"'));
  assert.ok((h.match(/team-profile/g) || []).length >= 2);
});
test('renderStatePanel renders title/body and optional action', () => {
  const h = renderStatePanel({ icon: 'alert', title: '불러올 수 없음', body: '재시도', actionId: 'retry', actionLabel: '다시' });
  assert.ok(h.includes('state-panel') && h.includes('불러올 수 없음') && h.includes('id="retry"'));
});
test('renderStandings sorts by pts desc', () => {
  const h = renderStandings(teams, 'A');
  const iMex = h.indexOf('멕시코'), iPol = h.indexOf('폴란드');
  assert.ok(iMex >= 0 && iPol > iMex);
  assert.ok(h.includes('4 pts'));
});
test('headerStatus prioritizes cache over stale over ok', () => {
  assert.deepEqual(headerStatus({ cached: true, stale: true }), { variant: 'danger', label: '캐시 데이터' });
  assert.deepEqual(headerStatus({ stale: true }), { variant: 'warning', label: '업데이트 지연' });
  assert.deepEqual(headerStatus({}), { variant: 'live', label: '데이터 정상' });
});
test('renderCard does not throw on missing prob/verdict/kickoff', () => {
  const bad = { id: 'X', group: 'A', matchday: 3, kickoff: 'TBD', status: 'upcoming', home: 'MEX', away: 'POL' };
  let html;
  assert.doesNotThrow(() => { html = renderCard(bad, byId, NOW); });
  assert.ok(html.includes('match-card') && html.includes('멕시코') && html.includes('폴란드'));
});
test('renderTeamProfile shows key players and a collapsible full squad', () => {
  const team = {
    id: 'MEX', name: '멕시코', formation: '4-3-3', style: '압박', aimed_tactics: '측면 과부하',
    record: { w: 1, d: 1, l: 0, pts: 4, gd: 2 }, form: ['W', 'D'], injuries: [],
    squad: [
      { name: '로페즈', position: 'GK', club: '리가 MX 클럽', key: false },
      { name: '가르시아', position: 'MF', club: '프리미어리그 클럽', key: true },
      { name: '토레스', position: 'FW', club: '에레디비시 클럽', key: true },
    ],
  };
  const h = renderTeamProfile(team);
  assert.ok(h.includes('주요 선수'));
  assert.ok(h.includes('가르시아') && h.includes('프리미어리그 클럽'));
  assert.ok(h.includes('전체 명단 (3)'));
  assert.ok(h.includes('로페즈')); // non-key player appears in full list
  assert.ok(h.includes('<details class="squad-all"'));
});
test('renderTeamProfile omits squad block when no squad', () => {
  const h = renderTeamProfile({ id: 'X', name: 'X', record: { pts: 0, gd: 0 }, form: [] });
  assert.ok(!h.includes('주요 선수'));
});
test('flagImg builds an img for a mapped team, empty for unmapped', () => {
  const h = flagImg('MEX', '멕시코');
  assert.ok(h.includes('mx.svg') && h.includes('class="flag"'));
  assert.equal(flagImg('XXX', '?'), '');
});
test('renderCard includes a flag image for mapped teams', () => {
  assert.ok(renderCard(match, byId, NOW).includes('flags/mx.svg'));
});
test('renderMatchDetail shows summary, tactics, keypoints, squads, path, back link', () => {
  const all = [match, { id: 'A-MD2-1', group: 'A', matchday: 2, kickoff: '2026-06-19T17:00:00-05:00', status: 'played', home: 'MEX', away: 'POL', prob: { win: 50, draw: 30, loss: 20 }, verdict: 'home_win' }];
  const h = renderMatchDetail(match, teams, all, NOW);
  assert.ok(h.includes('← 목록으로'));
  assert.ok(h.includes('전술 분석') && h.includes('키포인트') && h.includes('양 팀 명단') && h.includes('조별리그 경로'));
  assert.ok(h.includes('멕시코') && h.includes('폴란드'));
  assert.ok(h.includes('mx.svg'));
  assert.ok(/예측 [승무패]/.test(h));
});
test('renderMatchDetail handles a missing match', () => {
  assert.ok(renderMatchDetail(null, teams, [], NOW).includes('찾을 수 없습니다'));
});
