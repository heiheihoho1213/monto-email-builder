import React from 'react';

import { Container as BaseContainer } from '@usewaypoint/block-container';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, setSelectedBlockId, useDocument } from '../../editor/EditorContext';
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
            // 如果是新增块，创建新块并更新 childrenIds
            setDocument({
              [blockId]: block,
              [currentBlockId]: {
                type: 'Container',
                data: {
                  ...document[currentBlockId].data,
                  props: { childrenIds: childrenIds },
                },
              },
            });
            setSelectedBlockId(blockId);
          }
        }}
      />
    </BaseContainer>
  );
}
