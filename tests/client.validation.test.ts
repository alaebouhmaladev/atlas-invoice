import { describe, it, expect } from 'vitest'
import { ClientType } from '@prisma/client'
import { clientSchema } from '../server/utils/validation'
import { generateDisplayName } from '../server/services/client.service'

describe('Client Validation & Normalization Tests', () => {
  describe('Company Client Validation', () => {
    it('should validate a valid company client with 15-digit ICE', () => {
      const input = {
        type: ClientType.COMPANY,
        companyName: '  Atlas Events SARL  ',
        ice: '001234567890123',
        email: '  CONTACT@ATLASEVENTS.MA  ',
        city: 'Casablanca'
      }

      const result = clientSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.companyName).toBe('Atlas Events SARL')
        expect(result.data.email).toBe('contact@atlasevents.ma')
        expect(result.data.ice).toBe('001234567890123')
      }
    })

    it('should reject company client missing companyName', () => {
      const input = {
        type: ClientType.COMPANY,
        companyName: '   '
      }

      const result = clientSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject ICE with less or more than 15 digits', () => {
      const invalidShortIce = {
        type: ClientType.COMPANY,
        companyName: 'Test SARL',
        ice: '12345678901234' // 14 digits
      }
      expect(clientSchema.safeParse(invalidShortIce).success).toBe(false)

      const invalidLongIce = {
        type: ClientType.COMPANY,
        companyName: 'Test SARL',
        ice: '1234567890123456' // 16 digits
      }
      expect(clientSchema.safeParse(invalidLongIce).success).toBe(false)

      const invalidAlphaIce = {
        type: ClientType.COMPANY,
        companyName: 'Test SARL',
        ice: '00123456789012A'
      }
      expect(clientSchema.safeParse(invalidAlphaIce).success).toBe(false)
    })
  })

  describe('Individual Client Validation', () => {
    it('should validate a valid individual client', () => {
      const input = {
        type: ClientType.INDIVIDUAL,
        firstName: '  Youssef  ',
        lastName: '  Benali  ',
        phone: '+212661234567'
      }

      const result = clientSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.firstName).toBe('Youssef')
        expect(result.data.lastName).toBe('Benali')
      }
    })

    it('should reject individual client missing firstName or lastName', () => {
      const missingFirstName = {
        type: ClientType.INDIVIDUAL,
        firstName: '',
        lastName: 'Benali'
      }
      expect(clientSchema.safeParse(missingFirstName).success).toBe(false)

      const missingLastName = {
        type: ClientType.INDIVIDUAL,
        firstName: 'Youssef',
        lastName: ''
      }
      expect(clientSchema.safeParse(missingLastName).success).toBe(false)
    })
  })

  describe('Display Name Generation Helper', () => {
    it('should generate displayName from companyName for companies', () => {
      const name = generateDisplayName({
        type: ClientType.COMPANY,
        companyName: ' Atlas Bites SARL '
      })
      expect(name).toBe('Atlas Bites SARL')
    })

    it('should generate displayName from firstName + lastName for individuals', () => {
      const name = generateDisplayName({
        type: ClientType.INDIVIDUAL,
        firstName: ' Amine ',
        lastName: ' Tazi '
      })
      expect(name).toBe('Amine Tazi')
    })
  })
})
