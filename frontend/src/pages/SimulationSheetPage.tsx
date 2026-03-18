import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SimulationSheetContainer from '../components/SimulationSheetContainer';

/**
 * 売上シミュレーション入力ページ。
 * URL パラメータからプロジェクトIDを取得してシミュレーション入力シートを表示する。
 * 月次のみの入力ができる。表示ページへのリンクボタンを提供する。
 */
export default function SimulationSheetPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Typography>プロジェクトが見つかりません</Typography>;
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">シミュレーション入力</Typography>
        <Button
          variant="outlined"
          startIcon={<VisibilityIcon />}
          component={RouterLink}
          to={`/projects/${id}/simulation`}
        >
          表示・閲覧
        </Button>
      </Box>
      <SimulationSheetContainer projectId={id} />
    </Box>
  );
}
