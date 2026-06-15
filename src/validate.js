import { verdictFromProb } from './format.js';

export function normalizeProb(prob = {}) {
  const win = Math.max(0, Number(prob.win) || 0), draw = Math.max(0, Number(prob.draw) || 0), loss = Math.max(0, Number(prob.loss) || 0);
  const sum = win + draw + loss;
  if (sum === 0) return { win: 34, draw: 33, loss: 33, normalized: true };
  if (sum === 100) return { win, draw, loss, normalized: false };
  const raw = { win: win * 100 / sum, draw: draw * 100 / sum, loss: loss * 100 / sum };
  const out = { win: Math.floor(raw.win), draw: Math.floor(raw.draw), loss: Math.floor(raw.loss) };
  let remainder = 100 - (out.win + out.draw + out.loss);
  const order = ['win', 'draw', 'loss'].sort((a, b) => (raw[b] - out[b]) - (raw[a] - out[a]));
  for (let i = 0; i < remainder; i++) out[order[i % 3]] += 1;
  return { ...out, normalized: true };
}

const REQUIRED = ['id', 'group', 'matchday', 'home', 'away', 'prob', 'status'];
export function validateData(predictions, teams) {
  const errors = [], warnings = [];
  if (!predictions || !Array.isArray(predictions.matches)) { errors.push('predictions.matches가 배열이 아님'); return { ok: false, errors, warnings }; }
  const ids = new Set((teams || []).map(t => t.id));
  for (const m of predictions.matches) {
    const where = `match ${m.id ?? '(id없음)'}`;
    for (const f of REQUIRED) if (m[f] === undefined) errors.push(`${where}: 필수 필드 누락 '${f}'`);
    if (m.prob) {
      const s = (Number(m.prob.win) || 0) + (Number(m.prob.draw) || 0) + (Number(m.prob.loss) || 0);
      if (s !== 100) warnings.push(`${where}: prob 합이 100이 아님(${s})`);
      if (m.verdict && m.verdict !== verdictFromProb(m.prob)) warnings.push(`${where}: verdict(${m.verdict})가 prob 최고값과 불일치`);
    }
    if (ids.size) {
      if (m.home && !ids.has(m.home)) warnings.push(`${where}: home 팀 '${m.home}' teams에 없음`);
      if (m.away && !ids.has(m.away)) warnings.push(`${where}: away 팀 '${m.away}' teams에 없음`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}
