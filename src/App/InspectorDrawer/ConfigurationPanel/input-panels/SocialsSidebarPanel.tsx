import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Stack, Divider, IconButton, Select, MenuItem, Button, Paper } from '@mui/material';
import { AspectRatioOutlined, DragIndicator, DeleteOutline, Add } from '@mui/icons-material';
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [insertPosition, setInsertPosition] = useState<'top' | 'bottom' | null>(null); // 插入位置：上方或下方
  const isHandlerClickedRef = useRef<boolean>(false); // 跟踪是否点击了 handler

  const updateData = (d: unknown) => {
    const res = SocialsPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const iconStyle = data.props?.iconStyle || 'origin-colorful';
  const iconSize = data.props?.iconSize ?? 36;
  const socials = data.props?.socials || [];

  // 直接使用 socials，允许为空数组
  const currentSocials = socials;

  // 从socials中提取platforms数组
  const platforms = currentSocials.map(s => s.platform);

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

  // 更新指定索引的社媒链接
  const updateSocialUrl = (index: number, url: string | null) => {
    const newSocials = [...currentSocials];
    newSocials[index] = { ...newSocials[index], url };
    updateData({
      ...data,
      props: {
        ...data.props,
        platforms: newSocials.map(s => s.platform),
        socials: newSocials,
      },
    });
  };

  // 更新指定索引的社媒平台
  const updateSocialPlatform = (index: number, platform: SocialPlatform) => {
    const newSocials = [...currentSocials];
    newSocials[index] = { ...newSocials[index], platform };
    updateData({
      ...data,
      props: {
        ...data.props,
        platforms: newSocials.map(s => s.platform),
        socials: newSocials,
      },
    });
  };

  // 删除指定索引的社媒（允许全部删除）
  const deleteSocial = (index: number) => {
    const newSocials = currentSocials.filter((_, i) => i !== index);
    updateData({
      ...data,
      props: {
        ...data.props,
        platforms: newSocials.map(s => s.platform),
        socials: newSocials,
      },
    });
  };

  // 添加新的社媒（允许重复）
  const addSocial = () => {
    // 优先选择未选择过的第一个社媒
    const usedPlatforms = new Set(currentSocials.map(s => s.platform));
    const availablePlatform = SOCIAL_PLATFORMS.find(p => !usedPlatforms.has(p));

    // 如果都选择过了，就选择第一个（facebook）
    const platformToAdd = availablePlatform || SOCIAL_PLATFORMS[0];

    const newSocials = [...currentSocials, { platform: platformToAdd as SocialPlatform, url: null }];
    updateData({
      ...data,
      props: {
        ...data.props,
        platforms: newSocials.map(s => s.platform),
        socials: newSocials,
      },
    });
  };

  // 拖拽排序（插入操作）
  const handleDragStart = (index: number, e: React.DragEvent) => {
    // 检查是否是通过 handler 触发的拖拽
    if (!isHandlerClickedRef.current) {
      e.preventDefault();
      return;
    }

    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `social-${index}`);
  };

  // Handler 鼠标按下事件
  const handleHandlerMouseDown = () => {
    isHandlerClickedRef.current = true;
  };

  // 鼠标松开时重置标记
  useEffect(() => {
    const handleMouseUp = () => {
      isHandlerClickedRef.current = false;
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex === null) return;

    // 如果拖拽到自己的位置，不显示插入线
    if (draggedIndex === index) {
      setDragOverIndex(null);
      setInsertPosition(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseY = e.clientY;
    const elementCenterY = rect.top + rect.height / 2;

    // 根据鼠标位置判断是插入到上方还是下方
    const position = mouseY < elementCenterY ? 'top' : 'bottom';

    setDragOverIndex(index);
    setInsertPosition(position);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 完全禁用 handleDragLeave 的清除逻辑
    // 让插入线保持显示，直到 drop 或 dragEnd
    // 这样可以避免在间隙中移动时意外清除拖拽状态
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex === null) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setInsertPosition(null);
      return;
    }

    // 如果拖拽到自己的位置，不执行任何操作
    if (draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setInsertPosition(null);
      return;
    }

    const newSocials = [...currentSocials];
    const [removed] = newSocials.splice(draggedIndex, 1);

    // 根据插入位置计算目标索引
    let targetIndex: number;
    if (insertPosition === 'top') {
      // 插入到目标项的上方
      targetIndex = dropIndex;
      // 如果源元素在目标元素之前，由于已经移除了源元素，索引需要减1
      if (draggedIndex < dropIndex) {
        targetIndex = dropIndex - 1;
      }
    } else {
      // 插入到目标项的下方
      targetIndex = dropIndex + 1;
      // 如果源元素在目标元素之前，由于已经移除了源元素，索引需要减1
      if (draggedIndex < dropIndex) {
        targetIndex = dropIndex;
      }
    }

    // 确保索引在有效范围内
    targetIndex = Math.max(0, Math.min(targetIndex, newSocials.length));

    newSocials.splice(targetIndex, 0, removed);

    updateData({
      ...data,
      props: {
        ...data.props,
        platforms: newSocials.map(s => s.platform),
        socials: newSocials,
      },
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
    setInsertPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setInsertPosition(null);
    isHandlerClickedRef.current = false; // 重置标记
  };

  const isZh = language === 'zh';

  return (
    <BaseSidebarPanel title={t('socials.title')}>
      {/* 社媒选择 - 可拖拽排序的列表 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontSize: '12px', fontWeight: 500 }}>
          {t('socials.selectPlatforms')}
        </Typography>
        <Stack
          spacing={1}
          onDragOver={(e) => {
            // 在 Stack 容器上处理拖拽，确保即使鼠标在间隙中也能保持拖拽状态
            if (draggedIndex !== null) {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';

              const mouseY = e.clientY;

              // 找到所有 Paper 元素
              const papers = Array.from((e.currentTarget as HTMLElement).querySelectorAll('.MuiPaper-root')) as HTMLElement[];

              // 遍历所有 Paper 元素，找到鼠标位置对应的索引
              for (let i = 0; i < papers.length; i++) {
                const paperRect = papers[i].getBoundingClientRect();

                // 检查鼠标是否在这个 Paper 元素的范围内（包括上下方的间隙）
                // 扩大范围，包括上方和下方的间隙（增加到 24px 以覆盖更多区域）
                const expandedTop = paperRect.top - 24; // 上方间隙
                const expandedBottom = paperRect.bottom + 24; // 下方间隙

                if (mouseY >= expandedTop && mouseY <= expandedBottom) {
                  const paperCenterY = paperRect.top + paperRect.height / 2;
                  const position = mouseY < paperCenterY ? 'top' : 'bottom';

                  if (i !== draggedIndex) {
                    setDragOverIndex(i);
                    setInsertPosition(position);
                  }
                  break;
                }
              }
            }
          }}
          onDrop={(e) => {
            // 在 Stack 容器上也处理 drop，确保在间隙中也能完成拖拽
            if (draggedIndex !== null && dragOverIndex !== null) {
              e.preventDefault();
              e.stopPropagation();
              handleDrop(e, dragOverIndex);
            }
          }}
        >
          {currentSocials.map((social, index) => {
            const platformName = isZh ? PLATFORM_NAMES[social.platform as SocialPlatform].zh : PLATFORM_NAMES[social.platform as SocialPlatform].en;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            const showTopInsertLine = isDragOver && insertPosition === 'top';
            const showBottomInsertLine = isDragOver && insertPosition === 'bottom';
            // 使用索引作为 key，确保即使平台相同也能正确渲染和拖拽
            const itemKey = `social-${index}`;

            return (
              <React.Fragment key={itemKey}>
                {/* 上方插入线 */}
                {showTopInsertLine && (
                  <Box
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      // 在插入线上时，设置为在该面板上方插入
                      if (draggedIndex !== null && draggedIndex !== index) {
                        setDragOverIndex(index);
                        setInsertPosition('top');
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDrop(e, index);
                    }}
                    sx={{
                      height: '24px', // 进一步增加高度，覆盖更多间隙区域
                      py: '11px', // 增加内边距
                      display: 'flex',
                      alignItems: 'center',
                      // cursor: 'move',
                      position: 'relative',
                      zIndex: 1, // 确保插入线在最上层
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '50%',
                        left: '0',
                        right: '0',
                        transform: 'translateY(-50%)',
                        height: '2px',
                        backgroundColor: 'primary.main',
                        borderRadius: '1px',
                        mx: 1,
                      },
                    }}
                  />
                )}
                <Paper
                  draggable
                  onDragStart={(e) => handleDragStart(index, e)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    handleDragOver(e, index);
                  }}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(e, index);
                  }}
                  onDragEnd={handleDragEnd}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: isDragging ? 'action.hover' : 'background.paper',
                    opacity: isDragging ? 0.5 : 1,
                    // cursor: 'move',
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <IconButton
                      size="small"
                      sx={{ cursor: 'grab', color: 'text.secondary', '&:active': { cursor: 'grabbing' } }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleHandlerMouseDown();
                      }}
                    >
                      <DragIndicator fontSize="small" />
                    </IconButton>
                    <Select
                      value={social.platform}
                      onChange={(e) => updateSocialPlatform(index, e.target.value as SocialPlatform)}
                      size="small"
                      sx={{ flex: 1, fontSize: '12px' }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {SOCIAL_PLATFORMS.map((platform) => {
                        const name = isZh ? PLATFORM_NAMES[platform].zh : PLATFORM_NAMES[platform].en;
                        return (
                          <MenuItem key={platform} value={platform}>
                            {name}
                          </MenuItem>
                        );
                      })}
                    </Select>
                    <IconButton
                      size="small"
                      onClick={() => deleteSocial(index)}
                      sx={{ color: 'error.main' }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                    <TextInput
                      label=""
                      placeholder={`${t('socials.iconUrl')} - ${platformName}`}
                      defaultValue={social.url || ''}
                      onChange={(url) => updateSocialUrl(index, url || null)}
                    />
                  </Box>
                </Paper>
                {/* 下方插入线 */}
                {showBottomInsertLine && (
                  <Box
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      // 在插入线上时，设置为在该面板下方插入
                      if (draggedIndex !== null && draggedIndex !== index) {
                        setDragOverIndex(index);
                        setInsertPosition('bottom');
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDrop(e, index);
                    }}
                    sx={{
                      height: '24px', // 进一步增加高度，覆盖更多间隙区域
                      py: '11px', // 增加内边距
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'move',
                      position: 'relative',
                      zIndex: 1, // 确保插入线在最上层
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '50%',
                        left: '0',
                        right: '0',
                        transform: 'translateY(-50%)',
                        height: '2px',
                        backgroundColor: 'primary.main',
                        borderRadius: '1px',
                        mx: 1,
                      },
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </Stack>
        <Button
          startIcon={<Add />}
          onClick={addSocial}
          variant="outlined"
          size="small"
          fullWidth
          sx={{ mt: 1 }}
        >
          {t('socials.addAnother')}
        </Button>
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

      {/* Background Color, Alignment and Padding */}
      <MultiStylePropertyPanel
        names={['backgroundColor', 'padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}
