import { z } from 'zod';
import { zPadding } from '../helpers/zod';

const SocialsPropsSchema = z.object({
  props: z
    .object({
      socials: z.array(z.object({
        platform: z.string().optional().nullable(),
        url: z.string().optional().nullable(),
      })).optional().nullable(),
    })
    .optional()
    .nullable(),
  style: z
    .object({
      padding: zPadding().optional().nullable(),
      backgroundColor: z.string().optional().nullable(),
      textAlign: z.enum(['left', 'center', 'right']).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export default SocialsPropsSchema;

export type SocialsProps = z.infer<typeof SocialsPropsSchema>;

