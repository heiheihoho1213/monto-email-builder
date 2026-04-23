import React from 'react';

import RoundedCornerOutlined from '@mui/icons-material/RoundedCornerOutlined';

import { TStyle } from '../../../../../../documents/blocks/helpers/TStyle';
import { useTranslation } from '../../../../../../i18n/useTranslation';
import { NullableColorInput } from '../inputs/ColorInput';
import { NullableFontFamily } from '../inputs/FontFamily';
import FontSizeInput from '../inputs/FontSizeInput';
import FontStyleInput from '../inputs/FontStyleInput';
import FontWeightInput from '../inputs/FontWeightInput';
import LetterSpacingInput from '../inputs/LetterSpacingInput';
import LineHeightInput from '../inputs/LineHeightInput';
import PaddingInput from '../inputs/PaddingInput';
import SliderInput from '../inputs/SliderInput';
import TextAlignInput from '../inputs/TextAlignInput';
import TextDecorationInput from '../inputs/TextDecorationInput';

type StylePropertyPanelProps = {
  name: keyof TStyle;
  value: TStyle;
  onChange: (style: TStyle) => void;
};
export default function SingleStylePropertyPanel({ name, value, onChange }: StylePropertyPanelProps) {
  const { t } = useTranslation();
  const defaultValue = value[name] ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (v: any) => {
    onChange({ ...value, [name]: v });
  };

  switch (name) {
    case 'backgroundColor':
      return <NullableColorInput label={t('style.backgroundColor')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'borderColor':
      return <NullableColorInput label={t('style.borderColor')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'borderRadius':
      return (
        <SliderInput
          iconLabel={<RoundedCornerOutlined />}
          units="px"
          step={4}
          marks
          min={0}
          max={48}
          label={t('style.borderRadius')}
          defaultValue={defaultValue}
          onChange={handleChange}
        />
      );
    case 'color':
      return <NullableColorInput label={t('style.textColor')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'fontFamily':
      return <NullableFontFamily label={t('style.fontFamily')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'fontSize':
      return <FontSizeInput label={t('style.fontSize')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'fontWeight':
      return <FontWeightInput label={t('style.fontWeight')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'fontStyle':
      return <FontStyleInput label={t('style.fontStyle')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'textDecoration':
      return <TextDecorationInput label={t('style.textDecoration')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'lineHeight':
      return <LineHeightInput label={t('style.lineHeight')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'letterSpacing':
      return <LetterSpacingInput label={t('style.letterSpacing')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'textAlign':
      return <TextAlignInput label={t('style.alignment')} defaultValue={defaultValue} onChange={handleChange} />;
    case 'padding':
      return <PaddingInput label={t('style.padding')} defaultValue={defaultValue} onChange={handleChange} />;
  }
}
