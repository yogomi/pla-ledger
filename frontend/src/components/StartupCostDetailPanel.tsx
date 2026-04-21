import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import StartupCostTable, { CostType, StartupCostItem } from './StartupCostTable';

interface StartupCostDetailPanelProps {
  items: StartupCostItem[];
  currency: string;
}

const COST_TYPE_ORDER: CostType[] = ['equipment', 'renovation', 'deposit', 'intangible', 'founding', 'marketing', 'consumables', 'initial_inventory', 'working_capital'];

/**
 * スタートアップコストを費目区分ごとに分割して表示する読み取り専用パネル。
 * 各セクションはヘッダーと明細テーブルで構成し、件数0の区分は表示しない。
 */
export default function StartupCostDetailPanel({
  items,
  currency,
}: StartupCostDetailPanelProps) {
  const { t } = useTranslation();

  const costTypeLabel = (costType: CostType): string => {
    const labels: Record<CostType, string> = {
      equipment: t('cost_type_equipment'),
      renovation: t('cost_type_renovation'),
      deposit: t('cost_type_deposit'),
      intangible: t('cost_type_intangible'),
      founding: t('cost_type_founding'),
      marketing: t('cost_type_marketing'),
      consumables: t('cost_type_consumables'),
      initial_inventory: t('cost_type_initial_inventory'),
      working_capital: t('cost_type_working_capital'),
    };
    return labels[costType];
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {COST_TYPE_ORDER.map(costType => {
        const sectionItems = items.filter(item => item.cost_type === costType);
        if (sectionItems.length === 0) return null;

        return (
          <Box key={costType}>
            <Typography variant="h6" mb={2}>
              {costTypeLabel(costType)}
            </Typography>
            <StartupCostTable items={sectionItems} currency={currency} readOnly />
          </Box>
        );
      })}
    </Box>
  );
}
