import React from 'react';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, setSelectedBlockId, useDocument, editorStateStore } from '../../editor/EditorContext';
import EditorChildrenIds from '../helpers/EditorChildrenIds';

import { EmailLayoutProps } from './EmailLayoutPropsSchema';

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

  return (
    <div
      onClick={() => {
        setSelectedBlockId(null);
      }}
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
