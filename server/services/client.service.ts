import { ClientType, Prisma } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditLog } from './audit.service'
import type { ClientInput, ClientQueryInput } from '../utils/validation'

export interface PotentialDuplicate {
  id: string
  displayName: string
  companyName: string | null
  email: string | null
  phone: string | null
  matchReason: string
}

export function generateDisplayName(data: { type: ClientType; companyName?: string | null; firstName?: string | null; lastName?: string | null }): string {
  if (data.type === ClientType.COMPANY && data.companyName) {
    return data.companyName.trim()
  }
  if (data.type === ClientType.INDIVIDUAL && (data.firstName || data.lastName)) {
    const parts = [data.firstName?.trim(), data.lastName?.trim()].filter(Boolean)
    return parts.join(' ')
  }
  return data.companyName?.trim() || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Client sans nom'
}

export async function findDuplicates(data: ClientInput, excludeClientId?: string): Promise<{ exactIceConflict: boolean; potentialDuplicates: PotentialDuplicate[] }> {
  const potentialDuplicates: PotentialDuplicate[] = []
  let exactIceConflict = false

  // 1. Exact ICE check (Strict unique identifier)
  if (data.ice) {
    const existingIce = await prisma.client.findFirst({
      where: {
        ice: data.ice,
        ...(excludeClientId ? { id: { not: excludeClientId } } : {})
      },
      select: { id: true, displayName: true, companyName: true, email: true, phone: true }
    })

    if (existingIce) {
      exactIceConflict = true
      potentialDuplicates.push({
        ...existingIce,
        matchReason: `Même numéro ICE (${data.ice})`
      })
      return { exactIceConflict, potentialDuplicates }
    }
  }

  // 2. Soft matching (Email, Phone, DisplayName)
  const conditions: Prisma.ClientWhereInput[] = []

  if (data.email) {
    conditions.push({ email: { equals: data.email, mode: 'insensitive' } })
  }
  if (data.phone) {
    conditions.push({ phone: { equals: data.phone } })
  }

  const generatedName = generateDisplayName(data)
  if (generatedName && generatedName !== 'Client sans nom') {
    conditions.push({ displayName: { equals: generatedName, mode: 'insensitive' } })
  }

  if (conditions.length > 0) {
    const matches = await prisma.client.findMany({
      where: {
        OR: conditions,
        ...(excludeClientId ? { id: { not: excludeClientId } } : {})
      },
      select: { id: true, displayName: true, companyName: true, email: true, phone: true }
    })

    for (const match of matches) {
      let reason = 'Nom similaire'
      if (data.email && match.email?.toLowerCase() === data.email.toLowerCase()) {
        reason = `Même adresse email (${data.email})`
      } else if (data.phone && match.phone === data.phone) {
        reason = `Même numéro de téléphone (${data.phone})`
      }

      if (!potentialDuplicates.some((d) => d.id === match.id)) {
        potentialDuplicates.push({
          ...match,
          matchReason: reason
        })
      }
    }
  }

  return { exactIceConflict: false, potentialDuplicates }
}

export async function getClients(query: ClientQueryInput) {
  const { search, type, city, status, page, pageSize, sortBy, sortOrder } = query
  const skip = (page - 1) * pageSize

  const where: Prisma.ClientWhereInput = {}

  // Filter by archive status
  if (status === 'active') {
    where.isArchived = false
  } else if (status === 'archived') {
    where.isArchived = true
  }

  // Filter by ClientType
  if (type) {
    where.type = type
  }

  // Filter by City
  if (city) {
    where.city = { equals: city, mode: 'insensitive' }
  }

  // Search filter
  if (search) {
    const searchMode: Prisma.QueryMode = 'insensitive'
    where.OR = [
      { displayName: { contains: search, mode: searchMode } },
      { companyName: { contains: search, mode: searchMode } },
      { firstName: { contains: search, mode: searchMode } },
      { lastName: { contains: search, mode: searchMode } },
      { ice: { contains: search, mode: searchMode } },
      { taxId: { contains: search, mode: searchMode } },
      { email: { contains: search, mode: searchMode } },
      { phone: { contains: search, mode: searchMode } },
      { contactName: { contains: search, mode: searchMode } },
      { city: { contains: search, mode: searchMode } }
    ]
  }

  const [totalItems, data] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })
  ])

  const totalPages = Math.ceil(totalItems / pageSize) || 1

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages
    }
  }
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      updatedBy: {
        select: { id: true, name: true, email: true }
      }
    }
  })
}

