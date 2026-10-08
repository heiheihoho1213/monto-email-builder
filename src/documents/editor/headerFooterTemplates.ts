import type { TEditorBlock } from './core';
import {
  NO_PAD,
  TTemplateNode,
  UNSUBSCRIBE_HREF,
  button,
  columns,
  container,
  divider,
  heading,
  html,
  image,
  link,
  logoUrl,
  navLinks,
  p,
  pad,
  socials,
  SOCIAL_PLATFORMS,
  text,
} from './templateBuilders';

export type { TTemplateNode } from './templateBuilders';

/**
 * Predefined header / footer templates.
 *
 * A template is a small tree of blocks; `flattenTemplate` turns it into editor blocks
 * with fresh ids when it is applied. The first `FEATURED_COUNT` of each list are shown
 * in the sidebar, the rest under "More".
 */

export const FEATURED_COUNT = 3;

export type TSlotTemplate = {
  id: string;
  name: { en: string; zh: string };
  description: { en: string; zh: string };
  containerStyle: Record<string, unknown>;
  nodes: TTemplateNode[];
};

// ==================== Headers ====================

export const HEADER_TEMPLATES: TSlotTemplate[] = [
  {
    id: 'header-logo-nav',
    name: { en: 'Logo + navigation', zh: 'Logo + 导航' },
    description: { en: 'Logo on the left, menu links on the right', zh: '左侧 Logo，右侧导航链接' },
    containerStyle: { backgroundColor: '#FFFFFF', padding: NO_PAD },
    nodes: [
      columns(
        [
          [image(logoUrl('ffffff', '111827'), { padding: pad(0, 0, 0), width: 130, align: 'left' })],
          [html(p(navLinks(['Shop', 'Blog', 'Contact'], '#111827')), { fontSize: 14, textAlign: 'right', padding: pad(0, 0, 0) })],
        ],
        { padding: pad(20, 20) }
      ),
      divider('#EEEEEE', pad(0, 0, 0)),
    ],
  },
  {
    id: 'header-centered-logo',
    name: { en: 'Centered logo', zh: '居中 Logo' },
    description: { en: 'Clean, centered brand logo', zh: '简洁居中的品牌 Logo' },
    containerStyle: { backgroundColor: '#FFFFFF', padding: NO_PAD },
    nodes: [image(logoUrl('ffffff', '111827'), { padding: pad(28, 20), width: 150 }), divider('#EEEEEE', pad(0, 0, 24))],
  },
  {
    id: 'header-brand-banner',
    name: { en: 'Brand banner', zh: '品牌横幅' },
    description: { en: 'Bold colored banner with title', zh: '醒目的彩色横幅与标题' },
    containerStyle: { backgroundColor: '#4F46E5', padding: NO_PAD },
    nodes: [
      image(logoUrl('4f46e5', 'ffffff'), { padding: pad(28, 8), width: 120 }),
      heading('Big news is here', { color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold', padding: pad(8, 4) }, 'h1'),
      text('Everything you need to know this month', { color: '#E0E7FF', fontSize: 15, textAlign: 'center', padding: pad(0, 32) }),
    ],
  },
  {
    id: 'header-dark-nav',
    name: { en: 'Dark with menu', zh: '深色导航' },
    description: { en: 'Dark bar, light logo and links', zh: '深色背景，浅色 Logo 与链接' },
    containerStyle: { backgroundColor: '#111827', padding: NO_PAD },
    nodes: [
      columns(
        [
          [image(logoUrl('111827', 'ffffff'), { padding: pad(0, 0, 0), width: 130, align: 'left' })],
          [html(p(navLinks(['New', 'Men', 'Women', 'Sale'], '#F9FAFB')), { fontSize: 13, textAlign: 'right', padding: pad(0, 0, 0) })],
        ],
        { padding: pad(20, 20) }
      ),
    ],
  },
  {
    id: 'header-announcement',
    name: { en: 'Announcement bar', zh: '公告栏' },
    description: { en: 'Promo strip above a centered logo', zh: '顶部促销条 + 居中 Logo' },
    containerStyle: { backgroundColor: '#FFFFFF', padding: NO_PAD },
    nodes: [
      html(p(`<strong>Free shipping</strong> on all orders over $50 · ${link('Shop now →', 'https://example.com', '#FFFFFF', 'text-decoration:underline;')}`), {
        backgroundColor: '#059669',
        color: '#FFFFFF',
        fontSize: 13,
        textAlign: 'center',
        padding: pad(10, 10),
      }),
      image(logoUrl('ffffff', '064e3b'), { padding: pad(24, 20), width: 140 }),
    ],
  },
  {
    id: 'header-logo-cta',
    name: { en: 'Logo + button', zh: 'Logo + 按钮' },
    description: { en: 'Logo with a call-to-action button', zh: 'Logo 搭配行动按钮' },
    containerStyle: { backgroundColor: '#FFFFFF', padding: NO_PAD },
    nodes: [
      columns(
        [
          [image(logoUrl('ffffff', '111827'), { padding: pad(0, 0, 0), width: 130, align: 'left' })],
          [button('Sign in', { bg: '#2563EB', color: '#FFFFFF', align: 'right', padding: pad(0, 0, 0), size: 'small' })],
        ],
        { padding: pad(20, 20) }
      ),
      divider('#EEEEEE', pad(0, 0, 0)),
    ],
  },
  {
    id: 'header-newsletter',
    name: { en: 'Newsletter masthead', zh: '电子报刊头' },
    description: { en: 'Editorial title with issue and date', zh: '刊名、期号与日期' },
    containerStyle: { backgroundColor: '#FFFBF5', padding: NO_PAD },
    nodes: [
      heading('The Weekly Digest', { color: '#1C1917', fontFamily: 'BOOK_SERIF', textAlign: 'center', fontWeight: 'bold', padding: pad(32, 4) }, 'h1'),
      text('ISSUE #42  ·  OCTOBER 2026', { color: '#78716C', fontSize: 12, letterSpacing: 2, textAlign: 'center', padding: pad(4, 20) }),
      divider('#1C1917', pad(0, 0, 24)),
    ],
  },
  {
    id: 'header-logo-tagline',
    name: { en: 'Logo + tagline', zh: 'Logo + 标语' },
    description: { en: 'Logo with a short brand line', zh: 'Logo 与一句品牌标语' },
    containerStyle: { backgroundColor: '#F8FAFC', padding: NO_PAD },
    nodes: [
      image(logoUrl('f8fafc', '0f172a'), { padding: pad(28, 6), width: 140 }),
      text('Thoughtfully made, delivered to your door', { color: '#64748B', fontSize: 13, textAlign: 'center', padding: pad(0, 24) }),
    ],
  },
];

// ==================== Footers ====================

const legalLine = (color: string, linkColor: string) =>
  p(
    `You're receiving this email because you subscribed to updates from Your Company.<br />` +
      `${link('Unsubscribe', UNSUBSCRIBE_HREF, linkColor, 'text-decoration:underline;')}&nbsp;&nbsp;·&nbsp;&nbsp;` +
      `${link('Privacy policy', 'https://example.com', linkColor, 'text-decoration:underline;')}`
  ).replace('<p style="margin:0;">', `<p style="margin:0;color:${color};">`);

export const FOOTER_TEMPLATES: TSlotTemplate[] = [
  {
    id: 'footer-social-centered',
    name: { en: 'Social + legal', zh: '社交 + 法律信息' },
    description: { en: 'Social icons, address and unsubscribe', zh: '社交图标、地址与退订' },
    containerStyle: { backgroundColor: '#F9FAFB', padding: NO_PAD },
    nodes: [
      socials('with-border-line-black', pad(32, 12), SOCIAL_PLATFORMS, 32),
      text('Your Company Inc. · 123 Market Street, San Francisco, CA 94103', {
        color: '#6B7280',
        fontSize: 12,
        textAlign: 'center',
        padding: pad(8, 8),
      }),
      html(legalLine('#9CA3AF', '#6B7280'), { fontSize: 12, textAlign: 'center', lineHeight: 1.6, padding: pad(0, 32) }),
    ],
  },
  {
    id: 'footer-dark-full',
    name: { en: 'Dark complete', zh: '深色完整版' },
    description: { en: 'Logo, links, socials and legal on dark', zh: '深色背景：Logo、链接、社交与法律信息' },
    containerStyle: { backgroundColor: '#111827', padding: NO_PAD },
    nodes: [
      image(logoUrl('111827', 'ffffff'), { padding: pad(36, 16), width: 120 }),
      html(p(navLinks(['Shop', 'About us', 'Help center', 'Careers'], '#E5E7EB')), {
        fontSize: 13,
        textAlign: 'center',
        padding: pad(0, 16),
      }),
      socials('no-border-white', pad(4, 20), SOCIAL_PLATFORMS, 24),
      divider('#374151', pad(0, 0, 24)),
      html(legalLine('#9CA3AF', '#D1D5DB'), { fontSize: 12, textAlign: 'center', lineHeight: 1.6, padding: pad(20, 36) }),
    ],
  },
  {
    id: 'footer-simple',
    name: { en: 'Simple', zh: '简洁' },
    description: { en: 'Minimal copyright and unsubscribe', zh: '极简版权与退订' },
    containerStyle: { backgroundColor: '#FFFFFF', padding: NO_PAD },
    nodes: [
      divider('#E5E7EB', pad(8, 8)),
      html(
        p(`© 2026 Your Company. All rights reserved.`) +
          p(`${link('Unsubscribe', UNSUBSCRIBE_HREF, '#6B7280', 'text-decoration:underline;')}&nbsp;&nbsp;·&nbsp;&nbsp;${link('View in browser', 'https://example.com', '#6B7280', 'text-decoration:underline;')}`),
        { color: '#9CA3AF', fontSize: 12, textAlign: 'center', lineHeight: 1.7, padding: pad(8, 28) }
      ),
    ],
  },
  {
    id: 'footer-two-column',
    name: { en: 'Two columns', zh: '双栏' },
    description: { en: 'Company info beside quick links', zh: '公司信息与快捷链接并排' },
    containerStyle: { backgroundColor: '#F3F4F6', padding: NO_PAD },
    nodes: [
      columns(
        [
          [
            image(logoUrl('f3f4f6', '111827'), { padding: pad(0, 8, 0), width: 110, align: 'left' }),
            text('Making everyday life a little easier since 2012.', { color: '#4B5563', fontSize: 13, padding: pad(0, 0, 0) }),
          ],
          [
            html(
              p(`<strong style="color:#111827;">Quick links</strong>`) +
                p(link('Track your order', 'https://example.com', '#4B5563')) +
                p(link('Returns & exchanges', 'https://example.com', '#4B5563')) +
                p(link('Contact support', 'https://example.com', '#4B5563')),
              { fontSize: 13, lineHeight: 1.8, padding: pad(0, 0, 0) }
            ),
          ],
        ],
        { padding: pad(32, 20) }
      ),
      divider('#E5E7EB', pad(0, 0, 24)),
      html(legalLine('#9CA3AF', '#6B7280'), { fontSize: 11, textAlign: 'center', lineHeight: 1.6, padding: pad(16, 28) }),
    ],
  },
  {
    id: 'footer-support',
    name: { en: 'Help & support', zh: '帮助与支持' },
    description: { en: 'Support prompt with contact button', zh: '支持提示与联系按钮' },
    containerStyle: { backgroundColor: '#FFFFFF', padding: NO_PAD },
    nodes: [
      container(
        [
          heading('Questions? We’re here to help.', { color: '#0F172A', textAlign: 'center', fontWeight: 'bold', padding: pad(28, 4) }, 'h3'),
          html(p(`Reply to this email or reach us at ${link('support@yourcompany.com', 'mailto:support@yourcompany.com', '#2563EB')}`), {
            color: '#475569',
            fontSize: 14,
            textAlign: 'center',
            padding: pad(4, 12),
          }),
          button('Visit help center', { bg: '#0F172A', color: '#FFFFFF', padding: pad(4, 28), style: 'pill' }),
        ],
        { backgroundColor: '#EFF6FF', padding: NO_PAD }
      ),
      html(legalLine('#94A3B8', '#64748B'), { fontSize: 11, textAlign: 'center', lineHeight: 1.6, padding: pad(20, 28) }),
    ],
  },
  {
    id: 'footer-brand-color',
    name: { en: 'Brand color', zh: '品牌色' },
    description: { en: 'Colored block with white socials', zh: '品牌色背景与白色社交图标' },
    containerStyle: { backgroundColor: '#4F46E5', padding: NO_PAD },
    nodes: [
      text('Stay in the loop', { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center', padding: pad(32, 12) }),
      socials('with-border-white', pad(0, 20), ['instagram', 'x', 'youtube', 'tiktok'], 32),
      html(legalLine('#C7D2FE', '#FFFFFF'), { fontSize: 12, textAlign: 'center', lineHeight: 1.6, padding: pad(0, 32) }),
    ],
  },
  {
    id: 'footer-newsletter',
    name: { en: 'Newsletter', zh: '电子报' },
    description: { en: 'Forward-to-a-friend and sign-off', zh: '转发好友与结尾署名' },
    containerStyle: { backgroundColor: '#FFFBF5', padding: NO_PAD },
    nodes: [
      divider('#1C1917', pad(8, 8)),
      html(p(`Enjoyed this issue? ${link('Forward it to a friend →', 'https://example.com', '#B45309', 'font-weight:600;')}`), {
        color: '#44403C',
        fontSize: 14,
        textAlign: 'center',
        padding: pad(16, 8),
      }),
      socials('with-border-line-black', pad(8, 12), ['x', 'linkedin', 'youtube'], 28),
      html(legalLine('#A8A29E', '#78716C'), { fontSize: 11, textAlign: 'center', lineHeight: 1.6, padding: pad(4, 32) }),
    ],
  },
  {
    id: 'footer-app-download',
    name: { en: 'App download', zh: '下载 App' },
    description: { en: 'Promote your mobile app', zh: '推广移动应用' },
    containerStyle: { backgroundColor: '#0F172A', padding: NO_PAD },
    nodes: [
      text('Get the app', { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', padding: pad(32, 4) }),
      text('Track orders and get exclusive deals on the go.', { color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: pad(0, 16) }),
      columns(
        [
          [button('App Store', { bg: '#FFFFFF', color: '#0F172A', align: 'right', padding: pad(0, 0, 0), size: 'small' })],
          [button('Google Play', { bg: '#FFFFFF', color: '#0F172A', align: 'left', padding: pad(0, 0, 0), size: 'small' })],
        ],
        { padding: pad(0, 24) }
      ),
      html(legalLine('#64748B', '#CBD5E1'), { fontSize: 11, textAlign: 'center', lineHeight: 1.6, padding: pad(0, 32) }),
    ],
  },
];

/** Converts a template tree into flat editor blocks with ids built from `idPrefix`. */
export function flattenTemplate(
  template: TSlotTemplate,
  idPrefix: string
): { childrenIds: string[]; blocks: Record<string, TEditorBlock> } {
  const blocks: Record<string, TEditorBlock> = {};
  let counter = 0;

  const visit = (node: TTemplateNode): string => {
    const id = `${idPrefix}-${counter++}`;
    const data = JSON.parse(JSON.stringify(node.data));
    if (node.type === 'Container') {
      data.props = { ...(data.props ?? {}), childrenIds: (node.children ?? []).map(visit) };
    } else if (node.type === 'ColumnsContainer') {
      const cols = (node.columns ?? []).map((col) => ({ childrenIds: col.map(visit) }));
      // ColumnsContainer always stores 3 column slots
      while (cols.length < 3) cols.push({ childrenIds: [] });
      data.props = { ...(data.props ?? {}), columns: cols };
    }
    blocks[id] = { type: node.type, data } as TEditorBlock;
    return id;
  };

  const childrenIds = template.nodes.map(visit);
  return { childrenIds, blocks };
}
