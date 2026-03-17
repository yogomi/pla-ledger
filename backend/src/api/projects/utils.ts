import { Permission } from '../../models';

/**
 * プロジェクトに対するユーザーのロールを取得するユーティリティ関数
 * @param projectId - プロジェクトID
 * @param userId - ユーザーID（未認証の場合はundefined）
 * @returns ロール文字列、または権限なしの場合はnull
 */
export async function getProjectRole(
  projectId: string,
  userId: string | undefined,
): Promise<string | null> {
  if (!userId) return null;
  const perm = await Permission.findOne({ where: { project_id: projectId, user_id: userId } });
  return perm ? perm.role : null;
}
