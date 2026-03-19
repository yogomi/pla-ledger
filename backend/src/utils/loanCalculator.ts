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
 * @param principal - 借入元本
 * @param annualRate - 年利（%）
 * @param months - 返済月数
 * @param loanDate - 借入日 (YYYY-MM-DD)
 * @param repaymentStartDate - 返済開始日 (YYYY-MM-DD)。省略時は借入日翌月。
 * @returns 月次返済スケジュール
 */
export function generateEqualPaymentSchedule(
  principal: number,
  annualRate: number,
  months: number,
  loanDate: string,
  repaymentStartDate?: string | null,
): RepaymentEntry[] {
  const schedule: RepaymentEntry[] = [];
  const monthlyRate = annualRate / 100 / 12;
  const payment = calculateEqualPayment(principal, annualRate, months);
  const firstYearMonth = resolveFirstRepaymentYearMonth(loanDate, repaymentStartDate);
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

    schedule.push({
      yearMonth: addMonths(firstYearMonth, i),
      principalPayment,
      interestPayment,
      remainingBalance: balance,
    });
  }

  return schedule;
}

/**
 * 元金均等返済のスケジュールを生成する。
 * @param principal - 借入元本
 * @param annualRate - 年利（%）
 * @param months - 返済月数
 * @param loanDate - 借入日 (YYYY-MM-DD)
 * @param repaymentStartDate - 返済開始日 (YYYY-MM-DD)。省略時は借入日翌月。
 * @returns 月次返済スケジュール
 */
export function generateEqualPrincipalSchedule(
  principal: number,
  annualRate: number,
  months: number,
  loanDate: string,
  repaymentStartDate?: string | null,
): RepaymentEntry[] {
  const schedule: RepaymentEntry[] = [];
  const monthlyRate = annualRate / 100 / 12;
  const basePrincipalPayment = Math.round((principal / months) * 100) / 100;
  const firstYearMonth = resolveFirstRepaymentYearMonth(loanDate, repaymentStartDate);
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

    schedule.push({
      yearMonth: addMonths(firstYearMonth, i),
      principalPayment,
      interestPayment,
      remainingBalance: balance,
    });
  }

  return schedule;
}

/**
 * 一括返済のスケジュールを生成する。
 * 最終月まで毎月利息のみを支払い、最終月に元本を一括返済する。
 * @param principal - 借入元本
 * @param annualRate - 年利（%）
 * @param months - 返済月数
 * @param loanDate - 借入日 (YYYY-MM-DD)
 * @param repaymentStartDate - 返済開始日 (YYYY-MM-DD)。省略時は借入日翌月。
 * @returns 月次返済スケジュール
 */
export function generateBulletSchedule(
  principal: number,
  annualRate: number,
  months: number,
  loanDate: string,
  repaymentStartDate?: string | null,
): RepaymentEntry[] {
  const schedule: RepaymentEntry[] = [];
  const monthlyRate = annualRate / 100 / 12;
  const firstYearMonth = resolveFirstRepaymentYearMonth(loanDate, repaymentStartDate);

  for (let i = 0; i < months; i++) {
    const interestPayment = Math.round(principal * monthlyRate * 100) / 100;
    const isLastMonth = i === months - 1;
    const principalPayment = isLastMonth ? principal : 0;
    const remainingBalance = isLastMonth ? 0 : principal;

    schedule.push({
      yearMonth: addMonths(firstYearMonth, i),
      principalPayment,
      interestPayment,
      remainingBalance,
    });
  }

  return schedule;
}
