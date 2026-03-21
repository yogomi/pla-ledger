import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLaborCostMonthly, updateLaborCosts, deleteLaborCosts } from '../api/salesSimulations';
import { LaborCostInput } from '../types/SalesSimulation';

/**
 * 指定月の人件費データを取得するフック。
 */
export function useLaborCostMonthly(projectId: string, yearMonth: string) {
  return useQuery({
    queryKey: ['laborCost', projectId, yearMonth],
    queryFn: () => getLaborCostMonthly(projectId, yearMonth),
    enabled: Boolean(projectId) && Boolean(yearMonth),
  });
}

/**
 * 人件費を更新するミューテーションフック。
 * 保存後に該当月の人件費キャッシュを無効化する。
 */
export function useUpdateLaborCosts(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      yearMonth,
      laborCosts,
    }: {
      yearMonth: string;
      laborCosts: LaborCostInput[];
    }) => updateLaborCosts(projectId, yearMonth, laborCosts),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['laborCost', projectId, variables.yearMonth],
      });
    },
  });
}

/**
 * 人件費月次データを削除するミューテーションフック。
 * 削除後に該当月の人件費キャッシュを無効化する。
 */
export function useDeleteLaborCosts(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yearMonth }: { yearMonth: string }) =>
      deleteLaborCosts(projectId, yearMonth),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['laborCost', projectId, variables.yearMonth],
      });
    },
  });
}
