import React from 'react';
import { Box, Typography } from '@mui/material';
import { Socials, SocialsProps } from 'monto-email-block-socials';
// import { Socials, SocialsProps } from '../../../../monto-email-block-socials/src';

import { useTranslation } from '../../../i18n/useTranslation';

type SocialsEditorProps = SocialsProps;

export default function SocialsEditor(props: SocialsEditorProps) {
  const { t } = useTranslation();

  const socials = props.props?.socials || [];
  const platforms = props.props?.platforms || [];

  // 如果没有配置社交媒体平台，显示占位符
  const displayPlatforms = socials.length > 0 ? socials.map(s => s.platform) : platforms;
  if (displayPlatforms.length === 0) {
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

  // Socials 组件现在直接支持 socials 数组的顺序和重复
  return <Socials {...props} />;
}
