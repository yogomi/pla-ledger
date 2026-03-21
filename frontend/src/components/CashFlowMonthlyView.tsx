import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { useCashFlowMonthly } from '../hooks/useCashFlow';

/**
 * 月次キャッシュフロー読み取り専用表示コンポーネント。
 * 営業・投資・財務の3セクションをAccordionで折りたたみ可能に表示する。
 */
export default function CashFlowMonthlyView({
  projectId,
  yearMonth,
}: {
  projectId: string;
  yearMonth: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCashFlowMonthly(projectId, yearMonth);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  const renderRow = (label: string, value: number, autoLinked?: boolean) => (
    <TableRow key={label}>
      <TableCell>
        {label}
        {autoLinked && (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            {t('auto_linked')}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">{value.toLocaleString()}</TableCell>
    </TableRow>
  );

  return (
    <Box>
      {data.isInherited && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('inherited_info_cash_flow')}
        </Alert>
      )}

      {/* 営業活動CF */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">{t('operating_activities')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell>{t('item_name')}</TableCell>
                <TableCell align="right">{t('monthly_amount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {renderRow(t('profit_before_tax'), data.operating.profitBeforeTax, true)}
              {renderRow(t('depreciation'), data.operating.depreciation)}
              {renderRow(t('interest_expense'), data.operating.interestExpense, true)}
              {renderRow(
                t('accounts_receivable_change'),
                data.operating.accountsReceivableChange,
              )}
              {renderRow(t('inventory_change'), data.operating.inventoryChange)}
              {renderRow(t('accounts_payable_change'), data.operating.accountsPayableChange)}
              {renderRow(t('other_operating'), data.operating.otherOperating)}
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell>
                  <Typography fontWeight="bold">{t('subtotal')}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold">
                    {data.operating.subtotal.toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>

      {/* 投資活動CF */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">{t('investing_activities')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell>{t('item_name')}</TableCell>
                <TableCell align="right">{t('monthly_amount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {renderRow(t('capex_acquisition'), data.investing.capexAcquisition)}
              {renderRow(t('asset_sale'), data.investing.assetSale)}
              {renderRow(t('intangible_acquisition'), data.investing.intangibleAcquisition)}
              {renderRow(t('other_investing'), data.investing.otherInvesting)}
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell>
                  <Typography fontWeight="bold">{t('subtotal')}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold">
                    {data.investing.subtotal.toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>

      {/* 財務活動CF */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">{t('financing_activities')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell>{t('item_name')}</TableCell>
                <TableCell align="right">{t('monthly_amount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {renderRow(t('borrowing_proceeds'), data.financing.borrowingProceeds, true)}
              {renderRow(t('loan_repayment'), data.financing.loanRepayment, true)}
              {renderRow(t('capital_increase'), data.financing.capitalIncrease)}
              {renderRow(t('dividend_payment'), data.financing.dividendPayment)}
              {renderRow(t('other_financing'), data.financing.otherFinancing)}
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell>
                  <Typography fontWeight="bold">{t('subtotal')}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold">
                    {data.financing.subtotal.toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>

      {/* サマリー */}
      <Box mt={2} p={2} border={1} borderColor="divider" borderRadius={1}>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell>{t('net_cash_change')}</TableCell>
              <TableCell align="right">
                <Typography
                  fontWeight="bold"
                  color={data.summary.netCashChange >= 0 ? 'success.main' : 'error.main'}
                >
                  {data.summary.netCashChange.toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('cash_beginning')}</TableCell>
              <TableCell align="right">{data.summary.cashBeginning.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography fontWeight="bold">{t('cash_ending')}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {data.summary.cashEnding.toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      {/* 備考 */}
      {(data.notes.ja || data.notes.en) && (
        <Box mt={2} p={2} border={1} borderColor="divider" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>{t('notes')}</Typography>
          {data.notes.ja && (
            <Typography variant="body2" color="text.secondary">{data.notes.ja}</Typography>
          )}
          {data.notes.en && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {data.notes.en}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