export async function createClient(data: ClientInput, userId: string, ipAddress?: string, userAgent?: string) {
  const displayName = generateDisplayName(data)

  const { confirmDuplicate, ...cleanData } = data

  const client = await prisma.$transaction(async (tx) => {
    const newClient = await tx.client.create({
      data: {
        ...cleanData,
        displayName,
        createdById: userId
      }
    })

    return newClient
  })

  await createAuditLog({
    userId,
    action: 'CLIENT_CREATED',
    entityType: 'Client',
    entityId: client.id,
    metadata: {
      displayName: client.displayName,
      type: client.type,
      ice: client.ice,
      companyName: client.companyName
    },
    ipAddress,
    userAgent
  })

  if (confirmDuplicate) {
    await createAuditLog({
      userId,
      action: 'CLIENT_DUPLICATE_OVERRIDE',
      entityType: 'Client',
      entityId: client.id,
      metadata: { displayName: client.displayName, reason: 'Utilisateur a confirmé la création malgré un doublon potentiel' },
      ipAddress,
      userAgent
    })
  }

  return client
}

export async function updateClient(id: string, data: ClientInput, userId: string, ipAddress?: string, userAgent?: string) {
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) return null

  const displayName = generateDisplayName(data)
  const { confirmDuplicate, ...cleanData } = data

  const updatedClient = await prisma.client.update({
    where: { id },
    data: {
      ...cleanData,
      displayName,
      updatedById: userId
    }
  })

  // Detect changed field names for audit log metadata
  const changedFields: string[] = []
  Object.keys(cleanData).forEach((key) => {
    const k = key as keyof typeof cleanData
    if (existing[k] !== cleanData[k]) {
      changedFields.push(key)
    }
  })

  await createAuditLog({
    userId,
    action: 'CLIENT_UPDATED',
    entityType: 'Client',
    entityId: updatedClient.id,
    metadata: {
      displayName: updatedClient.displayName,
      changedFields
    },
    ipAddress,
    userAgent
  })

  if (confirmDuplicate) {
    await createAuditLog({
      userId,
      action: 'CLIENT_DUPLICATE_OVERRIDE',
      entityType: 'Client',
      entityId: updatedClient.id,
      metadata: { displayName: updatedClient.displayName, actionType: 'UPDATE' },
      ipAddress,
      userAgent
    })
  }

  return updatedClient
}

export async function archiveClient(id: string, userId: string, ipAddress?: string, userAgent?: string) {
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) return null

  const archivedClient = await prisma.client.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      updatedById: userId
    }
  })

  await createAuditLog({
    userId,
    action: 'CLIENT_ARCHIVED',
    entityType: 'Client',
    entityId: archivedClient.id,
    metadata: { displayName: archivedClient.displayName },
    ipAddress,
    userAgent
  })

  return archivedClient
}

export async function restoreClient(id: string, userId: string, ipAddress?: string, userAgent?: string) {
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) return null

  const restoredClient = await prisma.client.update({
    where: { id },
    data: {
      isArchived: false,
      archivedAt: null,
      updatedById: userId
    }
  })

  await createAuditLog({
    userId,
    action: 'CLIENT_RESTORED',
    entityType: 'Client',
    entityId: restoredClient.id,
    metadata: { displayName: restoredClient.displayName },
    ipAddress,
    userAgent
  })

  return restoredClient
}

export async function deleteClient(id: string, userId: string, ipAddress?: string, userAgent?: string) {
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) return null

  // Future phase check: Ensure no linked devis or factures exist
  // When Devis / Facture models are added, check count here.

  await createAuditLog({
    userId,
    action: 'CLIENT_DELETED',
    entityType: 'Client',
    entityId: id,
    metadata: { displayName: existing.displayName, ice: existing.ice, companyName: existing.companyName },
    ipAddress,
    userAgent
  })

  await prisma.client.delete({
    where: { id }
  })

  return existing
}
