import React, { useRef, useState } from 'react';

import {
  CloudUploadOutlined,
  LinkOutlined,
} from '@mui/icons-material';
import { Box, Button, CircularProgress, Stack, TextField, ToggleButton, Typography } from '@mui/material';
import { Video, VideoProps } from 'monto-email-block-video';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, editorStateStore, useVideoUploadHandler } from '../../editor/EditorContext';
import { useTranslation } from '../../../i18n/useTranslation';

type VideoEditorProps = VideoProps;

export default function VideoEditor(props: VideoEditorProps) {
  const { t } = useTranslation();
  const blockId = useCurrentBlockId();
  const videoUploadHandler = useVideoUploadHandler();
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 如果没有 URL，显示空白占位符和快捷操作
  if (!props.props?.url) {
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !videoUploadHandler) return;

      setUploading(true);
      try {
        const url = await videoUploadHandler(file);
        const currentBlock = editorStateStore.getState().document[blockId];
        if (currentBlock && currentBlock.type === 'Video') {
          setDocument({
            [blockId]: {
              ...currentBlock,
              data: {
                ...currentBlock.data,
                props: {
                  ...currentBlock.data.props,
                  url,
                },
              },
            },
          });
        }
        setUploadMode('url');
      } catch {
        // Error handled silently
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    const handleUploadClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      fileInputRef.current?.click();
    };

    const handleUrlSubmit = () => {
      const url = urlInput.trim().length === 0 ? null : urlInput.trim();
      const currentBlock = editorStateStore.getState().document[blockId];
      if (currentBlock && currentBlock.type === 'Video') {
        setDocument({
          [blockId]: {
            ...currentBlock,
            data: {
              ...currentBlock.data,
              props: {
                ...currentBlock.data.props,
                url,
              },
            },
          },
        });
      }
      setUrlInput('');
    };

    return (
      <Box
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          border: '2px dashed #cccccc73',
          borderRadius: 1,
          p: 2,
          gap: 2,
        }}
      >
        <Typography variant="body2" sx={{ textAlign: 'center', px: 2 }}>
          {t('video.placeholder')}
        </Typography>
        
        <Stack spacing={1} sx={{ width: '100%', maxWidth: 400 }}>
          <Stack direction="row" spacing={1}>
            <ToggleButton
              value="url"
              selected={uploadMode === 'url'}
              onChange={() => setUploadMode('url')}
              onMouseDown={(e) => e.stopPropagation()}
              size="small"
              fullWidth
            >
              <LinkOutlined fontSize="small" sx={{ mr: 0.5 }} />
              {t('video.url')}
            </ToggleButton>
            <ToggleButton
              value="upload"
              selected={uploadMode === 'upload'}
              onChange={() => setUploadMode('upload')}
              onMouseDown={(e) => e.stopPropagation()}
              size="small"
              fullWidth
              disabled={!videoUploadHandler}
            >
              <CloudUploadOutlined fontSize="small" sx={{ mr: 0.5 }} />
              {t('video.upload')}
            </ToggleButton>
          </Stack>

          {uploadMode === 'url' ? (
            <TextField
              size="small"
              placeholder={t('video.sourceUrl')}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUrlSubmit();
                }
              }}
              onBlur={handleUrlSubmit}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              fullWidth
            />
          ) : (
            <Stack spacing={1}>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Button
                variant="outlined"
                startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadOutlined />}
                onClick={handleUploadClick}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={uploading || !videoUploadHandler}
                fullWidth
              >
                {uploading ? t('video.uploading') : t('video.selectVideo')}
              </Button>
              {!videoUploadHandler && (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('video.uploadHandlerNotConfigured')}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
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
        backgroundColor: props.style?.backgroundColor || undefined,
        textAlign: props.style?.textAlign || undefined,
      }}
    >
      <Video {...props} />
    </Box>
  );
}

