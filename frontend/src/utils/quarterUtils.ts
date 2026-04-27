/** 四半期の定義 */
export interface QuarterDef {
  label: string;    // 'Q1' 〜 'Q4'
  months: string[]; // ['YYYY-MM', ...] カレンダー順に並んだ3ヶ月
}

/**
 * 指定年の四半期レイアウトを構築する。
 * @param year 対象年 (YYYY)
 * @param openingMonth 開業月 (1〜12)。calendar モード時は無視される。
 * @param qType 'calendar' = 1月始まり / 'fiscal' = 開業月始まり
 * @returns カレンダー順に並んだ 4 つの QuarterDef
 */
export function buildQuarterLayout(
  year: string,
  openingMonth: number,
  qType: 'calendar' | 'fiscal',
): QuarterDef[] {
  const O = qType === 'calendar' ? 1 : openingMonth;

  // 各カレンダー月 (1〜12) が属する四半期番号を計算する
  const quarterMap = new Map<number, string[]>();
  for (let m = 1; m <= 12; m++) {
    const q = Math.floor(((m - O + 12) % 12) / 3) + 1;
    const ym = `${year}-${String(m).padStart(2, '0')}`;
    if (!quarterMap.has(q)) quarterMap.set(q, []);
    quarterMap.get(q)!.push(ym);
  }

  // カレンダー順（最初の月が小さい順）に四半期を並べる
  const quarters: QuarterDef[] = Array.from(quarterMap.entries()).map(([q, months]) => ({
    label: `Q${q}`,
    months: months.sort(),
  }));
  quarters.sort((a, b) => a.months[0].localeCompare(b.months[0]));

  return quarters;
}

/**
 * 事業年度の開始月から12ヶ月分の YYYY-MM 文字列配列を返す。
 * 例: buildFiscalYearMonths("2027", 4) → ["2027-04", ..., "2027-12", "2028-01", "2028-02", "2028-03"]
 * @param year 事業年度の開始年 (YYYY)
 * @param openingMonth 開業月 (1〜12)
 */
export function buildFiscalYearMonths(year: string, openingMonth: number): string[] {
  const months: string[] = [];
  const startYear = Number(year);
  for (let i = 0; i < 12; i++) {
    const calMonth = ((openingMonth - 1 + i) % 12) + 1;
    const calYear = startYear + Math.floor((openingMonth - 1 + i) / 12);
    months.push(`${calYear}-${String(calMonth).padStart(2, '0')}`);
  }
  return months;
}

/**
 * 四半期ラベルに月範囲を付加した表示文字列を返す。
 * 例: { label: 'Q1', months: ['2027-04','2027-05','2027-06'] } → 'Q1 (4–6月)'
 */
export function buildQuarterLabel(q: QuarterDef): string {
  const first = Number(q.months[0].split('-')[1]);
  const last = Number(q.months[q.months.length - 1].split('-')[1]);
  return `${q.label} (${first}–${last}月)`;
}

/**
 * 事業年度の12ヶ月を Q1→Q2→Q3→Q4 の順に分割する。
 * @param fiscalMonths buildFiscalYearMonths() の戻り値
 */
export function buildFiscalQuarterLayout(fiscalMonths: string[]): QuarterDef[] {
  return [
    { label: 'Q1', months: fiscalMonths.slice(0, 3) },
    { label: 'Q2', months: fiscalMonths.slice(3, 6) },
    { label: 'Q3', months: fiscalMonths.slice(6, 9) },
    { label: 'Q4', months: fiscalMonths.slice(9, 12) },
  ];
}

// ─── Cookie ユーティリティ ───────────────────────────────────────────────────

export function getCookie(name: string): string | null {
  const match = document.cookie
    .split(';')
    .map(s => s.trim())
    .find(s => s.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function setCookie(name: string, value: string, days = 365): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}
