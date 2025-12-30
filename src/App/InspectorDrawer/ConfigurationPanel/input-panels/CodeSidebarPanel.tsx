import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from '../../../../i18n/useTranslation';
import CodePropsSchema, { CodeProps } from '../../../../documents/blocks/Code/CodePropsSchema';
import BaseSidebarPanel from './helpers/BaseSidebarPanel';

type CodeSidebarPanelProps = {
  data: CodeProps;
  setData: (v: CodeProps) => void;
};

export default function CodeSidebarPanel({ data, setData }: CodeSidebarPanelProps) {
  const { t } = useTranslation();

  return (
    <BaseSidebarPanel title="Code Block">
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Code Block Configuration (Placeholder)
        </Typography>
      </Box>
    </BaseSidebarPanel>
  );
}

