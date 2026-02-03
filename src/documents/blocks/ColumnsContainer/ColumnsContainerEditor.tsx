import React, { useMemo } from 'react';

import { ColumnsContainer as BaseColumnsContainer } from 'monto-email-block-columns-container';
import { Box } from '@mui/material';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, setSelectedBlockId, editorStateStore, useDocument } from '../../editor/EditorContext';
import { ColumnStretchProvider } from '../helpers/ColumnStretchContext';
import EditorChildrenIds, { EditorChildrenChange } from '../helpers/EditorChildrenIds';

import ColumnsContainerPropsSchema, { ColumnsContainerProps } from './ColumnsContainerPropsSchema';

/** props 除 columns/columnsCount 外的其余字段，用于 restProps 类型 */
type ColumnsContainerRestProps = Omit<NonNullable<ColumnsContainerProps['props']>, 'columns' | 'columnsCount'> & {
  contentAlignment?: 'top' | 'middle' | 'bottom' | 'stretch';
  columnHeights?: (number | null | undefined)[];
};

type ColumnItem = { childrenIds: string[] };

const EMPTY_COLUMNS_1 = [{ childrenIds: [] }];
const EMPTY_COLUMNS_2 = [{ childrenIds: [] }, { childrenIds: [] }];
const EMPTY_COLUMNS_3 = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];
const EMPTY_COLUMNS_4 = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];

export default function ColumnsContainerEditor({ style, props }: ColumnsContainerProps) {
  const currentBlockId = useCurrentBlockId();
  const document = useDocument(); // 使用 hook 获取最新的 document

  const rawProps = (props ?? {}) as NonNullable<ColumnsContainerProps['props']>;
  const { columns, columnsCount, ...rest } = rawProps;
  const restProps = rest as ColumnsContainerRestProps;
  const count = columnsCount ?? 3;

  // 根据列数初始化 columns，使用useMemo确保使用最新的columns数据
  const columnsValue = useMemo(() => {
    if (columns && columns.length === count) {
      return columns;
    }
    // 如果已有 columns，尝试保留现有的列
    if (columns && columns.length > 0) {
      const newColumns = columns.slice(0, count).map((col: ColumnItem) => col || { childrenIds: [] });
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

  const contentAlignment = (restProps?.contentAlignment ?? 'middle') as 'top' | 'middle' | 'bottom' | 'stretch';
  const isStretch = contentAlignment === 'stretch';
  const columnHeights = restProps?.columnHeights;
  const columnAreaSx = {
    width: '100%',
    height: '100%' as const,
    minWidth: 0,
    overflowWrap: 'break-word' as const,
    wordBreak: 'break-word' as const,
    ...(isStretch && { flex: 1, minHeight: 0, display: 'flex' as const, flexDirection: 'column' as const }),
  };

  const columnComponents = currentColumns.map((col: ColumnItem, index: number) => {
    const isColumnEmpty = !col?.childrenIds || col.childrenIds.length === 0;
    const allowReplace = isColumnEmpty;
    const columnHeightPx = columnHeights?.[index];
    const hasColumnHeight = columnHeightPx != null && columnHeightPx > 0;
    const sx = {
      ...columnAreaSx,
      ...(hasColumnHeight
        ? {
          height: `${columnHeightPx}px`,
          display: 'flex' as const,
          flexDirection: 'column' as const,
          minHeight: 0,
        }
        : {}),
    };

    const columnContent = (
      <Box key={index} data-column-area="true" sx={sx}>
        <EditorChildrenIds
          childrenIds={col?.childrenIds}
          onChange={(change) => updateColumn(index, change)}
          containerId={currentBlockId}
          allowReplace={allowReplace}
          fillHeight={isStretch || hasColumnHeight}
        />
      </Box>
    );

    return isStretch || hasColumnHeight ? (
      <ColumnStretchProvider key={index} value={true}>
        {columnContent}
      </ColumnStretchProvider>
    ) : (
      columnContent
    );
  });

  const baseProps: any = {
    ...(restProps && typeof restProps === 'object' ? restProps : {}),
    columnsCount: count,
  };

  return (
    <Box sx={{ color: 'inherit', width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
      <BaseColumnsContainer
        props={baseProps}
        style={style}
        columns={columnComponents}
      />
    </Box>
  );
}
