import React from 'react';
import { Box, Typography } from '@mui/material';
import { Video, VideoProps } from 'monto-email-block-video';

import { useTranslation } from '../../../i18n/useTranslation';

type VideoEditorProps = VideoProps;

export default function VideoEditor(props: VideoEditorProps) {
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
          {t('video.placeholder')}
        </Typography>
      </Box>
    );
  }

  // 如果有 URL，显示视频
  // const videoUrl = props.props.url;
  // const width = props.props.width || '100%';
  // const height = props.props.height || 'auto';
  // const autoplay = props.props.autoplay ?? false;
  // const loop = props.props.loop ?? false;
  // const muted = props.props.muted ?? false;
  // const controls = props.props.controls ?? true;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: props.props.contentAlignment === 'top' ? 'flex-start' :
          props.props.contentAlignment === 'bottom' ? 'flex-end' : 'center',
        width: '100%',
        padding: props.style?.padding ?
          `${props.style.padding.top}px ${props.style.padding.right}px ${props.style.padding.bottom}px ${props.style.padding.left}px` :
          undefined,
        backgroundColor: props.style?.backgroundColor || undefined,
        textAlign: props.style?.textAlign || undefined,
      }}
    >
      <Video {...props} />
    </Box>
  );
}

