import React from 'react';

import { Container as BaseContainer } from '@usewaypoint/block-container';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, setSelectedBlockId, useDocument, editorStateStore } from '../../editor/EditorContext';
import EditorChildrenIds from '../helpers/EditorChildrenIds';

import { ContainerProps } from './ContainerPropsSchema';

export default function ContainerEditor({ style, props }: ContainerProps) {
  const childrenIds = props?.childrenIds ?? [];

  const document = useDocument();
  const currentBlockId = useCurrentBlockId();

  return (
    <BaseContainer style={style}>
      <EditorChildrenIds
        childrenIds={childrenIds}
        containerId={currentBlockId}
        onChange={({ block, blockId, childrenIds }) => {
          // 检查是否试图将 Container 自身添加到自己的 childrenIds 中（防止循环引用）
          if (blockId === currentBlockId) {
            return;
          }
          
          // 如果是拖拽排序（block 没有 type），只更新 childrenIds
          if (!block.type) {
            setDocument({
              [currentBlockId]: {
                type: 'Container',
                data: {
                  ...document[currentBlockId].data,
                  props: { childrenIds: childrenIds },
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
                type: 'Container',
                data: {
                  ...latestDocument[currentBlockId].data,
                  props: { childrenIds: childrenIds },
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
    </BaseContainer>
  );
}
