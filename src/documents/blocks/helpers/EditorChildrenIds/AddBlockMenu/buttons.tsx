import React from 'react';

import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import Crop32Outlined from '@mui/icons-material/Crop32Outlined';
import HMobiledataOutlined from '@mui/icons-material/HMobiledataOutlined';
import HorizontalRuleOutlined from '@mui/icons-material/HorizontalRuleOutlined';
import HtmlOutlined from '@mui/icons-material/HtmlOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import LibraryAddOutlined from '@mui/icons-material/LibraryAddOutlined';
import NotesOutlined from '@mui/icons-material/NotesOutlined';
import ShareOutlined from '@mui/icons-material/ShareOutlined';
import SmartButtonOutlined from '@mui/icons-material/SmartButtonOutlined';
import ViewColumnOutlined from '@mui/icons-material/ViewColumnOutlined';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';

import { TEditorBlock } from '../../../../editor/core';

type TButtonProps = {
  label: string;
  icon: JSX.Element;
  block: () => TEditorBlock;
};
export const BUTTONS: TButtonProps[] = [
  {
    label: 'Heading',
    icon: <HMobiledataOutlined />,
    block: () => ({
      type: 'Heading',
      data: {
        props: { text: 'My new heading block' },
        style: {
          padding: { top: 16, bottom: 16, left: 24, right: 24 },
        },
      },
    }),
  },
  {
    label: 'Text',
    icon: <NotesOutlined />,
    block: () => ({
      type: 'Text',
      data: {
        props: { text: 'My new text block', markdown: false },
        style: {
          padding: { top: 16, bottom: 16, left: 24, right: 24 },
          fontWeight: 'normal',
        },
      },
    }),
  },

  {
    label: 'Button',
    icon: <SmartButtonOutlined />,
    block: () => ({
      type: 'Button',
      data: {
        props: {
          text: 'Button',
          url: '',
        },
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },
  {
    label: 'Image',
    icon: <ImageOutlined />,
    block: () => ({
      type: 'Image',
      data: {
        props: {
          url: '',
          alt: 'Sample product',
          contentAlignment: 'middle',
          linkHref: null,
        },
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },
  {
    label: 'Video',
    icon: <VideocamOutlined />,
    block: () => ({
      type: 'Video',
      data: {
        props: {
          url: '',
          alt: 'Sample video',
          contentAlignment: 'middle',
          linkHref: null,
          autoplay: false,
          loop: false,
          muted: false,
          controls: true,
        },
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },
  // {
  //   label: 'Avatar',
  //   icon: <AccountCircleOutlined />,
  //   block: () => ({
  //     type: 'Avatar',
  //     data: {
  //       props: {
  //         imageUrl: 'https://ui-avatars.com/api/?size=128',
  //         shape: 'circle',
  //       },
  //       style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
  //     },
  //   }),
  // },
  {
    label: 'Divider',
    icon: <HorizontalRuleOutlined />,
    block: () => ({
      type: 'Divider',
      data: {
        style: { padding: { top: 16, right: 0, bottom: 16, left: 0 } },
        props: {
          lineColor: '#CCCCCC',
        },
      },
    }),
  },
  {
    label: 'Spacer',
    icon: <Crop32Outlined />,
    block: () => ({
      type: 'Spacer',
      data: {},
    }),
  },
  {
    label: 'Socials',
    icon: <ShareOutlined />,
    block: () => ({
      type: 'Socials',
      data: {
        props: {
          platforms: ['facebook', 'instagram', 'x'],
          iconStyle: 'origin-colorful',
          iconSize: 36,
          socials: [
            { platform: 'facebook', url: null },
            { platform: 'instagram', url: null },
            { platform: 'x', url: null },
          ],
        },
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },
  {
    label: 'HTML',
    icon: <HtmlOutlined />,
    block: () => ({
      type: 'Html',
      data: {
        props: { contents: '<p>My new HTML block</p>' },
        style: {
          fontSize: 16,
          textAlign: null,
          padding: { top: 16, bottom: 16, left: 24, right: 24 },
        },
      } as any,
    }),
  },
  {
    label: 'Columns',
    icon: <ViewColumnOutlined />,
    block: () => ({
      type: 'ColumnsContainer',
      data: {
        props: {
          columnsGap: 16,
          columnsCount: 3,
          columns: [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }],
          fixedWidths: [null, null, null, null],
        },
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },
  {
    label: 'Container',
    icon: <LibraryAddOutlined />,
    block: () => ({
      type: 'Container',
      data: {
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },

  // { label: 'ProgressBar', icon: <ProgressBarOutlined />, block: () => ({}) },
  // { label: 'LoopContainer', icon: <ViewListOutlined />, block: () => ({}) },
];
