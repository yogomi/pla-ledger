import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SimulationViewContainer from '../components/SimulationViewContainer';

/**
 * シミュレーション表示ページ。
 * URL パラメータからプロジェクトIDを取得してシミュレーション結果を読み取り専用で表示する。
 * 入力ページへのリンクボタンを提供する。
 */
export default function SimulationViewPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Typography>プロジェクトが見つかりません</Typography>;
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">シミュレーション</Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          component={RouterLink}
          to={`/projects/${id}/simulation/edit`}
        >
          入力・編集
        </Button>
      </Box>
      <SimulationViewContainer projectId={id} />
    </Box>
  );
}
