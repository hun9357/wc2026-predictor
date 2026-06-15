export function filterMatches(matches, criteria = {}) {
  const { group = 'ALL', matchday = 'ALL', remainingOnly = true, query = '', teams = [] } = criteria;
  const byId = new Map((teams || []).map(t => [t.id, t]));
  const q = String(query).trim().toLowerCase();
  return (matches || []).filter(m => {
    if (remainingOnly && m.status !== 'upcoming') return false;
    if (group !== 'ALL' && m.group !== group) return false;
    if (matchday !== 'ALL' && String(m.matchday) !== String(matchday)) return false;
    if (q) {
      const h = byId.get(m.home), a = byId.get(m.away);
      const hay = [m.home, m.away, h?.name, a?.name].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
