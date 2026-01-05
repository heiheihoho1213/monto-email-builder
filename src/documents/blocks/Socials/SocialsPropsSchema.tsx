import { z } from 'zod';
import { zPadding } from '../helpers/zod';

// 支持的社媒平台
export const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'x',
  'linkedin',
  'youtube',
  'tiktok',
  'snapchat',
  'whatsapp',
  'telegram',
  'discord',
  'reddit',
  'twitch',
  'threads',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

// 图标类别
export const ICON_STYLES = [
  'no-border-black', // 深色 (Glyph Dark) -> glyph-dark
  'no-border-white', // 浅色 (Glyph Light) -> glyph-light
  'origin-colorful', // 面性·彩色 (Circular Dynamic Color) -> circular-dynamic-color
  'with-border-black', // 面性·深色 (Circular Dark) -> circular-dark
  'with-border-white', // 面性·浅色 (Circular Light) -> circular-light
  'with-border-line-colorful', // 线性·彩色 (Circular Outline Color) -> circular-outline-color
  'with-border-line-black', // 线性·黑白 (Circular Outline Dark) -> circular-outline-dark
  'with-border-line-white', // 线性·浅色 (Circular Outline Light) -> circular-outline-light
  'standard', // 标准 (Standard) -> standard
] as const;

export type IconStyle = (typeof ICON_STYLES)[number];

const SocialsPropsSchema = z.object({
  props: z
    .object({
      // 选中的社媒平台列表
      platforms: z.array(z.enum(SOCIAL_PLATFORMS as [string, ...string[]])).optional().nullable(),
      // 图标类别
      iconStyle: z.enum(ICON_STYLES as [string, ...string[]]).optional().nullable(),
      // 图标统一尺寸（宽高相同）
      iconSize: z.number().optional().nullable(),
      // 每个平台的配置
      socials: z
        .array(
          z.object({
            platform: z.enum(SOCIAL_PLATFORMS as [string, ...string[]]),
            url: z.string().optional().nullable(),
          })
        )
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
  style: z
    .object({
      padding: zPadding().optional().nullable(),
      backgroundColor: z.string().optional().nullable(),
      textAlign: z.enum(['left', 'center', 'right']).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export default SocialsPropsSchema;

export type SocialsProps = z.infer<typeof SocialsPropsSchema>;

