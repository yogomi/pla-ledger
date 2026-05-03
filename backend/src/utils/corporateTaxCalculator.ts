/** 法人税計算ユーティリティ */

/** 税率設定 */
export interface TaxRates {
  corporateTaxLow: number;      // 法人税率（800万以下）%
  corporateTaxHigh: number;     // 法人税率（800万超）%
  localCorporateTax: number;    // 地方法人税率（法人税額に対して）%
  prefecturalTaxRate: number;   // 都道府県民税法人税割（法人税額に対して）%
  municipalTaxRate: number;     // 市区町村民税法人税割（法人税額に対して）%
  businessTaxLow: number;       // 事業税率（400万以下）%
  businessTaxMid: number;       // 事業税率（400万〜800万）%
  businessTaxHigh: number;      // 事業税率（800万超）%
  specialBusinessTax: number;   // 特別法人事業税（事業税額に対して）%
  annualFlatTax: number;        // 均等割（年額・円）
}

export const DEFAULT_TAX_RATES: TaxRates = {
  corporateTaxLow: 15.0,
  corporateTaxHigh: 23.2,
  localCorporateTax: 4.4,
  prefecturalTaxRate: 1.0,
  municipalTaxRate: 8.4,
  businessTaxLow: 3.5,
  businessTaxMid: 5.3,
  businessTaxHigh: 6.7,
  specialBusinessTax: 37.0,
  annualFlatTax: 50000,
};

/** 事業年度の区間 */
export interface FiscalPeriod {
  label: string;         // 表示用ラベル（例: 第1期）
  start: string;         // YYYY-MM
  end: string;           // YYYY-MM
  paymentMonth: string;  // 納税月（決算月+2ヶ月）YYYY-MM
}

/** 法人税等の内訳 */
export interface CorporateTaxBreakdown {
  corporateTax: number;
  localCorporateTax: number;
  prefecturalTax: number;
  municipalTax: number;
  businessTax: number;
  specialBusinessTax: number;
  flatTax: number;
  totalTax: number;
}

/**
 * YYYY-MM 形式の年月に指定月数を加算して返す。
 */
