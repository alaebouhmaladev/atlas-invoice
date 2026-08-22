export const HR_TIMEZONE = 'Africa/Casablanca'

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function toHrLocalDate(value: string | Date): string {
  if (typeof value === 'string' && LOCAL_DATE_PATTERN.test(value)) return value

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Date RH invalide.')

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function parseHrLocalDate(value: string | Date): Date {
  const localDate = typeof value === 'string' && LOCAL_DATE_PATTERN.test(value)
    ? value
    : toHrLocalDate(value)
  const parsed = new Date(`${localDate}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) throw new Error('Date RH invalide.')
  return parsed
}

export function getHrDateRange(value: string | Date): { start: Date; end: Date } {
  const start = parseHrLocalDate(value)
  const end = new Date(start)
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

export function enumerateHrDates(startInput: string | Date, endInput: string | Date): string[] {
  const start = parseHrLocalDate(startInput)
  const end = parseHrLocalDate(endInput)
  if (start > end) throw new Error('La date de fin doit être postérieure ou égale à la date de début.')

  const dates: string[] = []
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10))
  }
  return dates
}
