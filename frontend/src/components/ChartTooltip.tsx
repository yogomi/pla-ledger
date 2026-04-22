import React from 'react';
import { Box, Typography } from '@mui/material';
import type { TooltipContentProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

/**
 * 折れ線グラフ共通カスタムTooltip。
 * 各系列の値を表示し、dataにnoteJa/noteEnが含まれる場合は両言語のコメントを追記する。
 */
export default function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;

  const noteJa = payload[0]?.payload?.noteJa as string | null | undefined;
  const noteEn = payload[0]?.payload?.noteEn as string | null | undefined;

  return (
    <Box sx={{
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: 1,
      p: 1,
      maxWidth: 300,
    }}>
      <Typography variant="caption" display="block" fontWeight="bold">{label}</Typography>
      {payload.map(entry => (
        <Typography
          key={String(entry.name)}
          variant="caption"
          display="block"
          sx={{ color: entry.color }}
        >
          {entry.name}: {typeof entry.value === 'number' ? Math.round(entry.value).toLocaleString() : String(entry.value ?? '')}
        </Typography>
      ))}
      {(noteJa || noteEn) && (
        <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px solid #eee' }}>
          {noteJa && (
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
              {noteJa}
            </Typography>
          )}
          {noteEn && (
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
              {noteEn}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
