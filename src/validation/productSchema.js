import { z } from 'zod'

const baseProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, { message: 'Please enter a product SKU' })
    .regex(/^[A-Z]{3}-\d{3}$/, {
      message: 'SKU must follow the format ABC-001.',
    }),

  name: z
    .string()
    .trim()
    .min(3, { message: 'Product name must be at least 3 characters long' })
    .max(100, { message: 'Product name cannot exceed 100 characters' }),

  category: z.string().trim().min(1, { message: 'Please enter a product category' }),

  unit: z.string().trim().min(1, { message: 'Please enter a product unit' }),

  sellingPrice: z
    .number({ invalid_type_error: 'Selling price must be a number' })
    .nonnegative({ message: 'Selling price cannot be negative' }),

  costPrice: z
    .number({ invalid_type_error: 'Cost price must be a number' })
    .nonnegative({ message: 'Cost price cannot be negative' })
    .optional(),

  stockQuantity: z
    .number({ invalid_type_error: 'Stock quantity must be a number' })
    .finite({ message: 'Stock quantity must be finite' })
    .nonnegative({ message: 'Stock quantity cannot be negative' }),

  status: z.string().trim().min(1, { message: 'Please select a status from the list' }),

  description: z
    .string()
    .trim()
    .max(500, { message: 'Description cannot exceed 500 characters' })
    .optional(),
})

export const createProductSchema = baseProductSchema.superRefine((data, ctx) => {
  if (data.costPrice !== undefined && data.sellingPrice < data.costPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sellingPrice'],
      message: 'Selling price cannot be lower than the cost price.',
    })
  }
})

export const updateProductSchema = baseProductSchema
