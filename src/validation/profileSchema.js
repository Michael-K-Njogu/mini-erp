import { z } from 'zod'

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required.').max(100),
  phoneNumber: z
    .string()
    .trim()
    .max(30, 'Phone number must be 30 characters or fewer.')
    .refine((value) => !value || /^[+0-9(). -]+$/.test(value), 'Enter a valid phone number.'),
})
