import { useMemo, useState } from 'react';

import { CloseOutlined } from '@mui/icons-material';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import { Box, Button, Checkbox, Divider, FormControlLabel, IconButton, InputLabel, MenuItem, Popover, Select, SelectChangeEvent, Stack, TextField, Typography } from '@mui/material';
import { TextProps, TextPropsSchema } from 'monto-email-block-text';
import { ZodError } from 'zod';
import { useTranslation } from '../../../../i18n/useTranslation';
import { useTextSelection, useLastTextBlockContent, markLastInlineStyleApply, setTextSelection } from '../../../../documents/editor/EditorContext';
import { TStyle } from '../../../../documents/blocks/helpers/TStyle';

import BaseSidebarPanel from './helpers/BaseSidebarPanel';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel';

/** 跟随选区的 7 项：显示/应用以选区首字或整段选区为准；其余为全局 */
const SELECTION_AWARE_KEYS: (keyof TStyle)[] = [
  'color',
  'backgroundColor',
  'fontFamily',
  'fontSize',
  'letterSpacing',
  'fontWeight',
  'fontStyle',
  'textDecoration',
];

const SELECTION_AWARE_NAMES: (keyof TStyle)[] = [
  'color',
  'backgroundColor',
  'fontFamily',
  'fontSize',
  // 跟随选区控制组：letterSpacing + B/I/U/Strike（由 MultiStylePropertyPanel 自动渲染 formatGroup）
  'letterSpacing',
  'fontWeight',
  'fontStyle',
  'textDecoration',
];

const GLOBAL_NAMES: (keyof TStyle)[] = ['lineHeight', 'textAlign', 'padding'];

type InlineRun = { start: number; end: number; style: Record<string, unknown> };
type LinkKind = 'web' | 'email';
type InlineLink = { start: number; end: number; href: string; targetBlank?: boolean | null };

function hasStrikethrough(dec: unknown): boolean {
  return typeof dec === 'string' && dec.includes('line-through');
}

function getEffectiveStyleAtOffset(
  global: TextProps['style'],
  runs: InlineRun[] | null | undefined,
  offset: number
): TStyle {
  const s: TStyle = global ? { ...global } : {};
  if (!runs) return s;
  for (const run of runs) {
    if (offset >= run.start && offset < run.end && run.style) {
      Object.assign(s, run.style);
    }
  }
  return s;
}

type TextSidebarPanelProps = {
  blockId: string;
  data: TextProps;
  setData: (v: TextProps) => void;
};

