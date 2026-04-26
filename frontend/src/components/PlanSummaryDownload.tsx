import { useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useTranslation } from 'react-i18next';
import {
  buildTimelinePeriod,
  buildTimelineYears,
  TIMELINE_MONTHS_BEFORE,
  TIMELINE_MONTHS_AFTER,
} from '../utils/timelinePeriod';
import { getProfitLossYearly } from '../api/salesSimulations';
import { getCashFlowYearly } from '../api/cashFlow';
import { getStartupCosts } from '../api/startupCosts';
import { getLoans, getLoanRepaymentSchedule } from '../api/loans';
import { getFixedAssets } from '../api/fixedAssets';

interface PlanSummaryDownloadProps {
  projectId: string;
  projectName: string;
  currency: string;
  /**
   * 開業予定月 (YYYY-MM)。
   * ★ この値を元にタイムラインと同じ期間を算出します。
   *    期間の定義は src/utils/timelinePeriod.ts を参照してください。
   */
  plannedOpeningDate: string | null;
}

/**
 * 事業計画概要データのダウンロードページ。
 * タイムラインと同じ期間（前 TIMELINE_MONTHS_BEFORE ヶ月・後 TIMELINE_MONTHS_AFTER ヶ月）の
 * 各種データを収集してJSON形式でダウンロードする。
 *
 * ★ 出力期間の変更は src/utils/timelinePeriod.ts で行ってください。
 *    ProjectTimeline.tsx とこのコンポーネントは同じ定数を参照しています。
 */
