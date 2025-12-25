import React, { useRef, useState } from 'react';

import {
  CloudUploadOutlined,
  LinkOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignCenterOutlined,
  VerticalAlignTopOutlined,
} from '@mui/icons-material';
import { Button, CircularProgress, Stack, ToggleButton, Typography } from '@mui/material';
import { ImageProps, ImagePropsSchema } from '@usewaypoint/block-image';
import { ZodError } from 'zod';

import { useImageUploadHandler } from '../../../../documents/editor/EditorContext';
import { useTranslation } from '../../../../i18n/useTranslation';

import BaseSidebarPanel from './helpers/BaseSidebarPanel';
import RadioGroupInput from './helpers/inputs/RadioGroupInput';
import TextDimensionInput from './helpers/inputs/TextDimensionInput';
import TextInput from './helpers/inputs/TextInput';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel';

type ImageSidebarPanelProps = {
  data: ImageProps;
  setData: (v: ImageProps) => void;
};
export default function ImageSidebarPanel({ data, setData }: ImageSidebarPanelProps) {
  const { t } = useTranslation();
  const [, setErrors] = useState<ZodError | null>(null);
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUploadHandler = useImageUploadHandler();

  const updateData = (d: unknown) => {
    const res = ImagePropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!imageUploadHandler) {
      return;
    }

    setUploading(true);
    try {
      const url = await imageUploadHandler(file);
      updateData({ ...data, props: { ...data.props, url } });
      // 上传成功后切换到URL模式，显示上传后的URL
      setUploadMode('url');
    } catch {
      // Error handled silently
    } finally {
      setUploading(false);
      // 重置文件输入，以便可以再次选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <BaseSidebarPanel title={t('image.imageBlock')}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1}>
          <ToggleButton
            value="url"
            selected={uploadMode === 'url'}
            onChange={() => setUploadMode('url')}
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
            size="small"
            fullWidth
            disabled={!imageUploadHandler}
          >
            <CloudUploadOutlined fontSize="small" sx={{ mr: 0.5 }} />
            {t('image.upload')}
          </ToggleButton>
        </Stack>

        {uploadMode === 'url' ? (
          <TextInput
            label={t('image.sourceUrl')}
            defaultValue={data.props?.url ?? ''}
            onChange={(v) => {
              const url = v.trim().length === 0 ? null : v.trim();
              updateData({ ...data, props: { ...data.props, url } });
            }}
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
              disabled={uploading || !imageUploadHandler}
              fullWidth
            >
              {uploading ? t('image.uploading') : t('image.selectImage')}
            </Button>
            {!imageUploadHandler && (
              <Typography variant="caption" color="text.secondary">
                {t('image.uploadHandlerNotConfigured')}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>

      <TextInput
        label={t('image.altText')}
        defaultValue={data.props?.alt ?? ''}
        onChange={(alt) => updateData({ ...data, props: { ...data.props, alt } })}
      />
      <TextInput
        label={t('image.clickThroughUrl')}
        defaultValue={data.props?.linkHref ?? ''}
        onChange={(v) => {
          const linkHref = v.trim().length === 0 ? null : v.trim();
          updateData({ ...data, props: { ...data.props, linkHref } });
        }}
      />
      <Stack direction="row" spacing={2}>
        <TextDimensionInput
          label={t('image.width')}
          defaultValue={data.props?.width}
          onChange={(width) => updateData({ ...data, props: { ...data.props, width } })}
        />
        <TextDimensionInput
          label={t('image.height')}
          defaultValue={data.props?.height}
          onChange={(height) => updateData({ ...data, props: { ...data.props, height } })}
        />
      </Stack>

      <RadioGroupInput
        label={t('image.alignment')}
        defaultValue={data.props?.contentAlignment ?? 'middle'}
        onChange={(contentAlignment) => updateData({ ...data, props: { ...data.props, contentAlignment } })}
      >
        <ToggleButton value="top">
          <VerticalAlignTopOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="middle">
          <VerticalAlignCenterOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="bottom">
          <VerticalAlignBottomOutlined fontSize="small" />
        </ToggleButton>
      </RadioGroupInput>

      <MultiStylePropertyPanel
        names={['backgroundColor', 'textAlign', 'padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}
