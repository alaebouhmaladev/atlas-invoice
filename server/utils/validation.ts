import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .pipe(z.string().email({ message: 'Invalid email address format' })),
  password: z.string({ required_error: 'Password is required' }).min(1, { message: 'Password cannot be empty' })
})

export type LoginInput = z.infer<typeof loginSchema>