export default function TextSidebarPanel({ blockId, data, setData }: TextSidebarPanelProps) {
  const { t } = useTranslation();
  const [, setErrors] = useState<ZodError | null>(null);
  const textSelection = useTextSelection();
  const lastTextBlockContent = useLastTextBlockContent();

  const hasSelection =
    textSelection?.blockId === blockId && textSelection.start < textSelection.end;

  const displayStyle = useMemo((): TStyle => {
    const global = data.style ?? {};
    if (!hasSelection || !textSelection) return global;
    const runs = (data.props as { inlineRuns?: InlineRun[] })?.inlineRuns ?? null;
    const firstCharStyle = getEffectiveStyleAtOffset(global, runs, textSelection.start);
    return {
      ...global,
      color: firstCharStyle.color,
      backgroundColor: firstCharStyle.backgroundColor,
      fontFamily: firstCharStyle.fontFamily,
      fontSize: firstCharStyle.fontSize,
      letterSpacing: firstCharStyle.letterSpacing,
      fontWeight: firstCharStyle.fontWeight,
      fontStyle: firstCharStyle.fontStyle,
      textDecoration: firstCharStyle.textDecoration,
    };
  }, [data, hasSelection, textSelection]);

  const updateData = (d: unknown) => {
    const res = TextPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const handleStyleChange = (newStyle: TStyle) => {
    const currentText =
      lastTextBlockContent?.blockId === blockId ? lastTextBlockContent.text : (data.props?.text ?? '');
    const prev = displayStyle as Record<string, unknown>;
    const next = newStyle as Record<string, unknown>;
    // 注意：一次点击（尤其是 TextFormatGroup 的 underline/strikethrough）可能同时改变多个字段。
    // 旧逻辑只取“第一个变化的 key”，会导致 underline 第一次点击不生效（被 fontWeight/fontStyle 抢占）。
    const ALL_KEYS: (keyof TStyle)[] = [...SELECTION_AWARE_KEYS, 'lineHeight', 'textAlign', 'padding'];
    const changed: Partial<TStyle> = {};
    for (const k of ALL_KEYS) {
      if (next[k as string] !== prev[k as string]) {
        changed[k] = next[k as string];
      }
    }
    if (Object.keys(changed).length === 0) return;

    const changedSelectionAware: Partial<TStyle> = {};
    const changedGlobalOnly: Partial<TStyle> = {};
    for (const [k, v] of Object.entries(changed)) {
      const key = k as keyof TStyle;
      if (SELECTION_AWARE_KEYS.includes(key)) changedSelectionAware[key] = v;
      else changedGlobalOnly[key] = v;
    }

    const applyGlobalPatch = (patch: Partial<TStyle>) => {
      if (!patch || Object.keys(patch).length === 0) return;
      // lineHeight/Alignment/Padding 只支持全局，并为兼容旧数据删除 inlineRuns 里的 lineHeight
      const shouldClean = 'lineHeight' in patch || 'textAlign' in patch || 'padding' in patch;
      if (shouldClean) {
        const currentProps = (data.props ?? {}) as TextProps['props'] & { inlineRuns?: InlineRun[] };
        const runs = currentProps.inlineRuns ?? [];
        const nextRuns: InlineRun[] = runs
          .map((run) => {
            const nextStyle = { ...(run.style ?? {}) } as Record<string, unknown>;
            delete nextStyle.lineHeight;
            return Object.keys(nextStyle).length ? { ...run, style: nextStyle } : null;
          })
          .filter((v): v is InlineRun => v != null);

        updateData({
          ...data,
          style: { ...data.style, ...patch },
          props: { ...data.props, inlineRuns: nextRuns.length ? nextRuns : undefined },
        });
        return;
      }
      updateData({ ...data, style: { ...data.style, ...patch } });
    };

    // 没选区：所有变化都写全局 style
    if (!hasSelection || !textSelection) {
      applyGlobalPatch({ ...changedSelectionAware, ...changedGlobalOnly });
      return;
    }

    // 有选区：selection-aware 写 inlineRuns；global-only 写全局 style
    if (Object.keys(changedGlobalOnly).length) {
      applyGlobalPatch(changedGlobalOnly);
    }

    if (Object.keys(changedSelectionAware).length) {
      const textLen = currentText.length;
      const s = Math.max(0, Math.min(textLen, textSelection.start));
      const e = Math.max(0, Math.min(textLen, textSelection.end));
      if (s >= e) return;
      const propsWithRuns = data.props as TextProps['props'] & { inlineRuns?: InlineRun[] };
      const nextRuns = [...(propsWithRuns?.inlineRuns ?? [])];
      nextRuns.push({
        start: s,
        end: e,
        style: changedSelectionAware as Record<string, unknown>,
      });
      markLastInlineStyleApply();
      updateData({
        ...data,
        props: { ...data.props, text: currentText, inlineRuns: nextRuns },
      });
    }
  };

  const textForSnippet =
    lastTextBlockContent?.blockId === blockId ? lastTextBlockContent.text : (data.props?.text ?? '');
  const selectedSnippet =
    hasSelection && textSelection
      ? textForSnippet.slice(textSelection.start, textSelection.end)
      : '';

  const linkEnabled = hasSelection && !data.props?.markdown;

  const [linkAnchorEl, setLinkAnchorEl] = useState<null | HTMLElement>(null);
  const [linkKind, setLinkKind] = useState<LinkKind>('web');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkTargetBlank, setLinkTargetBlank] = useState<boolean>(true);

  const getSafeHref = (kind: LinkKind, raw: string): string | null => {
    const v = raw.trim();
    if (!v) return null;
    if (kind === 'email') {
      const email = v.replace(/^mailto:/i, '').trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return null;
      return `mailto:${email}`;
    }
    // web
    const normalized = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const parsed = new URL(normalized);
      if (!/^https?:$/i.test(parsed.protocol)) return null;
      if (!parsed.hostname) return null;
      // 业务校验：拒绝随机单词主机名（例如 sdfsdfsdf），仅接受带点域名或 IP
      const host = parsed.hostname.trim();
      const isIpv4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(host);
      const isIpv6 = host.includes(':');
      const isDomain = host.includes('.');
      if (!isDomain && !isIpv4 && !isIpv6) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const getExistingLinkAt = (offset: number): InlineLink | null => {
    const links = ((data.props as any)?.inlineLinks ?? []) as InlineLink[];
    for (const l of links) {
      if (offset >= l.start && offset < l.end) return l;
    }
    return null;
  };

  const applyInlineLinksOverlay = (
    prev: InlineLink[] | null | undefined,
    start: number,
    end: number,
    next: InlineLink,
    text?: string
  ): InlineLink[] | undefined => {
    if (start >= end) return prev ?? undefined;
    const isWhitespaceOnly = (s: number, e: number) => {
      if (!text) return false;
      return text.slice(s, e).trim() === '';
    };
    const out: InlineLink[] = [];
    for (const l of prev ?? []) {
      if (l.end <= start || l.start >= end) {
        out.push(l);
        continue;
      }
      if (l.start < start) {
        if (!isWhitespaceOnly(l.start, start)) {
          out.push({ ...l, end: start });
        }
      }
      if (l.end > end) {
        if (!isWhitespaceOnly(end, l.end)) {
          out.push({ ...l, start: end });
        }
      }
    }
    out.push(next);
    out.sort((a, b) => a.start - b.start || a.end - b.end);

    // 合并相邻且 payload 相同的 link
    const merged: InlineLink[] = [];
    for (const l of out) {
      const last = merged[merged.length - 1];
      if (
        last &&
        last.end === l.start &&
        last.href === l.href &&
        Boolean(last.targetBlank) === Boolean(l.targetBlank)
      ) {
        last.end = l.end;
        continue;
      }
      merged.push({ ...l });
    }
    return merged.length ? merged : undefined;
  };

  const handleOpenLink = (e: React.MouseEvent<HTMLElement>) => {
    if (!linkEnabled || !textSelection) return;
    const existing = getExistingLinkAt(textSelection.start);
    if (existing) {
      if (/^mailto:/i.test(existing.href)) {
        setLinkKind('email');
        setLinkUrl(existing.href.replace(/^mailto:/i, ''));
      } else {
        setLinkKind('web');
        setLinkUrl(existing.href);
      }
      setLinkTargetBlank(Boolean(existing.targetBlank));
    } else {
      setLinkKind('web');
      setLinkUrl('');
      setLinkTargetBlank(true);
    }
    setLinkAnchorEl(e.currentTarget);
  };

  const handleCloseLink = () => {
    setLinkAnchorEl(null);
  };

  const handleSaveLink = () => {
    if (!textSelection) return;
    const safeHref = getSafeHref(linkKind, linkUrl);
    if (!safeHref) return;

    const currentText =
      lastTextBlockContent?.blockId === blockId ? lastTextBlockContent.text : (data.props?.text ?? '');
    const textLen = currentText.length;
    const s = Math.max(0, Math.min(textLen, textSelection.start));
    const e = Math.max(0, Math.min(textLen, textSelection.end));
    if (s >= e) return;

    const prev = ((data.props as any)?.inlineLinks ?? []) as InlineLink[];
    const next: InlineLink = { start: s, end: e, href: safeHref, targetBlank: linkTargetBlank };

    const nextLinks = applyInlineLinksOverlay(prev, s, e, next, currentText);

    // 默认下划线：对选区写入 textDecoration（保留删除线等其他样式）
    const currentRuns = (((data.props as any)?.inlineRuns ?? []) as InlineRun[]) ?? [];
    const underlineRuns: InlineRun[] = [];
    for (let i = s; i < e; i++) {
      const eff = getEffectiveStyleAtOffset(data.style ?? {}, currentRuns, i);
      const dec = hasStrikethrough(eff.textDecoration) ? 'underline line-through' : 'underline';
      const last = underlineRuns[underlineRuns.length - 1];
      if (last && last.end === i && (last.style as any).textDecoration === dec) {
        last.end = i + 1;
      } else {
        underlineRuns.push({ start: i, end: i + 1, style: { textDecoration: dec } });
      }
    }

    markLastInlineStyleApply();
    updateData({
      ...data,
      props: {
        ...(data.props as any),
        text: currentText,
        inlineLinks: nextLinks,
        inlineRuns: [...currentRuns, ...underlineRuns],
      },
    });
    setLinkAnchorEl(null);
  };

  return (
    <BaseSidebarPanel title={t('text.title')}>
      {hasSelection && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            py: 0.75,
            px: 1,
            borderRadius: 1,
            bgcolor: 'action.selected',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0, mr: 0.5 }}>
            {selectedSnippet ? t('text.selectedSnippet', { snippet: selectedSnippet.length > 20 ? selectedSnippet.slice(0, 20) + '…' : selectedSnippet }) : t('text.selectionRange')}
          </Typography>
          <IconButton size="small" onClick={() => setTextSelection(null)} aria-label={t('text.clearSelection')} sx={{ flexShrink: 0 }}>
            <CloseOutlined fontSize="small" />
          </IconButton>
        </Stack>
      )}
      <Stack direction="row" alignItems="start" flexDirection="column" justifyContent="space-between">
        <InputLabel shrink>{t('text.link')}</InputLabel>
        <Button
          size="small"
          variant="outlined"
          onClick={handleOpenLink}
          disabled={!linkEnabled}
          aria-label={t('text.link')}
          startIcon={<LinkOutlined fontSize="small" />}
          sx={{
            alignSelf: 'flex-start',
            mt: 0.5,
            color: 'text.secondary',
            borderColor: 'divider',
            '& .MuiButton-startIcon': { color: 'text.secondary' },
            '&:hover': {
              borderColor: 'text.disabled',
              backgroundColor: 'action.hover',
            },
          }}
        >
          {t('text.editLink')}
        </Button>
      </Stack>
      <MultiStylePropertyPanel
        names={SELECTION_AWARE_NAMES}
        value={displayStyle}
        onChange={handleStyleChange}
      />
      {/* divider 以下的字段统一按全局配置（不写 inlineRuns） */}
      <Divider sx={{ my: 2 }} />
      <MultiStylePropertyPanel names={GLOBAL_NAMES} value={displayStyle} onChange={handleStyleChange} />

      <Popover
        open={Boolean(linkAnchorEl)}
        anchorEl={linkAnchorEl}
        onClose={handleCloseLink}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 360, p: 2.5 } }}
      >
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('text.link')}
          </Typography>

          <Select
            fullWidth
            size="small"
            value={linkKind}
            onChange={(ev: SelectChangeEvent) => setLinkKind(ev.target.value as LinkKind)}
          >
            <MenuItem value="web">{t('text.linkTypeWeb')}</MenuItem>
            <MenuItem value="email">{t('text.linkTypeEmail')}</MenuItem>
          </Select>

          <TextField
            fullWidth
            size="small"
            label={t('text.linkUrl')}
            placeholder={t('text.linkPlaceholderUrl')}
            value={linkUrl}
            onChange={(ev) => setLinkUrl(ev.target.value)}
            error={!getSafeHref(linkKind, linkUrl)}
            helperText={!getSafeHref(linkKind, linkUrl) ? t('text.linkInvalid') : ' '}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={linkTargetBlank}
                onChange={(ev) => setLinkTargetBlank(ev.target.checked)}
              />
            }
            label={t('text.linkTargetBlank')}
          />

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 1 }}>
            <Button variant="outlined" onClick={handleCloseLink}>{t('common.cancel')}</Button>
            <Button
              variant="contained"
              onClick={handleSaveLink}
              disabled={!getSafeHref(linkKind, linkUrl)}
            >
              {t('common.save')}
            </Button>
          </Box>
        </Stack>
      </Popover>
    </BaseSidebarPanel>
  );
}
