import { TEditorConfiguration } from '../../documents/editor/core';

const RESERVATION_REMINDER: TEditorConfiguration = {
  root: {
    type: 'EmailLayout',
    data: {
      backdropColor: '#F5F5F5',
      canvasColor: '#FFFFFF',
      textColor: '#262626',
      fontFamily: 'MODERN_SANS',
      childrenIds: [
        'block_verification_code_1',
        'block_verification_code_2',
        'block_verification_code_3',
        'block_verification_code_4',
        'block_verification_code_5',
      ],
    },
  },
  block_verification_code_1: {
    type: 'Text',
    data: {
      style: {
        color: null,
        backgroundColor: null,
        fontSize: 16,
        fontFamily: null,
        fontWeight: 'normal',
        textAlign: 'center',
        padding: {
          top: 32,
          bottom: 16,
          left: 24,
          right: 24,
        },
      },
      props: {
        text: 'Your verification code is:',
      },
    },
  },
  block_verification_code_2: {
    type: 'Heading',
    data: {
      style: {
        color: null,
        backgroundColor: null,
        fontFamily: 'MONOSPACE',
        fontWeight: 'bold',
        textAlign: 'center',
        padding: {
          top: 16,
          bottom: 16,
          left: 24,
          right: 24,
        },
      },
      props: {
        level: 'h1',
        text: '123456',
      },
    },
  },
  block_verification_code_3: {
    type: 'Text',
    data: {
      style: {
        color: null,
        backgroundColor: null,
        fontSize: 14,
        fontFamily: null,
        fontWeight: 'normal',
        textAlign: 'center',
        padding: {
          top: 16,
          bottom: 16,
          left: 24,
          right: 24,
        },
      },
      props: {
        text: 'This code will expire in 10 minutes.',
      },
    },
  },
  block_verification_code_4: {
    type: 'Text',
    data: {
      style: {
        color: null,
        backgroundColor: null,
        fontSize: 14,
        fontFamily: null,
        fontWeight: 'normal',
        textAlign: 'center',
        padding: {
          top: 16,
          bottom: 16,
          left: 24,
          right: 24,
        },
      },
      props: {
        text: 'If you did not request this code, please ignore this email.',
      },
    },
  },
  block_verification_code_5: {
    type: 'Text',
    data: {
      style: {
        color: null,
        backgroundColor: null,
        fontSize: 12,
        fontFamily: null,
        fontWeight: 'normal',
        textAlign: 'center',
        padding: {
          top: 32,
          bottom: 32,
          left: 24,
          right: 24,
        },
      },
      props: {
        text: 'Problems? Just reply to this email.',
      },
    },
  },
};

export default RESERVATION_REMINDER;
