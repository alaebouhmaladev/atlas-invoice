import { z } from 'zod'
import { ClientType } from '@prisma/client'

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .pipe(z.string().email({ message: 'Invalid email address format' })),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, { message: 'Password cannot be empty' })
})

export type LoginInput = z.infer<typeof loginSchema>

// Helper to sanitize optional text strings (trim and convert empty strings to null or undefined)
const optionalText = (maxLen = 255) =>
  z
    .string()
    .max(maxLen, { message: `Le texte ne peut pas dépasser ${maxLen} caractères` })
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null
      const trimmed = val.trim()
      return trimmed.length > 0 ? trimmed : null
    })

// Helper for ICE validation (exactly 15 numeric digits if provided)
const optionalIce = z
  .string()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return null
    const cleaned = val.replace(/\s+/g, '')
    return cleaned.length > 0 ? cleaned : null
  })
  .refine((val) => val === null || /^\d{15}$/.test(val), {
    message: "L'ICE doit comporter exactement 15 chiffres"
  })

// Helper for optional email validation
const optionalEmail = z
  .string()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return null
    const trimmed = val.trim().toLowerCase()
    return trimmed.length > 0 ? trimmed : null
  })
  .refine((val) => val === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: "Format d'adresse email invalide"
  })

export const clientSchema = z
  .object({
    type: z.nativeEnum(ClientType, { required_error: 'Le type de client est requis' }),
    companyName: optionalText(255),
    firstName: optionalText(100),
    lastName: optionalText(100),
    ice: optionalIce,
    taxId: optionalText(100),
    rc: optionalText(100),
    cnss: optionalText(100),
    patent: optionalText(100),
    email: optionalEmail,
    phone: optionalText(50),
    secondaryPhone: optionalText(50),
    address: optionalText(500),
    addressLine2: optionalText(500),
    city: optionalText(100),
    postalCode: optionalText(20),
    country: z.string().default('Maroc').transform((val) => val?.trim() || 'Maroc'),
    contactName: optionalText(150),
    contactPosition: optionalText(100),
    contactEmail: optionalEmail,
    contactPhone: optionalText(50),
    notes: optionalText(2000),
    confirmDuplicate: z.boolean().optional().default(false)
  })
  .superRefine((data, ctx) => {
    if (data.type === ClientType.COMPANY) {
      if (!data.companyName || data.companyName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La raison sociale est requise pour une entreprise',
          path: ['companyName']
        })
      }
    } else if (data.type === ClientType.INDIVIDUAL) {
      if (!data.firstName || data.firstName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Le prénom est requis pour un particulier',
          path: ['firstName']
        })
      }
      if (!data.lastName || data.lastName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Le nom est requis pour un particulier',
          path: ['lastName']
        })
      }
    }
  })

export type ClientInput = z.infer<typeof clientSchema>

export const clientUpdateSchema = clientSchema

export const clientQuerySchema = z.object({
  search: z.string().optional().transform((val) => val?.trim() || undefined),
  type: z.nativeEnum(ClientType).optional(),
  city: z.string().optional().transform((val) => val?.trim() || undefined),
  status: z.enum(['active', 'archived', 'all']).default('active'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'displayName', 'companyName', 'city']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type ClientQueryInput = z.infer<typeof clientQuerySchema>
