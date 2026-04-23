import React from 'react';

import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import { Divider, IconButton, Paper, Stack, SxProps, Tooltip } from '@mui/material';

import { TEditorBlock, TEditorConfiguration } from '../../../editor/core';
import { resetDocument, setSelectedBlockId, useDocument } from '../../../editor/EditorContext';
import { ColumnsContainerProps } from '../../ColumnsContainer/ColumnsContainerPropsSchema';

function generateId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// 递归复制块及其子块，返回新 document 和新块 id
function duplicateBlockInDocument(
  doc: TEditorConfiguration,
  blockId: string
): { newDocument: TEditorConfiguration; newBlockId: string } {
  const block = doc[blockId];
  if (!block) {
    return { newDocument: doc, newBlockId: blockId };
  }
  const newId = generateId();
  const clone = JSON.parse(JSON.stringify(block)) as TEditorBlock;
  let newDoc = { ...doc };

  if (clone.type === 'Container' && clone.data?.props?.childrenIds) {
    const newChildIds: string[] = [];
    for (const childId of clone.data.props.childrenIds) {
      const { newDocument: nextDoc, newBlockId: newChildId } = duplicateBlockInDocument(newDoc, childId);
      newDoc = nextDoc;
      newChildIds.push(newChildId);
    }
    clone.data.props.childrenIds = newChildIds;
  } else if (clone.type === 'ColumnsContainer' && clone.data?.props?.columns) {
    const newColumns = clone.data.props.columns.map((col: { childrenIds?: string[] }) => {
      const ids = col.childrenIds ?? [];
      const newChildIds: string[] = [];
      for (const childId of ids) {
        const { newDocument: nextDoc, newBlockId: newChildId } = duplicateBlockInDocument(newDoc, childId);
        newDoc = nextDoc;
        newChildIds.push(newChildId);
      }
      return { ...col, childrenIds: newChildIds };
    });
    clone.data.props.columns = newColumns;
  }

  newDoc = { ...newDoc, [newId]: clone };
  return { newDocument: newDoc, newBlockId: newId };
}

