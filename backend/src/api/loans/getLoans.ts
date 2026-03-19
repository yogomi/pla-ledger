import { Router, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize, Project, Loan } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';

/**
 * @api {GET} /api/projects/:projectId/loans 借入一覧取得
 * @description
 *   - プロジェクトに紐づく借入一覧を取得する
 *   - 各借入の基本情報と現在残高（最終返済後の残高）を返却する
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *
 * @response
 *   成功時: {
 *     success: true, code: '', message: 'Loans retrieved successfully',
 *     data: { loans: [...] }
 *   }
 *   失敗時:
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'View permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @author yogomi
 * @date 2026-03-19
 */
const router = Router({ mergeParams: true });

/** 借入の最終残高を一括取得するクエリ結果の型 */
interface LatestBalanceRow {
  loan_id: string;
  remaining_balance: number;
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;

  const project = await Project.findByPk(projectId);
  if (!project) {
    res.status(404).json({
      success: false, code: 'not_found', message: 'Project not found', data: null,
    });
    return;
  }

  const role = await getProjectRole(projectId, req.user!.id);
  if (!role) {
    res.status(403).json({
      success: false, code: 'forbidden', message: 'View permission required', data: null,
    });
    return;
  }

  const loans = await Loan.findAll({
    where: { project_id: projectId },
    order: [['created_at', 'ASC']],
  });

  if (loans.length === 0) {
    res.json({
      success: true,
      code: '',
      message: 'Loans retrieved successfully',
      data: { loans: [] },
    });
    return;
  }

  // 各借入の最終返済残高をサブクエリで一括取得する（N+1クエリを回避）
  const latestBalances = await sequelize.query<LatestBalanceRow>(
    `SELECT loan_id, remaining_balance
     FROM loan_repayments lr
     WHERE year_month = (
       SELECT MAX(year_month) FROM loan_repayments WHERE loan_id = lr.loan_id
     )
     AND loan_id IN (:loanIds)`,
    {
      replacements: { loanIds: loans.map(l => l.id) },
      type: QueryTypes.SELECT,
    },
  );

  const balanceMap = new Map<string, number>(
    latestBalances.map(row => [row.loan_id, Number(row.remaining_balance)]),
  );

  const loansWithBalance = loans.map(loan => ({
    id: loan.id,
    projectId: loan.project_id,
    lenderName: loan.lender_name,
    principalAmount: Number(loan.principal_amount),
    interestRate: Number(loan.interest_rate),
    loanDate: loan.loan_date,
    repaymentMonths: loan.repayment_months,
    repaymentMethod: loan.repayment_method,
    remainingBalance: balanceMap.get(loan.id) ?? Number(loan.principal_amount),
    description: loan.description,
    createdAt: loan.created_at,
    updatedAt: loan.updated_at,
  }));

  res.json({
    success: true,
    code: '',
    message: 'Loans retrieved successfully',
    data: { loans: loansWithBalance },
  });
});

export default router;
