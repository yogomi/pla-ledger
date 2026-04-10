import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStartupCosts, updateStartupCosts, StartupCostInput } from '../api/startupCosts';

/**
 * スタートアップコスト一覧を取得するフック。
 * @param projectId プロジェクトID
 */
export function useStartupCosts(projectId: string) {
  return useQuery({
    queryKey: ['startupCosts', projectId],
    queryFn: () => getStartupCosts(projectId),
    enabled: Boolean(projectId),
  });
}

/**
 * スタートアップコストを一括更新するミューテーションフック。
 * 保存後にキャッシュを無効化する。
 * @param projectId プロジェクトID
 */
export function useUpdateStartupCosts(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: StartupCostInput[]) => updateStartupCosts(projectId, items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['startupCosts', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['cashFlow', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['cashFlowYearly', projectId] });
    },
  });
}
