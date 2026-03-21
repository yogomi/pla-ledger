/** キャッシュフロー営業活動セクション */
export interface OperatingActivities {
  profitBeforeTax: number;
  depreciation: number;
  interestExpense: number;
  accountsReceivableChange: number;
  inventoryChange: number;
  accountsPayableChange: number;
  otherOperating: number;
  subtotal: number;
}

/** キャッシュフロー投資活動セクション */
export interface InvestingActivities {
  capexAcquisition: number;
  assetSale: number;
  intangibleAcquisition: number;
  otherInvesting: number;
  subtotal: number;
}

/** キャッシュフロー財務活動セクション */
export interface FinancingActivities {
  borrowingProceeds: number;
  loanRepayment: number;
  capitalIncrease: number;
  dividendPayment: number;
  otherFinancing: number;
  subtotal: number;
}

/** キャッシュフロー概要 */
export interface CashFlowSummary {
  netCashChange: number;
  cashBeginning: number;
  cashEnding: number;
}

/** 月次キャッシュフローデータ */
export interface CashFlowMonthlyData {
  yearMonth: string;
  isInherited: boolean;
  operating: OperatingActivities;
  investing: InvestingActivities;
  financing: FinancingActivities;
  summary: CashFlowSummary;
  notes: {
    ja: string | null;
    en: string | null;
  };
}

/** 年次キャッシュフローデータ */
export interface CashFlowYearlyData {
  year: string;
  months: Array<{
    yearMonth: string;
    operatingCF: number;
    investingCF: number;
    financingCF: number;
    netCashChange: number;
    cashEnding: number;
  }>;
  yearly: {
    totalOperatingCF: number;
    totalInvestingCF: number;
    totalFinancingCF: number;
    netCashChange: number;
    cashBeginning: number;
    cashEnding: number;
  };
}

/** キャッシュフロー更新用入力データ */
export interface CashFlowInputData {
  depreciation: number;
  accountsReceivableChange: number;
  inventoryChange: number;
  accountsPayableChange: number;
  otherOperating: number;
  capexAcquisition: number;
  assetSale: number;
  intangibleAcquisition: number;
  otherInvesting: number;
  capitalIncrease: number;
  dividendPayment: number;
  otherFinancing: number;
  cashBeginning?: number;
  noteJa?: string;
  noteEn?: string;
}
