import React, { Fragment, useState } from 'react';

import { Box } from '@mui/material';

import { TEditorBlock, TEditorConfiguration } from '../../../editor/core';
import { editorStateStore, setDocument } from '../../../editor/EditorContext';
import EditorBlock from '../../../editor/EditorBlock';

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

export default function EditorChildrenIds({ childrenIds, onChange, containerId }: EditorChildrenIdsProps) {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
      setDraggedBlockId(draggedId);
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedId = e.dataTransfer.getData('text/plain') || getCurrentDraggedBlockId();
    console.log('handleDrop: 开始处理拖拽', {
      draggedId,
      dataTransfer: e.dataTransfer.getData('text/plain'),
      currentDraggedBlockId: getCurrentDraggedBlockId(),
      containerId,
      childrenIds,
      dropIndex,
    });

    if (!draggedId || !childrenIds) {
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    // 检查 draggedId 是否是当前容器的 ID（ColumnsContainer 的 ID），如果是，说明拖拽的是容器本身，应该忽略
    if (draggedId === containerId) {
      console.warn('handleDrop: 拖拽的是容器本身，忽略', { draggedId, containerId });
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    const sourceIndex = childrenIds.indexOf(draggedId);

    // 如果拖拽的block在当前容器中，执行排序操作
    if (sourceIndex !== -1) {
      if (sourceIndex === dropIndex) {
        (window as any).__currentDraggedBlockId = null;
        (window as any).__currentDraggedBlock = null;
        setDraggedBlockId(null);
        setDragOverIndex(null);
        return;
      }

      const newChildrenIds = [...childrenIds];
      const [removed] = newChildrenIds.splice(sourceIndex, 1);
      newChildrenIds.splice(dropIndex, 0, removed);

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
    console.log('handleDrop: 外部拖拽', {
      draggedId,
      draggedBlock,
      containerId,
    });

    if (!draggedBlock) {
      console.warn('handleDrop: 无法获取被拖拽的block数据', { draggedId });
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    // 使用原来的 blockId，实现移动而不是复制
    const blockId = draggedId;

    // 添加到目标容器
    const newChildrenIds = [...childrenIds];
    if (dropIndex >= 0 && dropIndex < childrenIds.length) {
      // 替换现有元素
      newChildrenIds.splice(dropIndex, 1, blockId);
    } else {
      // 插入新元素
      newChildrenIds.splice(dropIndex, 0, blockId);
    }

    // 获取当前document
    const document = editorStateStore.getState().document;

    // 找到原容器
    const parentInfo = findParentContainerId(document, blockId);
    console.log('handleDrop: 查找原容器', {
      blockId,
      parentInfo,
      containerId,
    });

    // 检查是否是跨列拖拽（同一个ColumnsContainer，原block在某个列中）
    // 如果原block在ColumnsContainer的某个列中，且目标也是同一个ColumnsContainer，则是跨列拖拽
    const isCrossColumnDrag = parentInfo.containerId === containerId &&
      parentInfo.columnIndex !== null;

    console.log('handleDrop: 跨列拖拽检测', {
      isCrossColumnDrag,
      parentInfo,
      containerId,
    });

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
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  if (!childrenIds || childrenIds.length === 0) {
    return (
      <Box
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const draggedId = getCurrentDraggedBlockId();
          if (draggedId) {
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

          // 添加到目标容器（空白区域，直接添加）
          const newChildrenIds = [blockId];

          // 获取当前document
          const document = editorStateStore.getState().document;

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
          ...(dragOverIndex === 0 && draggedBlockId !== null && !childrenIds?.includes(draggedBlockId)
            ? {
              outline: '2px solid',
              outlineColor: 'primary.main',
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
                  backgroundColor: 'primary.main',
                  zIndex: 1000,
                  pointerEvents: 'none',
                }
                : {},
            }),
        }}
      >
        <AddBlockButton placeholder onSelect={appendBlock} />
      </Box>
    );
  }

  return (
    <>
      {childrenIds.map((childId, i) => {
        const isLastBlock = i === childrenIds.length - 1;
        const isExternalDrag = draggedBlockId !== null && draggedBlockId !== childId && !childrenIds.includes(draggedBlockId);
        const showTopIndicator = dragOverIndex === i && draggedBlockId !== null && draggedBlockId !== childId && !isExternalDrag;
        const showBottomIndicator = isLastBlock && dragOverIndex === childrenIds.length && draggedBlockId !== null && draggedBlockId !== childId && !isExternalDrag;
        const showFullBorder = dragOverIndex === i && isExternalDrag;

        return (
          <Fragment key={childId}>
            <AddBlockButton onSelect={(block) => insertBlock(block, i)} />
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const draggedId = getCurrentDraggedBlockId();
                if (!draggedId) return;

                // 检查是否是外部拖拽
                const isExternal = !childrenIds.includes(draggedId);

                // 如果是最后一个块且不是外部拖拽，检查是否拖拽到块的下方区域
                if (isLastBlock && !isExternal) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseY = e.clientY;
                  const blockBottom = rect.bottom;
                  // 如果鼠标在块的下半部分，认为是拖拽到底部
                  if (mouseY > blockBottom - rect.height / 2) {
                    setDraggedBlockId(draggedId);
                    setDragOverIndex(childrenIds.length);
                    return;
                  }
                }

                // 如果是外部拖拽，直接显示在当前块位置
                if (isExternal) {
                  setDraggedBlockId(draggedId);
                  setDragOverIndex(i);
                  return;
                }

                handleDragOver(e, i);
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                // 如果是最后一个块且拖拽到底部
                if (isLastBlock && dragOverIndex === childrenIds.length) {
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
                  // 实现移动操作：从原容器中移除，添加到目标容器末尾
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

                  // 添加到目标容器末尾
                  const newChildrenIds = [...childrenIds, blockId];

                  // 获取当前document
                  const document = editorStateStore.getState().document;

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
                  return;
                }
                // 处理拖拽到已有元素上的情况
                // 如果是外部拖拽，应该替换（覆盖）当前元素
                const draggedId = e.dataTransfer.getData('text/plain') || getCurrentDraggedBlockId();
                if (!draggedId || !childrenIds) {
                  (window as any).__currentDraggedBlockId = null;
                  (window as any).__currentDraggedBlock = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  return;
                }

                const sourceIndex = childrenIds.indexOf(draggedId);

                // 如果拖拽的block在当前容器中，执行排序操作
                if (sourceIndex !== -1) {
                  handleDrop(e, i);
                  return;
                }

                // 如果拖拽的block不在当前容器中，说明是从外部拖拽过来的
                // 实现移动操作：从原容器中移除，替换当前元素
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

                // 替换当前元素：删除当前元素，插入新元素
                const newChildrenIds = [...childrenIds];
                newChildrenIds.splice(i, 1, blockId); // 替换而不是插入

                // 获取当前document
                const document = editorStateStore.getState().document;

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
                ...(showFullBorder
                  ? {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: '-2px',
                  }
                  : {
                    '&::before': showTopIndicator
                      ? {
                        content: '""',
                        position: 'absolute',
                        top: -2,
                        left: 0,
                        right: 0,
                        height: 4,
                        backgroundColor: 'primary.main',
                        zIndex: 1000,
                        pointerEvents: 'none',
                      }
                      : {},
                    '&::after': showBottomIndicator
                      ? {
                        content: '""',
                        position: 'absolute',
                        bottom: -2,
                        left: 0,
                        right: 0,
                        height: 4,
                        backgroundColor: 'primary.main',
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
      <AddBlockButton onSelect={appendBlock} />
    </>
  );
}
