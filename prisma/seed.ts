import { PrismaClient, Role } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

function validatePasswordStrength(password: string): boolean {
  if (password.length < 12) return false
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  return hasUpper && hasLower && hasDigit && hasSpecial
}

async function seed() {
  console.log('🌱 Starting Super Admin seed process...')

  const name = process.env.SUPER_ADMIN_NAME
  const rawEmail = process.env.SUPER_ADMIN_EMAIL
  const password = process.env.SUPER_ADMIN_PASSWORD

  if (!name || !rawEmail || !password) {
    console.error(
      '❌ Error: SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD must be defined in environment variables.'
    )
    process.exit(1)
  }

  const email = rawEmail.trim().toLowerCase()

  if (!validatePasswordStrength(password)) {
    console.error(
      '❌ Error: SUPER_ADMIN_PASSWORD must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    )
    process.exit(1)
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email }
  })

  let adminUser = existingAdmin
  if (!adminUser) {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4
    })

    adminUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.SUPER_ADMIN,
        isActive: true
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'SYSTEM_SUPER_ADMIN_SEEDED',
        entityType: 'User',
        entityId: adminUser.id,
        metadata: {
          email: adminUser.email,
          seededAt: new Date().toISOString()
        }
      }
    })

    console.log(`✅ Super Admin created successfully!`)
    console.log(`   ID: ${adminUser.id}`)
  } else {
    console.log(`ℹ️ Super Admin account for (${email}) already exists. Skipping creation.`)
  }

  // Seed Demo Clients (1 Company, 1 Individual)
  if (adminUser) {
    console.log('🌱 Seeding demo clients (Entreprise & Particulier)...')

    const clientCompany = await prisma.client.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        type: 'COMPANY',
        companyName: 'Maroc Telecom Event SARL',
        displayName: 'Maroc Telecom Event SARL',
        ice: '002847192000088',
        taxId: '40382910',
        rc: '128475',
        cnss: '7789012',
        patent: '3849201',
        email: 'events@maroctelecom.ma',
        phone: '+212 537 71 22 00',
        address: 'Avenue Annakhil, Hay Riad',
        city: 'Rabat',
        postalCode: '10000',
        country: 'Maroc',
        contactName: 'Mme. Salma Bennani',
        contactPosition: 'Directrice Évènementiel',
        contactEmail: 's.bennani@maroctelecom.ma',
        contactPhone: '+212 661 12 34 56',
        createdById: adminUser.id
      },
      update: {}
    })

    const clientIndividual = await prisma.client.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        type: 'INDIVIDUAL',
        firstName: 'Youssef',
        lastName: 'El Amrani',
        displayName: 'M. Youssef El Amrani',
        email: 'y.elamrani@gmail.com',
        phone: '+212 662 99 88 77',
        address: 'Residence Les Palmier, Apt 14',
        city: 'Casablanca',
        postalCode: '20000',
        country: 'Maroc',
        createdById: adminUser.id
      },
      update: {}
    })

    console.log(`✅ Demo Clients ensured:`)
    console.log(`   1. Entreprise: ${clientCompany.displayName}`)
    console.log(`   2. Particulier: ${clientIndividual.displayName}`)

    // 1. Seed Demo Devis (Quotes)
    console.log('🌱 Seeding demo devis...')
    const companySnapshot = {
      legalName: 'Atlas Bites SARL',
      tradingName: 'Atlas Bites Traiteur & Restauration',
      address: '124 Boulevard Anfa, Etage 3',
      city: 'Casablanca',
      country: 'Maroc',
      ice: '002987123000045',
      taxId: '39482710',
      phone: '+212 522 99 88 77',
      email: 'contact@atlasbites.ma',
      bankName: 'Attijariwafa Bank',
      rib: '007 780 0001234567890123 45'
    }

    const clientCompanySnapshot = {
      displayName: clientCompany.displayName,
      type: clientCompany.type,
      companyName: clientCompany.companyName,
      ice: clientCompany.ice,
      taxId: clientCompany.taxId,
      rc: clientCompany.rc,
      email: clientCompany.email,
      phone: clientCompany.phone,
      address: clientCompany.address,
      city: clientCompany.city,
      country: clientCompany.country
    }

    const clientIndividualSnapshot = {
      displayName: clientIndividual.displayName,
      type: clientIndividual.type,
      firstName: clientIndividual.firstName,
      lastName: clientIndividual.lastName,
      email: clientIndividual.email,
      phone: clientIndividual.phone,
      address: clientIndividual.address,
      city: clientIndividual.city,
      country: clientIndividual.country
    }

    // Devis 1: DEV-2026-0001 (SENT)
    await prisma.quote.upsert({
      where: { id: '00000000-0000-0000-0000-000000000101' },
      create: {
        id: '00000000-0000-0000-0000-000000000101',
        number: 'DEV-2026-0001',
        sequenceNumber: 1,
        sequenceYear: 2026,
        clientId: clientCompany.id,
        clientSnapshot: clientCompanySnapshot,
        status: 'SENT',
        issueDate: new Date('2026-08-01'),
        validUntil: new Date('2026-08-31'),
        subtotalHt: 40000,
        discountAmount: 0,
        totalNetHt: 40000,
        totalVat: 8000,
        totalTtc: 48000,
        subject: 'Prestation Cocktail Dînatoire Corporate 150p',
        paymentTerms: '50% à la commande, solde à la livraison',
        createdById: adminUser.id,
        items: {
          create: [
            {
              position: 1,
              title: 'Buffet Cocktail Prestige (150 personnes)',
              quantity: 150,
              unit: 'Personne',
              unitPriceHt: 200,
              discountRate: 0,
              vatRate: 20,
              grossAmountHt: 30000,
              discountAmount: 0,
              netAmountHt: 30000,
              vatAmount: 6000,
              totalTtc: 36000
            },
            {
              position: 2,
              title: 'Service Serveurs & Animation Maître d\'hôtel',
              quantity: 1,
              unit: 'Forfait',
              unitPriceHt: 10000,
              discountRate: 0,
              vatRate: 20,
              grossAmountHt: 10000,
              discountAmount: 0,
              netAmountHt: 10000,
              vatAmount: 2000,
              totalTtc: 12000
            }
          ]
        }
      },
      update: {}
    })

    // Devis 2: DEV-2026-0002 (ACCEPTED)
    await prisma.quote.upsert({
      where: { id: '00000000-0000-0000-0000-000000000102' },
      create: {
        id: '00000000-0000-0000-0000-000000000102',
        number: 'DEV-2026-0002',
        sequenceNumber: 2,
        sequenceYear: 2026,
        clientId: clientIndividual.id,
        clientSnapshot: clientIndividualSnapshot,
        status: 'ACCEPTED',
        acceptedAt: new Date('2026-08-05'),
        issueDate: new Date('2026-08-02'),
        validUntil: new Date('2026-08-25'),
        subtotalHt: 12500,
        discountAmount: 0,
        totalNetHt: 12500,
        totalVat: 2500,
        totalTtc: 15000,
        subject: 'Buffet Réception Mariage Privé',
        paymentTerms: 'Règlement à réception',
        createdById: adminUser.id,
        items: {
          create: [
            {
              position: 1,
              title: 'Menu Dîner Prestige Mariage (50 personnes)',
              quantity: 50,
              unit: 'Personne',
              unitPriceHt: 250,
              discountRate: 0,
              vatRate: 20,
              grossAmountHt: 12500,
              discountAmount: 0,
              netAmountHt: 12500,
              vatAmount: 2500,
              totalTtc: 15000
            }
          ]
        }
      },
      update: {}
    })

    // 2. Seed Demo Factures (Invoices)
    console.log('🌱 Seeding demo factures & payments...')

    // Facture 1: FAC-2026-0001 (FINALIZED, PARTIALLY_PAID)
    const inv1 = await prisma.invoice.upsert({
      where: { id: '00000000-0000-0000-0000-000000000201' },
      create: {
        id: '00000000-0000-0000-0000-000000000201',
        number: 'FAC-2026-0001',
        sequenceNumber: 1,
        sequenceYear: 2026,
        clientId: clientCompany.id,
        status: 'FINALIZED',
        paymentStatus: 'PARTIALLY_PAID',
        finalizedAt: new Date('2026-08-05'),
        issueDate: new Date('2026-08-05'),
        dueDate: new Date('2026-09-05'),
        clientSnapshot: clientCompanySnapshot,
        companySnapshot: companySnapshot,
        subtotalHt: 40000,
        discountAmount: 0,
        totalNetHt: 40000,
        totalVat: 8000,
        totalTtc: 48000,
        amountPaid: 20000,
        amountDue: 28000,
        subject: 'Facture Acompte Prestation Gala Annuel',
        paymentTerms: 'Règlement sous 30 jours',
        createdById: adminUser.id,
        items: {
          create: [
            {
              position: 1,
              title: 'Acompte Prestation Gala Annuel (50%)',
              quantity: 1,
              unit: 'Forfait',
              unitPriceHt: 40000,
              discountRate: 0,
              vatRate: 20,
              grossAmountHt: 40000,
              discountAmount: 0,
              netAmountHt: 40000,
              vatAmount: 8000,
              totalTtc: 48000
            }
          ]
        },
        payments: {
          create: [
            {
              id: '00000000-0000-0000-0000-000000000301',
              amount: 20000,
              paymentDate: new Date('2026-08-06'),
              method: 'BANK_TRANSFER',
              reference: 'VIR-ATTIJARI-8899',
              notes: 'Acompte reçu par virement bancaire',
              status: 'CONFIRMED',
              createdById: adminUser.id
            }
          ]
        }
      },
      update: {}
    })

    // Facture 2: FAC-2026-0002 (FINALIZED, PAID)
    await prisma.invoice.upsert({
      where: { id: '00000000-0000-0000-0000-000000000202' },
      create: {
        id: '00000000-0000-0000-0000-000000000202',
        number: 'FAC-2026-0002',
        sequenceNumber: 2,
        sequenceYear: 2026,
        clientId: clientIndividual.id,
        status: 'FINALIZED',
        paymentStatus: 'PAID',
        finalizedAt: new Date('2026-08-06'),
        paidAt: new Date('2026-08-06'),
        issueDate: new Date('2026-08-06'),
        dueDate: new Date('2026-08-20'),
        clientSnapshot: clientIndividualSnapshot,
        companySnapshot: companySnapshot,
        subtotalHt: 12500,
        discountAmount: 0,
        totalNetHt: 12500,
        totalVat: 2500,
        totalTtc: 15000,
        amountPaid: 15000,
        amountDue: 0,
        subject: 'Facture Prestation Réception Mariage',
        paymentTerms: 'Réglé au comptant',
        createdById: adminUser.id,
        items: {
          create: [
            {
              position: 1,
              title: 'Prestation Complète Buffet Mariage',
              quantity: 1,
              unit: 'Forfait',
              unitPriceHt: 12500,
              discountRate: 0,
              vatRate: 20,
              grossAmountHt: 12500,
              discountAmount: 0,
              netAmountHt: 12500,
              vatAmount: 2500,
              totalTtc: 15000
            }
          ]
        },
        payments: {
          create: [
            {
              id: '00000000-0000-0000-0000-000000000302',
              amount: 15000,
              paymentDate: new Date('2026-08-06'),
              method: 'CHEQUE',
              reference: 'CHQ-BMCE-009812',
              notes: 'Réglé intégralement par chèque',
              status: 'CONFIRMED',
              createdById: adminUser.id
            }
          ]
        }
      },
      update: {}
    })

    // Facture 3: Brouillon (DRAFT)
    await prisma.invoice.upsert({
      where: { id: '00000000-0000-0000-0000-000000000203' },
      create: {
        id: '00000000-0000-0000-0000-000000000203',
        clientId: clientCompany.id,
        status: 'DRAFT',
        paymentStatus: 'UNPAID',
        issueDate: new Date('2026-08-10'),
        dueDate: new Date('2026-09-10'),
        clientSnapshot: clientCompanySnapshot,
        companySnapshot: companySnapshot,
        subtotalHt: 6000,
        discountAmount: 0,
        totalNetHt: 6000,
        totalVat: 1200,
        totalTtc: 7200,
        amountPaid: 0,
        amountDue: 7200,
        subject: 'Brouillon - Service Pause Café Executive',
        createdById: adminUser.id,
        items: {
          create: [
            {
              position: 1,
              title: 'Pause Café Viennoiseries & Jus Frais (60 pers)',
              quantity: 60,
              unit: 'Personne',
              unitPriceHt: 100,
              discountRate: 0,
              vatRate: 20,
              grossAmountHt: 6000,
              discountAmount: 0,
              netAmountHt: 6000,
              vatAmount: 1200,
              totalTtc: 7200
            }
          ]
        }
      },
      update: {}
    })

    // Ensure document sequence counter is set to 2 for FAC and DEV
    await prisma.documentSequence.upsert({
      where: { type_year: { type: 'INVOICE', year: 2026 } },
      create: { type: 'INVOICE', year: 2026, lastNumber: 2 },
      update: { lastNumber: Math.max(2, 2) }
    })

    await prisma.documentSequence.upsert({
      where: { type_year: { type: 'QUOTE', year: 2026 } },
      create: { type: 'QUOTE', year: 2026, lastNumber: 2 },
      update: { lastNumber: Math.max(2, 2) }
    })

    console.log(`✅ Demo Devis & Factures seeded!`)
  }
}

seed()
  .catch((e) => {
    console.error('❌ Seed script error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
