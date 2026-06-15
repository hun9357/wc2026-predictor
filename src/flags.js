// FIFA 3-letter code → ISO 3166-1 alpha-2 (flagcdn code) for local flag SVGs in assets/flags/.
export const FIFA_TO_ISO2 = {
  MEX: 'mx', KOR: 'kr', CZE: 'cz', RSA: 'za',
  CAN: 'ca', BIH: 'ba', QAT: 'qa', SUI: 'ch',
  BRA: 'br', MAR: 'ma', SCO: 'gb-sct', HAI: 'ht',
  USA: 'us', AUS: 'au', TUR: 'tr', PAR: 'py',
  GER: 'de', ECU: 'ec', CIV: 'ci', CUW: 'cw',
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz',
  ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy',
  FRA: 'fr', SEN: 'sn', IRQ: 'iq', NOR: 'no',
  ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
  POR: 'pt', COD: 'cd', UZB: 'uz', COL: 'co',
  ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa',
};

export function flagPath(id) {
  const iso = FIFA_TO_ISO2[id];
  return iso ? `./assets/flags/${iso}.svg` : null;
}
