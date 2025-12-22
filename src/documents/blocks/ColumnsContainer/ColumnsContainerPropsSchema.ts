import { z } from 'zod';

import { ColumnsContainerPropsSchema as BaseColumnsContainerPropsSchema } from '@usewaypoint/block-columns-container';

const BasePropsShape = BaseColumnsContainerPropsSchema.shape.props.unwrap().unwrap().shape;

const ColumnsContainerPropsSchema = z.object({
  style: BaseColumnsContainerPropsSchema.shape.style,
  props: z
    .object({
      ...BasePropsShape,
      columnsCount: z.number().min(1).max(4).optional().nullable(),
      columns: z.array(z.object({ childrenIds: z.array(z.string()) })).min(1).max(4),
      fixedWidths: z
        .tuple([
          z.number().nullable().optional(),
          z.number().nullable().optional(),
          z.number().nullable().optional(),
          z.number().nullable().optional(),
        ])
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
});

export type ColumnsContainerProps = z.infer<typeof ColumnsContainerPropsSchema>;
export default ColumnsContainerPropsSchema;
