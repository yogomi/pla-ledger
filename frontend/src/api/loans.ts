import api from '../utils/api';
import { Loan, LoanRepayment, LoanInputData } from '../types/Loan';

/**
 * 借入一覧を取得する。
 * @param projectId プロジェクトID
 */
export async function getLoans(projectId: string): Promise<{ loans: Loan[] }> {
  const res = await api.get(`/projects/${projectId}/loans`);
  return res.data.data as { loans: Loan[] };
}

/**
 * 借入を作成する。
 * @param projectId プロジェクトID
 * @param data 借入入力データ
 */
export async function createLoan(
  projectId: string,
  data: LoanInputData,
): Promise<{ loan: Loan; repaymentSchedule: LoanRepayment[] }> {
  const res = await api.post(`/projects/${projectId}/loans`, data);
  return res.data.data as { loan: Loan; repaymentSchedule: LoanRepayment[] };
}

/**
 * 借入を更新する。
 * @param projectId プロジェクトID
 * @param loanId 借入ID
 * @param data 更新データ（部分更新）
 */
export async function updateLoan(
  projectId: string,
  loanId: string,
  data: Partial<LoanInputData>,
): Promise<{ loan: Loan }> {
  const res = await api.put(`/projects/${projectId}/loans/${loanId}`, data);
  return res.data.data as { loan: Loan };
}

/**
 * 借入を削除する。
 * @param projectId プロジェクトID
 * @param loanId 借入ID
 */
export async function deleteLoan(projectId: string, loanId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/loans/${loanId}`);
}

/**
 * 返済スケジュールを取得する。
 * @param projectId プロジェクトID
 * @param loanId 借入ID
 */
export async function getLoanRepaymentSchedule(
  projectId: string,
  loanId: string,
): Promise<{
  loanId: string;
  lenderName: string;
  principalAmount: number;
  schedule: LoanRepayment[];
}> {
  const res = await api.get(`/projects/${projectId}/loans/${loanId}/schedule`);
  return res.data.data as {
    loanId: string;
    lenderName: string;
    principalAmount: number;
    schedule: LoanRepayment[];
  };
}
