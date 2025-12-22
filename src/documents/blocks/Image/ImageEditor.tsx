import React from 'react';

import { Box, Typography } from '@mui/material';
import { Image, ImageProps } from '@usewaypoint/block-image';

import { useTranslation } from '../../../i18n/useTranslation';

type ImageEditorProps = ImageProps;

export default function ImageEditor(props: ImageEditorProps) {
  const { t } = useTranslation();
  
  // 如果没有 URL，显示空白占位符
  if (!props.props?.url) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          backgroundColor: '#F5F5F5',
          border: '2px dashed #CCCCCC',
          borderRadius: 1,
          color: '#999999',
        }}
      >
        <Typography variant="body2" sx={{ textAlign: 'center', px: 2 }}>
          {t('image.placeholder')}
        </Typography>
      </Box>
    );
  }

  // 如果有 URL，正常显示图片
  return <Image {...props} />;
}

