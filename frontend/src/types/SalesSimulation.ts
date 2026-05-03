/** 売上シミュレーション関連の型定義 */

/** 売上シミュレーションの品目スナップショット（APIレスポンス用） */
export interface ItemSnapshotData {
  itemId: string;
  itemName: string;
  itemOrder: number;
  unitPrice: number;
  quantity: number;
  operatingDays: number;
  costRate: number;
  description: string | null;
  calculationType: 'daily' | 'monthly';
  monthlyQuantity: number;
  monthlySales: number;
  monthlyCost: number;
  isInherited: boolean;
}

/** 売上シミュレーションのカテゴリ */
export interface CategoryData {
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  items: ItemSnapshotData[];
}

/** 売上シミュレーション月次データ */
export interface SalesSimulationData {
  yearMonth: string;
  isInherited: boolean;
  categories: CategoryData[];
  monthlyTotal: number;
  monthlyCost: number;
}

/** 経費シミュレーションの経費項目 */
export interface ExpenseItem {
  id: string;
  categoryName: string;
  amount: number;
  description: string | null;
}

/** 人件費 type 別月次内訳 */
export interface LaborByTypeItem {
  type: string;
  amount: number;
}

/** 経費シミュレーション月次データ */
export interface ExpenseSimulationData {
  yearMonth: string;
  isInherited: boolean;
  monthlySales: number;
  monthlyCost: number;
  fixedExpenses: ExpenseItem[];
  fixedTotal: number;
  laborTotal: number;
  laborByType: LaborByTypeItem[];
  totalExpense: number;
  operatingProfit: number;
}

/** 損益計算書の月次データ */
export interface MonthlyProfitLoss {
  yearMonth: string;
  monthlySales: number;
  monthlyCost: number;
  fixedTotal: number;
  laborTotal: number;
  depreciation: number;
  totalExpense: number;
  operatingProfit: number;
  interestExpense: number;
  profitBeforeTax: number;
  netProfit: number;
  profitRate: number;
  isInherited: boolean;
  noteJa: string | null;
  noteEn: string | null;
}

/** 損益計算書の年次データ */
export interface ProfitLossYearlyData {
  year: string;
  months: MonthlyProfitLoss[];
  yearly: {
    totalSales: number;
    totalCost: number;
    totalFixed: number;
    totalLabor: number;
    totalDepreciation: number;
    totalExpense: number;
    totalOperatingProfit: number;
    totalInterestExpense: number;
    totalProfitBeforeTax: number;
    totalNetProfit: number;
    averageProfitRate: number;
  };
}

/** 売上シミュレーション品目の入力データ */
export interface ItemInputData {
  itemId: string;
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  itemName: string;
  itemOrder: number;
  unitPrice: number;
  quantity: number;
  operatingDays: number;
  costRate: number;
  description: string | null;
  calculationType: 'daily' | 'monthly';
  monthlyQuantity: number;
}

/** 経費項目の入力データ */
export interface ExpenseInputItem {
  categoryName: string;
  amount: number;
  description: string | null;
}

/** 人件費の種別 */
export type LaborCostType = 'owner_salary' | 'full_time' | 'part_time';

/** 人件費アイテム（APIレスポンス用） */
export interface LaborCostItem {
  id: string;
  type: LaborCostType;
  monthlySalary: number | null;
  employeeCount: number | null;
  bonusMonths: number | null;
  hourlyWage: number | null;
  hoursPerDay: number | null;
  daysPerMonth: number | null;
  partTimeCount: number | null;
  ownerSalary: number | null;
  monthlyTotal: number;
  displayOrder: number;
  noteJa: string | null;
  noteEn: string | null;
}

/** 月次人件費データ */
export interface LaborCostMonthlyData {
  yearMonth: string;
  isInherited: boolean;
  socialInsuranceRate: number;
  laborCosts: LaborCostItem[];
  monthlyTotal: number;
}

/** 人件費入力アイテム（オーナー給与） */
export interface LaborCostInputOwnerSalary {
  type: 'owner_salary';
  ownerSalary: number;
  displayOrder?: number;
  noteJa?: string | null;
  noteEn?: string | null;
}

