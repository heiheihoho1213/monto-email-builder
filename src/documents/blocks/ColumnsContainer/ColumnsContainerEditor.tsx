import React, { useMemo } from 'react';

import { ColumnsContainer as BaseColumnsContainer } from '@usewaypoint/block-columns-container';
import { Box } from '@mui/material';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, setSelectedBlockId, editorStateStore, useDocument } from '../../editor/EditorContext';
import EditorChildrenIds, { EditorChildrenChange } from '../helpers/EditorChildrenIds';

import ColumnsContainerPropsSchema, { ColumnsContainerProps } from './ColumnsContainerPropsSchema';

const EMPTY_COLUMNS_1 = [{ childrenIds: [] }];
const EMPTY_COLUMNS_2 = [{ childrenIds: [] }, { childrenIds: [] }];
const EMPTY_COLUMNS_3 = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];
const EMPTY_COLUMNS_4 = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];

export default function ColumnsContainerEditor({ style, props }: ColumnsContainerProps) {
  const currentBlockId = useCurrentBlockId();
  const document = useDocument(); // 使用 hook 获取最新的 document

  const { columns, columnsCount, ...restProps } = props ?? {};
  const count = columnsCount ?? 3;

  // 根据列数初始化 columns，使用useMemo确保使用最新的columns数据
  const columnsValue = useMemo(() => {
    if (columns && columns.length === count) {
      return columns;
    }
    // 如果已有 columns，尝试保留现有的列
    if (columns && columns.length > 0) {
      const newColumns = columns.slice(0, count).map(col => col || { childrenIds: [] });
      // 如果需要的列数更多，添加空列
      while (newColumns.length < count) {
        newColumns.push({ childrenIds: [] });
      }
      return newColumns;
    }
    // 否则使用默认值
    if (count === 1) {
      return EMPTY_COLUMNS_1;
    } else if (count === 2) {
      return EMPTY_COLUMNS_2;
    } else if (count === 4) {
      return EMPTY_COLUMNS_4;
    } else {
      return EMPTY_COLUMNS_3;
    }
  }, [columns, count]);

  const updateColumn = (columnIndex: number, { block, blockId, childrenIds }: EditorChildrenChange) => {
    // 获取当前document，检查block是否已经在document中（跨容器拖拽时已经在handleDrop中更新了document）
    // 注意：这里使用 editorStateStore.getState().document 获取最新状态，因为 updateColumn 不是 React 组件
    const currentDocument = editorStateStore.getState().document;
    const blockExists = currentDocument[blockId] && currentDocument[blockId].type;

    // 从最新的document中获取columns，确保使用最新数据
    // 优先使用document中的最新数据，如果没有则使用columnsValue
    const latestContainer = currentDocument[currentBlockId];
    let latestColumns: Array<{ childrenIds: string[] }> = columnsValue;
    if (latestContainer && latestContainer.type === 'ColumnsContainer') {
      const containerColumns = latestContainer.data.props?.columns;
      if (containerColumns && containerColumns.length > 0) {
        latestColumns = containerColumns;
      }
    }

    // 检查是否是跨列拖拽：同一个ColumnsContainer，但blockId在其他列中
    let sourceColumnIndex: number | null = null;
    for (let i = 0; i < latestColumns.length; i++) {
      if (i !== columnIndex && latestColumns[i]?.childrenIds?.includes(blockId)) {
        sourceColumnIndex = i;
        break;
      }
    }

    // 如果是跨列拖拽，需要创建新的block（复制数据），并从源列删除
    let finalBlockId = blockId;
    let finalBlock = block;
    if (sourceColumnIndex !== null && block.type) {
      // 生成新的blockId
      finalBlockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // 深拷贝block数据
      finalBlock = JSON.parse(JSON.stringify(block));
    }

    // 创建新的columns数组，确保有足够的列
    const nColumns: Array<{ childrenIds: string[] }> = [];
    for (let i = 0; i < count; i++) {
      if (i === columnIndex) {
        // 更新目标列的childrenIds - 使用传入的childrenIds，但替换blockId为finalBlockId（如果是跨列拖拽）
        const updatedChildrenIds = sourceColumnIndex !== null
          ? childrenIds.map(id => id === blockId ? finalBlockId : id)
          : childrenIds;
        nColumns.push({ childrenIds: updatedChildrenIds });
      } else if (i === sourceColumnIndex) {
        // 从源列删除原block
        const sourceColumn = latestColumns[i];
        const filteredChildrenIds = (sourceColumn?.childrenIds || []).filter((id) => id !== blockId);
        nColumns.push({ childrenIds: filteredChildrenIds });
      } else {
        // 保留其他列的childrenIds，使用最新的数据
        const existingColumn = latestColumns[i];
        nColumns.push(existingColumn ? { childrenIds: existingColumn.childrenIds || [] } : { childrenIds: [] });
      }
    }

    // 准备更新数据
    // 确保 columns 和 columnsCount 正确设置
    const updates: any = {
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
    };

    // 确保 columns 属性在解析后仍然存在（双重保险）
    if (updates[currentBlockId].data.props) {
      updates[currentBlockId].data.props.columns = nColumns;
      updates[currentBlockId].data.props.columnsCount = count;
    }

    // 如果是拖拽排序（block 没有 type），只更新 childrenIds
    if (!block.type) {
      setDocument(updates);
    } else {
      // 如果是跨列拖拽，添加新的block（复制）
      if (sourceColumnIndex !== null) {
        // 跨列拖拽：创建新的block（复制），无论blockExists是否为true
        updates[finalBlockId] = finalBlock;
      } else if (!blockExists) {
        // 如果不是跨列拖拽，且block不存在，添加新block
        updates[blockId] = block;
      }
      // 合并更新，确保同时更新columns和block
      setDocument(updates);
      if (block.type) {
        setSelectedBlockId(finalBlockId);
      }
    }
  };

  // 使用 document 中的最新 columns 数据，而不是 columnsValue
  // 这样可以确保使用最新的数据，避免使用旧的 props
  const currentDocument = useDocument();
  const currentContainer = currentDocument[currentBlockId];
  const currentColumns = (currentContainer && currentContainer.type === 'ColumnsContainer' && currentContainer.data.props?.columns) || columnsValue;

  const columnComponents = currentColumns.map((col, index) => (
    <Box
      key={index}
      data-column-area="true"
      sx={{
        width: '100%',
        height: '100%',
        minWidth: 0, // 确保flex布局中文本可以换行
        overflowWrap: 'break-word', // 允许长单词换行
        wordBreak: 'break-word', // 确保文本换行
      }}
    >
      <EditorChildrenIds
        childrenIds={col?.childrenIds}
        onChange={(change) => updateColumn(index, change)}
        containerId={currentBlockId}
        allowReplace={true}
      />
    </Box>
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
          color: 'inherit', // 继承父元素的文字颜色
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
            data-column-area="true"
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
    <Box sx={{ color: 'inherit' }}>
      <BaseColumnsContainer
        props={baseProps}
        style={style}
        columns={columnComponents}
      />
    </Box>
  );
}
