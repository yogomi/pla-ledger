import React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useCashFlowYearly } from '../hooks/useCashFlow';

const COLORS = {
  operating: '#4caf50',
  investing: '#f44336',
  financing: '#2196f3',
  cashBalance: '#ff9800',
};

/** Tooltip formatter: 数値は toLocaleString、それ以外は文字列変換 */
const tooltipFormatter = (v: unknown) =>
  typeof v === 'number' ? v.toLocaleString() : String(v);

/**
 * キャッシュフローグラフコンポーネント。
 * 月次推移（複合チャート）・年間増減（ウォーターフォール）・活動別構成比（ドーナツ）の3種を表示する。
 */
export default function CashFlowCharts({
  projectId,
  year,
}: {
  projectId: string;
  year: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCashFlowYearly(projectId, year);

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

  // 月次推移チャート用データ
  const monthlyChartData = data.months.map(m => ({
    name: m.yearMonth.split('-')[1],
    [t('operating_cf')]: m.operatingCF,
    [t('investing_cf')]: m.investingCF,
    [t('financing_cf')]: m.financingCF,
    [t('cash_balance')]: m.cashEnding,
  }));

  // ウォーターフォールチャート用データ
  const waterfallData = [
    {
      name: t('cash_beginning'),
      value: data.yearly.cashBeginning,
      fill: '#9e9e9e',
      base: 0,
    },
    {
      name: t('operating_cf'),
      value: Math.abs(data.yearly.totalOperatingCF),
      fill: data.yearly.totalOperatingCF >= 0 ? COLORS.operating : COLORS.investing,
      base: data.yearly.cashBeginning,
    },
    {
      name: t('investing_cf'),
      value: Math.abs(data.yearly.totalInvestingCF),
      fill: data.yearly.totalInvestingCF >= 0 ? COLORS.operating : COLORS.investing,
      base: data.yearly.cashBeginning + data.yearly.totalOperatingCF,
    },
    {
      name: t('financing_cf'),
      value: Math.abs(data.yearly.totalFinancingCF),
      fill: data.yearly.totalFinancingCF >= 0 ? COLORS.operating : COLORS.investing,
      base: data.yearly.cashBeginning
        + data.yearly.totalOperatingCF
        + data.yearly.totalInvestingCF,
    },
    {
      name: t('cash_ending'),
      value: data.yearly.cashEnding,
      fill: '#9e9e9e',
      base: 0,
    },
  ];

  // 活動別構成比（ドーナツ）用データ（絶対値で表示）
  const pieData = [
    { name: t('operating_cf'), value: Math.abs(data.yearly.totalOperatingCF) },
    { name: t('investing_cf'), value: Math.abs(data.yearly.totalInvestingCF) },
    { name: t('financing_cf'), value: Math.abs(data.yearly.totalFinancingCF) },
  ].filter(d => d.value > 0);

  const pieColors = [COLORS.operating, COLORS.investing, COLORS.financing];

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      {/* 月次キャッシュフロー推移（複合チャート） */}
      <Box>
        <Typography variant="h6" gutterBottom>{t('cash_flow_chart_title')}</Typography>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monthlyChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Bar dataKey={t('operating_cf')} fill={COLORS.operating} stackId="cf" />
            <Bar dataKey={t('investing_cf')} fill={COLORS.investing} stackId="cf" />
            <Bar dataKey={t('financing_cf')} fill={COLORS.financing} stackId="cf" />
            <Line
              type="monotone"
              dataKey={t('cash_balance')}
              stroke={COLORS.cashBalance}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* 年次キャッシュフロー構成（ウォーターフォールチャート） */}
      <Box>
        <Typography variant="h6" gutterBottom>{t('waterfall_chart_title')}</Typography>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={waterfallData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={tooltipFormatter} />
            {/* 透明なベースバーでウォーターフォールを実現する */}
            <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="value" stackId="wf" isAnimationActive={false}>
              {waterfallData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* 活動別構成比（ドーナツチャート） */}
      {pieData.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>{t('composition_chart_title')}</Typography>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
                }
              >
                {pieData.map((_entry, index) => (
                  <Cell key={index} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}
