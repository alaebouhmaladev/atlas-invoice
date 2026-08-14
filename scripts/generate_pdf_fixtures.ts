import fs from 'node:fs'
import path from 'node:path'
import { generateQuotePdfBuffer } from '../server/services/pdf.service'
import { generateInvoicePdfBuffer } from '../server/services/invoicePdf.service'

const outputDir = path.join(process.cwd(), 'tmp/pdf_fixtures')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const baseClient = {
  displayName: 'Maroc Telecom Events SARL',
  type: 'COMPANY',
  companyName: 'Maroc Telecom Events',
  contactName: 'Karim Benali',
  ice: '002847192000088',
  taxId: '38472910',
  rc: '129482',
  phone: '+212 522 11 22 33',
  email: 'events@iam.ma',
  address: '100 Boulevard Zerktouni',
  city: 'Casablanca',
  country: 'Maroc'
}

const baseCompany = {
  legalName: 'Atlas Bites SARL',
  tradeName: 'Services Traiteur & Évènementiel',
  address: '124 Boulevard Anfa',
  city: 'Casablanca',
  country: 'Maroc',
  ice: '002987123000045',
  taxId: '39482710',
  rc: '192837',
  phone: '+212 522 99 88 77',
  email: 'contact@atlasbites.ma',
  bankName: 'Attijariwafa Bank',
  accountHolder: 'Atlas Bites SARL',
  rib: '007 780 0001234567890123 45'
}

