import React from 'react';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, setSelectedBlockId, useDocument, editorStateStore } from '../../editor/EditorContext';
import EditorChildrenIds from '../helpers/EditorChildrenIds';
import { TEditorBlock } from '../../editor/core';

import { EmailLayoutProps } from './EmailLayoutPropsSchema';

let idCounter = 0;
function generateId() {
  return `block-${Date.now()}-${++idCounter}`;
}

// 从 window 对象获取当前拖拽的 blockId（因为在 dragOver 事件中无法读取 dataTransfer）
const getCurrentDraggedBlockId = (): string | null => {
  return (window as any).__currentDraggedBlockId || null;
};

// 获取被拖拽的block数据
const getCurrentDraggedBlock = (): TEditorBlock | null => {
  return (window as any).__currentDraggedBlock || null;
};

function getFontFamily(fontFamily: EmailLayoutProps['fontFamily']) {
  const f = fontFamily ?? 'MODERN_SANS';
  switch (f) {
    case 'MODERN_SANS':
      return '"Helvetica Neue", "Arial Nova", "Nimbus Sans", Arial, sans-serif';
    case 'BOOK_SANS':
      return 'Optima, Candara, "Noto Sans", source-sans-pro, sans-serif';
    case 'ORGANIC_SANS':
      return 'Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", source-sans-pro, sans-serif';
    case 'GEOMETRIC_SANS':
      return 'Avenir, "Avenir Next LT Pro", Montserrat, Corbel, "URW Gothic", source-sans-pro, sans-serif';
    case 'HEAVY_SANS':
      return 'Bahnschrift, "DIN Alternate", "Franklin Gothic Medium", "Nimbus Sans Narrow", sans-serif-condensed, sans-serif';
    case 'ROUNDED_SANS':
      return 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, "Arial Rounded MT Bold", Calibri, source-sans-pro, sans-serif';
    case 'MODERN_SERIF':
      return 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif';
    case 'BOOK_SERIF':
      return '"Iowan Old Style", "Palatino Linotype", "URW Palladio L", P052, serif';
    case 'MONOSPACE':
      return '"Nimbus Mono PS", "Courier New", "Cutive Mono", monospace';
  }
}

