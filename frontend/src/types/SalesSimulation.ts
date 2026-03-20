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
