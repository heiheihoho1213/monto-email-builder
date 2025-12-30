import { z } from 'zod';
import { zPadding } from '../helpers/zod';

const CodePropsSchema = z.object({
  props: z
    .object({
      language: z.enum(['html']).optional().nullable(),
      code: z.string().optional().nullable(),
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

export default CodePropsSchema;

export type CodeProps = z.infer<typeof CodePropsSchema>;

