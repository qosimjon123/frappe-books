import type { Schema } from 'schemas/types';

/** fadl: order curated row fields by server meta (field_order). */
export function orderByMeta(fieldnames: string[], schema: Schema): string[] {
  const order = new Map(schema.fields.map((field, i) => [field.fieldname, i]));
  return fieldnames.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}
