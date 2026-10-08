import React, { useEffect, useRef, useState } from 'react';

import { Box, CircularProgress } from '@mui/material';
import { renderToStaticMarkup } from 'monto-email-core';

import { TEditorConfiguration } from '../../documents/editor/core';

const EMAIL_WIDTH = 600;

// 去掉 EmailLayout 的外边距，让缩略图贴边显示
const PREVIEW_CSS = '<style>html,body{margin:0;overflow:hidden;}body>div{padding:0 !important;}</style>';

export function renderPreviewHtml(document: TEditorConfiguration): string {
  try {
    return PREVIEW_CSS + renderToStaticMarkup(document, { rootBlockId: 'root' });
  } catch {
    return PREVIEW_CSS + '<p style="font:13px sans-serif;color:#999;padding:16px">Preview unavailable</p>';
  }
}

type Props = {
  /** 已渲染的 HTML；为 null 时显示加载中 */
  html: string | null;
  /** 缩略图宽度（px） */
  width: number;
  /** 缩略图区域高度（px）：内容垂直居中，超出部分从顶部开始裁切 */
  maxHeight: number;
};

/** 将 600px 宽的邮件 HTML 等比缩放为缩略图 */
export default function TemplatePreview({ html, width, maxHeight }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const scale = width / EMAIL_WIDTH;

  useEffect(() => setContentHeight(null), [html]);

  const handleLoad = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    // 测量邮件内容本身（documentElement.scrollHeight 至少等于 iframe 视口高度，不能用）
    const measure = () => {
      const content = doc.body.querySelector(':scope > div') as HTMLElement | null;
      const h = Math.ceil(content ? content.getBoundingClientRect().height : doc.body.scrollHeight);
      if (h > 0) setContentHeight(h);
    };
    measure();
    // 图片加载完成后高度会变化
    doc.querySelectorAll('img').forEach((img) => img.addEventListener('load', measure));
  };

  const fullHeight = contentHeight ?? maxHeight / scale;
  const boxHeight = Math.min(fullHeight * scale, maxHeight);

  return (
    <Box
      sx={{
        width,
        height: maxHeight,
        display: 'flex',
        alignItems: contentHeight !== null && boxHeight < maxHeight ? 'center' : 'flex-start',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {html === null ? (
        <CircularProgress size={20} />
      ) : (
        <Box sx={{ width, height: boxHeight, overflow: 'hidden', flexShrink: 0, boxShadow: contentHeight !== null && boxHeight < maxHeight ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
        <iframe
          ref={iframeRef}
          title="preview"
          srcDoc={html}
          sandbox="allow-same-origin"
          onLoad={handleLoad}
          tabIndex={-1}
          style={{
            width: EMAIL_WIDTH,
            height: fullHeight,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
            display: 'block',
          }}
        />
        </Box>
      )}
    </Box>
  );
}
