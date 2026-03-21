import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { z } from 'zod';
import { Project, CashFlowMonthly } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearSchema } from '../../schemas/salesSimulation';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
  year: YearSchema,
});

/**
 * @api {GET} /api/projects/:projectId/cash-flow/yearly/:year 年次キャッシュフロー取得
 * @description
 *   - 指定年の12ヶ月分のキャッシュフローデータを取得
 *   - 年間合計を計算して返却
 *
 * @request
 *   - params: projectId (UUID), year (YYYY形式)
 *   - 認証必須
 *
 * @response
 *   - 成功時: { success: true, code: '', message: 'Yearly cash flow data retrieved',
 *               data: { year, months, yearly } }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Yearly cash flow data retrieved",
 *     "data": {
 *       "year": "2026",
 *       "months": [
 *         { "yearMonth": "2026-01", "operatingCF": 800000, "investingCF": -200000,
 *           "financingCF": 500000, "netCashChange": 1100000, "cashEnding": 1100000 },
 *         ...
 *       ],
 *       "yearly": {
 *         "totalOperatingCF": 12000000,
 *         "totalInvestingCF": -3000000,
 *         "totalFinancingCF": 5000000,
 *         "netCashChange": 14000000,
 *         "cashBeginning": 500000,
 *         "cashEnding": 14500000
 *       }
 *     }
 *   }
 *
 * @author yogomi
 * @date 2026-03-21
 */
const router = Router({ mergeParams: true });

router.get('/yearly/:year', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = ParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }
  const { projectId, year } = parsed.data;

  const project = await Project.findByPk(projectId);
  if (!project) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'Project not found',
      data: null,
    });
    return;
  }

  const role = await getProjectRole(projectId, req.user!.id);
  if (!role) {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'View permission required',
      data: null,
    });
    return;
  }

  // 指定年の全月データを一括取得
  const records = await CashFlowMonthly.findAll({
    where: {
      project_id: projectId,
      year_month: { [Op.like]: `${year}-%` },
    },
    order: [['year_month', 'ASC']],
  });

  // year_month をキーにマップ化
  const recordMap = new Map(records.map(r => [r.year_month, r]));

  // 12ヶ月分のデータを生成（存在しない月は0として扱う）
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const yearMonth = `${year}-${String(m).padStart(2, '0')}`;
    const r = recordMap.get(yearMonth);
    months.push({
      yearMonth,
      operatingCF: r ? Number(r.operating_cf_subtotal) : 0,
      investingCF: r ? Number(r.investing_cf_subtotal) : 0,
      financingCF: r ? Number(r.financing_cf_subtotal) : 0,
      netCashChange: r ? Number(r.net_cash_change) : 0,
      cashEnding: r ? Number(r.cash_ending) : 0,
    });
  }

  // 年間合計
  const totalOperatingCF = months.reduce((sum, m) => sum + m.operatingCF, 0);
  const totalInvestingCF = months.reduce((sum, m) => sum + m.investingCF, 0);
  const totalFinancingCF = months.reduce((sum, m) => sum + m.financingCF, 0);
  const netCashChange = months.reduce((sum, m) => sum + m.netCashChange, 0);

  // 期首残高：1月レコードのcash_beginning（なければ0）
  const jan = recordMap.get(`${year}-01`);
  const cashBeginning = jan ? Number(jan.cash_beginning) : 0;
  // 期末残高：最後に記録がある月のcash_ending（なければ期首+累積増減）
  let cashEnding = cashBeginning + netCashChange;
  for (let m = 12; m >= 1; m--) {
    const ym = `${year}-${String(m).padStart(2, '0')}`;
    const r = recordMap.get(ym);
    if (r) {
      cashEnding = Number(r.cash_ending);
      break;
    }
  }

  res.json({
    success: true,
    code: '',
    message: 'Yearly cash flow data retrieved',
    data: {
      year,
      months,
      yearly: {
        totalOperatingCF,
        totalInvestingCF,
        totalFinancingCF,
        netCashChange,
        cashBeginning,
        cashEnding,
      },
    },
  });
});

export default router;
