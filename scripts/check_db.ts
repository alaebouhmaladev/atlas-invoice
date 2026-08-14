import { prisma } from '../server/utils/db'

async function main() {
  const settings = await prisma.companySettings.findUnique({ where: { singletonKey: 'DEFAULT' } })
  console.log('=== COMPANY SETTINGS IN DATABASE ===')
  console.log(JSON.stringify(settings, null, 2))

  const assets = await prisma.companyAsset.findMany({
    select: { id: true, type: true, originalName: true, mimeType: true, size: true, createdAt: true }
  })
  console.log('=== COMPANY ASSETS IN DATABASE ===')
  console.log(JSON.stringify(assets, null, 2))

  const latestInvoice = await prisma.invoice.findFirst({
    orderBy: { createdAt: 'desc' }
  })
  console.log('=== LATEST INVOICE IN DATABASE ===')
  console.log(JSON.stringify({
    id: latestInvoice?.id,
    number: latestInvoice?.number,
    companySnapshot: latestInvoice?.companySnapshot
  }, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
