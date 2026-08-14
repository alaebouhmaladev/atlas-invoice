import { prisma } from '../server/utils/db'

async function restoreUserLogo() {
  const latestLogo = await prisma.companyAsset.findFirst({
    where: { type: 'LOGO' },
    orderBy: { createdAt: 'desc' }
  })

  if (latestLogo) {
    await prisma.companySettings.update({
      where: { singletonKey: 'DEFAULT' },
      data: { activeLogoAssetId: latestLogo.id }
    })
    console.log('Restored active logo asset ID:', latestLogo.id)
  } else {
    console.log('No logo asset found')
  }
}

restoreUserLogo().catch(console.error).finally(() => prisma.$disconnect())
