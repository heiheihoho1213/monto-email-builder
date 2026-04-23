import React from 'react';

import * as AddOutlinedModule from '@mui/icons-material/AddOutlined';
import { ButtonBase } from '@mui/material';

import { resolveMuiIcon } from '../../../../../utils/resolveMuiIcon';

const AddOutlined = resolveMuiIcon(AddOutlinedModule);

type Props = {
  onClick: () => void;
};
export default function PlaceholderButton({ onClick }: Props) {
  return (
    <ButtonBase
      onClick={(ev) => {
        ev.stopPropagation();
        onClick();
      }}
      sx={{
        display: 'flex',
        alignContent: 'center',
        justifyContent: 'center',
        height: 48,
        width: '100%',
        bgcolor: 'rgba(0,0,0, 0.05)',
      }}
    >
      <AddOutlined
        sx={{
          p: 0.12,
          bgcolor: 'brand.blue',
          borderRadius: 24,
          color: 'primary.contrastText',
        }}
        fontSize="small"
      />
    </ButtonBase>
  );
}
