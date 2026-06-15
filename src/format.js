const TZ = 'America/Chicago';

export function verdictFromProb(prob) {
  const win = Number(prob?.win) || 0, draw = Number(prob?.draw) || 0, loss = Number(prob?.loss) || 0;
  const max = Math.max(win, draw, loss);
  if (max === win) return 'home_win';
  if (max === loss) return 'away_win';
  return 'draw';
}

export function confidenceLevel(prob) {
  const max = Math.max(Number(prob?.win) || 0, Number(prob?.draw) || 0, Number(prob?.loss) || 0);
  if (max >= 60) return 'high';
  if (max >= 45) return 'med';
  return 'toss';
}

export function confidenceLabel(prob) {
  const lvl = confidenceLevel(prob);
  return lvl === 'high' ? '높은 확신' : lvl === 'med' ? '중간 확신' : '접전';
}

export function isStale(generatedAtIso, now = new Date(), thresholdHours = 28) {
  const gen = new Date(generatedAtIso).getTime();
  if (Number.isNaN(gen)) return false;
  return (now.getTime() - gen) / 3_600_000 > thresholdHours;
}

function ctParts(date) {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}
function dayDiffCT(from, to) {
  const a = ctParts(from), b = ctParts(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}
export function formatKickoff(kickoffIso, now = new Date()) {
  const d = new Date(kickoffIso);
  const p = ctParts(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const diff = dayDiffCT(now, d);
  const rel = diff === 0 ? '오늘' : diff === 1 ? '내일' : diff === -1 ? '어제' : `${p.m}/${p.d}`;
  return { time, rel, label: `${rel} ${time} CT` };
}
