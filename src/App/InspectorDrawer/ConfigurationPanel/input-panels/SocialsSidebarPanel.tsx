import React, { useState } from 'react';
import { Box, Typography, Checkbox, FormControlLabel, Grid, Stack, Divider } from '@mui/material';
import { AspectRatioOutlined } from '@mui/icons-material';
import { useTranslation } from '../../../../i18n/useTranslation';
import SocialsPropsSchema, { SocialsProps, SOCIAL_PLATFORMS, ICON_STYLES, SocialPlatform, IconStyle } from '../../../../documents/blocks/Socials/SocialsPropsSchema';
import BaseSidebarPanel from './helpers/BaseSidebarPanel';
import ToggleButton from '@mui/material/ToggleButton';
import TextInput from './helpers/inputs/TextInput';
import SliderInput from './helpers/inputs/SliderInput';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel';
import { ZodError } from 'zod';

// 平台显示名称映射
const PLATFORM_NAMES: Record<SocialPlatform, { zh: string; en: string }> = {
  facebook: { zh: 'Facebook', en: 'Facebook' },
  instagram: { zh: 'Instagram', en: 'Instagram' },
  x: { zh: 'X (Twitter)', en: 'X (Twitter)' },
  linkedin: { zh: 'LinkedIn', en: 'LinkedIn' },
  youtube: { zh: 'YouTube', en: 'YouTube' },
  tiktok: { zh: 'TikTok', en: 'TikTok' },
  snapchat: { zh: 'Snapchat', en: 'Snapchat' },
  whatsapp: { zh: 'WhatsApp', en: 'WhatsApp' },
  telegram: { zh: 'Telegram', en: 'Telegram' },
  discord: { zh: 'Discord', en: 'Discord' },
  reddit: { zh: 'Reddit', en: 'Reddit' },
  twitch: { zh: 'Twitch', en: 'Twitch' },
  threads: { zh: 'Threads', en: 'Threads' },
};

// 图标类别显示名称映射
const ICON_STYLE_NAMES: Record<IconStyle, { zh: string; en: string }> = {
  'no-border-black': { zh: '深色', en: 'Glyph Dark' },
  'no-border-white': { zh: '浅色', en: 'Glyph Light' },
  'origin-colorful': { zh: '面性·彩色', en: 'Circular Dynamic Color' },
  'with-border-black': { zh: '面性·深色', en: 'Circular Dark' },
  'with-border-white': { zh: '面性·浅色', en: 'Circular Light' },
  'with-border-line-colorful': { zh: '线性·彩色', en: 'Circular Outline Color' },
  'with-border-line-black': { zh: '线性·黑白', en: 'Circular Outline Dark' },
  'with-border-line-white': { zh: '线性·浅色', en: 'Circular Outline Light' },
  'standard': { zh: '标准', en: 'Standard' },
};

type SocialsSidebarPanelProps = {
  data: SocialsProps;
  setData: (v: SocialsProps) => void;
};

