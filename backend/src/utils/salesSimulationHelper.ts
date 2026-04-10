import { SalesSimulationSnapshot } from '../models';

/**
 * 商品行の売上・原価を計算する
 * @param item - 単価・数量・稼働日数・原価率・計算方式・月間販売個数を持つオブジェクト
 * @returns 売上合計と原価合計
 */
export function calculateItemMetrics(item: {
  unitPrice: number;
  quantity: number;
  operatingDays: number;
  costRate: number;
  calculationType: 'daily' | 'monthly';
  monthlyQuantity: number;
}): { sales: number; cost: number } {
  let sales: number;
  if (item.calculationType === 'monthly') {
    sales = item.unitPrice * item.monthlyQuantity;
  } else {
    sales = item.unitPrice * item.quantity * item.operatingDays;
  }
  const cost = sales * (item.costRate / 100);
  return { sales, cost };
}

/**
 * スナップショットの items 配列から月間合計売上・原価を計算する
 * @param items - スナップショット内のアイテム配列
 * @returns 月間合計売上と月間合計原価
 */
export function calculateSnapshotTotals(
  items: Array<{
    unitPrice: number;
    quantity: number;
    operatingDays: number;
    costRate: number;
    calculationType: 'daily' | 'monthly';
    monthlyQuantity: number;
  }>,
): { monthlyTotal: number; monthlyCost: number } {
  let monthlyTotal = 0;
  let monthlyCost = 0;
  for (const item of items) {
    const { sales, cost } = calculateItemMetrics(item);
    monthlyTotal += sales;
    monthlyCost += cost;
  }
  return { monthlyTotal, monthlyCost };
}

/**
 * 指定プロジェクト・指定月より前の直近スナップショットを取得する
 * @param projectId - プロジェクトID
 * @param yearMonth - 基準となる年月 (YYYY-MM)
 * @returns 直近の過去スナップショット、存在しない場合は null
 */
export async function getPreviousSnapshot(
  projectId: string,
  yearMonth: string,
): Promise<SalesSimulationSnapshot | null> {
  const snapshots = await SalesSimulationSnapshot.findAll({
    where: { project_id: projectId },
    order: [['year_month', 'DESC']],
  });
  for (const snap of snapshots) {
    if (snap.year_month < yearMonth) {
      return snap;
    }
  }
  return null;
}

/**
 * YYYY-MM 形式の年月に指定月数を加減算する
 * @param yearMonth - 基準年月 (YYYY-MM)
 * @param months - 加算する月数（負の値で減算）
 * @returns 計算後の年月 (YYYY-MM)
 */
export function addMonths(yearMonth: string, months: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + months, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
