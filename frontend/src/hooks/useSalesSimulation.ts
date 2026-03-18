import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSalesSimulationMonthly,
  updateSalesSimulationMonthly,
  getExpenseSimulationMonthly,
  getProfitLossYearly,
  updateFixedExpenses,
  updateVariableExpenses,
  createSalesCategory,
  updateSalesCategory,
  deleteSalesCategory,
  createSalesItem,
  deleteSalesItem,
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

/**
 * 売上シミュレーションカテゴリを作成するミューテーションフック。
 * 成功後に該当プロジェクト・月の売上シミュレーションキャッシュを無効化する。
 */
export function useCreateSalesCategory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryName, categoryOrder }: {
      categoryName: string;
      categoryOrder?: number;
    }) => createSalesCategory(projectId, categoryName, categoryOrder),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salesSimulation', projectId] });
    },
  });
}

/**
 * 売上シミュレーションカテゴリを削除するミューテーションフック。
 */
export function useDeleteSalesCategory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId }: { categoryId: string }) =>
      deleteSalesCategory(projectId, categoryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salesSimulation', projectId] });
    },
  });
}

/**
 * 売上シミュレーションカテゴリを更新するミューテーションフック。
 * 成功後に該当プロジェクトの売上シミュレーションキャッシュを無効化する。
 */
export function useUpdateSalesCategory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      categoryName,
      categoryOrder,
    }: {
      categoryId: string;
      categoryName?: string;
      categoryOrder?: number;
    }) => updateSalesCategory(projectId, categoryId, { categoryName, categoryOrder }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salesSimulation', projectId] });
    },
  });
}

/**
 * 売上シミュレーションアイテムを作成するミューテーションフック。
 */
export function useCreateSalesItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, itemName }: { categoryId: string; itemName: string }) =>
      createSalesItem(projectId, categoryId, itemName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salesSimulation', projectId] });
    },
  });
}

/**
 * 売上シミュレーションアイテムを削除するミューテーションフック。
 */
export function useDeleteSalesItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      deleteSalesItem(projectId, itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salesSimulation', projectId] });
    },
  });
}
