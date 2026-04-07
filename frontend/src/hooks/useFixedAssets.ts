import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFixedAssets,
  createFixedAsset,
  updateFixedAsset,
  deleteFixedAsset,
} from '../api/fixedAssets';
import { FixedAssetInputData } from '../types/FixedAsset';

/**
 * 固定資産一覧を取得するフック。
 */
export function useFixedAssets(projectId: string) {
  return useQuery({
    queryKey: ['fixedAssets', projectId],
    queryFn: () => getFixedAssets(projectId),
    enabled: Boolean(projectId),
  });
}

/**
 * 固定資産を作成するミューテーションフック。
 * 成功後に固定資産一覧キャッシュを無効化する。
 */
export function useCreateFixedAsset(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FixedAssetInputData) => createFixedAsset(projectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fixedAssets', projectId] });
      // キャッシュフローの減価償却費に影響するため無効化
      void queryClient.invalidateQueries({ queryKey: ['cashFlow', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['cashFlowYearly', projectId] });
    },
  });
}

/**
 * 固定資産を更新するミューテーションフック。
 * 成功後に固定資産一覧・キャッシュフローキャッシュを無効化する。
 */
export function useUpdateFixedAsset(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, data }: { assetId: string; data: Partial<FixedAssetInputData> }) =>
      updateFixedAsset(projectId, assetId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fixedAssets', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['cashFlow', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['cashFlowYearly', projectId] });
    },
  });
}

/**
 * 固定資産を削除するミューテーションフック。
 * 成功後に固定資産一覧・キャッシュフローキャッシュを無効化する。
 */
export function useDeleteFixedAsset(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => deleteFixedAsset(projectId, assetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fixedAssets', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['cashFlow', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['cashFlowYearly', projectId] });
    },
  });
}
