import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSalesSimulationMonthly,
  updateSalesSimulationMonthly,
  getExpenseSimulationMonthly,
  getProfitLossYearly,
  getSalesSimulationYearly,
  getExpenseSimulationYearly,
  updateFixedExpenses,
  deleteSalesSimulationMonthly,
  deleteFixedExpenses,
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
 * 指定年の売上シミュレーションデータをカテゴリ別に取得するフック。
 */
export function useSalesSimulationYearly(projectId: string, year: string) {
  return useQuery({
    queryKey: ['salesSimulationYearly', projectId, year],
    queryFn: () => getSalesSimulationYearly(projectId, year),
    enabled: Boolean(projectId) && Boolean(year),
  });
}

/**
 * 指定年の経費シミュレーションデータをカテゴリ別に取得するフック。
 */
export function useExpenseSimulationYearly(projectId: string, year: string) {
  return useQuery({
    queryKey: ['expenseSimulationYearly', projectId, year],
    queryFn: () => getExpenseSimulationYearly(projectId, year),
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salesSimulation', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['salesSimulationYearly', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['profitLoss', projectId] });
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenseSimulation', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['expenseSimulationYearly', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['profitLoss', projectId] });
    },
  });
}

/**
 * 売上シミュレーション月次データを削除するミューテーションフック。
 * 削除後に該当月のキャッシュを無効化する。
 */
export function useDeleteSalesSimulationMonthly(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yearMonth }: { yearMonth: string }) =>
      deleteSalesSimulationMonthly(projectId, yearMonth),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salesSimulation', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['salesSimulationYearly', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['profitLoss', projectId] });
    },
  });
}

/**
 * 固定費月次データを削除するミューテーションフック。
 * 削除後に該当月の経費キャッシュを無効化する。
 */
export function useDeleteFixedExpenses(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yearMonth }: { yearMonth: string }) =>
      deleteFixedExpenses(projectId, yearMonth),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenseSimulation', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['expenseSimulationYearly', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['profitLoss', projectId] });
    },
  });
}
