const BASE = 'https://flagcdn.com/w80'

export const TEAM_FLAGS: Record<string, string> = {
  // Group A
  MEX: `${BASE}/mx.png`,
  RSA: `${BASE}/za.png`,
  KOR: `${BASE}/kr.png`,
  CZE: `${BASE}/cz.png`,
  // Group B
  CAN: `${BASE}/ca.png`,
  BIH: `${BASE}/ba.png`,
  QAT: `${BASE}/qa.png`,
  SUI: `${BASE}/ch.png`,
  // Group C
  BRA: `${BASE}/br.png`,
  MAR: `${BASE}/ma.png`,
  HAI: `${BASE}/ht.png`,
  SCO: `${BASE}/gb-sct.png`,
  // Group D
  USA: `${BASE}/us.png`,
  PAR: `${BASE}/py.png`,
  AUS: `${BASE}/au.png`,
  TUR: `${BASE}/tr.png`,
  // Group E
  GER: `${BASE}/de.png`,
  CUW: `${BASE}/cw.png`,
  CIV: `${BASE}/ci.png`,
  ECU: `${BASE}/ec.png`,
  // Group F
  NED: `${BASE}/nl.png`,
  JPN: `${BASE}/jp.png`,
  SWE: `${BASE}/se.png`,
  TUN: `${BASE}/tn.png`,
  // Group G
  BEL: `${BASE}/be.png`,
  EGY: `${BASE}/eg.png`,
  IRN: `${BASE}/ir.png`,
  NZL: `${BASE}/nz.png`,
  // Group H
  ESP: `${BASE}/es.png`,
  CPV: `${BASE}/cv.png`,
  KSA: `${BASE}/sa.png`,
  URU: `${BASE}/uy.png`,
  // Group I
  FRA: `${BASE}/fr.png`,
  SEN: `${BASE}/sn.png`,
  IRQ: `${BASE}/iq.png`,
  NOR: `${BASE}/no.png`,
  // Group J
  ARG: `${BASE}/ar.png`,
  ALG: `${BASE}/dz.png`,
  AUT: `${BASE}/at.png`,
  JOR: `${BASE}/jo.png`,
  // Group K
  POR: `${BASE}/pt.png`,
  COD: `${BASE}/cd.png`,
  UZB: `${BASE}/uz.png`,
  COL: `${BASE}/co.png`,
  // Group L
  ENG: `${BASE}/gb-eng.png`,
  CRO: `${BASE}/hr.png`,
  GHA: `${BASE}/gh.png`,
  PAN: `${BASE}/pa.png`,
}

export function getFlagUrl(abbreviation: string): string | null {
  return TEAM_FLAGS[abbreviation.toUpperCase()] ?? null
}
