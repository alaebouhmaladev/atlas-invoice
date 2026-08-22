import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import {
  ClientType,
  ContractStatus,
  ContractType,
  EmploymentStatus,
  Gender,
  InvoiceStatus,
  LeaveCategory,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  QuoteStatus,
  Role,
  SiteType
} from '@prisma/client'

const prisma = new PrismaClient()
const confirmation = process.env.RESET_CONFIRMATION
const keepEmail = (process.env.KEEP_SUPER_ADMIN_EMAIL || '').trim().toLowerCase()
const tenantId = 'default-tenant'

function assertLocalDatabase() {
  const url = new URL(process.env.DATABASE_URL || '')
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/atlas_bites_facturation') {
    throw new Error('Refus: ce script est réservé à la base locale atlas_bites_facturation.')
  }
  if (confirmation !== 'EFFACER LA BASE LOCALE ATLAS') throw new Error('Confirmation destructive invalide.')
  if (keepEmail !== 'admin@atlasbites.ma') throw new Error('Le Super Admin à conserver doit être admin@atlasbites.ma.')
}

function generatedPassword(role: string) {
  return `Atlas-${role}-${randomBytes(9).toString('base64url')}!7a`
}

function clientSnapshot(client: { id: string; displayName: string; email: string | null; phone: string | null; city: string | null; type: ClientType }) {
  return { id: client.id, displayName: client.displayName, email: client.email, phone: client.phone, city: client.city, type: client.type }
}

function companySnapshot() {
  return {
    legalName: 'Atlas Bites Maroc SARL',
    tradeName: 'Atlas Bites',
    city: 'Casablanca',
    country: 'Maroc',
    currency: 'MAD'
  }
}

