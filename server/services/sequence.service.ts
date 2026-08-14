import { prisma } from '../utils/db'

export async function getNextSequenceNumber(
  type: string = 'QUOTE',
  customYear?: number
): Promise<{ formattedNumber: string; sequenceNumber: number; sequenceYear: number }> {
  const year = customYear || new Date().getFullYear()

  // Concurrency-safe atomic upsert and increment inside database transaction
  const sequence = await prisma.$transaction(async (tx) => {
    const seq = await tx.documentSequence.upsert({
      where: {
        type_year: {
          type,
          year
        }
      },
      create: {
        type,
        year,
        lastNumber: 1
      },
      update: {
        lastNumber: {
          increment: 1
        }
      }
    })
    return seq
  })

  const paddedNumber = String(sequence.lastNumber).padStart(4, '0')
  let prefix = type
  if (type === 'QUOTE') prefix = 'DEV'
  if (type === 'INVOICE') prefix = 'FAC'
  const formattedNumber = `${prefix}-${year}-${paddedNumber}`

  return {
    formattedNumber,
    sequenceNumber: sequence.lastNumber,
    sequenceYear: year
  }
}
