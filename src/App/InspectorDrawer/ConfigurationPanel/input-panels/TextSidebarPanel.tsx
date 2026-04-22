import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CloseOutlined, DataObjectOutlined } from '@mui/icons-material';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Checkbox, Divider, FormControlLabel, IconButton, InputLabel, MenuItem, Popover, Select, SelectChangeEvent, Stack, TextField, Typography } from '@mui/material';
import { TextProps, TextPropsSchema, getResolvedTextBodyHtml } from 'monto-email-block-text';
import { ZodError } from 'zod';
import { useTranslation } from '../../../../i18n/useTranslation';
import {
  markLastInlineStyleApply,
  setTextSelection,
  useLastTextBlockContent,
  useContactAttributes,
  useTextCaret,
  useTextSelection,
  queueTextDomApply,
} from '../../../../documents/editor/EditorContext';
import {
  extractInsertedVariableOccurrencesFromHtmlString,
  getLinkInRangeFromHtmlString,
  readInlineStyleInRangeFromHtmlString,
} from '../../../../documents/blocks/Text/textDom';
import { BASE_VARIABLE_GROUPS, VariableGroup } from '../../../../documents/blocks/Text/variableCatalog';
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
  'letterSpacing',
  'fontWeight',
  'fontStyle',
  'textDecoration',
];

const GLOBAL_NAMES: (keyof TStyle)[] = ['lineHeight', 'textAlign', 'padding'];

type LinkKind = 'web' | 'email';

const VARIABLE_GROUPS: VariableGroup[] = BASE_VARIABLE_GROUPS;

type TextSidebarPanelProps = {
  blockId: string;
  data: TextProps;
  setData: (v: TextProps) => void;
};

