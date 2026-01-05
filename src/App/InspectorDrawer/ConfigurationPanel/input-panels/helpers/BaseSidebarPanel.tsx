import React from 'react';

import { Box, Stack, Typography } from '@mui/material';

type SidebarPanelProps = {
  title: string;
  children: React.ReactNode;
};
export default function BaseSidebarPanel({ title, children }: SidebarPanelProps) {
  return (
    <Box p={2} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        {title}
      </Typography>
      <Stack spacing={3} mb={3} sx={{ width: '100%', maxWidth: '100%' }}>
        {children}
      </Stack>
    </Box>
  );
}
