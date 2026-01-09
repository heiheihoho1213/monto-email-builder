import React, { useRef, useState } from 'react';

import {
  CloudUploadOutlined,
  LinkOutlined,
} from '@mui/icons-material';
import { Box, Button, CircularProgress, Stack, TextField, ToggleButton, Typography } from '@mui/material';
import { Image, ImageProps } from '@usewaypoint/block-image';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, editorStateStore, useImageUploadHandler } from '../../editor/EditorContext';
import { useTranslation } from '../../../i18n/useTranslation';

type ImageEditorProps = ImageProps;

export default function ImageEditor(props: ImageEditorProps) {
  const { t } = useTranslation();
  const blockId = useCurrentBlockId();
  const imageUploadHandler = useImageUploadHandler();
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 如果没有 URL，显示空白占位符和快捷操作
  if (!props.props?.url) {
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !imageUploadHandler) return;

      setUploading(true);
      try {
        const url = await imageUploadHandler(file);
        const currentBlock = editorStateStore.getState().document[blockId];
        if (currentBlock && currentBlock.type === 'Image') {
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
      if (currentBlock && currentBlock.type === 'Image') {
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
          minHeight: 150,
          border: '2px dashed #cccccc73',
          borderRadius: 1,
          p: 2,
          gap: 2,
        }}
      >
        <Typography variant="body2" sx={{ textAlign: 'center', px: 2 }}>
          {t('image.placeholder')}
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
              {t('image.url')}
            </ToggleButton>
            <ToggleButton
              value="upload"
              selected={uploadMode === 'upload'}
              onChange={() => setUploadMode('upload')}
              onMouseDown={(e) => e.stopPropagation()}
              size="small"
              fullWidth
              disabled={!imageUploadHandler}
            >
              <CloudUploadOutlined fontSize="small" sx={{ mr: 0.5 }} />
              {t('image.upload')}
            </ToggleButton>
          </Stack>

          {uploadMode === 'url' ? (
            <TextField
              size="small"
              placeholder={t('image.sourceUrl')}
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
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Button
                variant="outlined"
                startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadOutlined />}
                onClick={handleUploadClick}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={uploading || !imageUploadHandler}
                fullWidth
              >
                {uploading ? t('image.uploading') : t('image.selectImage')}
              </Button>
              {!imageUploadHandler && (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('image.uploadHandlerNotConfigured')}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </Box>
    );
  }

  // 如果有 URL，正常显示图片
  return <Image {...props} />;
}

