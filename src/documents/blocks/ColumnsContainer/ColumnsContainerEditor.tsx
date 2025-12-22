import React from 'react';

import { ColumnsContainer as BaseColumnsContainer } from '@usewaypoint/block-columns-container';
import { Box } from '@mui/material';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, setSelectedBlockId } from '../../editor/EditorContext';
import EditorChildrenIds, { EditorChildrenChange } from '../helpers/EditorChildrenIds';

import ColumnsContainerPropsSchema, { ColumnsContainerProps } from './ColumnsContainerPropsSchema';

const EMPTY_COLUMNS_1 = [{ childrenIds: [] }];
const EMPTY_COLUMNS_2 = [{ childrenIds: [] }, { childrenIds: [] }];
const EMPTY_COLUMNS_3 = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];
const EMPTY_COLUMNS_4 = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];

export default function ColumnsContainerEditor({ style, props }: ColumnsContainerProps) {
  const currentBlockId = useCurrentBlockId();

  const { columns, columnsCount, ...restProps } = props ?? {};
  const count = columnsCount ?? 3;

  // 根据列数初始化 columns
  let columnsValue = columns;
  if (!columnsValue || columnsValue.length !== count) {
    if (count === 1) {
      columnsValue = EMPTY_COLUMNS_1;
    } else if (count === 2) {
      columnsValue = EMPTY_COLUMNS_2;
    } else if (count === 4) {
      columnsValue = EMPTY_COLUMNS_4;
    } else {
      columnsValue = EMPTY_COLUMNS_3;
    }
    // 如果已有 columns，尝试保留现有的列
    if (columns && columns.length > 0) {
      columnsValue = columns.slice(0, count).map(col => col || { childrenIds: [] });
      // 如果需要的列数更多，添加空列
      while (columnsValue.length < count) {
        columnsValue.push({ childrenIds: [] });
      }
    }
  }

  const updateColumn = (columnIndex: number, { block, blockId, childrenIds }: EditorChildrenChange) => {
    const nColumns = [...columnsValue];
    nColumns[columnIndex] = { childrenIds };
    // 如果是拖拽排序（block 没有 type），只更新 childrenIds
    if (!block.type) {
      setDocument({
        [currentBlockId]: {
          type: 'ColumnsContainer',
          data: ColumnsContainerPropsSchema.parse({
            style,
            props: {
              ...restProps,
              columnsCount: count,
              columns: nColumns,
            },
          }),
        },
      });
    } else {
      // 如果是新增块，创建新块并更新 childrenIds
      setDocument({
        [blockId]: block,
        [currentBlockId]: {
          type: 'ColumnsContainer',
          data: ColumnsContainerPropsSchema.parse({
            style,
            props: {
              ...restProps,
              columnsCount: count,
              columns: nColumns,
            },
          }),
        },
      });
      setSelectedBlockId(blockId);
    }
  };

  const columnComponents = columnsValue.map((col, index) => (
    <EditorChildrenIds
      key={index}
      childrenIds={col?.childrenIds}
      onChange={(change) => updateColumn(index, change)}
    />
  ));

  // BaseColumnsContainer 只支持 2 或 3 列，对于 1 或 4 列，我们需要自定义渲染
  if (count === 1 || count === 4) {
    const columnsGap = (restProps && 'columnsGap' in restProps) ? restProps.columnsGap ?? 0 : 0;
    const contentAlignment = (restProps && 'contentAlignment' in restProps) ? restProps.contentAlignment ?? 'middle' : 'middle';
    const fixedWidths = (restProps && 'fixedWidths' in restProps) ? restProps.fixedWidths : undefined;

    // 计算列宽
    const getColumnWidth = (index: number): string => {
      if (fixedWidths && fixedWidths[index] !== null && fixedWidths[index] !== undefined) {
        return `${fixedWidths[index]}%`;
      }
      return count === 1 ? '100%' : '25%';
    };

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: `${columnsGap}px`,
          alignItems: contentAlignment === 'top' ? 'flex-start' : contentAlignment === 'bottom' ? 'flex-end' : 'center',
          width: '100%',
          ...(style?.padding && {
            padding: `${style.padding.top}px ${style.padding.right}px ${style.padding.bottom}px ${style.padding.left}px`,
          }),
          ...(style?.backgroundColor && {
            backgroundColor: style.backgroundColor,
          }),
        }}
      >
        {columnComponents.map((col, index) => (
          <Box
            key={index}
            sx={{
              flex: fixedWidths && fixedWidths[index] !== null && fixedWidths[index] !== undefined ? 'none' : 1,
              width: getColumnWidth(index),
              minWidth: 0,
            }}
          >
            {col}
          </Box>
        ))}
      </Box>
    );
  }

  // 对于 2 或 3 列，使用 BaseColumnsContainer
  // 需要过滤掉 fixedWidths 的第4个元素（如果存在）
  let baseFixedWidths: [number | null | undefined, number | null | undefined, number | null | undefined] | undefined = undefined;

  if (restProps && 'fixedWidths' in restProps && restProps.fixedWidths) {
    baseFixedWidths = [restProps.fixedWidths[0], restProps.fixedWidths[1], restProps.fixedWidths[2]];
  }

  // 创建不包含 fixedWidths 的 baseProps
  const baseProps: any = {
    ...(restProps && typeof restProps === 'object' ? restProps : {}),
    columnsCount: count as 2 | 3,
  };

  // 如果有 fixedWidths，只取前3个元素
  if (baseFixedWidths !== undefined) {
    baseProps.fixedWidths = baseFixedWidths;
  } else if (restProps && 'fixedWidths' in restProps) {
    // 如果原 fixedWidths 是 null 或 undefined，也传递 null
    baseProps.fixedWidths = null;
  }

  return (
    <BaseColumnsContainer
      props={baseProps}
      style={style}
      columns={columnComponents}
    />
  );
}
