import { Router, Response } from 'express';
import { sequelize, Project, Loan, LoanRepayment } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { createLoanSchema } from '../../schemas/loanSchemas';
import {
  generateEqualPaymentSchedule,
  generateEqualPrincipalSchedule,
  generateBulletSchedule,
} from '../../utils/loanCalculator';

/**
 * @api {POST} /api/projects/:projectId/loans 借入登録
 * @description
 *   - 新規借入を登録し、返済スケジュールを自動生成する
 *   - 返済方法（元利均等・元金均等・一括返済）に応じて計算ロジックを切り替える
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   Body: createLoanSchema（Zod）
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_request', message: エラー内容, data: null }
 *
 * @response
 *   成功時: {
 *     success: true, code: '', message: 'Loan created successfully',
 *     data: { loan: {...}, repaymentSchedule: [...] }
 *   }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_request', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Edit permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @author yogomi
 * @date 2026-03-19
 */
const router = Router({ mergeParams: true });

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;

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

  const parsed = createLoanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_request',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const {
    lenderName,
    principalAmount,
    interestRate,
    loanDate,
    repaymentStartDate,
    repaymentMonths,
    repaymentMethod,
    description,
  } = parsed.data;

  // 返済スケジュール計算
  let schedule;
  if (repaymentMethod === 'equal_payment') {
    schedule = generateEqualPaymentSchedule(
      principalAmount, interestRate, repaymentMonths, loanDate, repaymentStartDate,
    );
  } else if (repaymentMethod === 'equal_principal') {
    schedule = generateEqualPrincipalSchedule(
      principalAmount, interestRate, repaymentMonths, loanDate, repaymentStartDate,
    );
  } else {
    schedule = generateBulletSchedule(
      principalAmount, interestRate, repaymentMonths, loanDate, repaymentStartDate,
    );
  }

  const transaction = await sequelize.transaction();
  try {
    const loan = await Loan.create({
      project_id: projectId,
      lender_name: lenderName,
      principal_amount: principalAmount,
      interest_rate: interestRate,
      loan_date: loanDate,
      repayment_start_date: repaymentStartDate ?? null,
      repayment_months: repaymentMonths,
      repayment_method: repaymentMethod,
      description: description ?? null,
    }, { transaction });

    const repayments = await LoanRepayment.bulkCreate(
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

    res.status(201).json({
      success: true,
      code: '',
      message: 'Loan created successfully',
      data: {
        loan: {
          id: loan.id,
          projectId: loan.project_id,
          lenderName: loan.lender_name,
          principalAmount: Number(loan.principal_amount),
          interestRate: Number(loan.interest_rate),
          loanDate: loan.loan_date,
          repaymentStartDate: loan.repayment_start_date,
          repaymentMonths: loan.repayment_months,
          repaymentMethod: loan.repayment_method,
          description: loan.description,
          createdAt: loan.created_at,
          updatedAt: loan.updated_at,
        },
        repaymentSchedule: repayments.map(r => ({
          yearMonth: r.year_month,
          principalPayment: Number(r.principal_payment),
          interestPayment: Number(r.interest_payment),
          remainingBalance: Number(r.remaining_balance),
        })),
      },
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
});

export default router;
