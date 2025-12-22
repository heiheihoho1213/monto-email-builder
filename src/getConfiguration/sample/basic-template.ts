import { TEditorConfiguration } from '../../documents/editor/core';

const BASIC_TEMPLATE: TEditorConfiguration = {
  root: {
    type: 'EmailLayout',
    data: {
      backdropColor: '#F5F5F5',
      canvasColor: '#FFFFFF',
      textColor: '#262626',
      fontFamily: 'MODERN_SANS',
      childrenIds: [
        'title-block',
        'content-block',
        'footer-block',
      ],
    },
  },
  'title-block': {
    type: 'Heading',
    data: {
      style: {
        padding: {
          top: 32,
          bottom: 16,
          right: 24,
          left: 24,
        },
        textAlign: 'center',
      },
      props: {
        text: 'Your Title Here',
        level: 'h1',
      },
    },
  },
  'content-block': {
    type: 'Text',
    data: {
      style: {
        padding: {
          top: 16,
          bottom: 16,
          right: 24,
          left: 24,
        },
      },
      props: {
        text: 'Your content goes here...',
      },
    },
  },
  'footer-block': {
    type: 'Text',
    data: {
      style: {
        padding: {
          top: 32,
          bottom: 32,
          right: 24,
          left: 24,
        },
        textAlign: 'center',
        fontSize: 12,
        color: '#666666',
      },
      props: {
        text: 'Copyright (C) *|CURRENT_YEAR|* *|LIST:COMPANY|*. All rights reserved.\n\n*|IFNOT:ARCHIVE_PAGE|**|LIST:DESCRIPTION|**|END:IF|*\n\nOur mailing address is:\n*|IFNOT:ARCHIVE_PAGE|**|HTML:LIST_ADDRESS|**|END:IF|*',
      },
    },
  },
};

export default BASIC_TEMPLATE;

