import React from 'react';

import { Button, Divider, Drawer, Stack, Typography } from '@mui/material';

import { resetDocument, useSamplesDrawerOpen } from '../../documents/editor/EditorContext';
import { useTranslation } from '../../i18n/useTranslation';
import EMPTY_EMAIL_MESSAGE from '../../getConfiguration/sample/empty-email-message';

import SidebarButton from './SidebarButton';

export const SAMPLES_DRAWER_WIDTH = 240;

export default function SamplesDrawer() {
  const { t } = useTranslation();
  const samplesDrawerOpen = useSamplesDrawerOpen();

  const handleNewDocumentClick = () => {
    resetDocument(EMPTY_EMAIL_MESSAGE);
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={samplesDrawerOpen}
      PaperProps={{
        sx: {
          position: 'relative',
          height: '100%',
          zIndex: 0,
        },
      }}
      sx={{
        position: 'relative',
        width: samplesDrawerOpen ? SAMPLES_DRAWER_WIDTH : 0,
        flexShrink: 0,
        flexGrow: 0,
        overflow: 'hidden',
        zIndex: 0,
        '& .MuiDrawer-paper': {
          position: 'relative',
          height: '100%',
          width: '100%',
          zIndex: 0,
        },
      }}
    >
      <Stack spacing={3} py={1} px={2} width={SAMPLES_DRAWER_WIDTH}>
        <Stack spacing={2} sx={{ '& .MuiButtonBase-root': { width: '100%', justifyContent: 'flex-start' } }}>
          <Typography variant="h6" component="h1" sx={{ p: 0.75 }}>
            {t('common.emailBuilder')}
          </Typography>

          <Stack spacing={1} alignItems="flex-start">
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={handleNewDocumentClick}
              sx={{
                fontWeight: 600,
                width: '100%',
                justifyContent: 'flex-start',
              }}
            >
              {t('common.newDocument')}
            </Button>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 0.75, fontWeight: 500 }}>
              {t('common.useBuiltInTemplates')}
            </Typography>
            <Stack alignItems="flex-start">
              <SidebarButton sampleName="basic-template">{t('samples.quickStart')}</SidebarButton>
              <SidebarButton sampleName="welcome">{t('samples.welcomeEmail')}</SidebarButton>
              <SidebarButton sampleName="reservation-reminder">{t('samples.reservationReminder')}</SidebarButton>
            </Stack>
          </Stack>

          {/* <Divider /> */}

          {/* <Stack>
            <Button size="small" href="https://www.usewaypoint.com/open-source/emailbuilderjs" target="_blank">
              Learn more
            </Button>
            <Button size="small" href="https://github.com/usewaypoint/email-builder-js" target="_blank">
              View on GitHub
            </Button>
          </Stack> */}
        </Stack>
      </Stack>
    </Drawer>
  );
}