async function main() {
  assertLocalDatabase()
  const keeper = await prisma.user.findFirst({ where: { email: { equals: keepEmail, mode: 'insensitive' }, role: Role.SUPER_ADMIN } })
  if (!keeper) throw new Error('Le Super Admin demandé est introuvable.')

  const credentials: Array<{ role: Role; email: string; password: string }> = []

  await prisma.$transaction(async tx => {
    const tables = await tx.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
      ORDER BY tablename
    `
    const quotedTables = tables.map(({ tablename }) => {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(tablename)) throw new Error(`Nom de table inattendu: ${tablename}`)
      return `"${tablename}"`
    })
    await tx.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables.join(', ')} RESTART IDENTITY CASCADE`)

    const admin = await tx.user.create({
      data: {
        id: keeper.id,
        tenantId: keeper.tenantId,
        name: keeper.name,
        email: keepEmail,
        passwordHash: keeper.passwordHash,
        role: Role.SUPER_ADMIN,
        isActive: true,
        mustChangePassword: keeper.mustChangePassword,
        passwordChangedAt: keeper.passwordChangedAt,
        lastLoginAt: null,
        createdAt: keeper.createdAt
      }
    })

    const roleAccounts = [
      { role: Role.HR_MANAGER, name: 'Responsable RH', email: 'rh.manager@atlasbites.ma' },
      { role: Role.ACCOUNTANT, name: 'Comptable Atlas', email: 'comptable@atlasbites.ma' },
      { role: Role.COMMERCIAL, name: 'Commercial Atlas', email: 'commercial@atlasbites.ma' }
    ]
    const createdUsers: Record<string, string> = {}
    for (const account of roleAccounts) {
      const password = generatedPassword(account.role)
      const user = await tx.user.create({
        data: {
          tenantId,
          name: account.name,
          email: account.email,
          passwordHash: await argon2.hash(password),
          role: account.role,
          isActive: true,
          mustChangePassword: true
        }
      })
      createdUsers[account.role] = user.id
      credentials.push({ role: account.role, email: account.email, password })
    }

    await tx.companySettings.create({
      data: {
        legalName: 'Atlas Bites Maroc SARL',
        tradeName: 'Atlas Bites',
        legalForm: 'SARL',
        address: 'Boulevard Zerktouni',
        city: 'Casablanca',
        postalCode: '20000',
        country: 'Maroc',
        phone: '+212 5 22 00 00 00',
        email: 'contact@atlasbites.ma',
        defaultCurrency: 'MAD',
        defaultVatRate: new Prisma.Decimal(20),
        defaultQuoteValidityDays: 30,
        defaultInvoiceDueDays: 30,
        quotePrefix: 'DEV',
        invoicePrefix: 'FAC',
        updatedById: admin.id
      }
    })

    const clients: Array<{ id: string; displayName: string; email: string | null; phone: string | null; city: string | null; type: ClientType }> = []
    const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Agadir', 'Fès', 'Meknès', 'Kénitra']
    for (let index = 1; index <= 100; index++) {
      const isCompany = index <= 10
      const displayName = isCompany ? `Entreprise Démo ${String(index).padStart(2, '0')}` : `Client Démo ${String(index).padStart(3, '0')}`
      const client = await tx.client.create({
        data: {
          type: isCompany ? ClientType.COMPANY : ClientType.INDIVIDUAL,
          companyName: isCompany ? displayName : null,
          firstName: isCompany ? null : `Prénom${index}`,
          lastName: isCompany ? null : `Nom${index}`,
          displayName,
          ice: isCompany ? `001234567${String(index).padStart(3, '0')}` : null,
          email: `client${index}@example.ma`,
          phone: `+212600${String(index).padStart(6, '0')}`,
          address: `${index}, avenue Démonstration`,
          city: cities[(index - 1) % cities.length],
          postalCode: String(20000 + index),
          country: 'Maroc',
          contactName: isCompany ? `Responsable ${index}` : null,
          contactPosition: isCompany ? 'Direction' : null,
          notes: 'Donnée de démonstration locale',
          createdById: admin.id
        },
        select: { id: true, displayName: true, email: true, phone: true, city: true, type: true }
      })
      clients.push(client)
    }

    const now = new Date()
    const year = now.getUTCFullYear()
    for (let index = 1; index <= 20; index++) {
      const client = clients[(index - 1) % clients.length]
      const unitPrice = new Prisma.Decimal(750 + index * 35)
      const quantity = new Prisma.Decimal(2)
      const subtotal = unitPrice.mul(quantity)
      const vat = subtotal.mul(new Prisma.Decimal('0.20'))
      const total = subtotal.add(vat)
      const issueDate = new Date(Date.UTC(year, (index - 1) % 12, Math.min(index, 28)))
      const validUntil = new Date(issueDate)
      validUntil.setUTCDate(validUntil.getUTCDate() + 30)
      const statuses = [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.ACCEPTED, QuoteStatus.REJECTED]
      const status = statuses[(index - 1) % statuses.length]
      await tx.quote.create({
        data: {
          number: `DEV-${year}-${String(index).padStart(5, '0')}`,
          sequenceNumber: index,
          sequenceYear: year,
          clientId: client.id,
          clientSnapshot: clientSnapshot(client),
          companySnapshot: companySnapshot(),
          status,
          issueDate,
          validUntil,
          currency: 'MAD',
          defaultVatRate: new Prisma.Decimal(20),
          subtotalHt: subtotal,
          discountAmount: new Prisma.Decimal(0),
          totalNetHt: subtotal,
          totalVat: vat,
          totalTtc: total,
          subject: `Prestation Atlas ${index}`,
          paymentTerms: 'Paiement sous 30 jours',
          sentAt: status !== QuoteStatus.DRAFT ? issueDate : null,
          acceptedAt: status === QuoteStatus.ACCEPTED ? issueDate : null,
          rejectedAt: status === QuoteStatus.REJECTED ? issueDate : null,
          createdById: admin.id,
          items: {
            create: {
              position: 1,
              title: `Service professionnel ${index}`,
              description: 'Prestation de démonstration',
              quantity,
              unit: 'unité',
              unitPriceHt: unitPrice,
              discountRate: new Prisma.Decimal(0),
              vatRate: new Prisma.Decimal(20),
              grossAmountHt: subtotal,
              discountAmount: new Prisma.Decimal(0),
              netAmountHt: subtotal,
              vatAmount: vat,
              totalTtc: total
            }
          }
        }
      })
    }

    for (let index = 1; index <= 20; index++) {
      const client = clients[(index + 19) % clients.length]
      const unitPrice = new Prisma.Decimal(900 + index * 40)
      const quantity = new Prisma.Decimal(1)
      const subtotal = unitPrice.mul(quantity)
      const vat = subtotal.mul(new Prisma.Decimal('0.20'))
      const total = subtotal.add(vat)
      const status = index <= 15 ? InvoiceStatus.FINALIZED : index <= 18 ? InvoiceStatus.DRAFT : InvoiceStatus.CANCELLED
      const issueDate = new Date(Date.UTC(year, (index - 1) % 12, Math.min(index, 28)))
      const dueDate = new Date(issueDate)
      dueDate.setUTCDate(dueDate.getUTCDate() + 30)
      const paid = status === InvoiceStatus.FINALIZED && index <= 5
      await tx.invoice.create({
        data: {
          number: status === InvoiceStatus.DRAFT ? null : `FAC-${year}-${String(index).padStart(5, '0')}`,
          sequenceNumber: status === InvoiceStatus.DRAFT ? null : index,
          sequenceYear: status === InvoiceStatus.DRAFT ? null : year,
          clientId: client.id,
          status,
          paymentStatus: paid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
          issueDate,
          dueDate,
          currency: 'MAD',
          clientSnapshot: clientSnapshot(client),
          companySnapshot: companySnapshot(),
          subtotalHt: subtotal,
          discountAmount: new Prisma.Decimal(0),
          totalNetHt: subtotal,
          totalVat: vat,
          totalTtc: total,
          amountPaid: paid ? total : new Prisma.Decimal(0),
          amountDue: paid ? new Prisma.Decimal(0) : total,
          subject: `Facturation prestation ${index}`,
          paymentTerms: 'Paiement sous 30 jours',
          finalizedAt: status === InvoiceStatus.FINALIZED ? issueDate : null,
          cancelledAt: status === InvoiceStatus.CANCELLED ? issueDate : null,
          cancellationReason: status === InvoiceStatus.CANCELLED ? 'Facture de démonstration annulée' : null,
          cancelledById: status === InvoiceStatus.CANCELLED ? admin.id : null,
          paidAt: paid ? dueDate : null,
          createdById: admin.id,
          items: {
            create: {
              position: 1,
              title: `Prestation facturée ${index}`,
              description: 'Ligne de démonstration',
              quantity,
              unit: 'forfait',
              unitPriceHt: unitPrice,
              discountRate: new Prisma.Decimal(0),
              vatRate: new Prisma.Decimal(20),
              grossAmountHt: subtotal,
              discountAmount: new Prisma.Decimal(0),
              netAmountHt: subtotal,
              vatAmount: vat,
              totalTtc: total
            }
          },
          ...(paid ? {
            payments: {
              create: {
                amount: total,
                paymentDate: dueDate,
                method: PaymentMethod.BANK_TRANSFER,
                reference: `VIR-DEMO-${index}`,
                createdById: admin.id
              }
            }
          } : {})
        }
      })
    }

    await tx.documentSequence.createMany({
      data: [
        { type: 'QUOTE', year, lastNumber: 20 },
        { type: 'INVOICE', year, lastNumber: 20 }
      ]
    })

    const site = await tx.workSite.create({
      data: {
        tenantId,
        code: 'CASA-SIEGE',
        name: 'Siège Casablanca',
        type: SiteType.HEAD_OFFICE,
        description: 'Site principal Atlas Bites',
        addressLine1: 'Boulevard Zerktouni',
        city: 'Casablanca',
        postalCode: '20000',
        country: 'Maroc',
        phone: '+212522000000',
        email: 'siege@atlasbites.ma',
        openingDate: new Date(Date.UTC(year - 5, 0, 1)),
        createdById: admin.id
      }
    })
    const department = await tx.department.create({
      data: { tenantId, code: 'OPS', name: 'Opérations', description: 'Équipe opérationnelle de démonstration', createdById: admin.id }
    })
    const positionDefinitions = [
      ['RESP-RH', 'Responsable RH', true],
      ['COMPTABLE', 'Comptable', false],
      ['COMMERCIAL', 'Commercial', false],
      ['EQUIPIER', 'Équipier polyvalent', false]
    ] as const
    const positions = []
    for (const [code, title, isManagerial] of positionDefinitions) {
      positions.push(await tx.position.create({
        data: {
          tenantId,
          departmentId: department.id,
          code,
          title,
          isManagerial,
          standardWeeklyMinutes: 2640,
          salaryReferenceMin: new Prisma.Decimal(3500),
          salaryReferenceMax: new Prisma.Decimal(15000),
          currency: 'MAD',
          createdById: admin.id
        }
      }))
    }

    const firstNames = ['Salma', 'Youssef', 'Imane', 'Omar', 'Nadia', 'Mehdi', 'Sara', 'Amine', 'Lina', 'Karim']
    const lastNames = ['Alaoui', 'Benali', 'Idrissi', 'El Fassi', 'Bennani', 'Tazi', 'Amrani', 'Chraibi', 'Mansouri', 'Berrada']
    const employees = []
    for (let index = 0; index < 10; index++) {
      const linkedUserId = index === 0 ? createdUsers[Role.HR_MANAGER] : index === 1 ? createdUsers[Role.ACCOUNTANT] : index === 2 ? createdUsers[Role.COMMERCIAL] : null
      const hireDate = new Date(Date.UTC(year - 1 - (index % 4), index % 12, 1 + index))
      employees.push(await tx.employee.create({
        data: {
          tenantId,
          employeeNumber: `EMP-${String(index + 1).padStart(4, '0')}`,
          firstName: firstNames[index],
          lastName: lastNames[index],
          displayName: `${firstNames[index]} ${lastNames[index]}`,
          gender: index % 2 === 0 ? Gender.FEMALE : Gender.MALE,
          birthDate: new Date(Date.UTC(1988 + index, index % 12, 10 + index)),
          birthPlace: cities[index % cities.length],
          nationality: 'Marocaine',
          addressLine1: `${20 + index}, rue des Collaborateurs`,
          city: cities[index % cities.length],
          postalCode: String(20000 + index),
          country: 'Maroc',
          phonePrimary: `+212661${String(index).padStart(6, '0')}`,
          personalEmail: `employe${index + 1}@example.ma`,
          professionalEmail: `employe${index + 1}@atlasbites.ma`,
          emergencyContactName: `Contact urgence ${index + 1}`,
          emergencyContactRelationship: 'Famille',
          emergencyContactPhone: `+212662${String(index).padStart(6, '0')}`,
          hireDate,
          employmentStatus: EmploymentStatus.ACTIVE,
          baseSalary: new Prisma.Decimal(5000 + index * 650),
          salaryCurrency: 'MAD',
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          bankName: 'Banque de démonstration',
          internalNotes: 'Dossier RH de démonstration sans identifiants sensibles réels.',
          linkedUserId,
          createdById: admin.id
        }
      }))
    }

    const manager = employees[0]
    await tx.workSite.update({ where: { id: site.id }, data: { managerEmployeeId: manager.id } })
    await tx.department.update({ where: { id: department.id }, data: { managerEmployeeId: manager.id } })

    for (let index = 0; index < employees.length; index++) {
      const employee = employees[index]
      const position = positions[Math.min(index, 3)]
      await tx.employeeAssignment.create({
        data: {
          tenantId,
          employeeId: employee.id,
          siteId: site.id,
          departmentId: department.id,
          positionId: position.id,
          managerEmployeeId: index === 0 ? null : manager.id,
          assignmentType: 'PERMANENT',
          isPrimary: true,
          startDate: employee.hireDate,
          reason: 'Affectation initiale de démonstration',
          createdById: admin.id
        }
      })
      const contractType = index < 6 ? ContractType.CDI : index < 9 ? ContractType.CDD : ContractType.PART_TIME
      const contract = await tx.employmentContract.create({
        data: {
          tenantId,
          employeeId: employee.id,
          contractNumber: `CTR-${year}-${String(index + 1).padStart(4, '0')}`,
          contractType,
          status: ContractStatus.ACTIVE,
          startDate: employee.hireDate,
          endDate: contractType === ContractType.CDD ? new Date(Date.UTC(year + 1, 11, 31)) : null,
          trialStartDate: employee.hireDate,
          trialEndDate: new Date(Date.UTC(employee.hireDate.getUTCFullYear(), employee.hireDate.getUTCMonth() + 3, employee.hireDate.getUTCDate())),
          signedAt: employee.hireDate,
          siteId: site.id,
          departmentId: department.id,
          positionId: position.id,
          managerEmployeeId: index === 0 ? null : manager.id,
          salarySnapshot: employee.baseSalary || new Prisma.Decimal(0),
          currency: 'MAD',
          standardWeeklyMinutes: contractType === ContractType.PART_TIME ? 1320 : 2640,
          employeeNameSnapshot: employee.displayName,
          employeeNumberSnapshot: employee.employeeNumber,
          siteSnapshot: site.name,
          departmentSnapshot: department.name,
          positionSnapshot: position.title,
          companySnapshot: companySnapshot(),
          notes: 'Contrat de démonstration',
          createdById: admin.id
        }
      })
      await tx.employeeDocument.create({
        data: {
          tenantId,
          employeeId: employee.id,
          contractId: contract.id,
          category: 'CONTRACT',
          title: `Contrat ${contract.contractNumber}`,
          description: 'Métadonnée documentaire de démonstration; aucun fichier sensible joint.',
          documentNumber: contract.contractNumber,
          issueDate: employee.hireDate,
          isRequired: true,
          isConfidential: true,
          createdById: admin.id
        }
      })
      for (let day = 1; day <= 5; day++) {
        await tx.employeeAvailability.create({
          data: {
            tenantId,
            employeeId: employee.id,
            dayOfWeek: day,
            startLocalTime: '09:00',
            endLocalTime: '18:00',
            status: 'AVAILABLE',
            reason: 'Disponibilité habituelle',
            effectiveFrom: employee.hireDate,
            createdById: admin.id
          }
        })
      }
    }

    await tx.siteSchedulePolicy.create({ data: { tenantId, siteId: site.id, timezone: 'Africa/Casablanca', updatedById: admin.id } })
    await tx.attendancePolicy.create({
      data: {
        tenantId,
        siteId: site.id,
        name: 'Politique de présence du siège',
        timezone: 'Africa/Casablanca',
        createdById: admin.id
      }
    })

    const leaveTypes = [
      { code: 'CP', name: 'Congés payés', category: LeaveCategory.PAID, isPaid: true, usesBalance: true, color: '#2563eb' },
      { code: 'MAL', name: 'Congé maladie', category: LeaveCategory.SICK, isPaid: true, usesBalance: false, color: '#dc2626' },
      { code: 'CNP', name: 'Congé sans solde', category: LeaveCategory.UNPAID, isPaid: false, usesBalance: false, color: '#64748b' }
    ]
    const createdLeaveTypes = []
    for (const leaveType of leaveTypes) {
      createdLeaveTypes.push(await tx.leaveType.create({ data: { tenantId, ...leaveType, requiresDocument: leaveType.code === 'MAL', allowPartialDay: true, allowHourly: true, createdById: admin.id } }))
    }
    for (const leaveType of createdLeaveTypes) {
      await tx.leavePolicy.create({
        data: {
          tenantId,
          leaveTypeId: leaveType.id,
          siteId: site.id,
          scopeKey: `SITE:${site.id}`,
          name: `Politique ${leaveType.name}`,
          effectiveFrom: new Date(Date.UTC(year, 0, 1)),
          entitlementMinutes: leaveType.usesBalance ? 22 * 480 : 0,
          accrualMinutes: leaveType.usesBalance ? 880 : 0,
          accrualFrequency: leaveType.usesBalance ? 'MONTHLY' : 'MANUAL',
          minutesPerDay: 480,
          workingWeekdays: [1, 2, 3, 4, 5],
          excludeHolidays: true,
          approvalWorkflow: 'MANAGER_THEN_HR',
          createdById: admin.id
        }
      })
      if (leaveType.usesBalance) {
        for (const employee of employees) {
          const opening = 22 * 480
          const balance = await tx.leaveBalance.create({
            data: {
              tenantId,
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              periodStart: new Date(Date.UTC(year, 0, 1)),
              periodEnd: new Date(Date.UTC(year, 11, 31)),
              openingMinutes: opening,
              availableMinutes: opening
            }
          })
          await tx.leaveBalanceEntry.create({
            data: {
              tenantId,
              balanceId: balance.id,
              entryType: 'OPENING',
              amountMinutes: opening,
              effectiveDate: new Date(Date.UTC(year, 0, 1)),
              reason: 'Solde annuel initial de démonstration',
              idempotencyKey: `demo:${year}:${employee.id}:${leaveType.id}:opening`,
              balanceBeforeSnapshot: { availableMinutes: 0 },
              balanceAfterSnapshot: { availableMinutes: opening },
              actorId: admin.id
            }
          })
        }
      }
    }

    const calendar = await tx.holidayCalendar.create({
      data: {
        tenantId,
        code: `MA-${year}`,
        name: `Calendrier Maroc ${year} — dates à confirmer`,
        timezone: 'Africa/Casablanca',
        countryCode: 'MA',
        isDefault: true,
        createdById: admin.id
      }
    })
    await tx.holidayCalendarSite.create({ data: { tenantId, calendarId: calendar.id, siteId: site.id } })

    await tx.auditLog.create({
      data: {
        userId: admin.id,
        actorDisplayNameSnapshot: admin.name,
        actorRoleSnapshot: Role.SUPER_ADMIN,
        action: 'LOCAL_DEMO_DATABASE_RESET',
        category: 'SYSTEM',
        result: 'SUCCESS',
        entityType: 'Database',
        entityReference: 'atlas_bites_facturation',
        metadata: { users: 4, clients: 100, companies: 10, quotes: 20, finalizedInvoices: 15, otherInvoices: 5, employees: 10 }
      }
    })
  }, { maxWait: 10_000, timeout: 180_000 })

  console.log(JSON.stringify({
    keptSuperAdmin: keepEmail,
    credentials,
    seeded: { users: 4, clients: 100, companies: 10, quotes: 20, finalizedInvoices: 15, otherInvoices: 5, employees: 10, activeContracts: 10 }
  }, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
