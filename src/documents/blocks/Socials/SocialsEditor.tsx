import React from 'react';
import { Box, Typography } from '@mui/material';
import { Socials, SocialsProps } from 'monto-email-block-socials';

import { useTranslation } from '../../../i18n/useTranslation';

type SocialsEditorProps = SocialsProps;

export default function SocialsEditor(props: SocialsEditorProps) {
  const { t } = useTranslation();

  // 如果没有配置社交媒体链接，显示占位符
  if (!props.props?.socials || props.props.socials.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 100,
          backgroundColor: '#F5F5F5',
          border: '2px dashed #CCCCCC',
          borderRadius: 1,
          color: '#999999',
        }}
      >
        <Typography variant="body2" sx={{ textAlign: 'center', px: 2 }}>
          Social Media Icons Placeholder
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: props.style?.padding ?
          `${props.style.padding.top}px ${props.style.padding.right}px ${props.style.padding.bottom}px ${props.style.padding.left}px` :
          undefined,
        backgroundColor: props.style?.backgroundColor || undefined,
        textAlign: props.style?.textAlign || undefined,
      }}
    >
      <Socials {...props} />
    </Box>
  );
}

