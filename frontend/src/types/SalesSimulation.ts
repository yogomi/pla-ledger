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

/** 経費シミュレーション月次データ */
export interface ExpenseSimulationData {
  yearMonth: string;
  isInherited: boolean;
  monthlySales: number;
  monthlyCost: number;
  fixedExpenses: ExpenseItem[];
  fixedTotal: number;
  variableExpenses: ExpenseItem[];
  variableTotal: number;
  totalExpense: number;
  operatingProfit: number;
}

/** 損益計算書の月次データ */
export interface MonthlyProfitLoss {
  yearMonth: string;
  monthlySales: number;
  monthlyCost: number;
  fixedTotal: number;
  variableTotal: number;
  laborTotal: number;
  totalExpense: number;
  operatingProfit: number;
  interestExpense: number;
  netProfit: number;
  profitRate: number;
  isInherited: boolean;
}

/** 損益計算書の年次データ */
export interface ProfitLossYearlyData {
  year: string;
  months: MonthlyProfitLoss[];
  yearly: {
    totalSales: number;
    totalCost: number;
    totalFixed: number;
    totalVariable: number;
    totalLabor: number;
    totalExpense: number;
    totalOperatingProfit: number;
    totalInterestExpense: number;
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
