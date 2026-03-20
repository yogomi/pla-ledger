import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import { useLoans, useDeleteLoan } from '../hooks/useLoan';
import { Loan } from '../types/Loan';
import LoanEditorDialog from './LoanEditorDialog';
import LoanRepaymentScheduleTable from './LoanRepaymentScheduleTable';

interface LoanListContainerProps {
  projectId: string;
  /** 通貨コード (例: JPY, USD)。金額表示に使用する。 */
  currency: string;
  /** 編集権限の有無。true の場合に作成・編集・削除ボタンを表示する。 */
  canEdit: boolean;
}

/**
 * 借入一覧を表示するコンテナコンポーネント。
 * 各借入のカード表示、新規作成・編集・削除アクション、返済スケジュール展開表示を担う。
 */
export default function LoanListContainer({
  projectId,
  currency,
  canEdit,
}: LoanListContainerProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useLoans(projectId);
  const deleteMutation = useDeleteLoan(projectId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  const handleAddClick = () => {
    setEditingLoan(null);
    setEditorOpen(true);
  };

  const handleEditClick = (loan: Loan) => {
    setEditingLoan(loan);
    setEditorOpen(true);
  };

  const handleDeleteClick = async (loanId: string) => {
    if (!window.confirm(t('confirm_delete_loan'))) return;
    await deleteMutation.mutateAsync(loanId);
    if (expandedLoanId === loanId) setExpandedLoanId(null);
  };

  const handleToggleSchedule = (loanId: string) => {
    setExpandedLoanId(prev => (prev === loanId ? null : loanId));
  };

  const repaymentMethodLabel = (method: Loan['repaymentMethod']) => {
    if (method === 'equal_payment') return t('equal_payment');
    if (method === 'equal_principal') return t('equal_principal');
    return t('bullet');
  };

  const deferredInterestPolicyLabel = (policy: Loan['deferredInterestPolicy']) => {
    if (policy === 'waive') return t('deferred_interest_policy_waive');
    return t('deferred_interest_policy_charge');
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  const loans = data?.loans ?? [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{t('loan_list')}</Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            {t('add_loan')}
          </Button>
        )}
      </Box>

      {loans.length === 0 && (
        <Alert severity="info">{t('no_items')}</Alert>
      )}

      <Box display="flex" flexDirection="column" gap={2}>
        {loans.map(loan => (
          <Card key={loan.id} variant="outlined">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {loan.lenderName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('principal_amount')}: {loan.principalAmount.toLocaleString()} {currency}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('interest_rate')}: {loan.interestRate}%　
                    {t('loan_date')}: {loan.loanDate}　
                    {t('repayment_months')}: {loan.repaymentMonths}{t('months_unit')}
                  </Typography>
                  {loan.repaymentStartDate !== null && (
                    <Typography variant="body2" color="text.secondary">
                      {t('repayment_start_date')}: {loan.repaymentStartDate}　
                      {t('deferred_interest_policy')}: {deferredInterestPolicyLabel(loan.deferredInterestPolicy)}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {t('repayment_method')}: {repaymentMethodLabel(loan.repaymentMethod)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('remaining_balance')}: {loan.remainingBalance.toLocaleString()} {currency}
                  </Typography>
                  {loan.description && (
                    <Typography variant="body2" color="text.secondary">
                      {t('loan_description')}: {loan.description}
                    </Typography>
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleSchedule(loan.id)}
                    aria-label={t('repayment_schedule')}
                  >
                    {expandedLoanId === loan.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                  {canEdit && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(loan)}
                        aria-label={t('edit_loan')}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => void handleDeleteClick(loan.id)}
                        aria-label={t('delete_loan')}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
            </CardContent>

            {/* 返済スケジュール展開表示 */}
            <Collapse in={expandedLoanId === loan.id}>
              <Divider />
              <Box p={2}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  {t('repayment_schedule')}
                </Typography>
                <LoanRepaymentScheduleTable
                  projectId={projectId}
                  loanId={loan.id}
                  currency={currency}
                />
              </Box>
            </Collapse>
          </Card>
        ))}
      </Box>

      <LoanEditorDialog
        projectId={projectId}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        loan={editingLoan}
      />
    </Box>
  );
}