// 查找block所在的父容器ID和列索引（如果是ColumnsContainer）
function findParentContainerId(document: TEditorConfiguration, blockId: string): { containerId: string | null; columnIndex: number | null } {
  for (const [containerId, container] of Object.entries(document)) {
    // 检查EmailLayout
    if (container.type === 'EmailLayout' && container.data.childrenIds?.includes(blockId)) {
      return { containerId, columnIndex: null };
    }
    // 检查Container
    if (container.type === 'Container' && container.data.props?.childrenIds?.includes(blockId)) {
      return { containerId, columnIndex: null };
    }
    // 检查ColumnsContainer
    if (container.type === 'ColumnsContainer') {
      const columns = container.data.props?.columns;
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

const sx: SxProps = {
  position: 'absolute',
  bottom: -12,
  left: -50,
  borderRadius: 64,
  paddingX: 0.5,
  paddingY: 0.5,
  zIndex: 'fab',
};

type Props = {
  blockId: string;
};
export default function TuneMenu({ blockId }: Props) {
  const document = useDocument();

  // 查找当前 block 所在的父容器
  const parentInfo = findParentContainerId(document, blockId);

  // 检查是否可以移动（上下箭头是否应该显示）
  const canMove = React.useMemo(() => {
    if (!parentInfo.containerId) {
      return { canMoveUp: false, canMoveDown: false };
    }

    const container = document[parentInfo.containerId];
    if (!container) {
      return { canMoveUp: false, canMoveDown: false };
    }

    let childrenIds: string[] | null | undefined = null;

    if (container.type === 'EmailLayout') {
      childrenIds = container.data.childrenIds;
    } else if (container.type === 'Container') {
      childrenIds = container.data.props?.childrenIds;
    } else if (container.type === 'ColumnsContainer' && parentInfo.columnIndex !== null) {
      const columns = container.data.props?.columns;
      if (columns && columns[parentInfo.columnIndex]) {
        childrenIds = columns[parentInfo.columnIndex].childrenIds;
      }
    }

    if (!childrenIds || childrenIds.length <= 1) {
      return { canMoveUp: false, canMoveDown: false };
    }

    const index = childrenIds.indexOf(blockId);
    if (index < 0) {
      return { canMoveUp: false, canMoveDown: false };
    }

    return {
      canMoveUp: index > 0,
      canMoveDown: index < childrenIds.length - 1,
    };
  }, [document, blockId, parentInfo]);

  const handleDeleteClick = () => {
    const filterChildrenIds = (childrenIds: string[] | null | undefined) => {
      if (!childrenIds) {
        return childrenIds;
      }
      return childrenIds.filter((f) => f !== blockId);
    };
    const nDocument: typeof document = { ...document };

    // 如果删除的是 ColumnsContainer 中的子元素，需要检查删除后 column 是否为空
    let columnsContainerIdToCheck: string | null = null;
    let columnIndexToCheck: number | null = null;

    for (const [id, b] of Object.entries(nDocument)) {
      const block = b as TEditorBlock;
      if (id === blockId) {
        continue;
      }
      switch (block.type) {
        case 'EmailLayout':
          nDocument[id] = {
            ...block,
            data: {
              ...block.data,
              childrenIds: filterChildrenIds(block.data.childrenIds),
            },
          };
          break;
        case 'Container':
          nDocument[id] = {
            ...block,
            data: {
              ...block.data,
              props: {
                ...block.data.props,
                childrenIds: filterChildrenIds(block.data.props?.childrenIds),
              },
            },
          };
          break;
        case 'ColumnsContainer':
          // 检查删除的 block 是否在这个 ColumnsContainer 中
          const columns = block.data.props?.columns || [];
          let foundInColumn = false;
          let foundColumnIndex = -1;

          for (let i = 0; i < columns.length; i++) {
            if (columns[i].childrenIds?.includes(blockId)) {
              foundInColumn = true;
              foundColumnIndex = i;
              break;
            }
          }

          if (foundInColumn) {
            // 记录需要检查的 ColumnsContainer
            columnsContainerIdToCheck = id;
            columnIndexToCheck = foundColumnIndex;
          }

          nDocument[id] = {
            type: 'ColumnsContainer',
            data: {
              style: block.data.style,
              props: {
                ...block.data.props,
                columns: columns.map((c) => ({
                  childrenIds: filterChildrenIds(c.childrenIds),
                })),
              },
            } as ColumnsContainerProps,
          };
          break;
        default:
          nDocument[id] = block;
      }
    }

    // 删除被删除的 block
    delete nDocument[blockId];

    // 如果删除的是 ColumnsContainer 中的子元素，检查删除后该 column 是否为空
    if (columnsContainerIdToCheck && columnIndexToCheck !== null) {
      const columnsContainer = nDocument[columnsContainerIdToCheck];
      if (columnsContainer && columnsContainer.type === 'ColumnsContainer') {
        const updatedColumns = columnsContainer.data.props?.columns || [];
        const deletedColumn = updatedColumns[columnIndexToCheck];

        // 检查删除后的 column 是否为空
        if (deletedColumn && (!deletedColumn.childrenIds || deletedColumn.childrenIds.length === 0)) {
          // 如果只剩下最后一列，删除整个 ColumnsContainer
          if (updatedColumns.length <= 1) {
            // 需要从父容器中移除这个 ColumnsContainer
            const columnsContainerParentInfo = findParentContainerId(nDocument, columnsContainerIdToCheck);

            if (columnsContainerParentInfo.containerId) {
              const parentContainer = nDocument[columnsContainerParentInfo.containerId];
              if (parentContainer) {
                if (parentContainer.type === 'EmailLayout') {
                  nDocument[columnsContainerParentInfo.containerId] = {
                    ...parentContainer,
                    data: {
                      ...parentContainer.data,
                      childrenIds: (parentContainer.data.childrenIds || []).filter(
                        (id) => id !== columnsContainerIdToCheck
                      ),
                    },
                  };
                } else if (parentContainer.type === 'Container') {
                  nDocument[columnsContainerParentInfo.containerId] = {
                    ...parentContainer,
                    data: {
                      ...parentContainer.data,
                      props: {
                        ...parentContainer.data.props,
                        childrenIds: (parentContainer.data.props?.childrenIds || []).filter(
                          (id) => id !== columnsContainerIdToCheck
                        ),
                      },
                    },
                  };
                }
              }
            }

            // 删除 ColumnsContainer
            delete nDocument[columnsContainerIdToCheck];
            // 取消选中（如果选中的是 ColumnsContainer）
            setSelectedBlockId(null);
          } else {
            // 如果还有其他列，只删除这一列（从 columns 数组中移除）
            const newColumns = updatedColumns.filter((_, index) => index !== columnIndexToCheck);
            const newColumnsCount = newColumns.length;

            nDocument[columnsContainerIdToCheck] = {
              type: 'ColumnsContainer',
              data: {
                style: columnsContainer.data.style,
                props: {
                  ...columnsContainer.data.props,
                  columns: newColumns,
                  columnsCount: newColumnsCount,
                },
              } as ColumnsContainerProps,
            };
          }
        }
      }
    }

    resetDocument(nDocument);
  };

  const handleDuplicateClick = () => {
    if (blockId === 'root' || !parentInfo.containerId) return;
    const container = document[parentInfo.containerId];
    if (!container) return;
    let childrenIds: string[] | null = null;
    if (container.type === 'EmailLayout') {
      childrenIds = container.data.childrenIds ?? null;
    } else if (container.type === 'Container') {
      childrenIds = container.data.props?.childrenIds ?? null;
    } else if (container.type === 'ColumnsContainer' && parentInfo.columnIndex !== null) {
      const col = container.data.props?.columns?.[parentInfo.columnIndex];
      childrenIds = col?.childrenIds ?? null;
    }
    if (!childrenIds) return;
    const index = childrenIds.indexOf(blockId);
    if (index < 0) return;

    const { newDocument: nDoc, newBlockId } = duplicateBlockInDocument(document, blockId);
    const newChildrenIds = [...childrenIds];
    newChildrenIds.splice(index + 1, 0, newBlockId);

    const nDocument = { ...nDoc };
    const parentId = parentInfo.containerId;
    const parentBlock = nDocument[parentId];
    if (!parentBlock) return;
    if (parentBlock.type === 'EmailLayout') {
      nDocument[parentId] = { ...parentBlock, data: { ...parentBlock.data, childrenIds: newChildrenIds } };
    } else if (parentBlock.type === 'Container') {
      nDocument[parentId] = {
        ...parentBlock,
        data: {
          ...parentBlock.data,
          props: { ...parentBlock.data.props, childrenIds: newChildrenIds },
        },
      };
    } else if (parentBlock.type === 'ColumnsContainer' && parentInfo.columnIndex !== null) {
      const columns = (parentBlock.data.props?.columns ?? []).map((c: { childrenIds: string[] }, i: number) =>
        i === parentInfo.columnIndex! ? { ...c, childrenIds: newChildrenIds } : c
      );
      nDocument[parentId] = {
        ...parentBlock,
        data: {
          ...parentBlock.data,
          props: { ...parentBlock.data.props, columns },
        },
      } as TEditorBlock;
    }
    resetDocument(nDocument);
    setSelectedBlockId(newBlockId);
  };

  const handleMoveClick = (direction: 'up' | 'down') => {
    const moveChildrenIds = (ids: string[] | null | undefined) => {
      if (!ids) {
        return ids;
      }
      const index = ids.indexOf(blockId);
      if (index < 0) {
        return ids;
      }
      const childrenIds = [...ids];
      if (direction === 'up' && index > 0) {
        [childrenIds[index], childrenIds[index - 1]] = [childrenIds[index - 1], childrenIds[index]];
      } else if (direction === 'down' && index < childrenIds.length - 1) {
        [childrenIds[index], childrenIds[index + 1]] = [childrenIds[index + 1], childrenIds[index]];
      }
      return childrenIds;
    };
    const nDocument: typeof document = { ...document };
    for (const [id, b] of Object.entries(nDocument)) {
      const block = b as TEditorBlock;
      if (id === blockId) {
        continue;
      }
      switch (block.type) {
        case 'EmailLayout':
          nDocument[id] = {
            ...block,
            data: {
              ...block.data,
              childrenIds: moveChildrenIds(block.data.childrenIds),
            },
          };
          break;
        case 'Container':
          nDocument[id] = {
            ...block,
            data: {
              ...block.data,
              props: {
                ...block.data.props,
                childrenIds: moveChildrenIds(block.data.props?.childrenIds),
              },
            },
          };
          break;
        case 'ColumnsContainer':
          nDocument[id] = {
            type: 'ColumnsContainer',
            data: {
              style: block.data.style,
              props: {
                ...block.data.props,
                columns: block.data.props?.columns?.map((c) => ({
                  childrenIds: moveChildrenIds(c.childrenIds),
                })),
              },
            } as ColumnsContainerProps,
          };
          break;
        default:
          nDocument[id] = block;
      }
    }

    resetDocument(nDocument);
    setSelectedBlockId(blockId);
  };

  return (
    <Paper sx={sx} onClick={(ev) => ev.stopPropagation()}>
      <Stack>
        {canMove.canMoveUp && (
          <Tooltip title="Move up" placement="left" arrow>
            <IconButton onClick={() => handleMoveClick('up')} sx={{ color: 'text.primary' }}>
              <ArrowUpwardOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {canMove.canMoveDown && (
          <Tooltip title="Move down" placement="left" arrow>
            <IconButton onClick={() => handleMoveClick('down')} sx={{ color: 'text.primary' }}>
              <ArrowDownwardOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {(canMove.canMoveUp || canMove.canMoveDown) && (
          <Divider sx={{ my: 1, mx: 1 }} />
        )}

        {blockId !== 'root' && (
          <Tooltip title="Duplicate" placement="left" arrow>
            <IconButton onClick={handleDuplicateClick} sx={{ color: 'text.primary' }}>
              <ContentCopyOutlined sx={{ fontSize: '16px' }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete" placement="left" arrow>
          <IconButton onClick={handleDeleteClick} sx={{ color: 'text.primary' }}>
            <DeleteOutlined color="error" fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
