import React, { Fragment, useState, useEffect } from 'react';

import { Box } from '@mui/material';

import { TEditorBlock, TEditorConfiguration } from '../../../editor/core';
import { editorStateStore, setDocument } from '../../../editor/EditorContext';
import EditorBlock from '../../../editor/EditorBlock';
import ColumnsContainerPropsSchema from '../../ColumnsContainer/ColumnsContainerPropsSchema';

import AddBlockButton from './AddBlockMenu';

export type EditorChildrenChange = {
  blockId: string;
  block: TEditorBlock;
  childrenIds: string[];
};

function generateId() {
  return `block-${Date.now()}`;
}

export type EditorChildrenIdsProps = {
  childrenIds: string[] | null | undefined;
  onChange: (val: EditorChildrenChange) => void;
  containerId?: string; // 当前容器的ID，用于跨容器拖拽
  allowReplace?: boolean; // 是否允许拖拽覆盖（替换）现有元素，默认 false
};

// 从 window 对象获取当前拖拽的 blockId（因为在 dragOver 事件中无法读取 dataTransfer）
const getCurrentDraggedBlockId = (): string | null => {
  return (window as any).__currentDraggedBlockId || null;
};

// 获取被拖拽的block数据
const getCurrentDraggedBlock = (): TEditorBlock | null => {
  return (window as any).__currentDraggedBlock || null;
};

// 查找block所在的父容器ID和列索引（如果是ColumnsContainer）
function findParentContainerId(document: TEditorConfiguration, blockId: string): { containerId: string | null; columnIndex: number | null } {
  for (const [containerId, container] of Object.entries(document)) {
    const containerData = container.data;
    // 检查EmailLayout
    if (container.type === 'EmailLayout' && containerData.childrenIds?.includes(blockId)) {
      return { containerId, columnIndex: null };
    }
    // 检查Container
    if (container.type === 'Container' && containerData.props?.childrenIds?.includes(blockId)) {
      return { containerId, columnIndex: null };
    }
    // 检查ColumnsContainer
    if (container.type === 'ColumnsContainer') {
      const columns = containerData.props?.columns;
      if (columns) {
        for (let i = 0; i < columns.length; i++) {
          if (columns[i].childrenIds?.includes(blockId)) {
            return { containerId, columnIndex: i };
          }
        }
      }
    }
  }
  return { containerId: null, columnIndex: null };
}

// 检查是否允许将 block 拖入目标容器（防止 ColumnsContainer 嵌套）
function canDropBlockIntoContainer(
  draggedBlock: TEditorBlock | null,
  targetContainerId: string | undefined,
  document: TEditorConfiguration
): boolean {
  if (!draggedBlock || !targetContainerId) {
    return true;
  }

  const draggedBlockType = draggedBlock.type;
  const targetContainer = document[targetContainerId];
  const targetContainerType = targetContainer?.type;

  // Container 内部允许拖入 Container 和 ColumnsContainer
  // 只有当目标是 ColumnsContainer 时，才禁止拖入 Container 和 ColumnsContainer
  if (targetContainerType === 'ColumnsContainer') {
    // ColumnsContainer 内部不允许拖入 Container 或 ColumnsContainer
    if (draggedBlockType === 'Container' || draggedBlockType === 'ColumnsContainer') {
      return false;
    }
  }
  // 如果目标是 Container，允许拖入任何内容（包括 Container 和 ColumnsContainer）

  return true;
}

// 从原容器中移除block
function removeBlockFromParentContainer(
  document: TEditorConfiguration,
  blockId: string,
  parentInfo: { containerId: string | null; columnIndex: number | null }
): TEditorConfiguration {
  if (!parentInfo.containerId) {
    return document;
  }

  const container = document[parentInfo.containerId];
  if (!container) {
    return document;
  }

  const newDocument = { ...document };
  const newContainer = { ...container, data: { ...container.data } };

  if (container.type === 'EmailLayout') {
    const childrenIds = container.data.childrenIds || [];
    newContainer.data = {
      ...container.data,
      childrenIds: childrenIds.filter((id) => id !== blockId),
    };
  } else if (container.type === 'Container') {
    const childrenIds = container.data.props?.childrenIds || [];
    newContainer.data = {
      ...container.data,
      props: {
        ...container.data.props,
        childrenIds: childrenIds.filter((id) => id !== blockId),
      },
    };
  } else if (container.type === 'ColumnsContainer' && parentInfo.columnIndex !== null) {
    const columns = container.data.props?.columns || [];
    const newColumns = columns.map((col, index) => {
      if (index === parentInfo.columnIndex) {
        return {
          childrenIds: (col.childrenIds || []).filter((id) => id !== blockId),
        };
      }
      return col;
    });
    newContainer.data = {
      ...container.data,
      props: {
        ...container.data.props,
        columns: newColumns,
      },
    };
  }

  newDocument[parentInfo.containerId] = newContainer;
  return newDocument;
}

