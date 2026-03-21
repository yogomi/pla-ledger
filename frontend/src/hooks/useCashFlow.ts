import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCashFlowMonthly,
  updateCashFlowMonthly,
  getCashFlowYearly,
} from '../api/cashFlow';
import { CashFlowInputData } from '../types/CashFlow';

/**
 * 指定月のキャッシュフローデータを取得するフック。
 */
export function useCashFlowMonthly(projectId: string, yearMonth: string) {
  return useQuery({
    queryKey: ['cashFlow', projectId, yearMonth],
    queryFn: () => getCashFlowMonthly(projectId, yearMonth),
    enabled: Boolean(projectId) && Boolean(yearMonth),
  });
}

/**
 * 指定年のキャッシュフローデータを取得するフック。
 */
export function useCashFlowYearly(projectId: string, year: string) {
  return useQuery({
    queryKey: ['cashFlowYearly', projectId, year],
    queryFn: () => getCashFlowYearly(projectId, year),
    enabled: Boolean(projectId) && Boolean(year),
  });
}

/**
 * キャッシュフローを更新するミューテーションフック。
 * 保存後に該当月のキャッシュを無効化する。
 */
export function useUpdateCashFlow(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yearMonth, data }: { yearMonth: string; data: CashFlowInputData }) =>
      updateCashFlowMonthly(projectId, yearMonth, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['cashFlow', projectId, variables.yearMonth],
      });
      void queryClient.invalidateQueries({
        queryKey: ['cashFlowYearly', projectId],
      });
    },
  });
}