/** 人件費入力アイテム（正社員） */
export interface LaborCostInputFullTime {
  type: 'full_time';
  monthlySalary: number;
  employeeCount: number;
  bonusMonths?: number;
  displayOrder?: number;
  noteJa?: string | null;
  noteEn?: string | null;
}

/** 人件費入力アイテム（パート） */
export interface LaborCostInputPartTime {
  type: 'part_time';
  hourlyWage: number;
  hoursPerDay: number;
  daysPerMonth: number;
  partTimeCount: number;
  displayOrder?: number;
  noteJa?: string | null;
  noteEn?: string | null;
}

/** 人件費入力アイテム（ユニオン型） */
export type LaborCostInput =
  | LaborCostInputOwnerSalary
  | LaborCostInputFullTime
  | LaborCostInputPartTime;

/** 売上年次カテゴリーの月次データ */
export interface SalesCategoryMonthly {
  yearMonth: string;
  monthlySales: number;
  monthlyCost: number;
}

/** 売上年次カテゴリーデータ */
export interface SalesCategoryYearly {
  categoryId: string;
  categoryName: string;
  months: SalesCategoryMonthly[];
  yearlyTotal: number;
  yearlyCost: number;
}

/** 売上年次月次合計 */
export interface SalesMonthlyTotal {
  yearMonth: string;
  totalSales: number;
  totalCost: number;
  noteJa: string | null;
  noteEn: string | null;
}

/** 売上年次データ（APIレスポンス用） */
export interface SalesYearlyData {
  year: string;
  categories: SalesCategoryYearly[];
  monthlyTotals: SalesMonthlyTotal[];
  yearlyTotal: number;
  yearlyCost: number;
}

/** 経費年次カテゴリーの月次データ */
export interface ExpenseCategoryMonthly {
  yearMonth: string;
  amount: number;
}

/** 経費年次カテゴリーデータ */
export interface ExpenseCategoryYearly {
  categoryName: string;
  months: ExpenseCategoryMonthly[];
  yearlyTotal: number;
}

/** 経費年次月次合計 */
export interface ExpenseMonthlyTotal {
  yearMonth: string;
  fixedTotal: number;
  laborTotal: number;
  totalExpense: number;
}

/** 品目別年次の月次データ */
export interface SalesItemMonthly {
  yearMonth: string;
  monthlySales: number;
  monthlyCost: number;
}

/** 品目別年次データ */
export interface SalesItemYearly {
  itemId: string;
  itemName: string;
  months: SalesItemMonthly[];
  yearlyTotal: number;
  yearlyCost: number;
}

/** 品目別年次カテゴリデータ */
export interface SalesCategoryItemsYearly {
  categoryId: string;
  categoryName: string;
  items: SalesItemYearly[];
  categoryYearlyTotal: number;
}

/** 品目別年次データ（APIレスポンス用） */
export interface SalesYearlyItemsData {
  year: string;
  categories: SalesCategoryItemsYearly[];
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

/** 事業年度ごとの税計算結果 */
export interface FiscalYearTaxData {
  label: string;
  start: string;
  end: string;
  paymentMonth: string;
  taxableIncome: number;
  breakdown: CorporateTaxBreakdown;
}

/** 事業年度別税計算サマリーAPIレスポンス */
export interface FiscalYearSummaryData {
  enabled: boolean;
  fiscalYears: FiscalYearTaxData[];
}

/** 法人税率設定 */
export interface TaxRates {
  corporateTaxLow: number;
  corporateTaxHigh: number;
  localCorporateTax: number;
  prefecturalTaxRate: number;
  municipalTaxRate: number;
  businessTaxLow: number;
  businessTaxMid: number;
  businessTaxHigh: number;
  specialBusinessTax: number;
  annualFlatTax: number;
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

/** 経費年次データ（APIレスポンス用） */
export interface ExpenseYearlyData {
  year: string;
  fixedByCategory: ExpenseCategoryYearly[];
  laborMonths: ExpenseCategoryMonthly[];
  laborByType: ExpenseCategoryYearly[];
  monthlyTotals: ExpenseMonthlyTotal[];
  yearlyTotals: {
    totalFixed: number;
    totalLabor: number;
    totalExpense: number;
  };
}
