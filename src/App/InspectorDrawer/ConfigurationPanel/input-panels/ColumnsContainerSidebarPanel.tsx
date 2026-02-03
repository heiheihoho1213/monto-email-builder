import React, { useState, useEffect } from 'react';

import {
  SpaceBarOutlined,
  UnfoldMoreOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignCenterOutlined,
  VerticalAlignTopOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ToggleButton,
  Typography,
} from '@mui/material';

import ColumnsContainerPropsSchema, {
  ColumnsContainerProps,
} from '../../../../documents/blocks/ColumnsContainer/ColumnsContainerPropsSchema';
import { ZodError } from 'zod';
import { useTranslation } from '../../../../i18n/useTranslation';
import { useDocument, useSelectedBlockId } from '../../../../documents/editor/EditorContext';

import BaseSidebarPanel from './helpers/BaseSidebarPanel';
import RadioGroupInput from './helpers/inputs/RadioGroupInput';
import SliderInput from './helpers/inputs/SliderInput';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel';

type ColumnsContainerPanelProps = {
  data: ColumnsContainerProps;
  setData: (v: ColumnsContainerProps) => void;
};
export default function ColumnsContainerPanel({ data, setData }: ColumnsContainerPanelProps) {
  const { t } = useTranslation();
  const document = useDocument();
  const selectedBlockId = useSelectedBlockId();
  const [, setErrors] = useState<ZodError | null>(null);
  const updateData = (d: unknown) => {
    const res = ColumnsContainerPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  // 从 document 中获取最新的列数据，而不是依赖传入的 data prop
  const latestBlock = selectedBlockId ? document[selectedBlockId] : null;
  const latestData = latestBlock && latestBlock.type === 'ColumnsContainer' ? latestBlock.data : data;

  const currentColumnsCount = latestData.props?.columnsCount ?? 3;
  const currentFixedWidths = latestData.props?.fixedWidths;
  // 优先使用实际的 columns 数据，如果不存在则使用默认值
  const currentColumns = latestData.props?.columns || (currentColumnsCount === 1 ? [{ childrenIds: [] }] : currentColumnsCount === 2 ? [{ childrenIds: [] }, { childrenIds: [] }] : currentColumnsCount === 4 ? [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }] : [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }]);

  // 根据当前配置确定分栏类型
  const getCurrentLayout = React.useCallback((): string => {
    if (currentColumnsCount === 1) return '1';
    if (currentColumnsCount === 4) return '4';
    if (currentColumnsCount === 2) {
      if (currentFixedWidths && currentFixedWidths[0] !== null && currentFixedWidths[0] !== undefined && currentFixedWidths[1] !== null && currentFixedWidths[1] !== undefined) {
        const val1 = currentFixedWidths[0];
        const val2 = currentFixedWidths[1];
        if (Math.abs(val1 - 66.67) < 1 && Math.abs(val2 - 33.33) < 1) return '2:1';
        if (Math.abs(val1 - 33.33) < 1 && Math.abs(val2 - 66.67) < 1) return '1:2';
        if (Math.abs(val1 - 25) < 1 && Math.abs(val2 - 75) < 1) return '1:3';
        if (Math.abs(val1 - 75) < 1 && Math.abs(val2 - 25) < 1) return '3:1';
      }
      return '2';
    }
    if (currentColumnsCount === 3) {
      return '3';
    }
    return '3';
  }, [currentColumnsCount, currentFixedWidths]);

  const handleLayoutChange = (layout: string) => {
    // 计算新布局的列数
    let newColumnsCount: number;
    switch (layout) {
      case '1':
        newColumnsCount = 1;
        break;
      case '2':
      case '2:1':
      case '1:2':
      case '1:3':
      case '3:1':
        newColumnsCount = 2;
        break;
      case '3':
        newColumnsCount = 3;
        break;
      case '4':
        newColumnsCount = 4;
        break;
      default:
        newColumnsCount = 3;
    }

    // 检查是否会丢失数据
    const willLoseData = checkDataLoss(newColumnsCount);
    if (willLoseData) {
      // 会丢失数据，显示确认对话框
      setPendingLayout(layout);
      setConfirmDialogOpen(true);
    } else {
      // 不会丢失数据，直接切换
      setLayoutValue(layout);
      executeLayoutChange(layout);
    }
  };

  const handleConfirmDialogClose = (confirmed: boolean) => {
    setConfirmDialogOpen(false);
    if (confirmed && pendingLayout) {
      setLayoutValue(pendingLayout);
      executeLayoutChange(pendingLayout);
    }
    setPendingLayout(null);
  };

  const [layoutValue, setLayoutValue] = useState(() => getCurrentLayout());
  const [pendingLayout, setPendingLayout] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // 当数据变化时更新 layoutValue
  useEffect(() => {
    setLayoutValue(getCurrentLayout());
  }, [getCurrentLayout]);

  // 检查切换布局是否会丢失数据
  const checkDataLoss = React.useCallback((newColumnsCount: number): boolean => {
    if (newColumnsCount >= currentColumnsCount) {
      // 列数增加或不变，不会丢失数据
      return false;
    }
    // 列数减少，检查被删除的列是否有内容
    // 确保使用实际的列数组长度，而不是 currentColumnsCount
    const actualColumnsLength = currentColumns.length;
    for (let i = newColumnsCount; i < actualColumnsLength; i++) {
      const column = currentColumns[i];
      if (column && column.childrenIds && column.childrenIds.length > 0) {
        return true; // 有数据会丢失
      }
    }
    return false; // 没有数据会丢失
  }, [currentColumnsCount, currentColumns]);

  // 执行布局切换
  const executeLayoutChange = (layout: string) => {
    let newColumnsCount: number;
    let newFixedWidths: [number | null | undefined, number | null | undefined, number | null | undefined, number | null | undefined] = [null, null, null, null];
    let newColumns: Array<{ childrenIds: string[] }>;

    switch (layout) {
      case '1':
        newColumnsCount = 1;
        newColumns = [{ childrenIds: [] }];
        break;
      case '2':
        newColumnsCount = 2;
        newColumns = [{ childrenIds: [] }, { childrenIds: [] }];
        break;
      case '2:1':
        newColumnsCount = 2;
        newFixedWidths = [66.67, 33.33, null, null];
        newColumns = [{ childrenIds: [] }, { childrenIds: [] }];
        break;
      case '1:2':
        newColumnsCount = 2;
        newFixedWidths = [33.33, 66.67, null, null];
        newColumns = [{ childrenIds: [] }, { childrenIds: [] }];
        break;
      case '3':
        newColumnsCount = 3;
        newColumns = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];
        break;
      case '1:3':
        newColumnsCount = 2;
        newFixedWidths = [25, 75, null, null];
        newColumns = [{ childrenIds: [] }, { childrenIds: [] }];
        break;
      case '3:1':
        newColumnsCount = 2;
        newFixedWidths = [75, 25, null, null];
        newColumns = [{ childrenIds: [] }, { childrenIds: [] }];
        break;
      case '4':
        newColumnsCount = 4;
        newColumns = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];
        break;
      default:
        newColumnsCount = 3;
        newColumns = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];
    }

    // 如果列数变化，尝试保留现有列的内容
    if (newColumnsCount !== currentColumnsCount) {
      if (newColumnsCount > currentColumnsCount) {
        // 增加列数，保留现有列，添加空列
        newColumns = [...currentColumns];
        while (newColumns.length < newColumnsCount) {
          newColumns.push({ childrenIds: [] });
        }
      } else {
        // 减少列数，保留前面的列
        newColumns = currentColumns.slice(0, newColumnsCount);
      }
    } else {
      // 列数不变，但需要确保列数组长度正确
      if (currentColumns.length === newColumnsCount) {
        // 长度正确，保留现有列
        newColumns = currentColumns;
      } else {
        // 长度不正确，重新创建
        newColumns = Array.from({ length: newColumnsCount }, (_, i) =>
          currentColumns[i] || { childrenIds: [] }
        );
      }
    }

    updateData({
      ...data,
      props: {
        ...data.props,
        columnsCount: newColumnsCount,
        columns: newColumns,
        fixedWidths: newFixedWidths,
      },
    });
  };

  return (
    <BaseSidebarPanel title={t('columns.title')}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ mb: 1, fontSize: '12px', fontWeight: 500, color: 'text.secondary' }}>
          {t('columns.layout')}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5 }}>
          <ToggleButton
            value="1"
            selected={layoutValue === '1'}
            onChange={() => handleLayoutChange('1')}
            size="small"
            sx={{ minWidth: 'unset' }}
          >
            1
          </ToggleButton>
          <ToggleButton
            value="2"
            selected={layoutValue === '2'}
            onChange={() => handleLayoutChange('2')}
            size="small"
            sx={{ minWidth: 'unset' }}
          >
            2
          </ToggleButton>
          <ToggleButton
            value="2:1"
            selected={layoutValue === '2:1'}
            onChange={() => handleLayoutChange('2:1')}
            size="small"
            sx={{ minWidth: 'unset' }}
          >
            2:1
          </ToggleButton>
          <ToggleButton
            value="1:2"
            selected={layoutValue === '1:2'}
            onChange={() => handleLayoutChange('1:2')}
            size="small"
            sx={{ minWidth: 'unset' }}
          >
            1:2
          </ToggleButton>
          <ToggleButton
            value="3"
            selected={layoutValue === '3'}
            onChange={() => handleLayoutChange('3')}
            size="small"
            sx={{ minWidth: 'unset' }}
          >
            3
          </ToggleButton>
          <ToggleButton
            value="1:3"
            selected={layoutValue === '1:3'}
            onChange={() => handleLayoutChange('1:3')}
            size="small"
            sx={{ minWidth: 'unset' }}
          >
            1:3
          </ToggleButton>
          <ToggleButton
            value="3:1"
            selected={layoutValue === '3:1'}
            onChange={() => handleLayoutChange('3:1')}
            size="small"
            sx={{ minWidth: 'unset' }}
          >
            3:1
          </ToggleButton>
          <ToggleButton
            value="4"
            selected={layoutValue === '4'}
            onChange={() => handleLayoutChange('4')}
            size="small"
            sx={{ minWidth: 'unset' }}
          >
            4
          </ToggleButton>
        </Box>
      </Box>
      <SliderInput
        label={t('columns.gap')}
        iconLabel={<SpaceBarOutlined sx={{ color: 'text.secondary' }} />}
        units="px"
        step={4}
        marks
        min={0}
        max={80}
        defaultValue={data.props?.columnsGap ?? 0}
        onChange={(columnsGap) => updateData({ ...data, props: { ...data.props, columnsGap } })}
      />
      <RadioGroupInput
        label={t('columns.alignment')}
        defaultValue={data.props?.contentAlignment ?? 'middle'}
        onChange={(contentAlignment) => {
          updateData({ ...data, props: { ...data.props, contentAlignment } });
        }}
      >
        <ToggleButton value="top" title={t('columns.alignmentTop')}>
          <VerticalAlignTopOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="middle" title={t('columns.alignmentMiddle')}>
          <VerticalAlignCenterOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="bottom" title={t('columns.alignmentBottom')}>
          <VerticalAlignBottomOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="stretch" title={t('columns.alignmentStretch')}>
          <UnfoldMoreOutlined fontSize="small" />
        </ToggleButton>
      </RadioGroupInput>

      <MultiStylePropertyPanel
        names={['backgroundColor', 'padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />

      <Dialog open={confirmDialogOpen} onClose={() => handleConfirmDialogClose(false)}>
        <DialogTitle>{t('columns.confirmChangeTitle')}</DialogTitle>
        <DialogContent>
          <Typography>{t('columns.confirmChangeMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="primary" onClick={() => handleConfirmDialogClose(false)}>{t('columns.cancel')}</Button>
          <Button variant="contained" color="error" onClick={() => handleConfirmDialogClose(true)}>
            {t('columns.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </BaseSidebarPanel>
  );
}
