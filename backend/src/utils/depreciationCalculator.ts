import { FixedAsset, FixedAssetDepreciationSchedule } from '../models';

/** 月次償却スケジュールの1エントリ */
export interface DepreciationEntry {
  yearMonth: string;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

/**
 * 資産1件の月次償却スケジュール全体を生成する。
 * @param asset - 固定資産データ
 * @returns 償却開始月から償却終了月までの月次スケジュール
 */
export function calculateDepreciationSchedule(
  asset: {
    purchase_amount: number;
    salvage_value: number;
    useful_life: number;
    depreciation_method: 'straight_line' | 'diminishing';
    start_depreciation_date: string;
  },
): DepreciationEntry[] {
  const totalMonths = asset.useful_life * 12;
  const salvage = Number(asset.salvage_value) ?? 0;
  const purchaseAmount = Number(asset.purchase_amount);
  const depreciableAmount = purchaseAmount - salvage;

  // start_depreciation_date は YYYY-MM または YYYY-MM-DD 形式を受け付ける
  const startYearMonth = asset.start_depreciation_date.substring(0, 7);
  const [startYear, startMonth] = startYearMonth.split('-').map(Number);

  let bookValue = purchaseAmount;
  let accumulatedDepreciation = 0;
  const entries: DepreciationEntry[] = [];

  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(startYear, startMonth - 1 + i, 1);
    const yearMonth =
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    let monthlyDepreciation: number;

    if (asset.depreciation_method === 'straight_line') {
      // 定額法: 償却可能額を月数で均等割り
      if (i < totalMonths - 1) {
        monthlyDepreciation = Math.floor(depreciableAmount / totalMonths * 100) / 100;
      } else {
        // 最終月: 残りの償却可能額をすべて計上（端数調整）
        monthlyDepreciation = Math.max(0, bookValue - salvage);
      }
    } else {
      // 定率法（ダブル・ディクライニング・バランス法）
      // 年間償却率 = 2 / 耐用年数
      const annualRate = 2 / asset.useful_life;
      const monthlyRate = annualRate / 12;
      monthlyDepreciation = Math.floor(bookValue * monthlyRate * 100) / 100;

      // 定額法に切り替えるべきか判定（残存月数での定額計算値の方が大きい場合）
      const remainingMonths = totalMonths - i;
      const straightLineEquivalent =
        Math.floor((bookValue - salvage) / remainingMonths * 100) / 100;
      if (straightLineEquivalent > monthlyDepreciation) {
        monthlyDepreciation = straightLineEquivalent;
        // 最終月は残額全て計上
        if (remainingMonths === 1) {
          monthlyDepreciation = Math.max(0, bookValue - salvage);
        }
      }
    }

    // 帳簿価額が残存価額を下回らないように制限
    monthlyDepreciation = Math.min(monthlyDepreciation, Math.max(0, bookValue - salvage));

    accumulatedDepreciation = Math.round((accumulatedDepreciation + monthlyDepreciation) * 100) / 100;
    bookValue = Math.round((bookValue - monthlyDepreciation) * 100) / 100;

    entries.push({
      yearMonth,
      monthlyDepreciation,
      accumulatedDepreciation,
      bookValue,
    });
  }

  return entries;
}

/**
 * 指定年月の終了償却日・月次償却費を計算する。
 * @param purchaseAmount - 取得価額
 * @param salvageValue - 残存価額
 * @param usefulLife - 耐用年数（年）
 * @param depreciationMethod - 償却方法
 * @param startDepreciationDate - 償却開始日
 * @returns 償却終了日と月次償却費（初月）
 */
export function calculateAssetInfo(
  purchaseAmount: number,
  salvageValue: number,
  usefulLife: number,
  depreciationMethod: 'straight_line' | 'diminishing',
  startDepreciationDate: string,
): { endDepreciationDate: string; monthlyDepreciation: number } {
  const startYearMonth = startDepreciationDate.substring(0, 7);
  const [startYear, startMonth] = startYearMonth.split('-').map(Number);
  const totalMonths = usefulLife * 12;

  // 償却終了月 = 開始月 + 総月数 - 1
  const endDate = new Date(startYear, startMonth - 1 + totalMonths - 1, 1);
  const endDepreciationDate =
    `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

  // 初月の月次償却費を計算
  const schedule = calculateDepreciationSchedule({
    purchase_amount: purchaseAmount,
    salvage_value: salvageValue,
    useful_life: usefulLife,
    depreciation_method: depreciationMethod,
    start_depreciation_date: startDepreciationDate,
  });

  const monthlyDepreciation = schedule.length > 0 ? schedule[0].monthlyDepreciation : 0;

  return { endDepreciationDate, monthlyDepreciation };
}

/**
 * 指定プロジェクト・年月の全固定資産の月次減価償却費合計を計算する。
 * 各資産の `FixedAssetDepreciationSchedule` レコードを参照して合計する。
 * @param projectId - プロジェクトID
 * @param yearMonth - 対象年月 (YYYY-MM)
 * @returns 月次減価償却費合計
 */
export async function calculateMonthlyDepreciation(
  projectId: string,
  yearMonth: string,
): Promise<number> {
  // プロジェクト内の全固定資産を取得
  const assets = await FixedAsset.findAll({
    where: { project_id: projectId },
    attributes: ['id'],
  });

  if (assets.length === 0) {
    return 0;
  }

  const assetIds = assets.map(a => a.id);

  // 指定年月の償却スケジュールを一括取得
  const schedules = await FixedAssetDepreciationSchedule.findAll({
    where: {
      fixed_asset_id: assetIds,
      year_month: yearMonth,
    },
    attributes: ['monthly_depreciation'],
  });

  return schedules.reduce((sum, s) => sum + Number(s.monthly_depreciation), 0);
}
