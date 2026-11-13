import { z } from 'zod'

const phoneNumberPattern = /^(?:\+?[1-9]\d{1,14}|0\d{1,14})$/

const customerImageSchema = z
  .union([z.string().url(), z.instanceof(File)])
  .refine(
    (value) => {
      if (value instanceof File) {
        return value.size <= 2 * 1024 * 1024
      }

      return true
    },
    {
      message: 'Image size must be less than or equal to 2MB',
    },
  )
  .nullable()
  .optional()

const baseCustomerSchema = z.object({
  name: z.string().min(1, { message: 'Customer / Business Name is required' }),

  email: z.string().email({ message: 'Invalid email address' }),

  phonePrimary: z
    .string({ required_error: 'Primary phone number is required' })
    .min(1, { message: 'Primary phone number is required' })
    .regex(phoneNumberPattern, { message: 'Invalid phone number' }),

  phoneSecondary: z
    .string()
    .regex(phoneNumberPattern, { message: 'Invalid phone number' })
    .optional()
    .or(z.literal('')),

  region: z.string().min(1, { message: 'Please select a region' }),

  city: z.string().min(1, { message: 'City or town is required' }),

  contactPerson: z
    .string({ required_error: 'Contact person is required' })
    .min(1, { message: 'Contact person is required' }),

  deliveryAddress: z.string().min(1, { message: 'Delivery address is required' }),

  creditLimit: z
    .number({ invalid_type_error: 'Credit limit must be a number between 0 and 500,000' })
    .min(0, { message: 'Credit limit must be at least 0' })
    .max(500000, { message: 'Credit limit cannot exceed 500,000' }),

  creditStatus: z.string().min(1, { message: 'Please select a credit status' }),

  vatNumber: z.string().min(1, { message: 'VAT number is required for invoices' }),

  customerType: z.string().min(1, { message: 'Please select a customer type' }),

  sector: z.string().min(1, { message: 'Please select a sector' }),

  image: customerImageSchema,
})

export const createCustomerSchema = baseCustomerSchema.extend({
  acceptedTerms: z.boolean().refine((value) => value === true, {
    message: 'You must accept the terms and conditions',
  }),
})

export const updateCustomerSchema = baseCustomerSchema