export default function SocialsSidebarPanel({ data, setData }: SocialsSidebarPanelProps) {
  const { t, language } = useTranslation();
  const [, setErrors] = useState<ZodError | null>(null);

  const updateData = (d: unknown) => {
    const res = SocialsPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const platforms = data.props?.platforms || [];
  const iconStyle = data.props?.iconStyle || 'origin-colorful';
  const iconSize = data.props?.iconSize ?? 36;
  const socials = data.props?.socials || [];

  // 默认显示 facebook、instagram、x
  const defaultPlatforms: SocialPlatform[] = ['facebook', 'instagram', 'x'];
  const currentPlatforms: SocialPlatform[] = platforms.length > 0 ? (platforms as SocialPlatform[]) : defaultPlatforms;

  // 处理平台多选
  const handlePlatformToggle = (platform: SocialPlatform) => {
    const newPlatforms: SocialPlatform[] = currentPlatforms.includes(platform)
      ? currentPlatforms.filter((p) => p !== platform) as SocialPlatform[]
      : [...currentPlatforms, platform];

    // 同步更新 socials 数组
    const newSocials = socials.filter((s) => newPlatforms.includes(s.platform as SocialPlatform));
    // 为新添加的平台创建默认配置
    newPlatforms.forEach((p: SocialPlatform) => {
      if (!newSocials.find((s) => s.platform === p)) {
        newSocials.push({
          platform: p,
          url: null,
        });
      }
    });

    updateData({
      ...data,
      props: {
        ...data.props,
        platforms: newPlatforms,
        socials: newSocials,
      },
    });
  };

  // 处理图标类别选择
  const handleIconStyleChange = (style: string) => {
    updateData({
      ...data,
      props: {
        ...data.props,
        iconStyle: style as IconStyle,
      },
    });
  };

  // 更新指定平台的链接
  const updatePlatformUrl = (platform: SocialPlatform, url: string | null) => {
    const existingSocial = socials.find((s) => s.platform === platform);
    let newSocials: typeof socials;

    if (existingSocial) {
      newSocials = socials.map((s) =>
        s.platform === platform ? { ...s, url } : s
      );
    } else {
      newSocials = [...socials, { platform, url }];
    }

    updateData({
      ...data,
      props: {
        ...data.props,
        socials: newSocials,
      },
    });
  };

  // 获取指定平台的链接
  const getPlatformUrl = (platform: SocialPlatform): string => {
    const social = socials.find((s) => s.platform === platform);
    return social?.url || '';
  };

  const isZh = language === 'zh';

  return (
    <BaseSidebarPanel title={t('socials.title')}>
      {/* 选择社媒类型（多选） */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontSize: '12px', fontWeight: 500 }}>
          {t('socials.selectPlatforms')}
        </Typography>
        <Grid container spacing={1}>
          {SOCIAL_PLATFORMS.map((platform) => {
            const isSelected = currentPlatforms.includes(platform);
            const platformName = isZh ? PLATFORM_NAMES[platform].zh : PLATFORM_NAMES[platform].en;
            return (
              <Grid item xs={6} key={platform}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handlePlatformToggle(platform)}
                      size="small"
                    />
                  }
                  label={platformName}
                  sx={{ m: 0 }}
                />
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* 选择图标类别 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontSize: '12px', fontWeight: 500 }}>
          {t('socials.iconStyle')}
        </Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {ICON_STYLES.map((style) => {
            const styleName = isZh ? ICON_STYLE_NAMES[style].zh : ICON_STYLE_NAMES[style].en;
            const isSelected = iconStyle === style;
            return (
              <ToggleButton
                key={style}
                value={style}
                selected={isSelected}
                onChange={() => handleIconStyleChange(style)}
                fullWidth
                size="small"
                sx={{
                  fontSize: '12px',
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                }}
              >
                {styleName}
              </ToggleButton>
            );
          })}
        </Stack>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* 图标尺寸统一配置 */}
      <Box sx={{ mb: 2 }}>
        <SliderInput
          label={t('socials.iconSize')}
          iconLabel={<AspectRatioOutlined sx={{ fontSize: 16 }} />}
          defaultValue={iconSize}
          onChange={(size) => {
            updateData({
              ...data,
              props: {
                ...data.props,
                iconSize: size,
              },
            });
          }}
          min={12}
          max={48}
          step={2}
          units="px"
          marks
        />
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* 链接配置 - 为每个选中的平台显示链接输入框，按照固定顺序排列 */}
      {currentPlatforms.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontSize: '12px', fontWeight: 500 }}>
            {t('socials.iconUrl')}
          </Typography>
          <Stack spacing={2}>
            {SOCIAL_PLATFORMS.filter((platform) => currentPlatforms.includes(platform)).map((platform) => {
              const platformName = isZh ? PLATFORM_NAMES[platform].zh : PLATFORM_NAMES[platform].en;
              return (
                <TextInput
                  key={platform}
                  label={platformName}
                  defaultValue={getPlatformUrl(platform)}
                  onChange={(url) => updatePlatformUrl(platform, url || null)}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Background Color, Alignment and Padding */}
      <MultiStylePropertyPanel
        names={['backgroundColor', 'padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}
