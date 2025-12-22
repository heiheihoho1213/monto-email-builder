import { z } from 'zod';
import { zPadding } from '../helpers/zod';

const VideoPropsSchema = z.object({
  props: z
    .object({
      url: z.string().nullable().optional(),
      alt: z.string().optional().nullable(),
      width: z.string().optional().nullable(),
      height: z.string().optional().nullable(),
      contentAlignment: z.enum(['top', 'middle', 'bottom']).optional().nullable(),
      linkHref: z.string().nullable().optional(),
      autoplay: z.boolean().optional().nullable(),
      loop: z.boolean().optional().nullable(),
      muted: z.boolean().optional().nullable(),
      controls: z.boolean().optional().nullable(),
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

export default VideoPropsSchema;

export type VideoProps = z.infer<typeof VideoPropsSchema>;

