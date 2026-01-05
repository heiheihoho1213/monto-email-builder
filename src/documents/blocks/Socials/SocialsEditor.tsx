import React from 'react';
import { Box, Typography } from '@mui/material';
import { Socials, SocialsProps } from 'monto-email-block-socials';

import { useTranslation } from '../../../i18n/useTranslation';

type SocialsEditorProps = SocialsProps;

export default function SocialsEditor(props: SocialsEditorProps) {
  const { t } = useTranslation();

  // 如果没有配置社交媒体平台，显示占位符
  const platforms = props.props?.platforms || [];
  if (platforms.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 100,
          // backgroundColor: '#F5F5F5',
          border: '2px dashed #cccccc73',
          borderRadius: 1,
          // color: '#999999',
        }}
      >
        <Typography variant="body2" sx={{ textAlign: 'center', px: 2 }}>
          {t('socials.placeholder')}
        </Typography>
      </Box>
    );
  }

  return <Socials {...props} />;
}