export default function PlanSummaryDownload({
  projectId,
  projectName,
  currency,
  plannedOpeningDate,
}: PlanSummaryDownloadProps) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const base = plannedOpeningDate ?? '2025-01';
  const { from, to } = buildTimelinePeriod(base);
  const years = buildTimelineYears(base);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      // 全データを並列取得
      const [plResults, cfResults, startupCosts, loansData, assetsData] = await Promise.all([
        Promise.all(years.map(y => getProfitLossYearly(projectId, y))),
        Promise.all(years.map(y => getCashFlowYearly(projectId, y))),
        getStartupCosts(projectId),
        getLoans(projectId),
        getFixedAssets(projectId),
      ]);

      // 借入返済スケジュールを取得（各借入ごと）
      const loanSchedules = await Promise.all(
        loansData.loans.map(loan => getLoanRepaymentSchedule(projectId, loan.id)),
      );

      const summary = {
        _schema: {
          description_ja:
            `このファイルには「${projectName}」の事業計画データが含まれています。` +
            `期間は ${from} から ${to}（開業予定月の前${TIMELINE_MONTHS_BEFORE}ヶ月・` +
            `後${TIMELINE_MONTHS_AFTER}ヶ月）です。` +
            '売上継承設定などのアプリ固有の仕組みは展開済みの実数値に変換されており、' +
            'このファイル単体で事業計画の全容を把握できます。',
          description_en:
            `This file contains business plan data for "${projectName}". ` +
            `Period: ${from} to ${to} ` +
            `(${TIMELINE_MONTHS_BEFORE} months before and ${TIMELINE_MONTHS_AFTER} months ` +
            'after the planned opening date). ' +
            'App-specific logic such as sales inheritance is resolved to actual values, ' +
            'so this file is self-contained.',
          generated_at: new Date().toISOString(),
          currency_note: `全金額フィールドの単位は ${currency}。小数点以下は四捨五入済み。`,
          sections: {
            project: 'プロジェクト基本情報（名称・通貨・開業予定日・出力期間）',
            profit_loss: '損益計算書。年次・月次の売上・経費・各利益を含む。継承値は展開済み実数値。',
            cash_flow: 'キャッシュフロー計算書。営業・投資・財務活動別の月次合計と各月コメント。',
            startup_costs: '初期費用の明細リスト（品目・数量・単価・費用区分・計上月）。',
            loans: '借入情報と出力期間内の月次返済スケジュール。',
            fixed_assets: '固定資産リスト（毎月の償却費は profit_loss の depreciation に反映済み）。',
          },
        },
        project: {
          name: projectName,
          currency,
          planned_opening_date: plannedOpeningDate,
          export_period: { from, to },
        },
        profit_loss: {
          years: plResults.map((pl, i) => ({
            year: years[i],
            monthly: pl.months.map(m => ({
              year_month: m.yearMonth,
              sales: Math.round(m.monthlySales),
              cost: Math.round(m.monthlyCost),
              fixed_expenses: Math.round(m.fixedTotal),
              labor_cost: Math.round(m.laborTotal),
              depreciation: Math.round(m.depreciation),
              total_expense: Math.round(m.totalExpense),
              operating_profit: Math.round(m.operatingProfit),
              interest_expense: Math.round(m.interestExpense),
              profit_before_tax: Math.round(m.profitBeforeTax),
              net_profit: Math.round(m.netProfit),
              profit_rate_pct: Number(m.profitRate.toFixed(2)),
              comment_ja: m.noteJa ?? null,
              comment_en: m.noteEn ?? null,
            })),
            yearly_total: {
              total_sales: Math.round(pl.yearly.totalSales),
              total_cost: Math.round(pl.yearly.totalCost),
              total_fixed_expenses: Math.round(pl.yearly.totalFixed),
              total_labor_cost: Math.round(pl.yearly.totalLabor),
              total_depreciation: Math.round(pl.yearly.totalDepreciation),
              total_expense: Math.round(pl.yearly.totalExpense),
              total_operating_profit: Math.round(pl.yearly.totalOperatingProfit),
              total_interest_expense: Math.round(pl.yearly.totalInterestExpense),
              total_profit_before_tax: Math.round(pl.yearly.totalProfitBeforeTax),
              total_net_profit: Math.round(pl.yearly.totalNetProfit),
              average_profit_rate_pct: Number(pl.yearly.averageProfitRate.toFixed(2)),
            },
          })),
        },
        cash_flow: {
          years: cfResults.map((cf, i) => ({
            year: years[i],
            monthly: cf.months.map(m => ({
              year_month: m.yearMonth,
              operating_cf: Math.round(m.operatingCF),
              investing_cf: Math.round(m.investingCF),
              financing_cf: Math.round(m.financingCF),
              net_cash_change: Math.round(m.netCashChange),
              cash_ending: Math.round(m.cashEnding),
              comment_ja: m.noteJa ?? null,
              comment_en: m.noteEn ?? null,
            })),
            yearly_total: {
              total_operating_cf: Math.round(cf.yearly.totalOperatingCF),
              total_investing_cf: Math.round(cf.yearly.totalInvestingCF),
              total_financing_cf: Math.round(cf.yearly.totalFinancingCF),
              net_cash_change: Math.round(cf.yearly.netCashChange),
              cash_beginning: Math.round(cf.yearly.cashBeginning),
              cash_ending: Math.round(cf.yearly.cashEnding),
            },
          })),
        },
        startup_costs: startupCosts.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: Math.round(item.quantity * item.unit_price),
          cost_type: item.cost_type,
          allocation_month: item.allocation_month,
        })),
        loans: loansData.loans.map((loan, i) => ({
          lender_name: loan.lenderName,
          principal_amount: Math.round(loan.principalAmount),
          interest_rate_pct: loan.interestRate,
          loan_date: loan.loanDate,
          repayment_start_date: loan.repaymentStartDate,
          repayment_months: loan.repaymentMonths,
          repayment_method: loan.repaymentMethod,
          description: loan.description,
          repayment_schedule: (loanSchedules[i]?.schedule ?? [])
            .filter(r => r.yearMonth >= from && r.yearMonth <= to)
            .map(r => ({
              year_month: r.yearMonth,
              principal_payment: Math.round(r.principalPayment),
              interest_payment: Math.round(r.interestPayment),
              remaining_balance: Math.round(r.remainingBalance),
            })),
        })),
        fixed_assets: assetsData.assets.map(asset => ({
          asset_name: asset.assetName,
          asset_category: asset.assetCategory,
          purchase_date: asset.purchaseDate,
          purchase_amount: Math.round(asset.purchaseAmount),
          useful_life_years: asset.usefulLife,
          salvage_value: Math.round(asset.salvageValue),
          depreciation_method: asset.depreciationMethod,
          monthly_depreciation: Math.round(asset.monthlyDepreciation),
          start_depreciation_date: asset.startDepreciationDate,
          end_depreciation_date: asset.endDepreciationDate,
          notes: asset.notes,
        })),
      };

      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const safeTitle = projectName.replace(/[/\\?%*:|"<>]/g, '-');
      const a = document.createElement('a');
      a.href = url;
      a.download = `plan-summary-${safeTitle}-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(t('save_error'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>{t('plan_summary_download_title')}</Typography>

      {/* 非プログラマー向け説明 */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>{t('plan_summary_for_general_title')}</Typography>
        <Typography variant="body2" paragraph>
          {t('plan_summary_for_general_desc', {
            projectName,
            openingDate: base,
            monthsBefore: TIMELINE_MONTHS_BEFORE,
            monthsAfter: TIMELINE_MONTHS_AFTER,
          })}
        </Typography>
        <Typography variant="body2" paragraph>
          {t('plan_summary_for_general_note')}
        </Typography>
        <Typography variant="body2" component="div">
          {t('plan_summary_contents_label')}
          <Box component="ul" sx={{ mt: 0.5, pl: 3 }}>
            <li>{t('plan_summary_content_pl')}</li>
            <li>{t('plan_summary_content_cf')}</li>
            <li>{t('plan_summary_content_startup')}</li>
            <li>{t('plan_summary_content_loans')}</li>
            <li>{t('plan_summary_content_assets')}</li>
          </Box>
        </Typography>
      </Paper>

      {/* ダウンロードボタン */}
      <Box display="flex" gap={2} alignItems="center" mb={3}>
        <Button
          variant="contained"
          size="large"
          startIcon={
            downloading
              ? <CircularProgress size={18} color="inherit" />
              : <DownloadIcon />
          }
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? t('loading') : t('plan_summary_download_button')}
        </Button>
        {downloadError && <Alert severity="error">{downloadError}</Alert>}
      </Box>

      {/* データ構造の詳細 */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>{t('plan_summary_for_dev_title')}</Typography>
        <Typography variant="body2" paragraph>
          {t('plan_summary_for_dev_desc', {
            openingDate: base,
            monthsBefore: TIMELINE_MONTHS_BEFORE,
            monthsAfter: TIMELINE_MONTHS_AFTER,
          })}
        </Typography>
        <Box
          component="pre"
          sx={{
            bgcolor: 'grey.100',
            borderRadius: 1,
            p: 2,
            fontSize: '0.78rem',
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}
        >
{`{
  "_schema": {
    "description_ja": string,   // 日本語の概要説明
    "description_en": string,   // 英語の概要説明
    "generated_at": string,     // ISO 8601 形式の出力日時
    "currency_note": string,    // 金額単位の説明
    "sections": { ... }         // 各セクションの説明
  },
  "project": {
    "name": string,
    "currency": string,         // 例: "JPY"
    "planned_opening_date": string | null,  // YYYY-MM
    "export_period": { "from": string, "to": string }  // YYYY-MM
  },
  "profit_loss": {
    "years": [{
      "year": string,
      "monthly": [{
        "year_month": string,           // YYYY-MM
        "sales": number,
        "cost": number,                 // 原価
        "fixed_expenses": number,       // 固定費合計
        "labor_cost": number,           // 人件費合計
        "depreciation": number,
        "total_expense": number,
        "operating_profit": number,
        "interest_expense": number,
        "profit_before_tax": number,
        "net_profit": number,
        "profit_rate_pct": number,      // 利益率 (%)
        "comment_ja": string | null,
        "comment_en": string | null
      }],
      "yearly_total": { ... }           // 上記の年次合計
    }]
  },
  "cash_flow": {
    "years": [{
      "year": string,
      "monthly": [{
        "year_month": string,
        "operating_cf": number,
        "investing_cf": number,
        "financing_cf": number,
        "net_cash_change": number,
        "cash_ending": number,
        "comment_ja": string | null,
        "comment_en": string | null
      }],
      "yearly_total": { ... }
    }]
  },
  "startup_costs": [{
    "description": string,
    "quantity": number,
    "unit_price": number,
    "total": number,
    "cost_type": string,                // "equipment" | "renovation" | 等
    "allocation_month": string          // YYYY-MM
  }],
  "loans": [{
    "lender_name": string,
    "principal_amount": number,
    "interest_rate_pct": number,
    "loan_date": string,                // YYYY-MM-DD
    "repayment_months": number,
    "repayment_method": string,         // "equal_payment" | "equal_principal" | "bullet"
    "repayment_schedule": [{
      "year_month": string,
      "principal_payment": number,
      "interest_payment": number,
      "remaining_balance": number
    }]
  }],
  "fixed_assets": [{
    "asset_name": string,
    "asset_category": string,           // "building" | "equipment" | 等
    "purchase_date": string,            // YYYY-MM-DD
    "purchase_amount": number,
    "useful_life_years": number,
    "depreciation_method": string,      // "straight_line" | "diminishing"
    "monthly_depreciation": number,
    "start_depreciation_date": string,
    "end_depreciation_date": string
  }]
}`}
        </Box>
      </Paper>

    </Box>
  );
}