export default function TextSidebarPanel({ blockId, data, setData }: TextSidebarPanelProps) {
  const { t } = useTranslation();
  const [, setErrors] = useState<ZodError | null>(null);
  const textSelection = useTextSelection();
  const textCaret = useTextCaret();
  const lastTextBlockContent = useLastTextBlockContent();
  const contactAttributes = useContactAttributes();

  const variableGroups = useMemo(() => {
    const safeField = (s: unknown) => (typeof s === 'string' ? s.trim() : '');
    const custom = (Array.isArray(contactAttributes) ? contactAttributes : [])
      .filter((a) => {
        const f = safeField((a as any)?.AttrField);
        if (!f) return false;
        const en = (a as any)?.Enable;
        if (en === 0 || en === false) return false;
        return true;
      })
      .map((a) => {
        const f = safeField((a as any)?.AttrField);
        const label =
          safeField((a as any)?.AttrComment) ||
          safeField((a as any)?.Name) ||
          f;
        return { name: f, labelKey: label, kind: 'user' as const, isCustomLabel: true };
      });

    const base = VARIABLE_GROUPS.map((g) => ({
      ...g,
      items: g.items.map((it) => ({ ...it, isCustomLabel: false as const })),
    }));

    const contacts = base.find((g) => g.id === 'contacts');
    if (contacts) {
      const existing = new Set(contacts.items.map((i) => i.name));
      for (const it of custom) {
        if (!existing.has(it.name)) contacts.items.push(it as any);
      }
    }
    return base as Array<
      (typeof base)[number] & {
        items: Array<(typeof base)[number]['items'][number] & { isCustomLabel: boolean }>;
      }
    >;
  }, [contactAttributes]);

  /** 选区行内样式：合并同一帧内多次变更（如滑块拖动），避免每秒数百次 setDocument + renderToStaticMarkup */
  const pendingSelectionStyleRef = useRef<Partial<TStyle>>({});
  const selectionStyleRafRef = useRef<number | null>(null);

  const flushPendingSelectionStyle = useCallback(() => {
    selectionStyleRafRef.current = null;
    const patch = pendingSelectionStyleRef.current;
    pendingSelectionStyleRef.current = {};
    if (Object.keys(patch).length === 0) return;
    markLastInlineStyleApply();
    queueTextDomApply(blockId, { kind: 'style', style: patch });
  }, [blockId]);

  useEffect(() => {
    pendingSelectionStyleRef.current = {};
    if (selectionStyleRafRef.current != null) {
      cancelAnimationFrame(selectionStyleRafRef.current);
      selectionStyleRafRef.current = null;
    }
  }, [blockId]);

  const hasSelection =
    textSelection?.blockId === blockId && textSelection.start < textSelection.end;

  const displayStyle = useMemo((): TStyle => {
    const global = data.style ?? {};
    if (!hasSelection || !textSelection) return global;
    const html = getResolvedTextBodyHtml(data.props ?? null);
    const snapFromHtml = readInlineStyleInRangeFromHtmlString(html, textSelection.start, textSelection.end);
    if (snapFromHtml && Object.keys(snapFromHtml).length) return { ...global, ...snapFromHtml };
    const snapFromStore =
      lastTextBlockContent?.blockId === blockId ? lastTextBlockContent.styleSnapshot : undefined;
    if (snapFromStore && Object.keys(snapFromStore).length) return { ...global, ...snapFromStore };
    return global;
  }, [data.style, data.props, hasSelection, textSelection, lastTextBlockContent, blockId]);

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
    const prev = displayStyle as Record<string, unknown>;
    const next = newStyle as Record<string, unknown>;
    const ALL_KEYS: (keyof TStyle)[] = [...SELECTION_AWARE_KEYS, 'lineHeight', 'textAlign', 'padding'];
    const changed: Partial<TStyle> = {};
    for (const k of ALL_KEYS) {
      if (next[k as string] !== prev[k as string]) {
        const nv = next[k as string];
        // undefined 表示「本次控件未带该字段」，不要写进 patch，否则合并时会覆盖 DOM 里已有的字号等
        if (nv === undefined) continue;
        changed[k] = nv;
      }
    }
    // 粗体/斜体/装饰由同一 Toggle 组驱动，必须整组进 patch；否则只传「本次 diff 里的一项」会覆盖掉 DOM 里另几项（侧栏快照与 DOM 易不同步）
    const FORMAT_TRIO: (keyof TStyle)[] = ['fontWeight', 'fontStyle', 'textDecoration'];
    const formatTouched = FORMAT_TRIO.some((k) => next[k as string] !== prev[k as string]);
    if (formatTouched) {
      for (const k of FORMAT_TRIO) {
        const nv = next[k as string];
        if (nv !== undefined) (changed as Record<string, unknown>)[k as string] = nv;
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
      updateData({ ...data, style: { ...data.style, ...patch } });
    };

    if (!hasSelection || !textSelection) {
      applyGlobalPatch({ ...changedSelectionAware, ...changedGlobalOnly });
      return;
    }

    if (Object.keys(changedGlobalOnly).length) {
      applyGlobalPatch(changedGlobalOnly);
    }

    if (Object.keys(changedSelectionAware).length) {
      Object.assign(pendingSelectionStyleRef.current, changedSelectionAware);
      if (selectionStyleRafRef.current == null) {
        selectionStyleRafRef.current = requestAnimationFrame(flushPendingSelectionStyle);
      }
    }
  };

  const textForSnippet =
    lastTextBlockContent?.blockId === blockId ? lastTextBlockContent.text : '';

  const selectedSnippet =
    hasSelection && textSelection ? textForSnippet.slice(textSelection.start, textSelection.end) : '';

  const linkEnabled = hasSelection;
  // 明确需求：用户手打的 {{...}} 不识别为变量；只有插入式 span[data-text-variable] 才算变量。
  // 插入按钮只需要“无选区”即可；编辑器内部会保证 caret 不会落进变量 span。
  const variableEnabled = !hasSelection;
  const htmlForVariables = useMemo(() => getResolvedTextBodyHtml(data.props ?? null), [data.props]);
  const allowedVariableNames = useMemo(() => {
    const all = new Set<string>();
    for (const g of variableGroups) {
      for (const it of g.items) {
        if (it.kind === 'user') all.add(it.name);
      }
    }
    return all;
  }, [variableGroups]);
  /** 用户变量按「实例」列出（同名多次出现各自有默认值）；内置 {% %} 不在此列。依赖 data-variable-instance-id（编辑器挂载后会迁移补齐）。 */
  const recognizedUserVariableInstances = useMemo(() => {
    const occ = extractInsertedVariableOccurrencesFromHtmlString(htmlForVariables);
    const out: { instanceId: string; name: string; label: string }[] = [];
    const nameCount = new Map<string, number>();
    for (const o of occ) {
      if (o.builtin) continue;
      if (!allowedVariableNames.has(o.name)) continue;
      if (!o.instanceId) continue;
      const n = nameCount.get(o.name) ?? 0;
      nameCount.set(o.name, n + 1);
      const label = n === 0 ? `{{${o.name}}}` : `{{${o.name}}} (${n + 1})`;
      out.push({
        instanceId: o.instanceId,
        name: o.name,
        label,
      });
    }
    return out;
  }, [htmlForVariables, allowedVariableNames]);
  const variableDefaults = (data.props as any)?.variableDefaults ?? null;

  const [linkAnchorEl, setLinkAnchorEl] = useState<null | HTMLElement>(null);
  const [variableAnchorEl, setVariableAnchorEl] = useState<null | HTMLElement>(null);
  const [variableExpanded, setVariableExpanded] = useState<VariableGroup['id'] | null>('contacts');
  const [linkKind, setLinkKind] = useState<LinkKind>('web');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkTargetBlank, setLinkTargetBlank] = useState<boolean>(true);
  const linkUrlInputRef = useRef<HTMLInputElement | null>(null);

  const RFC5322_EMAIL_RE =
    /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;

  const RFC3986_HOST_RE = /^(?:\[(?:[A-Fa-f0-9:.]+)\]|(?:[A-Za-z0-9\-._~!$&'()*+,;=]|%[0-9A-Fa-f]{2})+)$/;

  const extractAuthorityHost = (urlLike: string): string | null => {
    const m = urlLike.match(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/?#]*)/);
    if (!m) return null;
    const authority = m[1];
    const hostPort = authority.replace(/^.*@/, '');
    if (!hostPort) return null;
    if (hostPort.startsWith('[')) {
      const close = hostPort.indexOf(']');
      if (close <= 0) return null;
      return hostPort.slice(0, close + 1);
    }
    return hostPort.split(':')[0] || null;
  };

  const getSafeHref = (kind: LinkKind, raw: string): string | null => {
    const v = raw.trim();
    if (!v) return null;
    // Links 内置变量（不含空格/换行）
    if (/^\{\%[A-Za-z_][A-Za-z0-9_]*\%\}$/.test(v)) {
      return v;
    }
    if (kind === 'email') {
      const email = v.replace(/^mailto:/i, '').trim();
      if (!RFC5322_EMAIL_RE.test(email)) return null;
      return `mailto:${email}`;
    }
    const normalized = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    const rawHost = extractAuthorityHost(normalized);
    if (!rawHost) return null;
    if (!RFC3986_HOST_RE.test(rawHost)) return null;
    // 禁止纯数字 host 被 URL 规范化为 IPv4（例如 134230 => 0.2.13.86）。
    if (/^\d+$/.test(rawHost)) return null;
    try {
      const parsed = new URL(normalized);
      if (!/^https?:$/i.test(parsed.protocol)) return null;
      if (!parsed.hostname) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const getExistingLinkInRange = (start: number, end: number) => {
    const html = getResolvedTextBodyHtml(data.props ?? null);
    return getLinkInRangeFromHtmlString(html, start, end);
  };

  const handleOpenLink = (e: React.MouseEvent<HTMLElement>) => {
    if (!linkEnabled || !textSelection) return;
    const existing = getExistingLinkInRange(textSelection.start, textSelection.end);
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

  const builtinLinkVars = useMemo(() => {
    const g = variableGroups.find((x) => x.id === 'links');
    return g ? g.items : [];
  }, [variableGroups]);

  const insertIntoLinkUrlAtCursor = (token: string) => {
    const el = linkUrlInputRef.current;
    if (!el) {
      setLinkUrl(token);
      return;
    }
    const start = el.selectionStart ?? linkUrl.length;
    const end = el.selectionEnd ?? linkUrl.length;
    const next = linkUrl.slice(0, start) + token + linkUrl.slice(end);
    setLinkUrl(next);
    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      } catch {
        // ignore
      }
    });
  };

  const handleOpenVariable = (e: React.MouseEvent<HTMLElement>) => {
    if (!variableEnabled) return;
    setVariableAnchorEl(e.currentTarget);
    setVariableExpanded('contacts');
  };

  const handleCloseVariable = () => {
    setVariableAnchorEl(null);
  };

  const handleInsertVariable = (name: string, kind: 'user' | 'builtin') => {
    if (!variableEnabled) return;
    const token = kind === 'builtin' ? `{%${name}%}` : `{{${name}}}`;
    queueTextDomApply(blockId, { kind: 'variable', token });
    setVariableAnchorEl(null);
  };

  const handleSaveLink = () => {
    if (!textSelection) return;
    const safeHref = getSafeHref(linkKind, linkUrl);
    if (!safeHref) return;

    markLastInlineStyleApply();
    queueTextDomApply(blockId, {
      kind: 'link',
      href: safeHref,
      targetBlank: linkTargetBlank,
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
            {selectedSnippet
              ? t('text.selectedSnippet', {
                  snippet: selectedSnippet.length > 20 ? selectedSnippet.slice(0, 20) + '…' : selectedSnippet,
                })
              : t('text.selectionRange')}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setTextSelection(null)}
            aria-label={t('text.clearSelection')}
            sx={{ flexShrink: 0 }}
          >
            <CloseOutlined fontSize="small" />
          </IconButton>
        </Stack>
      )}
      <Stack direction="row" alignItems="start" flexDirection="column" justifyContent="space-between">
        <InputLabel shrink>{t('text.link')}</InputLabel>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignSelf: 'flex-start' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleOpenLink}
            disabled={!linkEnabled}
            aria-label={t('text.link')}
            startIcon={<LinkOutlined fontSize="small" />}
            sx={{
              color: 'text.secondary',
              borderColor: 'divider',
              borderRadius: 1,
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
      </Stack>

      <Stack direction="row" alignItems="start" flexDirection="column" justifyContent="space-between" sx={{ mt: 2 }}>
        <InputLabel shrink>{t('text.variables.title')}</InputLabel>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, alignSelf: 'flex-start' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleOpenVariable}
            disabled={!variableEnabled}
            aria-label={t('text.addVariables')}
            startIcon={<DataObjectOutlined fontSize="small" />}
            sx={{
              color: 'text.secondary',
              borderColor: 'divider',
              borderRadius: 1,
              '& .MuiButton-startIcon': { color: 'text.secondary' },
              '&:hover': {
                borderColor: 'text.disabled',
                backgroundColor: 'action.hover',
              },
            }}
          >
            {t('text.addVariables')}
          </Button>
        </Stack>
      </Stack>

      {recognizedUserVariableInstances.length > 0 && (
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('text.variables.defaultsTitle')}
          </Typography>
          {recognizedUserVariableInstances.map((inst) => (
            <Stack
              key={inst.instanceId}
              direction="row"
              alignItems="flex-start"
              sx={{ flexWrap: 'wrap', rowGap: 0.5 }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  flex: '0 1 180px',
                  minWidth: 0,
                  wordBreak: 'break-all',
                  whiteSpace: 'normal',
                  lineHeight: 1.2,
                }}
              >
                {inst.label}
              </Typography>
              <TextField
                size="small"
                fullWidth
                sx={{
                  flex: '1 1 200px',
                  minWidth: 160,
                }}
                value={(variableDefaults && variableDefaults[inst.instanceId]) ?? ''}
                placeholder={t('text.variables.defaultPlaceholder')}
                onChange={(ev) => {
                  const next = { ...(variableDefaults ?? {}) } as Record<string, string>;
                  next[inst.instanceId] = ev.target.value;
                  updateData({ ...data, props: { ...(data.props as object), variableDefaults: next } });
                }}
              />
            </Stack>
          ))}
        </Stack>
      )}
      <MultiStylePropertyPanel names={SELECTION_AWARE_NAMES} value={displayStyle} onChange={handleStyleChange} />
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
            inputRef={linkUrlInputRef}
          />

          {builtinLinkVars.length > 0 && (
            <Stack spacing={0.75}>
              <Typography variant="body2" color="text.secondary">
                {t('text.linkBuiltinVariables')}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {builtinLinkVars.map((it) => (
                  <Button
                    key={it.name}
                    size="small"
                    variant="outlined"
                    onClick={() => insertIntoLinkUrlAtCursor(`{%${it.name}%}`)}
                    sx={{ borderColor: 'divider', color: 'text.secondary' }}
                  >
                    {`{%${it.name}%}`}
                  </Button>
                ))}
              </Stack>
            </Stack>
          )}

          <FormControlLabel
            control={
              <Checkbox checked={linkTargetBlank} onChange={(ev) => setLinkTargetBlank(ev.target.checked)} />
            }
            label={t('text.linkTargetBlank')}
          />

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 1 }}>
            <Button variant="outlined" onClick={handleCloseLink}>
              {t('common.cancel')}
            </Button>
            <Button variant="contained" onClick={handleSaveLink} disabled={!getSafeHref(linkKind, linkUrl)}>
              {t('common.save')}
            </Button>
          </Box>
        </Stack>
      </Popover>

      <Popover
        open={Boolean(variableAnchorEl)}
        anchorEl={variableAnchorEl}
        onClose={handleCloseVariable}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 360, p: 2.5, maxHeight: 500, overflowY: 'auto' } }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('text.addVariables')}
          </Typography>
          <Box>
            {variableGroups.map((g, idx) => {
              const titleKey =
                g.id === 'contacts'
                  ? 'text.variables.groupContacts'
                  : g.id === 'email'
                    ? 'text.variables.groupEmail'
                    : g.id === 'organization'
                      ? 'text.variables.groupOrganization'
                      : g.id === 'date'
                        ? 'text.variables.groupDate'
                        : 'text.variables.groupLinks';

              const expanded = variableExpanded === g.id;

              return (
                <Accordion
                  key={g.id}
                  disableGutters
                  square
                  elevation={0}
                  expanded={expanded}
                  onChange={(_, next) => setVariableExpanded(next ? g.id : null)}
                  sx={{
                    '&:before': { display: 'none' },
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    mb: 1,
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreOutlined fontSize="small" />}
                    sx={{
                      minHeight: 40,
                      '& .MuiAccordionSummary-content': { my: 0.75 },
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      {t(titleKey)}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 1.25 }}>
                    <Stack sx={{ mt: 0.5 }}>
                      {g.items.map((it) => (
                        <Button
                          key={it.name}
                          size="small"
                          variant="outlined"
                          sx={{
                            justifyContent: 'flex-start',
                            color: 'text.secondary',
                            borderColor: 'divider',
                            borderRadius: 1,
                            mb: 0.5,
                            '&:hover': {
                              borderColor: 'text.disabled',
                              backgroundColor: 'action.hover',
                            },
                          }}
                          onClick={() => handleInsertVariable(it.name, it.kind)}
                        >
                          <Stack spacing={0} alignItems="flex-start">
                            <Typography variant="caption" color="text.primary" fontSize={14}>
                              {(it as any).isCustomLabel ? it.labelKey : t(it.labelKey)}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              fontSize={11}
                              sx={{ fontFamily: 'monospace' }}
                            >
                              {it.kind === 'builtin' ? `{%${it.name}%}` : `{{${it.name}}}`}
                            </Typography>
                          </Stack>
                        </Button>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        </Stack>
      </Popover>
    </BaseSidebarPanel>
  );
}
