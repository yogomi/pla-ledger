import { Router, Response } from 'express';
import { sequelize, Project, Loan, LoanRepayment } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';

/**
 * @api {DELETE} /api/projects/:projectId/loans/:loanId 借入削除
 * @description
 *   - 借入とそれに紐づく返済スケジュールを削除する（カスケード削除）
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   - loanId: string (required) - 借入ID
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Loan deleted successfully', data: null }
 *   失敗時:
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Edit permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Loan not found', data: null }
 *
 * @author yogomi
 * @date 2026-03-19
 */
const router = Router({ mergeParams: true });

router.delete('/:loanId', authenticate, async (req: AuthRequest, res: Response) => {
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

  // 返済スケジュールと借入をトランザクション内で削除する
  const transaction = await sequelize.transaction();
  try {
    await LoanRepayment.destroy({ where: { loan_id: loanId }, transaction });
    await loan.destroy({ transaction });
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  res.json({
    success: true,
    code: '',
    message: 'Loan deleted successfully',
    data: null,
  });
});

export default router;
