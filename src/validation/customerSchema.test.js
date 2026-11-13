import { describe, expect, it } from 'vitest'
import { createCustomerSchema, updateCustomerSchema } from './customerSchema'

describe.each([
  ['create', createCustomerSchema],
  ['update', updateCustomerSchema],
])('%s customer phone numbers', (_operation, schema) => {
  it.each(['+254712345678', '254712345678', '710507389', '0710507389'])(
    'accepts %s for both primary and secondary numbers',
    (phone) => {
      expect(schema.shape.phonePrimary.safeParse(phone).success).toBe(true)
      expect(schema.shape.phoneSecondary.safeParse(phone).success).toBe(true)
    },
  )

  it.each(['', '+', '++254712345678', '+0710507389', '254+712345678', '1234567890123456'])(
    'rejects invalid primary number %s',
    (phone) => {
      expect(schema.shape.phonePrimary.safeParse(phone).success).toBe(false)
    },
  )

  it('allows an empty or omitted secondary number', () => {
    expect(schema.shape.phoneSecondary.safeParse('').success).toBe(true)
    expect(schema.shape.phoneSecondary.safeParse(undefined).success).toBe(true)
  })

  describe.each([
    ['create', createCustomerSchema],
    ['update', updateCustomerSchema],
  ])('%s customer contact person', (_operation, schema) => {
    it.each(['', undefined])('shows the required message for %s', (value) => {
      const result = schema.shape.contactPerson.safeParse(value)
      expect(result.success).toBe(false)
      expect(result.error.issues[0].message).toBe('Contact person is required')
    })

    it('accepts a contact person', () => {
      expect(schema.shape.contactPerson.safeParse('Alex').success).toBe(true)
    })
  })

  it.each(['', undefined])('shows a required message for primary number %s', (phone) => {
    const result = schema.shape.phonePrimary.safeParse(phone)
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('Primary phone number is required')
  })

  it('shows an invalid message for a malformed primary number', () => {
    const result = schema.shape.phonePrimary.safeParse('abc')
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('Invalid phone number')
  })
})
