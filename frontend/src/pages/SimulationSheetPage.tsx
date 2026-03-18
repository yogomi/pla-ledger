import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import SimulationSheetContainer from '../components/SimulationSheetContainer';

/**
 * 売上シミュレーションページ。
 * URL パラメータからプロジェクトIDを取得してシミュレーションシートを表示する。
 */
export default function SimulationSheetPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Typography>プロジェクトが見つかりません</Typography>;
  return (
    <Box p={3}>
      <SimulationSheetContainer projectId={id} />
    </Box>
  );
}
