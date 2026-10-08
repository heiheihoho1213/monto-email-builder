/**
 * Small builders for composing email templates as block trees.
 * Used by the header/footer templates and the starter email templates.
 */
import type { TEditorBlock } from './core';

export type TPadding = { top: number; bottom: number; left: number; right: number };

export type TTemplateNode = {
  type: TEditorBlock['type'];
  data: Record<string, any>;
  /** Container children */
  children?: TTemplateNode[];
  /** ColumnsContainer columns */
  columns?: TTemplateNode[][];
};


export const pad = (top: number, bottom: number, x = 24): TPadding => ({ top, bottom, left: x, right: x });
export const NO_PAD = pad(0, 0, 0);

export const logoUrl = (bg: string, fg: string, label = 'YOUR LOGO') =>
  `https://placehold.co/180x48/${bg}/${fg}/png?text=${encodeURIComponent(label)}&font=montserrat`;

export function image(url: string, opts: { padding: TPadding; width?: number; align?: 'left' | 'center' | 'right'; alt?: string }): TTemplateNode {
  return {
    type: 'Image',
    data: {
      style: { padding: opts.padding, textAlign: opts.align ?? 'center' },
      props: { url, alt: opts.alt ?? 'Logo', linkHref: 'https://example.com', width: opts.width ?? 140, contentAlignment: 'middle' },
    },
  };
}

export function heading(textValue: string, style: Record<string, unknown>, level: 'h1' | 'h2' | 'h3' = 'h2'): TTemplateNode {
  return { type: 'Heading', data: { style, props: { level, text: textValue } } };
}

/** Plain text block */
export function text(value: string, style: Record<string, unknown>): TTemplateNode {
  return { type: 'Text', data: { style, props: { text: value } } };
}

/** Rich text block (allowed tags: a, b, br, p, span, strong, em, u) */
export function html(body: string, style: Record<string, unknown>): TTemplateNode {
  return { type: 'Text', data: { style, props: { html: `<div style="margin:0;padding:0;">${body}</div>` } } };
}

export const p = (inner: string) => `<p style="margin:0;">${inner}</p>`;
export const link = (label: string, href: string, color: string, extra = '') =>
  `<a href="${href}" target="_blank" style="color:${color};text-decoration:none;${extra}">${label}</a>`;
export const UNSUBSCRIBE_HREF = '{%unsubscribe_link%}';

export function navLinks(items: string[], color: string, separator = '&nbsp;&nbsp;·&nbsp;&nbsp;') {
  return items.map((label) => link(label, 'https://example.com', color, 'font-weight:600;')).join(separator);
}

export function button(
  label: string,
  opts: { bg: string; color: string; align?: 'left' | 'center' | 'right'; padding: TPadding; style?: 'rectangle' | 'pill' | 'rounded'; size?: 'x-small' | 'small' | 'medium' | 'large' }
): TTemplateNode {
  return {
    type: 'Button',
    data: {
      style: { fontSize: 14, fontWeight: 'bold', textAlign: opts.align ?? 'center', padding: opts.padding },
      props: {
        text: label,
        url: 'https://example.com',
        buttonBackgroundColor: opts.bg,
        buttonTextColor: opts.color,
        buttonStyle: opts.style ?? 'rounded',
        size: opts.size ?? 'small',
      },
    },
  };
}

export function divider(color: string, padding: TPadding): TTemplateNode {
  return { type: 'Divider', data: { style: { padding }, props: { lineHeight: 1, lineColor: color } } };
}

export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'x', 'linkedin'];
export function socials(iconStyle: string, padding: TPadding, platforms = SOCIAL_PLATFORMS, iconSize = 28): TTemplateNode {
  return {
    type: 'Socials',
    data: {
      style: { padding, textAlign: 'center' },
      props: {
        platforms,
        iconStyle,
        iconSize,
        socials: platforms.map((platform) => ({ platform, url: 'https://example.com' })),
      },
    },
  };
}

export function columns(cols: TTemplateNode[][], opts: { padding: TPadding; bg?: string; fixedWidths?: (number | null)[] }): TTemplateNode {
  const fixed = opts.fixedWidths ?? [];
  return {
    type: 'ColumnsContainer',
    data: {
      style: { backgroundColor: opts.bg ?? null, padding: opts.padding },
      props: {
        columnsCount: cols.length,
        columnsGap: 16,
        contentAlignment: 'middle',
        fixedWidths: [fixed[0] ?? null, fixed[1] ?? null, fixed[2] ?? null, fixed[3] ?? null],
      },
    },
    columns: cols,
  };
}

export function container(children: TTemplateNode[], style: Record<string, unknown>): TTemplateNode {
  return { type: 'Container', data: { style }, children };
}

