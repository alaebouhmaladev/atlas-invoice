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

  if (existingAdmin) {
    console.log(`ℹ️ Super Admin account for (${email}) already exists. Skipping creation.`)
    return
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  })

  const superAdmin = await prisma.user.create({
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
      userId: superAdmin.id,
      action: 'SYSTEM_SUPER_ADMIN_SEEDED',
      entityType: 'User',
      entityId: superAdmin.id,
      metadata: {
        email: superAdmin.email,
        seededAt: new Date().toISOString()
      }
    }
  })

  console.log(`✅ Super Admin created successfully!`)
  console.log(`   ID: ${superAdmin.id}`)
  console.log(`   Name: ${superAdmin.name}`)
  console.log(`   Email: ${superAdmin.email}`)
  console.log(`   Role: ${superAdmin.role}`)
}

seed()
  .catch((e) => {
    console.error('❌ Seed script error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
