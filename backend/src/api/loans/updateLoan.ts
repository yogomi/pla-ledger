import { Router, Response } from 'express';
import { sequelize, Project, Loan, LoanRepayment } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { updateLoanSchema } from '../../schemas/loanSchemas';
import {
  generateEqualPaymentSchedule,
  generateEqualPrincipalSchedule,
  generateBulletSchedule,
} from '../../utils/loanCalculator';

/**
 * @api {PUT} /api/projects/:projectId/loans/:loanId 借入更新
 * @description
 *   - 借入情報を更新し、返済スケジュールを再計算する
 *   - 既存の返済スケジュールは削除され、新規生成される
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   - loanId: string (required) - 借入ID
 *   Body: updateLoanSchema（Zod、部分更新）
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_request', message: エラー内容, data: null }
 *
 * @response
 *   成功時: {
 *     success: true, code: '', message: 'Loan updated successfully',
 *     data: { loan: {...} }
 *   }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_request', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Edit permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project/Loan not found', data: null }
 *
 * @author yogomi
 * @date 2026-03-19
 */
const router = Router({ mergeParams: true });

router.put('/:loanId', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId, loanId } = req.params;

  const project = await Project.findByPk(projectId);
  if (!project) {
    res.status(404).json({
      success: false, code: 'not_found', message: 'Project not found', data: null,
    });
    return;
  }

  const role = await getProjectRole(projectId, req.user!.id);
  if (!role || role === 'viewer') {
    res.status(403).json({
      success: false, code: 'forbidden', message: 'Edit permission required', data: null,
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

  const parsed = updateLoanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_request',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const updates = parsed.data;

  // 更新後の値（未指定の場合は現在値を使用）
  const lenderName = updates.lenderName ?? loan.lender_name;
  const principalAmount = updates.principalAmount ?? Number(loan.principal_amount);
  const interestRate = updates.interestRate ?? Number(loan.interest_rate);
  const loanDate = updates.loanDate ?? loan.loan_date;
  const repaymentStartDate = 'repaymentStartDate' in updates
    ? (updates.repaymentStartDate ?? null)
    : loan.repayment_start_date;
  const deferredInterestPolicy = updates.deferredInterestPolicy ?? loan.deferred_interest_policy;
  const repaymentMonths = updates.repaymentMonths ?? loan.repayment_months;
  const repaymentMethod = updates.repaymentMethod ?? loan.repayment_method;
  const description = 'description' in updates ? (updates.description ?? null) : loan.description;

  // 返済スケジュール再計算
  let schedule;
  if (repaymentMethod === 'equal_payment') {
    schedule = generateEqualPaymentSchedule(
      principalAmount, interestRate, repaymentMonths, loanDate,
      repaymentStartDate, deferredInterestPolicy,
    );
  } else if (repaymentMethod === 'equal_principal') {
    schedule = generateEqualPrincipalSchedule(
      principalAmount, interestRate, repaymentMonths, loanDate,
      repaymentStartDate, deferredInterestPolicy,
    );
  } else {
    schedule = generateBulletSchedule(
      principalAmount, interestRate, repaymentMonths, loanDate,
      repaymentStartDate, deferredInterestPolicy,
    );
  }

  const transaction = await sequelize.transaction();
  try {
    await loan.update({
      lender_name: lenderName,
      principal_amount: principalAmount,
      interest_rate: interestRate,
      loan_date: loanDate,
      repayment_start_date: repaymentStartDate,
      deferred_interest_policy: deferredInterestPolicy,
      repayment_months: repaymentMonths,
      repayment_method: repaymentMethod,
      description,
    }, { transaction });

    // 既存の返済スケジュールを削除して再生成
    await LoanRepayment.destroy({ where: { loan_id: loanId }, transaction });
    await LoanRepayment.bulkCreate(
      schedule.map(entry => ({
        loan_id: loan.id,
        project_id: projectId,
        year_month: entry.yearMonth,
        principal_payment: entry.principalPayment,
        interest_payment: entry.interestPayment,
        remaining_balance: entry.remainingBalance,
      })),
      { transaction },
    );

    await transaction.commit();

    res.json({
      success: true,
      code: '',
      message: 'Loan updated successfully',
      data: {
        loan: {
          id: loan.id,
          projectId: loan.project_id,
          lenderName: loan.lender_name,
          principalAmount: Number(loan.principal_amount),
          interestRate: Number(loan.interest_rate),
          loanDate: loan.loan_date,
          repaymentStartDate: loan.repayment_start_date,
          deferredInterestPolicy: loan.deferred_interest_policy,
          repaymentMonths: loan.repayment_months,
          repaymentMethod: loan.repayment_method,
          description: loan.description,
          createdAt: loan.created_at,
          updatedAt: loan.updated_at,
        },
      },
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
});

export default router;
