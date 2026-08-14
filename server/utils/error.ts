import { createError, type H3Event } from 'h3'

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'DOCUMENT_LOCKED'
  | 'DUPLICATE_OPERATION'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | string

export interface FieldError {
  field: string
  message: string
}

export interface AppErrorData {
  code: ErrorCode
  message: string
  requestId?: string
  fieldErrors?: FieldError[]
  [key: string]: unknown
}

export function createSanitizedError(
  event: H3Event,
  statusCode: number,
  code: ErrorCode,
  message: string,
  fieldErrors?: FieldError[]
) {
  const requestId = (event.context.requestId as string) || undefined

  return createError({
    statusCode,
    statusMessage: code,
    data: {
      code,
      message,
      requestId,
      fieldErrors: fieldErrors || []
    }
  })
}

export function getGenericInternalError(event: H3Event, rawError?: unknown) {
  const requestId = (event.context.requestId as string) || undefined
  console.error(`[Internal Error] Request ID: ${requestId}`, rawError)

  return createError({
    statusCode: 500,
    statusMessage: 'INTERNAL_ERROR',
    data: {
      code: 'INTERNAL_ERROR',
      message: `Une erreur inattendue est survenue. Réessayez. Si le problème persiste, contactez l'administrateur avec la référence ${requestId || 'système'}.`,
      requestId
    }
  })
}