export default function EditorChildrenIds({ childrenIds, onChange, containerId, allowReplace = false }: EditorChildrenIdsProps) {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragNotAllowed, setIsDragNotAllowed] = useState(false); // 是否不允许拖入（嵌套检查）
  const [horizontalDragSide, setHorizontalDragSide] = useState<'left' | 'right' | null>(null); // 水平拖拽位置（左侧或右侧）
  const [horizontalDragTargetIndex, setHorizontalDragTargetIndex] = useState<number | null>(null); // 水平拖拽的目标block索引

  // 使用 useEffect 来设置全局鼠标样式
  useEffect(() => {
    if (isDragNotAllowed && typeof document !== 'undefined' && document.body) {
      // 设置全局样式，使整个文档的鼠标指针变为 no-drop
      document.body.style.cursor = 'no-drop';
      return () => {
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.cursor = '';
        }
      };
    }
  }, [isDragNotAllowed]);

  // 获取容器类型，用于禁用 Container 和 ColumnsContainer 选项
  const document = editorStateStore.getState().document;
  const containerType = containerId ? document[containerId]?.type : null;
  const isContainerOrColumnsContainer = containerType === 'ColumnsContainer';

  const appendBlock = (block: TEditorBlock) => {
    const blockId = generateId();
    return onChange({
      blockId,
      block,
      childrenIds: [...(childrenIds || []), blockId],
    });
  };

  const insertBlock = (block: TEditorBlock, index: number) => {
    const blockId = generateId();
    const newChildrenIds = [...(childrenIds || [])];
    newChildrenIds.splice(index, 0, blockId);
    return onChange({
      blockId,
      block,
      childrenIds: newChildrenIds,
    });
  };


  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    // 在 dragOver 事件中无法读取 dataTransfer，使用全局变量
    const draggedId = getCurrentDraggedBlockId();
    if (draggedId) {
      // 检查是否允许拖入（防止嵌套）
      const draggedBlock = getCurrentDraggedBlock();
      const document = editorStateStore.getState().document;
      const canDrop = canDropBlockIntoContainer(draggedBlock, containerId, document);
      setIsDragNotAllowed(!canDrop);

      // 如果不允许拖入，设置鼠标样式为禁用
      if (!canDrop) {
        e.dataTransfer.effectAllowed = 'none';
        e.dataTransfer.dropEffect = 'none';
      } else {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.dropEffect = 'move';
      }

      setDraggedBlockId(draggedId);
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setIsDragNotAllowed(false);
    setHorizontalDragSide(null);
    setHorizontalDragTargetIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedId = e.dataTransfer.getData('text/plain') || getCurrentDraggedBlockId();

    if (!draggedId || !childrenIds) {
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    // 检查 draggedId 是否是当前容器的 ID（ColumnsContainer 的 ID），如果是，说明拖拽的是容器本身，应该忽略
    if (draggedId === containerId) {
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    const sourceIndex = childrenIds.indexOf(draggedId);

    // 如果拖拽的block在当前容器中，执行排序操作
    if (sourceIndex !== -1) {
      // 如果拖拽到自己的位置，不执行任何操作
      if (sourceIndex === dropIndex) {
        (window as any).__currentDraggedBlockId = null;
        (window as any).__currentDraggedBlock = null;
        setDraggedBlockId(null);
        setDragOverIndex(null);
        return;
      }

      // 如果源元素在目标位置之前，且拖拽线显示在紧邻的下一个元素上方，
      // 那么插入到该位置之前实际上就是保持原状，不需要移动
      // 例如：[A, B, C]，A(0) 拖到 B(1) 上方，dropIndex=1
      // 如果插入到位置 1 之前，就是位置 0，但 A 已经在位置 0 了，所以应该保持原状
      if (sourceIndex < dropIndex && dropIndex - sourceIndex === 1) {
        // 拖到紧邻的下一个元素上方，保持原状
        (window as any).__currentDraggedBlockId = null;
        (window as any).__currentDraggedBlock = null;
        setDraggedBlockId(null);
        setDragOverIndex(null);
        return;
      }

      const newChildrenIds = [...childrenIds];
      const [removed] = newChildrenIds.splice(sourceIndex, 1);

      // 计算插入位置：
      // - 如果源位置在目标位置之前，插入位置需要减 1（因为已经移除了源元素）
      // - 如果源位置在目标位置之后，插入位置不变
      const insertIndex = sourceIndex < dropIndex ? dropIndex - 1 : dropIndex;
      newChildrenIds.splice(insertIndex, 0, removed);

      // 通过 onChange 通知父组件更新 childrenIds
      onChange({
        blockId: draggedId,
        block: {} as TEditorBlock, // 这个不会被使用，只是满足类型要求
        childrenIds: newChildrenIds,
      });

      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    // 如果拖拽的block不在当前容器中，说明是从外部拖拽过来的
    // 实现移动操作：从原容器中移除，添加到目标容器
    const draggedBlock = getCurrentDraggedBlock();

    if (!draggedBlock) {
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    // 使用原来的 blockId，实现移动而不是复制
    const blockId = draggedId;

    // 检查是否试图将容器自身添加到自己的 childrenIds 中（防止循环引用）
    // 如果 containerId 存在且 blockId 等于 containerId，说明是拖拽容器到自身，应该忽略
    if (containerId && blockId === containerId) {
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    // 获取当前document
    const document = editorStateStore.getState().document;

    // 检查是否允许将 block 拖入目标容器（防止 Container 和 ColumnsContainer 相互嵌套）
    if (!canDropBlockIntoContainer(draggedBlock, containerId, document)) {
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      setIsDragNotAllowed(false);
      return;
    }

    // 添加到目标容器
    const newChildrenIds = [...childrenIds];
    // 只有在 allowReplace 为 true 时（ColumnsContainer 的列），才允许替换现有元素
    // 否则只允许插入，不允许替换
    if (allowReplace && dropIndex >= 0 && dropIndex < childrenIds.length) {
      // 替换现有元素（仅适用于 ColumnsContainer 的列）
      newChildrenIds.splice(dropIndex, 1, blockId);
    } else {
      // 插入新元素（其他容器类型）
      newChildrenIds.splice(dropIndex, 0, blockId);
    }

    // 找到原容器
    const parentInfo = findParentContainerId(document, blockId);

    // 检查是否是跨列拖拽（同一个ColumnsContainer，原block在某个列中）
    // 如果原block在ColumnsContainer的某个列中，且目标也是同一个ColumnsContainer，则是跨列拖拽
    const isCrossColumnDrag = parentInfo.containerId === containerId &&
      parentInfo.columnIndex !== null;

    let newDocument = document;
    // 如果不是跨列拖拽，才从原容器中移除block
    // 跨列拖拽由updateColumn处理（复制到目标列，从源列删除）
    if (!isCrossColumnDrag) {
      newDocument = removeBlockFromParentContainer(document, blockId, parentInfo);
      // 先更新整个document（从原容器中移除block）
      setDocument(newDocument);
    }

    // 然后通过 onChange 通知父组件更新 childrenIds（这会触发updateColumn，updateColumn会更新columns）
    // 注意：需要延迟一下，确保setDocument已经完成（如果不是跨列拖拽），updateColumn能获取到最新的document
    setTimeout(() => {
      onChange({
        blockId: blockId,
        block: draggedBlock,
        childrenIds: newChildrenIds,
      });
    }, 0);

    (window as any).__currentDraggedBlockId = null;
    (window as any).__currentDraggedBlock = null;
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    (window as any).__currentDraggedBlockId = null;
    (window as any).__currentDraggedBlock = null;
    setDraggedBlockId(null);
    setDragOverIndex(null);
    setIsDragNotAllowed(false);
    setHorizontalDragSide(null);
    setHorizontalDragTargetIndex(null);
  };

  if (!childrenIds || childrenIds.length === 0) {
    return (
      <Box
        data-column-content="true"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const draggedId = getCurrentDraggedBlockId();
          if (draggedId) {
            // 检查是否允许拖入（防止嵌套）
            const draggedBlock = getCurrentDraggedBlock();
            const document = editorStateStore.getState().document;
            const canDrop = canDropBlockIntoContainer(draggedBlock, containerId, document);
            setIsDragNotAllowed(!canDrop);

            // 如果不允许拖入，设置鼠标样式为禁用
            if (!canDrop) {
              e.dataTransfer.effectAllowed = 'none';
              e.dataTransfer.dropEffect = 'none';
            } else {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.dropEffect = 'move';
            }

            setDraggedBlockId(draggedId);
            setDragOverIndex(0);
          }
        }}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const draggedId = e.dataTransfer.getData('text/plain') || getCurrentDraggedBlockId();
          if (!draggedId) {
            (window as any).__currentDraggedBlockId = null;
            (window as any).__currentDraggedBlock = null;
            setDraggedBlockId(null);
            setDragOverIndex(null);
            return;
          }

          // 如果拖拽的block不在当前容器中，说明是从外部拖拽过来的
          const draggedBlock = getCurrentDraggedBlock();
          if (!draggedBlock) {
            (window as any).__currentDraggedBlockId = null;
            (window as any).__currentDraggedBlock = null;
            setDraggedBlockId(null);
            setDragOverIndex(null);
            return;
          }

          // 实现移动操作：从原容器中移除，添加到目标容器
          // 使用原来的 blockId，实现移动而不是复制
          const blockId = draggedId;

          // 检查是否试图将容器自身添加到自己的 childrenIds 中（防止循环引用）
          if (containerId && blockId === containerId) {
            (window as any).__currentDraggedBlockId = null;
            (window as any).__currentDraggedBlock = null;
            setDraggedBlockId(null);
            setDragOverIndex(null);
            return;
          }

          // 检查是否允许将 block 拖入目标容器（防止 Container 和 ColumnsContainer 相互嵌套）
          const document = editorStateStore.getState().document;
          if (!canDropBlockIntoContainer(draggedBlock, containerId, document)) {
            (window as any).__currentDraggedBlockId = null;
            (window as any).__currentDraggedBlock = null;
            setDraggedBlockId(null);
            setDragOverIndex(null);
            setIsDragNotAllowed(false);
            return;
          }

          // 添加到目标容器（空白区域，直接添加）
          const newChildrenIds = [blockId];

          // 找到原容器
          const parentInfo = findParentContainerId(document, blockId);

          // 检查是否是跨列拖拽（同一个ColumnsContainer，原block在某个列中）
          // 如果原block在ColumnsContainer的某个列中，且目标也是同一个ColumnsContainer，则是跨列拖拽
          const isCrossColumnDrag = parentInfo.containerId === containerId &&
            parentInfo.columnIndex !== null;

          let newDocument = document;
          // 如果不是跨列拖拽，才从原容器中移除block
          // 跨列拖拽由updateColumn处理（复制到目标列，从源列删除）
          if (!isCrossColumnDrag) {
            newDocument = removeBlockFromParentContainer(document, blockId, parentInfo);
            // 先更新整个document（从原容器中移除block）
            setDocument(newDocument);
          }

          // 然后通过 onChange 通知父组件更新 childrenIds（这会触发updateColumn，updateColumn会更新columns）
          // 注意：需要延迟一下，确保setDocument已经完成（如果不是跨列拖拽），updateColumn能获取到最新的document
          setTimeout(() => {
            onChange({
              blockId: blockId,
              block: draggedBlock,
              childrenIds: newChildrenIds,
            });
          }, 0);

          (window as any).__currentDraggedBlockId = null;
          (window as any).__currentDraggedBlock = null;
          setDraggedBlockId(null);
          setDragOverIndex(null);
        }}
        onDragEnd={handleDragEnd}
        sx={{
          position: 'relative',
          cursor: isDragNotAllowed ? 'no-drop' : 'default',
          ...(dragOverIndex === 0 && draggedBlockId !== null && !childrenIds?.includes(draggedBlockId)
            ? {
              outline: '2px solid',
              outlineColor: isDragNotAllowed ? '#d3d9dd' : 'primary.main',
              outlineOffset: '-2px',
            }
            : {
              '&::before': dragOverIndex === 0 && draggedBlockId !== null
                ? {
                  content: '""',
                  position: 'absolute',
                  top: -2,
                  left: 0,
                  right: 0,
                  height: 4,
                  backgroundColor: isDragNotAllowed ? '#d3d9dd' : 'primary.main',
                  zIndex: 1000,
                  pointerEvents: 'none',
                }
                : {},
            }),
        }}
      >
        <AddBlockButton placeholder onSelect={appendBlock} disableContainerBlocks={isContainerOrColumnsContainer} />
      </Box>
    );
  }

  return (
    <>
      {childrenIds.map((childId, i) => {
        const isLastBlock = i === childrenIds.length - 1;
        const isExternalDrag = draggedBlockId !== null && draggedBlockId !== childId && !childrenIds.includes(draggedBlockId);
        // 同一个容器内的拖拽，显示排序指示线
        const showTopIndicator = dragOverIndex === i && draggedBlockId !== null && draggedBlockId !== childId && !isExternalDrag;
        // 底部指示线：同一个容器内的拖拽到底部，或外部拖拽到底部（非替换模式）
        const showBottomIndicator = isLastBlock && dragOverIndex === childrenIds.length && draggedBlockId !== null && draggedBlockId !== childId && (!isExternalDrag || !allowReplace);
        // 检查是否是分栏间交换（同一个ColumnsContainer的不同列之间）
        const draggedParentInfoForRender = draggedBlockId ? findParentContainerId(document, draggedBlockId) : null;
        const targetParentInfoForRender = findParentContainerId(document, childId);
        const isCrossColumnSwapForRender = draggedParentInfoForRender &&
          draggedParentInfoForRender.columnIndex !== null &&
          targetParentInfoForRender.columnIndex !== null &&
          draggedParentInfoForRender.containerId === targetParentInfoForRender.containerId &&
          draggedParentInfoForRender.columnIndex !== targetParentInfoForRender.columnIndex;

        // 检查是否是外部元素拖入列中（列有元素），需要禁止上下插入
        const isExternalDragIntoColumn = isExternalDrag &&
          draggedParentInfoForRender &&
          draggedParentInfoForRender.columnIndex === null && // 外部元素不在列中
          targetParentInfoForRender.columnIndex !== null && // 目标在列中
          !allowReplace; // 列有元素

        // 外部拖拽时的指示线：
        // - 如果 allowReplace 为 true（ColumnsContainer 的列），显示全边框（表示可以替换）
        // - 如果 allowReplace 为 false（其他容器），显示顶部指示线（表示可以插入到当前元素之前）
        // - 如果是分栏间交换，显示蓝色全边框（表示可以交换）
        // - 如果是外部元素拖入列中（列有元素），禁止显示上下插入指示线
        const showFullBorder = (allowReplace && dragOverIndex === i && isExternalDrag) ||
          (isCrossColumnSwapForRender && dragOverIndex === i);
        const showTopIndicatorForExternal = !allowReplace && dragOverIndex === i && isExternalDrag && !isCrossColumnSwapForRender && !isExternalDragIntoColumn;
        const showBottomIndicatorForExternal = !allowReplace && isLastBlock && dragOverIndex === childrenIds.length && isExternalDrag && !isExternalDragIntoColumn;
        // 水平拖拽指示线：显示在左侧或右侧
        const showLeftIndicator = horizontalDragSide === 'left' && horizontalDragTargetIndex === i;
        const showRightIndicator = horizontalDragSide === 'right' && horizontalDragTargetIndex === i;

        return (
          <Fragment key={childId}>
            <AddBlockButton onSelect={(block) => insertBlock(block, i)} disableContainerBlocks={isContainerOrColumnsContainer} />
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const draggedId = getCurrentDraggedBlockId();
                if (!draggedId) return;

                // 检查是否允许拖入（防止嵌套）
                const draggedBlock = getCurrentDraggedBlock();
                const document = editorStateStore.getState().document;
                const canDrop = canDropBlockIntoContainer(draggedBlock, containerId, document);
                setIsDragNotAllowed(!canDrop);

                // 如果不允许拖入，设置鼠标样式为禁用
                if (!canDrop) {
                  e.dataTransfer.effectAllowed = 'none';
                  e.dataTransfer.dropEffect = 'none';
                } else {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.dropEffect = 'move';
                }

                // 检查是否是外部拖拽
                const isExternal = !childrenIds.includes(draggedId);

                // 检查水平拖拽：只有当被拖拽的block和目标block都不是Container或ColumnsContainer时才允许
                // 并且它们都不在ColumnsContainer的列中（禁止column内部元素之间的水平拖拽）
                const targetBlock = document[childId];
                const isDraggedContainer = draggedBlock?.type === 'Container' || draggedBlock?.type === 'ColumnsContainer';
                const isTargetContainer = targetBlock?.type === 'Container' || targetBlock?.type === 'ColumnsContainer';

                // 检查被拖拽的block和目标block是否在ColumnsContainer的列中
                const draggedParentInfo = findParentContainerId(document, draggedId);
                const targetParentInfo = findParentContainerId(document, childId);
                const isDraggedInColumn = draggedParentInfo.columnIndex !== null;
                const isTargetInColumn = targetParentInfo.columnIndex !== null;

                // 检查是否在同一个ColumnsContainer的不同列中（分栏间交换）
                const isCrossColumnSwap = isDraggedInColumn && isTargetInColumn &&
                  draggedParentInfo.containerId === targetParentInfo.containerId &&
                  draggedParentInfo.containerId !== null &&
                  draggedParentInfo.columnIndex !== targetParentInfo.columnIndex;

                // 检查是否在同一个列中（禁止同一列内部的分栏间拖拽）
                const isSameColumn = isDraggedInColumn && isTargetInColumn &&
                  draggedParentInfo.containerId === targetParentInfo.containerId &&
                  draggedParentInfo.columnIndex === targetParentInfo.columnIndex;

                // 如果是分栏间交换，显示全边框（蓝色），不显示水平指示线
                if (isCrossColumnSwap && !isDraggedContainer && !isTargetContainer && draggedId !== childId) {
                  setDraggedBlockId(draggedId);
                  setDragOverIndex(i); // 显示全边框
                  setHorizontalDragSide(null); // 清除水平拖拽指示
                  setHorizontalDragTargetIndex(null);
                  return;
                }

                // 禁止同一个列内部的分栏间拖拽（左右或上下）
                if (isSameColumn) {
                  setHorizontalDragSide(null);
                  setHorizontalDragTargetIndex(null);
                  // 继续执行垂直拖拽逻辑
                }

                // 允许水平拖拽的情况：外部元素之间（不在列中，不是Container/ColumnsContainer）
                // 同时禁止自己拖拽到自己（防止自己跟自己合并）
                if (!isDraggedContainer && !isTargetContainer &&
                  !isDraggedInColumn && !isTargetInColumn &&
                  draggedId !== childId) {
                  // 检测鼠标位置在block的左侧还是右侧
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = e.clientX;
                  const blockCenterX = rect.left + rect.width / 2;

                  // 如果鼠标在block的左侧或右侧（距离边缘一定范围内），显示水平拖拽指示线
                  const edgeThreshold = rect.width * 0.3; // 边缘30%的区域用于水平拖拽

                  if (mouseX < rect.left + edgeThreshold) {
                    // 左侧拖拽
                    setHorizontalDragSide('left');
                    setHorizontalDragTargetIndex(i);
                    setDraggedBlockId(draggedId);
                    setDragOverIndex(null); // 清除垂直拖拽指示
                    return;
                  } else if (mouseX > rect.right - edgeThreshold) {
                    // 右侧拖拽
                    setHorizontalDragSide('right');
                    setHorizontalDragTargetIndex(i);
                    setDraggedBlockId(draggedId);
                    setDragOverIndex(null); // 清除垂直拖拽指示
                    return;
                  } else {
                    // 不在边缘区域，清除水平拖拽状态
                    setHorizontalDragSide(null);
                    setHorizontalDragTargetIndex(null);
                  }
                } else {
                  // 不允许水平拖拽，清除状态
                  setHorizontalDragSide(null);
                  setHorizontalDragTargetIndex(null);
                }

                // 如果是最后一个块，检查是否拖拽到块的下方区域
                // 对于外部拖拽，只有在非替换模式（!allowReplace）时才显示底部指示线
                // 但禁止外部元素拖入列中做上下插入（如果列数 >= 4）
                if (isLastBlock && (!isExternal || !allowReplace)) {
                  // 检查是否是外部元素拖入列中
                  const targetParentInfo = findParentContainerId(document, childId);
                  const isTargetInColumn = allowReplace || targetParentInfo.columnIndex !== null;
                  const draggedParentInfo = findParentContainerId(document, draggedId);
                  const isDraggedInColumn = draggedParentInfo.columnIndex !== null;

                  // 如果是外部元素拖入列中（列中有元素），检查是否可以扩列插入
                  if (isExternal && isTargetInColumn && !isDraggedInColumn && !allowReplace) {
                    // 检查当前 ColumnsContainer 的列数
                    const columnsContainerId = targetParentInfo.containerId;
                    if (columnsContainerId) {
                      const columnsContainer = document[columnsContainerId];
                      if (columnsContainer && columnsContainer.type === 'ColumnsContainer') {
                        const currentColumnsCount = columnsContainer.data.props?.columnsCount ||
                          columnsContainer.data.props?.columns?.length || 0;

                        // 如果列数 >= 4，禁止插入
                        if (currentColumnsCount >= 4) {
                          setIsDragNotAllowed(true);
                          e.dataTransfer.effectAllowed = 'none';
                          e.dataTransfer.dropEffect = 'none';
                          setHorizontalDragSide(null);
                          setHorizontalDragTargetIndex(null);
                          return;
                        }
                        // 如果列数 < 4，允许插入（会扩列），禁止显示底部插入指示线
                        // 只允许左右插入（扩列），不允许上下插入
                        // 根据鼠标位置决定显示左侧还是右侧指示线
                        const rect = e.currentTarget.getBoundingClientRect();
                        const mouseY = e.clientY;
                        const mouseX = e.clientX;
                        const blockBottom = rect.bottom;
                        const blockCenter = rect.left + rect.width / 2;

                        setDraggedBlockId(draggedId);
                        setDragOverIndex(null); // 不显示上下插入指示线

                        // 根据鼠标位置决定显示左侧还是右侧指示线
                        if (mouseX < blockCenter) {
                          // 鼠标在左侧，显示左侧插入指示线（在目标元素之前新增一列）
                          setHorizontalDragSide('left');
                        } else {
                          // 鼠标在右侧，显示右侧插入指示线（在目标元素之后新增一列）
                          setHorizontalDragSide('right');
                        }
                        setHorizontalDragTargetIndex(i);
                        return;
                      }
                    }
                  }

                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseY = e.clientY;
                  const blockBottom = rect.bottom;
                  // 如果鼠标在块的下半部分，认为是拖拽到底部
                  if (mouseY > blockBottom - rect.height / 2) {
                    setDraggedBlockId(draggedId);
                    setDragOverIndex(childrenIds.length);
                    setHorizontalDragSide(null);
                    setHorizontalDragTargetIndex(null);
                    return;
                  }
                }

                // 如果是外部拖拽，根据 allowReplace 决定显示方式
                if (isExternal) {
                  // 检查目标是否在列中（通过 allowReplace 或 findParentContainerId 检测）
                  const targetParentInfo = findParentContainerId(document, childId);
                  const isTargetInColumn = allowReplace || targetParentInfo.columnIndex !== null;

                  // 检查被拖拽的元素是否不在列中
                  const draggedParentInfo = findParentContainerId(document, draggedId);
                  const isDraggedInColumn = draggedParentInfo.columnIndex !== null;

                  // 如果列中有元素（allowReplace 为 false），检查是否可以扩列插入
                  if (isTargetInColumn && !isDraggedInColumn && !allowReplace) {
                    // 检查当前 ColumnsContainer 的列数
                    const columnsContainerId = targetParentInfo.containerId;
                    if (columnsContainerId) {
                      const columnsContainer = document[columnsContainerId];
                      if (columnsContainer && columnsContainer.type === 'ColumnsContainer') {
                        const currentColumnsCount = columnsContainer.data.props?.columnsCount ||
                          columnsContainer.data.props?.columns?.length || 0;

                        // 如果列数 >= 4，禁止插入
                        if (currentColumnsCount >= 4) {
                          setIsDragNotAllowed(true);
                          e.dataTransfer.effectAllowed = 'none';
                          e.dataTransfer.dropEffect = 'none';
                          setHorizontalDragSide(null);
                          setHorizontalDragTargetIndex(null);
                          return;
                        }
                        // 如果列数 < 4，允许插入（会扩列，左右插入，新增一列）
                        // 根据鼠标位置决定显示左侧还是右侧指示线
                        const rect = e.currentTarget.getBoundingClientRect();
                        const mouseX = e.clientX;
                        const blockCenter = rect.left + rect.width / 2;

                        setDraggedBlockId(draggedId);
                        setDragOverIndex(null); // 不显示上下插入指示线

                        if (mouseX < blockCenter) {
                          // 鼠标在左侧，显示左侧插入指示线（在目标元素之前新增一列）
                          setHorizontalDragSide('left');
                        } else {
                          // 鼠标在右侧，显示右侧插入指示线（在目标元素之后新增一列）
                          setHorizontalDragSide('right');
                        }
                        setHorizontalDragTargetIndex(i);
                        return;
                      }
                    }
                  }

                  setDraggedBlockId(draggedId);
                  // 如果 allowReplace 为 true，显示在当前块位置（可以替换）
                  // 如果 allowReplace 为 false，显示在当前块之前（可以插入）
                  if (allowReplace) {
                    setDragOverIndex(i);
                  } else {
                    // 对于非替换模式，显示插入指示线，应该显示在当前块之前
                    setDragOverIndex(i);
                  }
                  setHorizontalDragSide(null);
                  setHorizontalDragTargetIndex(null);
                  return;
                }

                // 同一个容器内的拖拽，显示排序指示线
                handleDragOver(e, i);
                setHorizontalDragSide(null);
                setHorizontalDragTargetIndex(null);
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();

                const draggedId = e.dataTransfer.getData('text/plain') || getCurrentDraggedBlockId();
                if (!draggedId || !childrenIds) {
                  (window as any).__currentDraggedBlockId = null;
                  (window as any).__currentDraggedBlock = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  setHorizontalDragSide(null);
                  setHorizontalDragTargetIndex(null);
                  return;
                }

                const draggedBlock = getCurrentDraggedBlock();
                if (!draggedBlock) {
                  (window as any).__currentDraggedBlockId = null;
                  (window as any).__currentDraggedBlock = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  setHorizontalDragSide(null);
                  setHorizontalDragTargetIndex(null);
                  return;
                }

                // 检查被拖拽的block和目标block都不是Container或ColumnsContainer
                const targetBlockId = childId;
                const document = editorStateStore.getState().document;
                const targetBlock = document[targetBlockId];
                const isDraggedContainer = draggedBlock?.type === 'Container' || draggedBlock?.type === 'ColumnsContainer';
                const isTargetContainer = targetBlock?.type === 'Container' || targetBlock?.type === 'ColumnsContainer';

                // 检查被拖拽的block和目标block是否在ColumnsContainer的列中
                const draggedParentInfoForDrop = findParentContainerId(document, draggedId);
                const targetParentInfoForDrop = findParentContainerId(document, targetBlockId);
                const isDraggedInColumnForDrop = draggedParentInfoForDrop.columnIndex !== null;
                const isTargetInColumnForDrop = targetParentInfoForDrop.columnIndex !== null;

                // 检查是否在同一个ColumnsContainer的不同列中（分栏间交换）
                const isCrossColumnSwap = isDraggedInColumnForDrop && isTargetInColumnForDrop &&
                  draggedParentInfoForDrop.containerId === targetParentInfoForDrop.containerId &&
                  draggedParentInfoForDrop.containerId !== null &&
                  draggedParentInfoForDrop.columnIndex !== targetParentInfoForDrop.columnIndex;

                // 检查是否在同一个列中（禁止同一列内部的分栏间拖拽）
                const isSameColumn = isDraggedInColumnForDrop && isTargetInColumnForDrop &&
                  draggedParentInfoForDrop.containerId === targetParentInfoForDrop.containerId &&
                  draggedParentInfoForDrop.columnIndex === targetParentInfoForDrop.columnIndex;

                // 如果是分栏间交换，直接执行交换操作（不检查水平拖拽）
                if (isCrossColumnSwap && !isDraggedContainer && !isTargetContainer && draggedId !== targetBlockId) {
                  // 分栏间交换：交换两个元素的位置
                  const draggedColumnIndex = draggedParentInfoForDrop.columnIndex!;
                  const targetColumnIndex = targetParentInfoForDrop.columnIndex!;
                  const columnsContainerId = draggedParentInfoForDrop.containerId!;

                  // 获取当前的columns数据
                  const columnsContainer = document[columnsContainerId];
                  if (columnsContainer && columnsContainer.type === 'ColumnsContainer') {
                    const currentColumns = columnsContainer.data.props?.columns || [];

                    // 创建新的columns数组
                    const newColumns = currentColumns.map((col, index) => {
                      if (index === draggedColumnIndex) {
                        // 源列：如果目标列有元素，用目标列的元素替换；如果目标列是空白，清空源列
                        const targetColumn = currentColumns[targetColumnIndex];
                        const targetChildrenIds = targetColumn?.childrenIds || [];
                        if (targetChildrenIds.length > 0) {
                          // 目标列有元素，交换：源列用目标列的元素
                          return { childrenIds: [...targetChildrenIds] };
                        } else {
                          // 目标列是空白，移动：源列变为空白
                          return { childrenIds: [] };
                        }
                      } else if (index === targetColumnIndex) {
                        // 目标列：用源列的元素替换（如果目标列是空白，就是移动；如果目标列有元素，就是交换）
                        const draggedColumn = currentColumns[draggedColumnIndex];
                        const draggedChildrenIds = draggedColumn?.childrenIds || [];
                        return { childrenIds: [...draggedChildrenIds] };
                      } else {
                        // 其他列保持不变
                        return { childrenIds: col?.childrenIds || [] };
                      }
                    });

                    // 更新ColumnsContainer
                    const updatedColumnsContainer = {
                      ...columnsContainer,
                      data: {
                        ...columnsContainer.data,
                        props: {
                          ...columnsContainer.data.props,
                          columns: newColumns,
                        },
                      },
                    };

                    // 更新document
                    setDocument({
                      [columnsContainerId]: updatedColumnsContainer,
                    });

                    // 清除拖拽状态
                    (window as any).__currentDraggedBlockId = null;
                    (window as any).__currentDraggedBlock = null;
                    setDraggedBlockId(null);
                    setDragOverIndex(null);
                    setHorizontalDragSide(null);
                    setHorizontalDragTargetIndex(null);
                    return;
                  }
                }

                // 禁止同一个列内部的分栏间拖拽（左右或上下）
                if (isSameColumn) {
                  (window as any).__currentDraggedBlockId = null;
                  (window as any).__currentDraggedBlock = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  setHorizontalDragSide(null);
                  setHorizontalDragTargetIndex(null);
                  return;
                }

                // 重新检测水平拖拽：检查鼠标位置是否在block的边缘区域（仅用于外部元素）
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX;
                const edgeThreshold = rect.width * 0.3; // 边缘30%的区域用于水平拖拽
                // 允许水平拖拽的情况：外部元素之间（不在列中，不是Container/ColumnsContainer）
                // 禁止自己拖拽到自己（防止自己跟自己合并）
                const isHorizontalDrag = !isDraggedContainer && !isTargetContainer &&
                  !isDraggedInColumnForDrop && !isTargetInColumnForDrop &&
                  draggedId !== targetBlockId &&
                  (mouseX < rect.left + edgeThreshold || mouseX > rect.right - edgeThreshold);
                const detectedHorizontalSide = mouseX < rect.left + edgeThreshold ? 'left' :
                  (mouseX > rect.right - edgeThreshold ? 'right' : null);

                // 处理外部水平拖拽：创建2列的ColumnsContainer
                if (isHorizontalDrag && detectedHorizontalSide) {

                  // 创建2列的ColumnsContainer
                  const columnsContainerId = generateId();

                  // 根据拖拽方向决定两个block的位置
                  // 如果拖到左侧：新block在左列，目标block在右列
                  // 如果拖到右侧：目标block在左列，新block在右列
                  const leftColumnBlockId = detectedHorizontalSide === 'left' ? draggedId : targetBlockId;
                  const rightColumnBlockId = detectedHorizontalSide === 'left' ? targetBlockId : draggedId;

                  // 创建ColumnsContainer
                  const columnsContainerData = ColumnsContainerPropsSchema.parse({
                    style: {
                      padding: { top: 16, bottom: 16, left: 24, right: 24 },
                    },
                    props: {
                      columnsCount: 2,
                      columnsGap: 16,
                      columns: [
                        { childrenIds: [leftColumnBlockId] },
                        { childrenIds: [rightColumnBlockId] },
                      ],
                    },
                  });
                  const columnsContainer: TEditorBlock = {
                    type: 'ColumnsContainer',
                    data: columnsContainerData,
                  };

                  // 找到被拖拽block的原容器
                  const draggedParentInfo = findParentContainerId(document, draggedId);

                  // 找到目标block的原容器
                  const targetParentInfo = findParentContainerId(document, targetBlockId);

                  // 检查被拖拽的block和目标block是否在同一个容器中
                  // 注意：如果它们在ColumnsContainer的不同列中（columnIndex不同），应该被视为不在同一个容器中
                  const isSameContainer = draggedParentInfo.containerId === targetParentInfo.containerId &&
                    draggedParentInfo.containerId === containerId &&
                    draggedParentInfo.columnIndex === targetParentInfo.columnIndex;

                  let newDocument = document;

                  // 如果被拖拽的block和目标block不在同一个容器中，需要从原容器中移除被拖拽的block
                  // 如果在同一个容器中，我们会在childrenIds中直接处理，不需要调用removeBlockFromParentContainer
                  if (!isSameContainer && draggedParentInfo.containerId) {
                    newDocument = removeBlockFromParentContainer(newDocument, draggedId, draggedParentInfo);
                  }

                  // 在当前容器中，用ColumnsContainer替换目标block的位置
                  // 同时需要移除被拖拽的block（如果它在当前容器中）
                  const newChildrenIds = [...childrenIds];
                  const targetIndex = childrenIds.indexOf(targetBlockId);
                  const draggedIndex = childrenIds.indexOf(draggedId);

                  if (targetIndex !== -1) {
                    // 如果被拖拽的block也在当前容器中，需要先移除它（在替换目标之前）
                    // 这样可以避免索引计算错误
                    if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
                      // 先移除被拖拽的block
                      newChildrenIds.splice(draggedIndex, 1);
                      // 如果被拖拽的block在目标block之前，目标block的索引需要减1
                      const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
                      // 替换目标block为ColumnsContainer（目标block会被包含在ColumnsContainer中）
                      newChildrenIds.splice(adjustedTargetIndex, 1, columnsContainerId);
                    } else {
                      // 如果被拖拽的block不在当前容器中，直接替换目标block
                      newChildrenIds.splice(targetIndex, 1, columnsContainerId);
                    }
                  } else {
                    // 如果目标block不在当前容器中（不应该发生），直接插入
                    newChildrenIds.splice(i, 0, columnsContainerId);
                    // 如果被拖拽的block在当前容器中，需要移除它
                    if (draggedIndex !== -1) {
                      newChildrenIds.splice(draggedIndex, 1);
                    }
                  }

                  // 确保两个block都在document中（如果不在，添加它们）
                  // 注意：即使block已经在document中，我们也要确保它们存在，因为可能被之前的操作移除了
                  // 但是，我们不在document中添加ColumnsContainer，让ContainerEditor的onChange来处理
                  newDocument = {
                    ...newDocument,
                    [draggedId]: draggedBlock,
                    [targetBlockId]: targetBlock,
                  };

                  // 先更新document，确保button和text都在document中
                  // 这样当ContainerEditor的onChange检查blockExists时，button和text已经存在了
                  setDocument(newDocument);

                  // 然后通过onChange通知父组件更新childrenIds
                  // ContainerEditor的onChange会添加ColumnsContainer（因为它不存在）并更新childrenIds
                  setTimeout(() => {
                    onChange({
                      blockId: columnsContainerId,
                      block: columnsContainer,
                      childrenIds: newChildrenIds,
                    });
                  }, 0);

                  (window as any).__currentDraggedBlockId = null;
                  (window as any).__currentDraggedBlock = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  setHorizontalDragSide(null);
                  setHorizontalDragTargetIndex(null);
                  return;
                }

                // 如果是最后一个块且拖拽到底部
                if (isLastBlock && dragOverIndex === childrenIds.length) {
                  const sourceIndex = childrenIds.indexOf(draggedId);

                  // 如果拖拽的block在当前容器中，执行排序操作
                  if (sourceIndex !== -1) {
                    if (sourceIndex === childrenIds.length - 1) {
                      (window as any).__currentDraggedBlockId = null;
                      (window as any).__currentDraggedBlock = null;
                      setDraggedBlockId(null);
                      setDragOverIndex(null);
                      return;
                    }
                    const newChildrenIds = [...childrenIds];
                    const [removed] = newChildrenIds.splice(sourceIndex, 1);
                    newChildrenIds.push(removed);
                    onChange({
                      blockId: draggedId,
                      block: {} as TEditorBlock,
                      childrenIds: newChildrenIds,
                    });
                    (window as any).__currentDraggedBlockId = null;
                    (window as any).__currentDraggedBlock = null;
                    setDraggedBlockId(null);
                    setDragOverIndex(null);
                    return;
                  }

                  // 如果拖拽的block不在当前容器中，说明是从外部拖拽过来的
                  // 检查是否是外部元素拖入列中做上下插入（需要检查列数）
                  const targetParentInfoForAppend = findParentContainerId(document, containerId || '');
                  const isTargetInColumnForAppend = allowReplace || targetParentInfoForAppend.columnIndex !== null;
                  const draggedParentInfoForAppend = findParentContainerId(document, draggedId);
                  const isDraggedInColumnForAppend = draggedParentInfoForAppend.columnIndex !== null;

                  // 如果是外部元素拖入列中（列中有元素），检查是否可以扩列插入
                  if (isTargetInColumnForAppend && !isDraggedInColumnForAppend && !allowReplace) {
                    const columnsContainerId = targetParentInfoForAppend.containerId;
                    if (columnsContainerId) {
                      const columnsContainer = document[columnsContainerId];
                      if (columnsContainer && columnsContainer.type === 'ColumnsContainer') {
                        const currentColumnsCount = columnsContainer.data.props?.columnsCount ||
                          columnsContainer.data.props?.columns?.length || 0;

                        // 如果列数 >= 4，禁止插入
                        if (currentColumnsCount >= 4) {
                          (window as any).__currentDraggedBlockId = null;
                          (window as any).__currentDraggedBlock = null;
                          setDraggedBlockId(null);
                          setDragOverIndex(null);
                          setIsDragNotAllowed(false);
                          return;
                        }

                        // 如果列数 < 4，扩列并插入到末尾
                        const currentColumns = columnsContainer.data.props?.columns || [];
                        const targetColumnIndex = targetParentInfoForAppend.columnIndex!;

                        // 如果当前是2列或4列，插入后改为3列均分
                        let newColumnsCount: number;
                        let newFixedWidths: [number | null | undefined, number | null | undefined, number | null | undefined, number | null | undefined] | undefined = undefined;

                        if (currentColumnsCount === 2 || currentColumnsCount === 4) {
                          // 改为3列均分
                          newColumnsCount = 3;
                          newFixedWidths = [null, null, null, null]; // 均分，不使用固定宽度
                        } else {
                          // 正常扩列
                          newColumnsCount = currentColumnsCount + 1;
                        }

                        // 创建新的columns数组，在目标列之后插入新列
                        const newColumns: Array<{ childrenIds: string[] }> = [];
                        for (let colIndex = 0; colIndex < currentColumnsCount; colIndex++) {
                          if (colIndex === targetColumnIndex) {
                            // 保留目标列
                            newColumns.push({ childrenIds: currentColumns[colIndex]?.childrenIds || [] });
                            // 在目标列之后插入新列，包含被拖拽的元素
                            newColumns.push({ childrenIds: [draggedId] });
                          } else {
                            // 保留其他列
                            newColumns.push({ childrenIds: currentColumns[colIndex]?.childrenIds || [] });
                          }
                        }

                        // 如果改为3列，需要调整columns数组长度
                        if (currentColumnsCount === 2 || currentColumnsCount === 4) {
                          // 如果当前是2列，插入后变为3列，newColumns已经有3个元素了
                          // 如果当前是4列，插入后变为3列，需要只保留前3列
                          if (currentColumnsCount === 4) {
                            // 只保留前3列
                            newColumns.splice(3);
                          }
                        }

                        // 找到原容器并移除block
                        const parentInfo = findParentContainerId(document, draggedId);
                        let newDocument = document;
                        if (parentInfo.containerId) {
                          newDocument = removeBlockFromParentContainer(document, draggedId, parentInfo);
                        }

                        // 更新ColumnsContainer，扩列并添加新block
                        const updatedColumnsContainer = {
                          ...columnsContainer,
                          data: {
                            ...columnsContainer.data,
                            props: {
                              ...columnsContainer.data.props,
                              columnsCount: newColumnsCount,
                              columns: newColumns,
                              ...(newFixedWidths !== undefined && { fixedWidths: newFixedWidths }),
                            },
                          },
                        };

                        // 更新document
                        setDocument({
                          ...newDocument,
                          [columnsContainerId]: updatedColumnsContainer,
                          [draggedId]: draggedBlock,
                        });

                        // 清除拖拽状态
                        (window as any).__currentDraggedBlockId = null;
                        (window as any).__currentDraggedBlock = null;
                        setDraggedBlockId(null);
                        setDragOverIndex(null);
                        setHorizontalDragSide(null);
                        setHorizontalDragTargetIndex(null);
                        return;
                      }
                    }
                  }

                  // 实现移动操作：从原容器中移除，添加到目标容器末尾
                  if (!draggedBlock) {
                    (window as any).__currentDraggedBlockId = null;
                    (window as any).__currentDraggedBlock = null;
                    setDraggedBlockId(null);
                    setDragOverIndex(null);
                    return;
                  }

                  // 使用原来的 blockId，实现移动而不是复制
                  const blockId = draggedId;

                  // 检查是否试图将容器自身添加到自己的 childrenIds 中（防止循环引用）
                  if (containerId && blockId === containerId) {
                    (window as any).__currentDraggedBlockId = null;
                    (window as any).__currentDraggedBlock = null;
                    setDraggedBlockId(null);
                    setDragOverIndex(null);
                    return;
                  }

                  // 检查是否允许将 block 拖入目标容器（防止 Container 和 ColumnsContainer 相互嵌套）
                  if (!canDropBlockIntoContainer(draggedBlock, containerId, document)) {
                    (window as any).__currentDraggedBlockId = null;
                    (window as any).__currentDraggedBlock = null;
                    setDraggedBlockId(null);
                    setDragOverIndex(null);
                    setIsDragNotAllowed(false);
                    return;
                  }

                  // 检查是否是外部元素拖入列中（列有元素），禁止底部插入
                  if (containerId) {
                    const targetParentInfoForBottom = findParentContainerId(document, containerId);
                    const isTargetInColumnForBottom = allowReplace || targetParentInfoForBottom.columnIndex !== null;
                    const draggedParentInfoForBottom = findParentContainerId(document, blockId);
                    const isDraggedInColumnForBottom = draggedParentInfoForBottom.columnIndex !== null;

                    // 如果是外部元素拖入列中（列有元素），禁止底部插入
                    if (isTargetInColumnForBottom && !isDraggedInColumnForBottom && !allowReplace) {
                      // 已经处理过扩列逻辑，如果到这里说明列数 >= 4，禁止插入
                      (window as any).__currentDraggedBlockId = null;
                      (window as any).__currentDraggedBlock = null;
                      setDraggedBlockId(null);
                      setDragOverIndex(null);
                      setIsDragNotAllowed(false);
                      return;
                    }
                  }

                  // 添加到目标容器末尾
                  const newChildrenIds = [...childrenIds, blockId];

                  // 找到原容器
                  const parentInfo = findParentContainerId(document, blockId);

                  // 检查是否是跨列拖拽（同一个ColumnsContainer，原block在某个列中）
                  // 如果原block在ColumnsContainer的某个列中，且目标也是同一个ColumnsContainer，则是跨列拖拽
                  const isCrossColumnDrag = parentInfo.containerId === containerId &&
                    parentInfo.columnIndex !== null;

                  let newDocumentForBottom = document;
                  // 如果不是跨列拖拽，才从原容器中移除block
                  // 跨列拖拽由updateColumn处理（复制到目标列，从源列删除）
                  if (!isCrossColumnDrag) {
                    newDocumentForBottom = removeBlockFromParentContainer(document, blockId, parentInfo);
                    // 先更新整个document（从原容器中移除block）
                    setDocument(newDocumentForBottom);
                  }

                  // 然后通过 onChange 通知父组件更新 childrenIds（这会触发updateColumn，updateColumn会更新columns）
                  // 注意：需要延迟一下，确保setDocument已经完成（如果不是跨列拖拽），updateColumn能获取到最新的document
                  setTimeout(() => {
                    onChange({
                      blockId: blockId,
                      block: draggedBlock,
                      childrenIds: newChildrenIds,
                    });
                  }, 0);

                  (window as any).__currentDraggedBlockId = null;
                  (window as any).__currentDraggedBlock = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  return;
                }
                // 处理拖拽到已有元素上的情况
                const sourceIndex = childrenIds.indexOf(draggedId);

                // 如果拖拽的block在当前容器中，执行排序操作
                if (sourceIndex !== -1) {
                  // 同一个容器内的排序，直接调用 handleDrop
                  handleDrop(e, i);
                  return;
                }

                // 如果拖拽的block不在当前容器中，说明是从外部拖拽过来的
                if (!draggedBlock) {
                  (window as any).__currentDraggedBlockId = null;
                  (window as any).__currentDraggedBlock = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  return;
                }

                // 使用原来的 blockId，实现移动而不是复制
                const blockId = draggedId;

                // 检查是否试图将容器自身添加到自己的 childrenIds 中（防止循环引用）
                if (containerId && blockId === containerId) {
                  (window as any).__currentDraggedBlockId = null;
                  (window as any).__currentDraggedBlock = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  return;
                }

                // 检查是否允许将 block 拖入目标容器（防止 Container 和 ColumnsContainer 相互嵌套）
                if (!canDropBlockIntoContainer(draggedBlock, containerId, document)) {
                  (window as any).__currentDraggedBlockId = null;
                  (window as any).__currentDraggedBlock = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  setIsDragNotAllowed(false);
                  return;
                }

                // 检查是否是外部元素拖入列中（列中有元素），需要扩列插入（左右插入，新增一列）
                const targetParentInfoForInsert = findParentContainerId(document, childId);
                const isTargetInColumnForInsert = allowReplace || targetParentInfoForInsert.columnIndex !== null;
                const draggedParentInfoForInsert = findParentContainerId(document, blockId);
                const isDraggedInColumnForInsert = draggedParentInfoForInsert.columnIndex !== null;

                // 检查是否是水平拖拽指示线（外部元素拖入列中，需要扩列）
                const isHorizontalDragForExpand = (horizontalDragSide === 'left' || horizontalDragSide === 'right') &&
                  horizontalDragTargetIndex === i &&
                  isTargetInColumnForInsert &&
                  !isDraggedInColumnForInsert &&
                  !allowReplace;

                // 如果是外部元素拖入列中（列中有元素），检查是否需要扩列
                if ((isTargetInColumnForInsert && !isDraggedInColumnForInsert && !allowReplace) || isHorizontalDragForExpand) {
                  const columnsContainerId = targetParentInfoForInsert.containerId;
                  if (columnsContainerId) {
                    const columnsContainer = document[columnsContainerId];
                    if (columnsContainer && columnsContainer.type === 'ColumnsContainer') {
                      const currentColumnsCount = columnsContainer.data.props?.columnsCount ||
                        columnsContainer.data.props?.columns?.length || 0;

                      // 如果列数 >= 4，禁止插入
                      if (currentColumnsCount >= 4) {
                        (window as any).__currentDraggedBlockId = null;
                        (window as any).__currentDraggedBlock = null;
                        setDraggedBlockId(null);
                        setDragOverIndex(null);
                        setIsDragNotAllowed(false);
                        return;
                      }

                      // 如果列数 < 4，扩列并插入
                      const currentColumns = columnsContainer.data.props?.columns || [];
                      const targetColumnIndex = targetParentInfoForInsert.columnIndex!;

                      // 如果当前是2列或4列，插入后改为3列均分
                      let newColumnsCount: number;
                      let newFixedWidths: [number | null | undefined, number | null | undefined, number | null | undefined, number | null | undefined] | undefined = undefined;

                      if (currentColumnsCount === 2 || currentColumnsCount === 4) {
                        // 改为3列均分
                        newColumnsCount = 3;
                        newFixedWidths = [null, null, null, null]; // 均分，不使用固定宽度
                      } else {
                        // 正常扩列
                        newColumnsCount = currentColumnsCount + 1;
                      }

                      // 检查是否是左侧插入
                      const isLeftInsert = horizontalDragSide === 'left' && horizontalDragTargetIndex === i;

                      // 创建新的columns数组，根据指示线位置插入新列
                      const newColumns: Array<{ childrenIds: string[] }> = [];
                      for (let colIndex = 0; colIndex < currentColumnsCount; colIndex++) {
                        if (isLeftInsert && colIndex === targetColumnIndex) {
                          // 左侧插入：在目标列之前插入新列
                          newColumns.push({ childrenIds: [blockId] });
                          newColumns.push({ childrenIds: currentColumns[colIndex]?.childrenIds || [] });
                        } else if (!isLeftInsert && colIndex === targetColumnIndex) {
                          // 右侧插入：在目标列之后插入新列
                          newColumns.push({ childrenIds: currentColumns[colIndex]?.childrenIds || [] });
                          newColumns.push({ childrenIds: [blockId] });
                        } else {
                          // 保留其他列
                          newColumns.push({ childrenIds: currentColumns[colIndex]?.childrenIds || [] });
                        }
                      }

                      // 如果改为3列，需要调整columns数组长度
                      if (currentColumnsCount === 2 || currentColumnsCount === 4) {
                        // 如果当前是2列，插入后变为3列，newColumns已经有3个元素了
                        // 如果当前是4列，插入后变为3列，需要只保留前3列
                        if (currentColumnsCount === 4) {
                          // 只保留前3列
                          newColumns.splice(3);
                        }
                      }

                      // 找到原容器并移除block
                      const parentInfo = findParentContainerId(document, blockId);
                      let newDocument = document;
                      if (parentInfo.containerId) {
                        newDocument = removeBlockFromParentContainer(document, blockId, parentInfo);
                      }

                      // 更新ColumnsContainer，扩列并添加新block
                      const updatedColumnsContainer = {
                        ...columnsContainer,
                        data: {
                          ...columnsContainer.data,
                          props: {
                            ...columnsContainer.data.props,
                            columnsCount: newColumnsCount,
                            columns: newColumns,
                            ...(newFixedWidths !== undefined && { fixedWidths: newFixedWidths }),
                          },
                        },
                      };

                      // 更新document
                      setDocument({
                        ...newDocument,
                        [columnsContainerId]: updatedColumnsContainer,
                        [blockId]: draggedBlock,
                      });

                      // 清除拖拽状态
                      (window as any).__currentDraggedBlockId = null;
                      (window as any).__currentDraggedBlock = null;
                      setDraggedBlockId(null);
                      setDragOverIndex(null);
                      setHorizontalDragSide(null);
                      setHorizontalDragTargetIndex(null);
                      return;
                    }
                  }
                }

                // 检查是否是外部元素拖入列中（列有元素），禁止上下插入
                const targetParentInfoForCheck = findParentContainerId(document, childId);
                const isTargetInColumnForCheck = allowReplace || targetParentInfoForCheck.columnIndex !== null;
                const draggedParentInfoForCheck = findParentContainerId(document, blockId);
                const isDraggedInColumnForCheck = draggedParentInfoForCheck.columnIndex !== null;

                // 如果是外部元素拖入列中（列有元素），禁止上下插入
                if (isTargetInColumnForCheck && !isDraggedInColumnForCheck && !allowReplace) {
                  // 已经处理过扩列逻辑，如果到这里说明列数 >= 4，禁止插入
                  (window as any).__currentDraggedBlockId = null;
                  (window as any).__currentDraggedBlock = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  setIsDragNotAllowed(false);
                  return;
                }

                // 只有在 allowReplace 为 true 时（ColumnsContainer 的列），才允许替换现有元素
                // 否则只允许插入，不允许替换
                const newChildrenIds = [...childrenIds];
                if (allowReplace) {
                  // 替换当前元素（仅适用于 ColumnsContainer 的列）
                  newChildrenIds.splice(i, 1, blockId);
                } else {
                  // 插入到当前元素之前（其他容器类型）
                  newChildrenIds.splice(i, 0, blockId);
                }

                // 找到原容器
                const parentInfo = findParentContainerId(document, blockId);

                // 检查是否是跨列拖拽（同一个ColumnsContainer，原block在某个列中）
                // 如果原block在ColumnsContainer的某个列中，且目标也是同一个ColumnsContainer，则是跨列拖拽
                const isCrossColumnDrag = parentInfo.containerId === containerId &&
                  parentInfo.columnIndex !== null;

                let newDocument = document;
                // 如果不是跨列拖拽，才从原容器中移除block
                // 跨列拖拽由updateColumn处理（复制到目标列，从源列删除）
                if (!isCrossColumnDrag) {
                  newDocument = removeBlockFromParentContainer(document, blockId, parentInfo);
                  // 先更新整个document（从原容器中移除block）
                  setDocument(newDocument);
                }

                // 然后通过 onChange 通知父组件更新 childrenIds（这会触发updateColumn，updateColumn会更新columns）
                // 注意：需要延迟一下，确保setDocument已经完成（如果不是跨列拖拽），updateColumn能获取到最新的document
                setTimeout(() => {
                  onChange({
                    blockId: blockId,
                    block: draggedBlock,
                    childrenIds: newChildrenIds,
                  });
                }, 0);

                (window as any).__currentDraggedBlockId = null;
                (window as any).__currentDraggedBlock = null;
                setDraggedBlockId(null);
                setDragOverIndex(null);
              }}
              onDragEnd={handleDragEnd}
              sx={{
                position: 'relative',
                cursor: isDragNotAllowed ? 'no-drop' : 'default',
                ...(showFullBorder
                  ? {
                    outline: '2px solid',
                    outlineColor: isDragNotAllowed ? '#d3d9dd' : 'primary.main',
                    outlineOffset: '-2px',
                  }
                  : {
                    // 水平拖拽指示线优先显示
                    '&::before': showLeftIndicator
                      ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: -2,
                        bottom: 0,
                        width: 4,
                        backgroundColor: isDragNotAllowed ? '#d3d9dd' : 'primary.main',
                        zIndex: 1000,
                        pointerEvents: 'none',
                      }
                      : (showTopIndicator || showTopIndicatorForExternal)
                        ? {
                          content: '""',
                          position: 'absolute',
                          top: -2,
                          left: 0,
                          right: 0,
                          height: 4,
                          backgroundColor: isDragNotAllowed ? '#d3d9dd' : 'primary.main',
                          zIndex: 1000,
                          pointerEvents: 'none',
                        }
                        : {},
                    '&::after': showRightIndicator
                      ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: -2,
                        bottom: 0,
                        width: 4,
                        backgroundColor: isDragNotAllowed ? '#d3d9dd' : 'primary.main',
                        zIndex: 1000,
                        pointerEvents: 'none',
                      }
                      : (showBottomIndicator || showBottomIndicatorForExternal)
                        ? {
                          content: '""',
                          position: 'absolute',
                          bottom: -2,
                          left: 0,
                          right: 0,
                          height: 4,
                          backgroundColor: isDragNotAllowed ? '#d3d9dd' : 'primary.main',
                          zIndex: 1000,
                          pointerEvents: 'none',
                        }
                        : {},
                  }),
              }}
            >
              <EditorBlock id={childId} />
            </Box>
          </Fragment>
        );
      })}
      <AddBlockButton onSelect={appendBlock} disableContainerBlocks={isContainerOrColumnsContainer} />
    </>
  );
}