export default function EmailLayoutEditor(props: EmailLayoutProps) {
  const childrenIds = props.childrenIds ?? [];
  const document = useDocument();
  const currentBlockId = useCurrentBlockId();

  const handleDropOnEmptyArea = (e: React.DragEvent) => {
    // 检查是否点击的是插入点区域（EditorChildrenIds 内部）
    const target = e.target as HTMLElement;
    const isInsideEditorChildrenIds = target.closest('[data-column-content="true"]') !== null;

    // 如果是在 EditorChildrenIds 内部，不处理（由 EditorChildrenIds 自己处理）
    if (isInsideEditorChildrenIds) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const draggedId = e.dataTransfer.getData('text/plain') || getCurrentDraggedBlockId();
    if (!draggedId) {
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      (window as any).__isSidebarBlock = false;
      return;
    }

    // 检查是否是从侧边栏拖拽的新块
    const isSidebarBlock = (window as any).__isSidebarBlock === true;
    const draggedBlock = getCurrentDraggedBlock();

    if (!draggedBlock) {
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      (window as any).__isSidebarBlock = false;
      return;
    }

    // 如果元素已经在画布上（在 childrenIds 中），且不是从侧边栏拖拽的，则不处理
    // 因为已经在画布上的元素应该通过 EditorChildrenIds 的拖拽逻辑处理，而不是在这里追加到底部
    if (!isSidebarBlock && childrenIds.includes(draggedId)) {
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      (window as any).__isSidebarBlock = false;
      return;
    }

    // 如果是侧边栏块，生成新的 blockId；否则使用原来的 blockId（实现移动而不是复制）
    const blockId = isSidebarBlock ? generateId() : draggedId;

    // 检查是否试图将容器自身添加到自己的 childrenIds 中（防止循环引用）
    if (blockId === currentBlockId) {
      (window as any).__currentDraggedBlockId = null;
      (window as any).__currentDraggedBlock = null;
      (window as any).__isSidebarBlock = false;
      return;
    }

    // 获取最新的 document
    const latestDocument = editorStateStore.getState().document;

    // 如果不是侧边栏块，需要从原容器中移除
    if (!isSidebarBlock) {
      // 查找原容器
      let parentInfo = { containerId: null as string | null, columnIndex: null as number | null };
      for (const [containerId, container] of Object.entries(latestDocument)) {
        if (container.type === 'EmailLayout' && container.data.childrenIds?.includes(draggedId)) {
          parentInfo = { containerId, columnIndex: null };
          break;
        }
        if (container.type === 'Container' && container.data.props?.childrenIds?.includes(draggedId)) {
          parentInfo = { containerId, columnIndex: null };
          break;
        }
        if (container.type === 'ColumnsContainer') {
          const columns = container.data.props?.columns;
          if (columns) {
            for (let i = 0; i < columns.length; i++) {
              if (columns[i].childrenIds?.includes(draggedId)) {
                parentInfo = { containerId, columnIndex: i };
                break;
              }
            }
          }
        }
      }

      // 从原容器中移除
      if (parentInfo.containerId) {
        const parentContainer = latestDocument[parentInfo.containerId];
        const newDocument = { ...latestDocument };

        if (parentInfo.columnIndex !== null) {
          // 从 ColumnsContainer 的列中移除
          const parentData = parentContainer.data as any;
          const columns = [...(parentData.props?.columns || [])];
          columns[parentInfo.columnIndex] = {
            ...columns[parentInfo.columnIndex],
            childrenIds: columns[parentInfo.columnIndex].childrenIds?.filter((id: string) => id !== draggedId) || [],
          };
          newDocument[parentInfo.containerId] = {
            ...parentContainer,
            data: {
              ...parentData,
              props: {
                ...parentData.props,
                columns,
              },
            },
          } as any;
        } else {
          // 从 Container 或 EmailLayout 中移除
          const parentData = parentContainer.data as any;
          const currentChildrenIds = parentContainer.type === 'Container'
            ? parentData.props?.childrenIds || []
            : parentData.childrenIds || [];
          const newChildrenIds = currentChildrenIds.filter((id: string) => id !== draggedId);

          if (parentContainer.type === 'Container') {
            const parentData = parentContainer.data as any;
            newDocument[parentInfo.containerId] = {
              ...parentContainer,
              data: {
                ...parentData,
                props: {
                  ...parentData.props,
                  childrenIds: newChildrenIds,
                },
              },
            } as any;
          } else {
            const parentData = parentContainer.data as any;
            newDocument[parentInfo.containerId] = {
              ...parentContainer,
              data: {
                ...parentData,
                childrenIds: newChildrenIds,
              },
            } as any;
          }
        }

        setDocument(newDocument);
      }
    }

    // 追加到最下方
    const newChildrenIds = [...childrenIds, blockId];
    const latestDocumentAfterRemove = editorStateStore.getState().document;
    const blockExists = latestDocumentAfterRemove[blockId] && latestDocumentAfterRemove[blockId].type;

    const updates: any = {
      [currentBlockId]: {
        type: 'EmailLayout',
        data: {
          ...latestDocumentAfterRemove[currentBlockId].data,
          childrenIds: newChildrenIds,
        },
      },
    };

    // 只有当 block 不存在时，才创建新块
    if (!blockExists) {
      updates[blockId] = draggedBlock;
    }

    setDocument(updates);
    setSelectedBlockId(blockId);

    (window as any).__currentDraggedBlockId = null;
    (window as any).__currentDraggedBlock = null;
    (window as any).__isSidebarBlock = false;
  };

  const handleDragOverOnEmptyArea = (e: React.DragEvent) => {
    // 检查是否点击的是插入点区域（EditorChildrenIds 内部）
    const target = e.target as HTMLElement;
    const isInsideEditorChildrenIds = target.closest('[data-column-content="true"]') !== null;

    // 如果是在 EditorChildrenIds 内部，不处理（由 EditorChildrenIds 自己处理）
    if (isInsideEditorChildrenIds) {
      return;
    }

    const draggedId = getCurrentDraggedBlockId();
    if (draggedId) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.dropEffect = 'move';
    }
  };

  return (
    <div
      onClick={() => {
        setSelectedBlockId(null);
      }}
      onDragOver={handleDragOverOnEmptyArea}
      onDrop={handleDropOnEmptyArea}
      style={{
        backgroundColor: props.backdropColor ?? '#F5F5F5',
        color: props.textColor ?? '#262626',
        fontFamily: getFontFamily(props.fontFamily),
        fontSize: '16px',
        fontWeight: '400',
        letterSpacing: '0.15008px',
        lineHeight: '1.5',
        margin: '0',
        padding: '32px 0',
        width: '100%',
        minHeight: '100%',
      }}
    >
      <table
        align="center"
        width="100%"
        style={{
          margin: '0 auto',
          maxWidth: props.width ? `${props.width}px` : '600px',
          backgroundColor: props.canvasColor ?? '#FFFFFF',
          borderRadius: props.borderRadius ?? undefined,
          // clipPath: 'inset(0 0 0 0 round 16px)',
          // overflow: 'hidden',
          border: (() => {
            const v = props.borderColor;
            if (!v) {
              return undefined;
            }
            return `1px solid ${v}`;
          })(),
        }}
        role="presentation"
        cellSpacing="0"
        cellPadding="0"
        border={0}
      >
        <tbody>
          <tr style={{ width: '100%' }}>
            <td>
              <EditorChildrenIds
                childrenIds={childrenIds}
                containerId={currentBlockId}
                onChange={({ block, blockId, childrenIds }) => {
                  // 检查是否试图将 EmailLayout 自身添加到自己的 childrenIds 中（防止循环引用）
                  if (blockId === currentBlockId) {
                    return;
                  }

                  // 如果是拖拽排序（block 没有 type），只更新 childrenIds
                  if (!block.type) {
                    setDocument({
                      [currentBlockId]: {
                        type: 'EmailLayout',
                        data: {
                          ...document[currentBlockId].data,
                          childrenIds: childrenIds,
                        },
                      },
                    });
                  } else {
                    // 获取最新的 document，确保使用最新的状态
                    const latestDocument = editorStateStore.getState().document;
                    // 检查 block 是否已经在 document 中（可能是从其他容器拖拽过来的）
                    const blockExists = latestDocument[blockId] && latestDocument[blockId].type;

                    const updates: any = {
                      [currentBlockId]: {
                        type: 'EmailLayout',
                        data: {
                          ...latestDocument[currentBlockId].data,
                          childrenIds: childrenIds,
                        },
                      },
                    };
                    // 只有当 block 不存在时，才创建新块
                    if (!blockExists) {
                      updates[blockId] = block;
                    }
                    setDocument(updates);
                    setSelectedBlockId(blockId);
                  }
                }}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