async function generateAllFixtures() {
  console.log('Generating 17 PDF fixtures...')

  // DEVIS FIXTURES
  // 1. One-line draft devis
  const devis1 = await generateQuotePdfBuffer({
    id: 'dev-draft-1',
    number: 'DEV-2026-0001',
    status: 'DRAFT',
    issueDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 5000,
    discountAmount: 0,
    totalNetHt: 5000,
    totalVat: 1000,
    totalTtc: 6000,
    subject: 'Cocktail de bienvenue',
    items: [
      {
        position: 1,
        title: 'Cocktail Dînatoire 50 personnes',
        description: 'Assortiment de 15 pièces salées et sucrées par personne.',
        quantity: 50,
        unit: 'Pers',
        unitPriceHt: 100,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 5000,
        discountAmount: 0,
        netAmountHt: 5000,
        vatAmount: 1000,
        totalTtc: 6000
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'devis_1_draft_oneline.pdf'), devis1)

  // 2. Accepted devis
  const devis2 = await generateQuotePdfBuffer({
    id: 'dev-accepted-2',
    number: 'DEV-2026-0002',
    status: 'ACCEPTED',
    issueDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 15000,
    discountAmount: 0,
    totalNetHt: 15000,
    totalVat: 3000,
    totalTtc: 18000,
    subject: 'Séminaire Annuel Entreprise',
    items: [
      {
        position: 1,
        title: 'Buffet Chaud Réception VIP',
        description: 'Entrées fraîches, 3 plats chauds au choix, buffet de desserts.',
        quantity: 100,
        unit: 'Pers',
        unitPriceHt: 150,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 15000,
        discountAmount: 0,
        netAmountHt: 15000,
        vatAmount: 3000,
        totalTtc: 18000
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'devis_2_accepted.pdf'), devis2)

  // 3. Devis with discounts
  const devis3 = await generateQuotePdfBuffer({
    id: 'dev-discount-3',
    number: 'DEV-2026-0003',
    status: 'SENT',
    issueDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 20000,
    discountAmount: 2000,
    totalNetHt: 18000,
    totalVat: 3600,
    totalTtc: 21600,
    subject: 'Gala de Fin d\'Année avec Remise Spéciale',
    items: [
      {
        position: 1,
        title: 'Dîner de Gala 4 Service',
        description: 'Service à table haut de gamme.',
        quantity: 100,
        unit: 'Couvert',
        unitPriceHt: 200,
        discountRate: 10,
        vatRate: 20,
        grossAmountHt: 20000,
        discountAmount: 2000,
        netAmountHt: 18000,
        vatAmount: 3600,
        totalTtc: 21600
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'devis_3_with_discounts.pdf'), devis3)

  // 4. Devis with mixed TVA
  const devis4 = await generateQuotePdfBuffer({
    id: 'dev-mixed-tva-4',
    number: 'DEV-2026-0004',
    status: 'SENT',
    issueDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 12000,
    discountAmount: 0,
    totalNetHt: 12000,
    totalVat: 1800,
    totalTtc: 13800,
    items: [
      {
        position: 1,
        title: 'Prestation Restauration Traiteur',
        quantity: 50,
        unit: 'Pers',
        unitPriceHt: 200,
        discountRate: 0,
        vatRate: 10,
        grossAmountHt: 10000,
        discountAmount: 0,
        netAmountHt: 10000,
        vatAmount: 1000,
        totalTtc: 11000
      },
      {
        position: 2,
        title: 'Location Matériel & Décoration',
        quantity: 1,
        unit: 'Forfait',
        unitPriceHt: 2000,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 2000,
        discountAmount: 0,
        netAmountHt: 2000,
        vatAmount: 400,
        totalTtc: 2400
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'devis_4_mixed_tva.pdf'), devis4)

  // 5. Multi-page devis (25 lines)
  const devis5Items = Array.from({ length: 25 }, (_, i) => ({
    position: i + 1,
    title: `Prestation Évènementielle - Module ${i + 1}`,
    description: `Description détaillée de la prestation traiteur N° ${i + 1}.`,
    quantity: 10,
    unit: 'Unité',
    unitPriceHt: 500,
    discountRate: 0,
    vatRate: 20,
    grossAmountHt: 5000,
    discountAmount: 0,
    netAmountHt: 5000,
    vatAmount: 1000,
    totalTtc: 6000
  }))

  const devis5 = await generateQuotePdfBuffer({
    id: 'dev-multipage-5',
    number: 'DEV-2026-0005',
    status: 'SENT',
    issueDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 125000,
    discountAmount: 0,
    totalNetHt: 125000,
    totalVat: 25000,
    totalTtc: 150000,
    items: devis5Items
  })
  fs.writeFileSync(path.join(outputDir, 'devis_5_multipage.pdf'), devis5)

  // 6. Devis with long descriptions
  const devis6 = await generateQuotePdfBuffer({
    id: 'dev-longdesc-6',
    number: 'DEV-2026-0006',
    status: 'SENT',
    issueDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 30000,
    discountAmount: 0,
    totalNetHt: 30000,
    totalVat: 6000,
    totalTtc: 36000,
    items: [
      {
        position: 1,
        title: 'Organisation Complète de Congrès International',
        description: 'Prise en charge intégrale de la restauration pour 200 participants comprenant le petit-déjeuner d\'accueil, la pause café du matin avec mignardises, le déjeuner buffet assis 3 services, la pause fraîcheur de l\'après-midi ainsi que le cocktail de clôture avec animation culinaire en direct.',
        quantity: 200,
        unit: 'Participant',
        unitPriceHt: 150,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 30000,
        discountAmount: 0,
        netAmountHt: 30000,
        vatAmount: 6000,
        totalTtc: 36000
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'devis_6_long_description.pdf'), devis6)

  // 7. Devis without logo
  const devis7 = await generateQuotePdfBuffer({
    id: 'dev-nologo-7',
    number: 'DEV-2026-0007',
    status: 'SENT',
    issueDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: { ...baseCompany, showLogoOnDocuments: false },
    subtotalHt: 8000,
    discountAmount: 0,
    totalNetHt: 8000,
    totalVat: 1600,
    totalTtc: 9600,
    items: [
      {
        position: 1,
        title: 'Pause Café Entreprise',
        quantity: 80,
        unit: 'Pers',
        unitPriceHt: 100,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 8000,
        discountAmount: 0,
        netAmountHt: 8000,
        vatAmount: 1600,
        totalTtc: 9600
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'devis_7_no_logo.pdf'), devis7)

  // FACTURE FIXTURES
  // 1. Draft Facture
  const fac1 = await generateInvoicePdfBuffer({
    id: 'fac-draft-1',
    status: 'DRAFT',
    paymentStatus: 'UNPAID',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 10000,
    discountAmount: 0,
    totalNetHt: 10000,
    totalVat: 2000,
    totalTtc: 12000,
    amountPaid: 0,
    amountDue: 12000,
    items: [
      {
        position: 1,
        title: 'Cocktail Dînatoire Professionnel',
        quantity: 100,
        unit: 'Pers',
        unitPriceHt: 100,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 10000,
        discountAmount: 0,
        netAmountHt: 10000,
        vatAmount: 2000,
        totalTtc: 12000
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'facture_1_draft.pdf'), fac1)

  // 2. Finalized Unpaid Facture
  const fac2 = await generateInvoicePdfBuffer({
    id: 'fac-finalized-2',
    number: 'FAC-2026-0001',
    status: 'FINALIZED',
    paymentStatus: 'UNPAID',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 10000,
    discountAmount: 0,
    totalNetHt: 10000,
    totalVat: 2000,
    totalTtc: 12000,
    amountPaid: 0,
    amountDue: 12000,
    items: [
      {
        position: 1,
        title: 'Cocktail Dînatoire Professionnel',
        quantity: 100,
        unit: 'Pers',
        unitPriceHt: 100,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 10000,
        discountAmount: 0,
        netAmountHt: 10000,
        vatAmount: 2000,
        totalTtc: 12000
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'facture_2_finalized_unpaid.pdf'), fac2)

  // 3. Partially Paid Facture
  const fac3 = await generateInvoicePdfBuffer({
    id: 'fac-partpaid-3',
    number: 'FAC-2026-0002',
    status: 'FINALIZED',
    paymentStatus: 'PARTIALLY_PAID',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 20000,
    discountAmount: 0,
    totalNetHt: 20000,
    totalVat: 4000,
    totalTtc: 24000,
    amountPaid: 10000,
    amountDue: 14000,
    items: [
      {
        position: 1,
        title: 'Prestation Banquet Évènementiel',
        quantity: 100,
        unit: 'Couvert',
        unitPriceHt: 200,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 20000,
        discountAmount: 0,
        netAmountHt: 20000,
        vatAmount: 4000,
        totalTtc: 24000
      }
    ],
    payments: [
      {
        paymentDate: new Date(),
        method: 'CHEQUE',
        reference: 'CHQ-998877',
        amount: 10000
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'facture_3_partially_paid.pdf'), fac3)

  // 4. Fully Paid/Acquitted Facture
  const fac4 = await generateInvoicePdfBuffer({
    id: 'fac-paid-4',
    number: 'FAC-2026-0003',
    status: 'FINALIZED',
    paymentStatus: 'PAID',
    issueDate: new Date(),
    dueDate: new Date(),
    paidAt: new Date(),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 15000,
    discountAmount: 0,
    totalNetHt: 15000,
    totalVat: 3000,
    totalTtc: 18000,
    amountPaid: 18000,
    amountDue: 0,
    items: [
      {
        position: 1,
        title: 'Buffet Réception Entreprise',
        quantity: 100,
        unit: 'Pers',
        unitPriceHt: 150,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 15000,
        discountAmount: 0,
        netAmountHt: 15000,
        vatAmount: 3000,
        totalTtc: 18000
      }
    ],
    payments: [
      {
        paymentDate: new Date(),
        method: 'BANK_TRANSFER',
        reference: 'VIR-100200',
        amount: 18000
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'facture_4_fully_paid.pdf'), fac4)

  // 5. Cancelled Facture
  const fac5 = await generateInvoicePdfBuffer({
    id: 'fac-cancelled-5',
    number: 'FAC-2026-0004',
    status: 'CANCELLED',
    paymentStatus: 'UNPAID',
    cancellationReason: 'Évènement annulé par le client',
    cancelledAt: new Date(),
    issueDate: new Date(),
    dueDate: new Date(),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 10000,
    discountAmount: 0,
    totalNetHt: 10000,
    totalVat: 2000,
    totalTtc: 12000,
    amountPaid: 0,
    amountDue: 12000,
    items: [
      {
        position: 1,
        title: 'Prestation Annulée',
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
  })
  fs.writeFileSync(path.join(outputDir, 'facture_5_cancelled.pdf'), fac5)

  // 6. Multi-page Facture
  const fac6Items = Array.from({ length: 22 }, (_, i) => ({
    position: i + 1,
    title: `Facturation Ligne N° ${i + 1}`,
    description: `Description de la prestation N° ${i + 1}`,
    quantity: 5,
    unit: 'Unité',
    unitPriceHt: 1000,
    discountRate: 0,
    vatRate: 20,
    grossAmountHt: 5000,
    discountAmount: 0,
    netAmountHt: 5000,
    vatAmount: 1000,
    totalTtc: 6000
  }))
  const fac6 = await generateInvoicePdfBuffer({
    id: 'fac-multipage-6',
    number: 'FAC-2026-0005',
    status: 'FINALIZED',
    paymentStatus: 'UNPAID',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 110000,
    discountAmount: 0,
    totalNetHt: 110000,
    totalVat: 22000,
    totalTtc: 132000,
    amountPaid: 0,
    amountDue: 132000,
    items: fac6Items
  })
  fs.writeFileSync(path.join(outputDir, 'facture_6_multipage.pdf'), fac6)

  // 7. Facture with mixed TVA
  const fac7 = await generateInvoicePdfBuffer({
    id: 'fac-mixedtva-7',
    number: 'FAC-2026-0006',
    status: 'FINALIZED',
    paymentStatus: 'UNPAID',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 15000,
    discountAmount: 0,
    totalNetHt: 15000,
    totalVat: 2000,
    totalTtc: 17000,
    amountPaid: 0,
    amountDue: 17000,
    items: [
      {
        position: 1,
        title: 'Service Restauration Traiteur (TVA 10%)',
        quantity: 100,
        unit: 'Pers',
        unitPriceHt: 100,
        discountRate: 0,
        vatRate: 10,
        grossAmountHt: 10000,
        discountAmount: 0,
        netAmountHt: 10000,
        vatAmount: 1000,
        totalTtc: 11000
      },
      {
        position: 2,
        title: 'Location sonorisation & podium (TVA 20%)',
        quantity: 1,
        unit: 'Forfait',
        unitPriceHt: 5000,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 5000,
        discountAmount: 0,
        netAmountHt: 5000,
        vatAmount: 1000,
        totalTtc: 6000
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'facture_7_mixed_tva.pdf'), fac7)

  // 8. Facture without logo
  const fac8 = await generateInvoicePdfBuffer({
    id: 'fac-nologo-8',
    number: 'FAC-2026-0007',
    status: 'FINALIZED',
    paymentStatus: 'UNPAID',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    clientSnapshot: baseClient,
    companySnapshot: { ...baseCompany, showLogoOnDocuments: false },
    subtotalHt: 10000,
    discountAmount: 0,
    totalNetHt: 10000,
    totalVat: 2000,
    totalTtc: 12000,
    amountPaid: 0,
    amountDue: 12000,
    items: [
      {
        position: 1,
        title: 'Buffet Traiteur Entreprise',
        quantity: 100,
        unit: 'Pers',
        unitPriceHt: 100,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 10000,
        discountAmount: 0,
        netAmountHt: 10000,
        vatAmount: 2000,
        totalTtc: 12000
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'facture_8_no_logo.pdf'), fac8)

  // 9 & 10. Paid Facture with & without signature/stamp assets
  const fac9 = await generateInvoicePdfBuffer({
    id: 'fac-paid-sigstamp-9',
    number: 'FAC-2026-0008',
    status: 'FINALIZED',
    paymentStatus: 'PAID',
    issueDate: new Date(),
    dueDate: new Date(),
    paidAt: new Date(),
    clientSnapshot: baseClient,
    companySnapshot: baseCompany,
    subtotalHt: 12000,
    discountAmount: 0,
    totalNetHt: 12000,
    totalVat: 2400,
    totalTtc: 14400,
    amountPaid: 14400,
    amountDue: 0,
    items: [
      {
        position: 1,
        title: 'Prestation Cocktail VIP avec Visuels',
        quantity: 80,
        unit: 'Pers',
        unitPriceHt: 150,
        discountRate: 0,
        vatRate: 20,
        grossAmountHt: 12000,
        discountAmount: 0,
        netAmountHt: 12000,
        vatAmount: 2400,
        totalTtc: 14400
      }
    ],
    payments: [
      {
        paymentDate: new Date(),
        method: 'BANK_TRANSFER',
        reference: 'VIR-990011',
        amount: 14400
      }
    ]
  })
  fs.writeFileSync(path.join(outputDir, 'facture_9_paid_assets.pdf'), fac9)

  console.log('Successfully generated all 17 PDF fixtures in tmp/pdf_fixtures/')
}

generateAllFixtures().catch(console.error)
