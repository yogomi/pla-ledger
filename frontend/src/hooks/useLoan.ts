import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  getLoanRepaymentSchedule,
} from '../api/loans';
import { LoanInputData } from '../types/Loan';

/**
 * 借入一覧を取得するフック。
 */
export function useLoans(projectId: string) {
  return useQuery({
    queryKey: ['loans', projectId],
    queryFn: () => getLoans(projectId),
    enabled: Boolean(projectId),
  });
}

/**
 * 借入を作成するミューテーションフック。
 * 成功後に借入一覧キャッシュを無効化する。
 */
export function useCreateLoan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LoanInputData) => createLoan(projectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loans', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['profitLoss', projectId] });
    },
  });
}

/**
 * 借入を更新するミューテーションフック。
 * 成功後に借入一覧・損益キャッシュを無効化する。
 */
export function useUpdateLoan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, data }: { loanId: string; data: Partial<LoanInputData> }) =>
      updateLoan(projectId, loanId, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['loans', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['loanSchedule', projectId, variables.loanId] });
      void queryClient.invalidateQueries({ queryKey: ['profitLoss', projectId] });
    },
  });
}

/**
 * 借入を削除するミューテーションフック。
 * 成功後に借入一覧・損益キャッシュを無効化する。
 */
export function useDeleteLoan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loanId: string) => deleteLoan(projectId, loanId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loans', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['profitLoss', projectId] });
    },
  });
}

/**
 * 返済スケジュールを取得するフック。
 */
export function useLoanRepaymentSchedule(projectId: string, loanId: string) {
  return useQuery({
    queryKey: ['loanSchedule', projectId, loanId],
    queryFn: () => getLoanRepaymentSchedule(projectId, loanId),
    enabled: Boolean(projectId) && Boolean(loanId),
  });
}
