import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, CircularProgress, Paper,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getFiscalYearSummary } from '../api/salesSimulations';

interface FiscalYearTaxTableProps {
  projectId: string;
  currency: string;
}

const fmt = (v: number) => Math.round(v).toLocaleString();

/**
 * 事業年度別の法人税等サマリーテーブル。
 * tax_calculation_enabled が false のプロジェクトでは何も表示しない。
 */
export default function FiscalYearTaxTable({ projectId, currency }: FiscalYearTaxTableProps) {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fiscalYearSummary', projectId],
    queryFn: () => getFiscalYearSummary(projectId),
    enabled: Boolean(projectId),
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) return <Alert severity="error">{t('load_error')}</Alert>;
  if (!data?.enabled || data.fiscalYears.length === 0) return null;

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        {t('fiscal_year_tax_title')}
      </Typography>
      <TableContainer component={Paper} sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell sx={{ minWidth: 100 }}>{t('fiscal_year_label')}</TableCell>
              <TableCell>{t('fiscal_year_period')}</TableCell>
              <TableCell align="right">{t('taxable_income')} ({currency})</TableCell>
              <TableCell align="right">{t('corporate_tax')} ({currency})</TableCell>
              <TableCell align="right">{t('local_corporate_tax')} ({currency})</TableCell>
              <TableCell align="right">{t('prefectural_tax')} ({currency})</TableCell>
              <TableCell align="right">{t('municipal_tax')} ({currency})</TableCell>
              <TableCell align="right">{t('business_tax')} ({currency})</TableCell>
              <TableCell align="right">{t('special_business_tax')} ({currency})</TableCell>
              <TableCell align="right">{t('flat_tax')} ({currency})</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {t('total_tax')} ({currency})
              </TableCell>
              <TableCell align="right">{t('tax_payment_month')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.fiscalYears.map(fy => (
              <TableRow key={fy.label}>
                <TableCell>{fy.label}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {fy.start} 〜 {fy.end}
                </TableCell>
                <TableCell align="right" sx={{ color: fy.taxableIncome < 0 ? 'error.main' : 'inherit' }}>
                  {fmt(fy.taxableIncome)}
                </TableCell>
                <TableCell align="right">{fmt(fy.breakdown.corporateTax)}</TableCell>
                <TableCell align="right">{fmt(fy.breakdown.localCorporateTax)}</TableCell>
                <TableCell align="right">{fmt(fy.breakdown.prefecturalTax)}</TableCell>
                <TableCell align="right">{fmt(fy.breakdown.municipalTax)}</TableCell>
                <TableCell align="right">{fmt(fy.breakdown.businessTax)}</TableCell>
                <TableCell align="right">{fmt(fy.breakdown.specialBusinessTax)}</TableCell>
                <TableCell align="right">{fmt(fy.breakdown.flatTax)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {fmt(fy.breakdown.totalTax)}
                </TableCell>
                <TableCell align="right">{fy.paymentMonth}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
