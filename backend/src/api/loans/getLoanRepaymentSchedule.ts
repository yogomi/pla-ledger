import { Router, Response } from 'express';
import { Project, Loan, LoanRepayment } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';

/**
 * @api {GET} /api/projects/:projectId/loans/:loanId/schedule 返済スケジュール取得
 * @description
 *   - 指定借入の月次返済スケジュールを取得する
 *   - 元金返済額・利息支払額・残高を月別に返却する
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   - loanId: string (required) - 借入ID
 *
 * @response
 *   成功時: {
 *     success: true, code: '', message: 'Repayment schedule retrieved successfully',
 *     data: {
 *       loanId: string,
 *       lenderName: string,
 *       principalAmount: number,
 *       schedule: [{ yearMonth, principalPayment, interestPayment, remainingBalance }]
 *     }
 *   }
 *   失敗時:
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'View permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Loan not found', data: null }
 *
 * @author yogomi
 * @date 2026-03-19
 */
const router = Router({ mergeParams: true });

router.get('/:loanId/schedule', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId, loanId } = req.params;

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

  const loan = await Loan.findOne({ where: { id: loanId, project_id: projectId } });
  if (!loan) {
    res.status(404).json({
      success: false, code: 'not_found', message: 'Loan not found', data: null,
    });
    return;
  }

  const repayments = await LoanRepayment.findAll({
    where: { loan_id: loanId },
    order: [['year_month', 'ASC']],
  });

  res.json({
    success: true,
    code: '',
    message: 'Repayment schedule retrieved successfully',
    data: {
      loanId: loan.id,
      lenderName: loan.lender_name,
      principalAmount: Number(loan.principal_amount),
      repaymentStartDate: loan.repayment_start_date,
      deferredInterestPolicy: loan.deferred_interest_policy,
      schedule: repayments.map(r => ({
        yearMonth: r.year_month,
        principalPayment: Number(r.principal_payment),
        interestPayment: Number(r.interest_payment),
        remainingBalance: Number(r.remaining_balance),
      })),
    },
  });
});

export default router;