function addMonths(yearMonth: string, months: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const total = (y * 12 + m - 1) + months;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

/**
 * 開業月と決算月から第1期の終了月（YYYY-MM）を求める。
 * 開業月と同年に決算月がある場合はその月、なければ翌年の決算月。
 */
function firstFiscalEnd(openingYearMonth: string, fiscalEndMonth: number): string {
  const [openYear, openMonth] = openingYearMonth.split('-').map(Number);
  const endMonth = String(fiscalEndMonth).padStart(2, '0');

  if (openMonth <= fiscalEndMonth) {
    return `${openYear}-${endMonth}`;
  }
  return `${openYear + 1}-${endMonth}`;
}

/**
 * 開業月・決算月から事業年度リストを生成する。
 * periodsCount 分の事業年度を返す。
 */
export function buildFiscalPeriods(
  openingYearMonth: string,
  fiscalEndMonth: number,
  periodsCount: number,
): FiscalPeriod[] {
  const periods: FiscalPeriod[] = [];
  let start = openingYearMonth;
  let end = firstFiscalEnd(openingYearMonth, fiscalEndMonth);
  const endMonthStr = String(fiscalEndMonth).padStart(2, '0');

  for (let i = 1; i <= periodsCount; i++) {
    const paymentMonth = addMonths(end, 2);
    periods.push({
      label: `第${i}期`,
      start,
      end,
      paymentMonth,
    });
    start = addMonths(end, 1);
    const [nextEndYear] = start.split('-').map(Number);
    end = `${nextEndYear}-${endMonthStr}`;
    // 開始月が決算月より後なら翌年になる
    const [, startMonth] = start.split('-').map(Number);
    if (startMonth > fiscalEndMonth) {
      end = `${nextEndYear + 1}-${endMonthStr}`;
    }
  }
  return periods;
}

/**
 * 課税所得から法人税等の内訳を計算する。
 * 課税所得がゼロ以下でも均等割は発生する。
 */
export function calcCorporateTax(
  taxableIncome: number,
  rates: TaxRates,
): CorporateTaxBreakdown {
  const income = Math.max(taxableIncome, 0);

  // 法人税（段階税率）
  let corporateTax = 0;
  if (income > 8_000_000) {
    corporateTax = 8_000_000 * (rates.corporateTaxLow / 100)
      + (income - 8_000_000) * (rates.corporateTaxHigh / 100);
  } else {
    corporateTax = income * (rates.corporateTaxLow / 100);
  }

  // 地方法人税・民税法人税割（法人税額に対して）
  const localCorporateTax = corporateTax * (rates.localCorporateTax / 100);
  const prefecturalTax = corporateTax * (rates.prefecturalTaxRate / 100);
  const municipalTax = corporateTax * (rates.municipalTaxRate / 100);

  // 事業税（段階税率）
  let businessTax = 0;
  if (income > 8_000_000) {
    businessTax = 4_000_000 * (rates.businessTaxLow / 100)
      + 4_000_000 * (rates.businessTaxMid / 100)
      + (income - 8_000_000) * (rates.businessTaxHigh / 100);
  } else if (income > 4_000_000) {
    businessTax = 4_000_000 * (rates.businessTaxLow / 100)
      + (income - 4_000_000) * (rates.businessTaxMid / 100);
  } else {
    businessTax = income * (rates.businessTaxLow / 100);
  }

  const specialBusinessTax = businessTax * (rates.specialBusinessTax / 100);

  const totalTax = Math.round(
    corporateTax + localCorporateTax + prefecturalTax + municipalTax
    + businessTax + specialBusinessTax + rates.annualFlatTax,
  );

  return {
    corporateTax: Math.round(corporateTax),
    localCorporateTax: Math.round(localCorporateTax),
    prefecturalTax: Math.round(prefecturalTax),
    municipalTax: Math.round(municipalTax),
    businessTax: Math.round(businessTax),
    specialBusinessTax: Math.round(specialBusinessTax),
    flatTax: rates.annualFlatTax,
    totalTax,
  };
}

/**
 * DB に保存された tax_rates（JSON）を TaxRates に変換する。
 * 不足フィールドはデフォルト値で補う。
 */
export function parseTaxRates(raw: unknown): TaxRates {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TAX_RATES };
  const r = raw as Record<string, unknown>;
  return {
    corporateTaxLow: typeof r['corporateTaxLow'] === 'number' ? r['corporateTaxLow'] : DEFAULT_TAX_RATES.corporateTaxLow,
    corporateTaxHigh: typeof r['corporateTaxHigh'] === 'number' ? r['corporateTaxHigh'] : DEFAULT_TAX_RATES.corporateTaxHigh,
    localCorporateTax: typeof r['localCorporateTax'] === 'number' ? r['localCorporateTax'] : DEFAULT_TAX_RATES.localCorporateTax,
    prefecturalTaxRate: typeof r['prefecturalTaxRate'] === 'number' ? r['prefecturalTaxRate'] : DEFAULT_TAX_RATES.prefecturalTaxRate,
    municipalTaxRate: typeof r['municipalTaxRate'] === 'number' ? r['municipalTaxRate'] : DEFAULT_TAX_RATES.municipalTaxRate,
    businessTaxLow: typeof r['businessTaxLow'] === 'number' ? r['businessTaxLow'] : DEFAULT_TAX_RATES.businessTaxLow,
    businessTaxMid: typeof r['businessTaxMid'] === 'number' ? r['businessTaxMid'] : DEFAULT_TAX_RATES.businessTaxMid,
    businessTaxHigh: typeof r['businessTaxHigh'] === 'number' ? r['businessTaxHigh'] : DEFAULT_TAX_RATES.businessTaxHigh,
    specialBusinessTax: typeof r['specialBusinessTax'] === 'number' ? r['specialBusinessTax'] : DEFAULT_TAX_RATES.specialBusinessTax,
    annualFlatTax: typeof r['annualFlatTax'] === 'number' ? r['annualFlatTax'] : DEFAULT_TAX_RATES.annualFlatTax,
  };
}
