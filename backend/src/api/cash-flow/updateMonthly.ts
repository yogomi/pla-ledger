import { Router, Response } from 'express';
import { z } from 'zod';
import { Project, CashFlowMonthly } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthSchema } from '../../schemas/salesSimulation';
import {
  fetchProfitAndInterest,
  fetchBorrowingData,
  fetchPrevCashEnding,
} from './getMonthly';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
  yearMonth: YearMonthSchema,
});

const UpdateCashFlowSchema = z.object({
  depreciation: z.number(),
  accountsReceivableChange: z.number(),
  inventoryChange: z.number(),
  accountsPayableChange: z.number(),
  otherOperating: z.number(),
  capexAcquisition: z.number(),
  assetSale: z.number(),
  intangibleAcquisition: z.number(),
  otherInvesting: z.number(),
  capitalIncrease: z.number(),
  dividendPayment: z.number(),
  otherFinancing: z.number(),
  cashBeginning: z.number().optional(),
  noteJa: z.string().optional(),
  noteEn: z.string().optional(),
});

/**
 * @api {PUT} /api/projects/:projectId/cash-flow/monthly/:yearMonth 月次キャッシュフロー更新
 * @description
 *   - 指定月のキャッシュフローデータを更新
 *   - 手入力項目のみを受け付け、自動連携項目はサーバー側で再計算
 *   - 小計・合計も自動計算
 *
 * @request
 *   - params: projectId (UUID), yearMonth (YYYY-MM形式)
 *   - body: { depreciation, accountsReceivableChange, inventoryChange, accountsPayableChange,
 *             otherOperating, capexAcquisition, assetSale, intangibleAcquisition, otherInvesting,
 *             capitalIncrease, dividendPayment, otherFinancing, cashBeginning?, noteJa?, noteEn? }
 *   - バリデーション：Zodで全フィールドをnumber型でチェック
 *   - 認証必須、Editor権限以上が必要
 *
 * @response
 *   - 成功時: { success: true, code: '', message: 'Cash flow updated successfully', data: { ... } }
 *   - バリデーションエラー: { success: false, code: 'invalid_query', message: 'エラー内容', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Cash flow updated successfully",
 *     "data": { ... }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_query",
 *     "message": "depreciation: Expected number, received string",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-21
 */
const router = Router({ mergeParams: true });

router.put('/monthly/:yearMonth', authenticate, async (req: AuthRequest, res: Response) => {
  const parsedParams = ParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsedParams.error),
      data: null,
    });
    return;
  }
  const { projectId, yearMonth } = parsedParams.data;

  const parsedBody = UpdateCashFlowSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsedBody.error),
      data: null,
    });
    return;
  }

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
  if (!role || role === 'viewer') {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Editor permission required',
      data: null,
    });
    return;
  }

  const {
    depreciation,
    accountsReceivableChange,
    inventoryChange,
    accountsPayableChange,
    otherOperating,
    capexAcquisition,
    assetSale,
    intangibleAcquisition,
    otherInvesting,
    capitalIncrease,
    dividendPayment,
    otherFinancing,
    noteJa,
    noteEn,
  } = parsedBody.data;

  // 自動連携データを取得
  const { profitBeforeTax, interestExpense } = await fetchProfitAndInterest(projectId, yearMonth);
  const { borrowingProceeds, loanRepaymentAmount } = await fetchBorrowingData(projectId, yearMonth);

  // 期首残高：明示的に指定があればそれを使用し、なければ前月のcash_endingを使用
  const cashBeginning =
    parsedBody.data.cashBeginning !== undefined
      ? parsedBody.data.cashBeginning
      : await fetchPrevCashEnding(projectId, yearMonth);

  // 小計計算
  const operatingCfSubtotal =
    profitBeforeTax + depreciation - interestExpense
    + accountsReceivableChange + inventoryChange + accountsPayableChange + otherOperating;
  const investingCfSubtotal = capexAcquisition + assetSale + intangibleAcquisition + otherInvesting;
  const financingCfSubtotal =
    borrowingProceeds + loanRepaymentAmount + capitalIncrease + dividendPayment + otherFinancing;
  const netCashChange = operatingCfSubtotal + investingCfSubtotal + financingCfSubtotal;
  const cashEnding = cashBeginning + netCashChange;

  const [record] = await CashFlowMonthly.upsert({
    project_id: projectId,
    year_month: yearMonth,
    profit_before_tax: profitBeforeTax,
    depreciation,
    interest_expense: interestExpense,
    accounts_receivable_change: accountsReceivableChange,
    inventory_change: inventoryChange,
    accounts_payable_change: accountsPayableChange,
    other_operating: otherOperating,
    operating_cf_subtotal: operatingCfSubtotal,
    capex_acquisition: capexAcquisition,
    asset_sale: assetSale,
    intangible_acquisition: intangibleAcquisition,
    other_investing: otherInvesting,
    investing_cf_subtotal: investingCfSubtotal,
    borrowing_proceeds: borrowingProceeds,
    loan_repayment: loanRepaymentAmount,
    capital_increase: capitalIncrease,
    dividend_payment: dividendPayment,
    other_financing: otherFinancing,
    financing_cf_subtotal: financingCfSubtotal,
    net_cash_change: netCashChange,
    cash_beginning: cashBeginning,
    cash_ending: cashEnding,
    is_inherited: false,
    note_ja: noteJa ?? null,
    note_en: noteEn ?? null,
  });

  res.json({
    success: true,
    code: '',
    message: 'Cash flow updated successfully',
    data: {
      yearMonth,
      isInherited: false,
      operating: {
        profitBeforeTax,
        depreciation,
        interestExpense,
        accountsReceivableChange,
        inventoryChange,
        accountsPayableChange,
        otherOperating,
        subtotal: operatingCfSubtotal,
      },
      investing: {
        capexAcquisition,
        assetSale,
        intangibleAcquisition,
        otherInvesting,
        subtotal: investingCfSubtotal,
      },
      financing: {
        borrowingProceeds,
        loanRepayment: loanRepaymentAmount,
        capitalIncrease,
        dividendPayment,
        otherFinancing,
        subtotal: financingCfSubtotal,
      },
      summary: {
        netCashChange,
        cashBeginning,
        cashEnding,
      },
      notes: {
        ja: record.note_ja,
        en: record.note_en,
      },
    },
  });
});

export default router;
