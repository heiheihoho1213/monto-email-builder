import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from '../../../../i18n/useTranslation';
import SocialsPropsSchema, { SocialsProps } from '../../../../documents/blocks/Socials/SocialsPropsSchema';
import BaseSidebarPanel from './helpers/BaseSidebarPanel';

type SocialsSidebarPanelProps = {
  data: SocialsProps;
  setData: (v: SocialsProps) => void;
};

export default function SocialsSidebarPanel({ data, setData }: SocialsSidebarPanelProps) {
  const { t } = useTranslation();

  return (
    <BaseSidebarPanel title="Social Media">
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Social Media Icons Configuration (Placeholder)
        </Typography>
      </Box>
    </BaseSidebarPanel>
  );
}

