/** 借入情報 */
export interface Loan {
  id: string;
  projectId: string;
  lenderName: string;
  principalAmount: number;
  interestRate: number;
  loanDate: string;
  repaymentStartDate: string | null;
  repaymentMonths: number;
  repaymentMethod: 'equal_payment' | 'equal_principal' | 'bullet';
  remainingBalance: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 返済スケジュール項目 */
export interface LoanRepayment {
  yearMonth: string;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
}

/** 借入作成・更新用の入力データ */
export interface LoanInputData {
  lenderName: string;
  principalAmount: number;
  interestRate: number;
  loanDate: string;
  repaymentStartDate: string | null;
  repaymentMonths: number;
  repaymentMethod: 'equal_payment' | 'equal_principal' | 'bullet';
  description: string | null;
}
