import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSalesSimulationMonthly,
  updateSalesSimulationMonthly,
  getExpenseSimulationMonthly,
  getProfitLossYearly,
  updateFixedExpenses,
  updateVariableExpenses,
} from '../api/salesSimulations';
import { ItemInputData, ExpenseInputItem } from '../types/SalesSimulation';

/**
 * 指定月の売上シミュレーションデータを取得するフック。
 */
export function useSalesSimulationMonthly(projectId: string, yearMonth: string) {
  return useQuery({
    queryKey: ['salesSimulation', projectId, yearMonth],
    queryFn: () => getSalesSimulationMonthly(projectId, yearMonth),
    enabled: Boolean(projectId) && Boolean(yearMonth),
  });
}

/**
 * 指定月の経費シミュレーションデータを取得するフック。
 */
export function useExpenseSimulationMonthly(projectId: string, yearMonth: string) {
  return useQuery({
    queryKey: ['expenseSimulation', projectId, yearMonth],
    queryFn: () => getExpenseSimulationMonthly(projectId, yearMonth),
    enabled: Boolean(projectId) && Boolean(yearMonth),
  });
}

/**
 * 指定年の損益計算書データを取得するフック。
 */
export function useProfitLossYearly(projectId: string, year: string) {
  return useQuery({
    queryKey: ['profitLoss', projectId, year],
    queryFn: () => getProfitLossYearly(projectId, year),
    enabled: Boolean(projectId) && Boolean(year),
  });
}

/**
 * 売上シミュレーションを更新するミューテーションフック。
 * 保存後に該当月のキャッシュを無効化する。
 */
export function useUpdateSalesSimulation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yearMonth, items }: { yearMonth: string; items: ItemInputData[] }) =>
      updateSalesSimulationMonthly(projectId, yearMonth, items),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['salesSimulation', projectId, variables.yearMonth],
      });
    },
  });
}

/**
 * 固定費を更新するミューテーションフック。
 * 保存後に該当月の経費キャッシュを無効化する。
 */
export function useUpdateFixedExpenses(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yearMonth, expenses }: { yearMonth: string; expenses: ExpenseInputItem[] }) =>
      updateFixedExpenses(projectId, yearMonth, expenses),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['expenseSimulation', projectId, variables.yearMonth],
      });
    },
  });
}

/**
 * 変動費を更新するミューテーションフック。
 * 保存後に該当月の経費キャッシュを無効化する。
 */
export function useUpdateVariableExpenses(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yearMonth, expenses }: { yearMonth: string; expenses: ExpenseInputItem[] }) =>
      updateVariableExpenses(projectId, yearMonth, expenses),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['expenseSimulation', projectId, variables.yearMonth],
      });
    },
  });
}
