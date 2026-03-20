/** 返済スケジュールを計算するユーティリティ関数群 */

/** 返済スケジュールの1行分のデータ */
export interface RepaymentEntry {
  yearMonth: string;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
}

/**
 * 借入日の翌月を返済開始年月 (YYYY-MM) として返す。
 * 例: "2025-01-31" → "2025-02"
 * @param loanDate - 借入日 (YYYY-MM-DD)
 */
function getFirstRepaymentYearMonth(loanDate: string): string {
  const [year, month] = loanDate.split('-').map(Number);
  // month は 1 始まり。new Date(year, month, 1) は JS の 0 始まり月で翌月初日になる。
  const d = new Date(year, month, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * 返済開始年月を解決する。
 * repaymentStartDate が指定されている場合はその年月を使用し、
 * 未指定（null/undefined）の場合は借入日の翌月にフォールバックする。
 * @param loanDate - 借入日 (YYYY-MM-DD)
 * @param repaymentStartDate - 返済開始日 (YYYY-MM-DD)、省略可
 */
function resolveFirstRepaymentYearMonth(
  loanDate: string,
  repaymentStartDate?: string | null,
): string {
  if (repaymentStartDate) {
    const [y, m] = repaymentStartDate.split('-');
    return `${y}-${m}`;
  }
  return getFirstRepaymentYearMonth(loanDate);
}

/**
 * 指定した年月から n ヶ月後の年月 (YYYY-MM) を返す。
 * @param startYearMonth - 開始年月 (YYYY-MM)
 * @param offsetMonths - ずらす月数
 */
function addMonths(startYearMonth: string, offsetMonths: number): string {
  const [y, m] = startYearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + offsetMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 2つの年月文字列の差（月数）を返す。
 * toYearMonth - fromYearMonth の月数差。
 * @param fromYearMonth - 開始年月 (YYYY-MM)
 * @param toYearMonth - 終了年月 (YYYY-MM)
 */
function monthDiff(fromYearMonth: string, toYearMonth: string): number {
  const [fy, fm] = fromYearMonth.split('-').map(Number);
  const [ty, tm] = toYearMonth.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * 据え置き期間の利息のみ支払い行を生成する。
 * borrowing_date の翌月から repaymentStartYearMonth の前月まで、
 * 元本は変わらず毎月利息のみ支払う。
 * @param principal - 借入元本
 * @param annualRate - 年利（%）
 * @param loanDate - 借入日 (YYYY-MM-DD)
 * @param repaymentStartYearMonth - 実際の返済開始年月 (YYYY-MM)
 * @returns 据え置き期間の月次エントリ
 */
function buildDeferralRows(
  principal: number,
  annualRate: number,
  loanDate: string,
  repaymentStartYearMonth: string,
): RepaymentEntry[] {
  const monthlyRate = annualRate / 100 / 12;
  const defaultStart = getFirstRepaymentYearMonth(loanDate);
  const deferralMonths = monthDiff(defaultStart, repaymentStartYearMonth);

  const rows: RepaymentEntry[] = [];
  for (let i = 0; i < deferralMonths; i++) {
    const interestPayment = Math.round(principal * monthlyRate * 100) / 100;
    rows.push({
      yearMonth: addMonths(defaultStart, i),
      principalPayment: 0,
      interestPayment,
      remainingBalance: principal,
    });
  }
  return rows;
}

/**
 * 元利均等返済の月次返済額を計算する。
 * @param principal - 元本
 * @param annualRate - 年利（%）
 * @param months - 返済月数
 * @returns 月次返済額（小数点以下2桁で四捨五入）
 */
export function calculateEqualPayment(
  principal: number,
  annualRate: number,
  months: number,
): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) {
    return Math.round((principal / months) * 100) / 100;
  }
  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(payment * 100) / 100;
}

/**
 * 元利均等返済のスケジュールを生成する。
 * repaymentStartDate と deferredInterestPolicy が両方指定された場合、
 * 据え置き期間の扱いが変わる。
 * - 'charge': 据え置き期間は毎月利息のみ支払い
 * - 'waive': 据え置き期間は利息なし（スケジュールに含めない）
 * @param principal - 借入元本
 * @param annualRate - 年利（%）
 * @param months - 返済月数
 * @param loanDate - 借入日 (YYYY-MM-DD)
 * @param repaymentStartDate - 返済開始日 (YYYY-MM-DD)。省略時は借入日翌月。
 * @param deferredInterestPolicy - 据え置き期間の利息方針。'charge' | 'waive'
 * @returns 月次返済スケジュール
 */
export function generateEqualPaymentSchedule(
  principal: number,
  annualRate: number,
  months: number,
  loanDate: string,
  repaymentStartDate?: string | null,
  deferredInterestPolicy: 'charge' | 'waive' = 'charge',
): RepaymentEntry[] {
  const firstYearMonth = resolveFirstRepaymentYearMonth(loanDate, repaymentStartDate);

  const deferralRows = (repaymentStartDate && deferredInterestPolicy === 'charge')
    ? buildDeferralRows(principal, annualRate, loanDate, firstYearMonth)
    : [];

  const repaymentRows: RepaymentEntry[] = [];
  const monthlyRate = annualRate / 100 / 12;
  const payment = calculateEqualPayment(principal, annualRate, months);
  let balance = principal;

  for (let i = 0; i < months; i++) {
    const interestPayment = Math.round(balance * monthlyRate * 100) / 100;
    let principalPayment = Math.round((payment - interestPayment) * 100) / 100;

    // 最終月：端数を元金で調整して残高がちょうど 0 になるようにする
    if (i === months - 1) {
      principalPayment = Math.round(balance * 100) / 100;
    }

    balance = Math.round((balance - principalPayment) * 100) / 100;
    if (balance < 0) balance = 0;

    repaymentRows.push({
      yearMonth: addMonths(firstYearMonth, i),
      principalPayment,
      interestPayment,
      remainingBalance: balance,
    });
  }

  return [...deferralRows, ...repaymentRows];
}

/**
 * 元金均等返済のスケジュールを生成する。
 * @param principal - 借入元本
 * @param annualRate - 年利（%）
 * @param months - 返済月数
 * @param loanDate - 借入日 (YYYY-MM-DD)
 * @param repaymentStartDate - 返済開始日 (YYYY-MM-DD)。省略時は借入日翌月。
 * @param deferredInterestPolicy - 据え置き期間の利息方針。'charge' | 'waive'
 * @returns 月次返済スケジュール
 */
export function generateEqualPrincipalSchedule(
  principal: number,
  annualRate: number,
  months: number,
  loanDate: string,
  repaymentStartDate?: string | null,
  deferredInterestPolicy: 'charge' | 'waive' = 'charge',
): RepaymentEntry[] {
  const firstYearMonth = resolveFirstRepaymentYearMonth(loanDate, repaymentStartDate);

  const deferralRows = (repaymentStartDate && deferredInterestPolicy === 'charge')
    ? buildDeferralRows(principal, annualRate, loanDate, firstYearMonth)
    : [];

  const repaymentRows: RepaymentEntry[] = [];
  const monthlyRate = annualRate / 100 / 12;
  const basePrincipalPayment = Math.round((principal / months) * 100) / 100;
  let balance = principal;

  for (let i = 0; i < months; i++) {
    const interestPayment = Math.round(balance * monthlyRate * 100) / 100;
    let principalPayment = basePrincipalPayment;

    // 最終月：残高全額を返済
    if (i === months - 1) {
      principalPayment = Math.round(balance * 100) / 100;
    }

    balance = Math.round((balance - principalPayment) * 100) / 100;
    if (balance < 0) balance = 0;

    repaymentRows.push({
      yearMonth: addMonths(firstYearMonth, i),
      principalPayment,
      interestPayment,
      remainingBalance: balance,
    });
  }

  return [...deferralRows, ...repaymentRows];
}

/**
 * 一括返済のスケジュールを生成する。
 * 最終月まで毎月利息のみを支払い、最終月に元本を一括返済する。
 * @param principal - 借入元本
 * @param annualRate - 年利（%）
 * @param months - 返済月数
 * @param loanDate - 借入日 (YYYY-MM-DD)
 * @param repaymentStartDate - 返済開始日 (YYYY-MM-DD)。省略時は借入日翌月。
 * @param deferredInterestPolicy - 据え置き期間の利息方針。'charge' | 'waive'
 * @returns 月次返済スケジュール
 */
export function generateBulletSchedule(
  principal: number,
  annualRate: number,
  months: number,
  loanDate: string,
  repaymentStartDate?: string | null,
  deferredInterestPolicy: 'charge' | 'waive' = 'charge',
): RepaymentEntry[] {
  const firstYearMonth = resolveFirstRepaymentYearMonth(loanDate, repaymentStartDate);

  const deferralRows = (repaymentStartDate && deferredInterestPolicy === 'charge')
    ? buildDeferralRows(principal, annualRate, loanDate, firstYearMonth)
    : [];

  const repaymentRows: RepaymentEntry[] = [];
  const monthlyRate = annualRate / 100 / 12;

  for (let i = 0; i < months; i++) {
    const interestPayment = Math.round(principal * monthlyRate * 100) / 100;
    const isLastMonth = i === months - 1;
    const principalPayment = isLastMonth ? principal : 0;
    const remainingBalance = isLastMonth ? 0 : principal;

    repaymentRows.push({
      yearMonth: addMonths(firstYearMonth, i),
      principalPayment,
      interestPayment,
      remainingBalance,
    });
  }

  return [...deferralRows, ...repaymentRows];
}
