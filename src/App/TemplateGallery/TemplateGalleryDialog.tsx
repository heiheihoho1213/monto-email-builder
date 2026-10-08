import React, { useEffect, useState } from 'react';

import * as CloseModule from '@mui/icons-material/Close';
import { Box, ButtonBase, Dialog, DialogContent, DialogTitle, IconButton, Tab, Tabs, Typography } from '@mui/material';

import { resolveMuiIcon } from '../../utils/resolveMuiIcon';

import TemplatePreview from './TemplatePreview';

const Close = resolveMuiIcon(CloseModule);

const CARD_WIDTH = 264;

export type TGalleryItem = {
  id: string;
  title: string;
  description?: string;
  /** 返回缩略图 HTML（可异步加载） */
  getHtml: () => string | Promise<string>;
};

export type TGalleryGroup = {
  id: string;
  label: string;
  items: TGalleryItem[];
  /** 缩略图最大高度 */
  previewMaxHeight: number;
};

type Props = {
  open: boolean;
  title: string;
  groups: TGalleryGroup[];
  initialGroupId?: string;
  onClose: () => void;
  onSelect: (groupId: string, itemId: string) => void;
};

function GalleryCard({ item, previewMaxHeight, onClick }: { item: TGalleryItem; previewMaxHeight: number; onClick: () => void }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(item.getHtml())
      .then((h) => !cancelled && setHtml(h))
      .catch(() => !cancelled && setHtml(''));
    return () => {
      cancelled = true;
    };
  }, [item]);

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'left',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        transition: 'border-color 120ms, box-shadow 120ms, transform 120ms',
        '&:hover, &.Mui-focusVisible': {
          borderColor: 'primary.main',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box sx={{ backgroundColor: '#F5F5F5', display: 'flex', justifyContent: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
        <TemplatePreview html={html} width={CARD_WIDTH} maxHeight={previewMaxHeight} />
      </Box>
      <Box sx={{ px: 1.5, py: 1.25 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {item.title}
        </Typography>
        {item.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {item.description}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
}

/** 模板画廊弹窗：网格展示带缩略图的模板，可按分组切换 */
export default function TemplateGalleryDialog({ open, title, groups, initialGroupId, onClose, onSelect }: Props) {
  const [groupId, setGroupId] = useState(initialGroupId ?? groups[0]?.id);

  useEffect(() => {
    if (open) setGroupId(initialGroupId ?? groups[0]?.id);
  }, [open, initialGroupId]);

  const group = groups.find((g) => g.id === groupId) ?? groups[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '85vh' } }}
      // 弹窗通过 portal 渲染，但 React 事件仍会冒泡到画布，这里阻断
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: groups.length > 1 ? 0 : 2 }}>
        {title}
        <IconButton onClick={onClose} size="small" aria-label="close">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      {groups.length > 1 && (
        <Tabs
          value={group?.id}
          onChange={(_, v) => setGroupId(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          {groups.map((g) => (
            <Tab key={g.id} value={g.id} label={`${g.label} (${g.items.length})`} sx={{ textTransform: 'none' }} />
          ))}
        </Tabs>
      )}
      <DialogContent sx={{ backgroundColor: '#FAFAFA' }}>
        {group && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_WIDTH}px, 1fr))`,
              justifyItems: 'center',
              gap: 2.5,
              py: 2,
              '& > *': { width: CARD_WIDTH + 2 },
            }}
          >
            {group.items.map((item) => (
              <GalleryCard
                key={item.id}
                item={item}
                previewMaxHeight={group.previewMaxHeight}
                onClick={() => {
                  onSelect(group.id, item.id);
                  onClose();
                }}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
