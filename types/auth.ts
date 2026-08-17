import type { Role } from '@prisma/client'

export interface UserPublic {
  id: string
  tenantId?: string
  name: string
  email: string
  role: Role
  isActive: boolean
  mustChangePassword?: boolean
  lastLoginAt?: string | Date | null
  createdAt: string | Date
}

export interface SessionData {
  id: string
  userId: string
  expiresAt: Date
  user: UserPublic
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
