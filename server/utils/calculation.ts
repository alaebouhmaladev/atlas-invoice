import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export interface RawLineItemInput {
  position?: number
  title: string
  description?: string | null
  quantity: number | string
  unit: string
  unitPriceHt: number | string
  discountRate?: number | string
  vatRate?: number | string
}

export interface RawGlobalDiscountInput {
  discountType?: 'PERCENTAGE' | 'FIXED' | null
  discountValue?: number | string | null
}

export interface CalculatedLineItem {
  position: number
  title: string
  description?: string | null
  quantity: string
  unit: string
  unitPriceHt: string
  discountRate: string
  vatRate: string
  grossAmountHt: string
  discountAmount: string
  netAmountHt: string
  vatAmount: string
  totalTtc: string
}

export interface VatRateBreakdown {
  rate: string
  netAmountHt: string
  vatAmount: string
}

export interface CalculatedQuoteTotals {
  subtotalHt: string
  lineDiscountsTotal: string
  globalDiscountTotal: string
  discountAmount: string // Combined line + global discounts
  totalNetHt: string
  totalVat: string
  totalTtc: string
  vatBreakdown: VatRateBreakdown[]
  items: CalculatedLineItem[]
}

function roundMoney(val: Decimal): Decimal {
  return val.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

function roundQty(val: Decimal): Decimal {
  return val.toDecimalPlaces(3, Decimal.ROUND_HALF_UP)
}

function roundRate(val: Decimal): Decimal {
  return val.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

export function calculateQuoteFinancials(
  rawItems: RawLineItemInput[],
  discountInput?: RawGlobalDiscountInput
): CalculatedQuoteTotals {
  if (!rawItems || rawItems.length === 0) {
    throw new Error('Un devis doit contenir au moins une ligne de prestation.')
  }

  let lineDiscountsTotalDec = new Decimal(0)
  let subtotalHtDec = new Decimal(0)

  // 1. First pass: Calculate line-by-line gross and net HT
  const intermediateLines = rawItems.map((item, idx) => {
    const position = item.position ?? idx + 1
    const qtyDec = roundQty(new Decimal(item.quantity || 0))
    const unitPriceDec = roundMoney(new Decimal(item.unitPriceHt || 0))
    const discountRateDec = roundRate(new Decimal(item.discountRate || 0))
    const vatRateDec = roundRate(new Decimal(item.vatRate ?? 20))

    if (qtyDec.isNegative() || qtyDec.isZero()) {
      throw new Error(`La quantité de la ligne ${position} doit être supérieure à zéro.`)
    }
    if (unitPriceDec.isNegative()) {
      throw new Error(`Le prix unitaire de la ligne ${position} ne peut pas être négatif.`)
    }
    if (discountRateDec.isNegative() || discountRateDec.greaterThan(100)) {
      throw new Error(`Le taux de remise de la ligne ${position} doit être compris entre 0 et 100%.`)
    }
    if (vatRateDec.isNegative() || vatRateDec.greaterThan(100)) {
      throw new Error(`Le taux de TVA de la ligne ${position} doit être compris entre 0 et 100%.`)
    }

    const grossAmountHt = roundMoney(qtyDec.mul(unitPriceDec))
    const lineDiscountAmount = roundMoney(grossAmountHt.mul(discountRateDec).div(100))
    const netAmountHt = roundMoney(grossAmountHt.minus(lineDiscountAmount))

    lineDiscountsTotalDec = lineDiscountsTotalDec.plus(lineDiscountAmount)
    subtotalHtDec = subtotalHtDec.plus(netAmountHt)

    return {
      position,
      title: item.title,
      description: item.description || null,
      quantity: qtyDec,
      unit: item.unit,
      unitPriceHt: unitPriceDec,
      discountRate: discountRateDec,
      vatRate: vatRateDec,
      grossAmountHt,
      discountAmount: lineDiscountAmount,
      netAmountHt
    }
  })

  // 2. Second pass: Calculate global discount (Percentage or Fixed MAD)
  let globalDiscountTotalDec = new Decimal(0)
  if (discountInput && discountInput.discountType && discountInput.discountValue) {
    const valDec = new Decimal(discountInput.discountValue)
    if (valDec.isPositive()) {
      if (discountInput.discountType === 'PERCENTAGE') {
        if (valDec.greaterThan(100)) {
          throw new Error('La remise globale en pourcentage ne peut pas dépasser 100%.')
        }
        globalDiscountTotalDec = roundMoney(subtotalHtDec.mul(valDec).div(100))
      } else if (discountInput.discountType === 'FIXED') {
        if (valDec.greaterThan(subtotalHtDec)) {
          throw new Error('La remise globale fixe ne peut pas être supérieure au sous-total HT.')
        }
        globalDiscountTotalDec = roundMoney(valDec)
      }
    }
  }

  const totalNetHtDec = roundMoney(Decimal.max(0, subtotalHtDec.minus(globalDiscountTotalDec)))
  const totalDiscountsCombinedDec = lineDiscountsTotalDec.plus(globalDiscountTotalDec)

  // 3. Third pass: Distribute global discount proportionally across lines for exact TVA calculation
  const vatMap = new Map<string, { netAmountHt: Decimal; vatAmount: Decimal }>()
  let totalVatDec = new Decimal(0)
  let allocatedGlobalDiscount = new Decimal(0)

  const calculatedItems: CalculatedLineItem[] = intermediateLines.map((line, idx) => {
    let lineGlobalDiscount = new Decimal(0)
    if (!subtotalHtDec.isZero() && !globalDiscountTotalDec.isZero()) {
      if (idx === intermediateLines.length - 1) {
        lineGlobalDiscount = globalDiscountTotalDec.minus(allocatedGlobalDiscount)
      } else {
        lineGlobalDiscount = roundMoney(globalDiscountTotalDec.mul(line.netAmountHt).div(subtotalHtDec))
        allocatedGlobalDiscount = allocatedGlobalDiscount.plus(lineGlobalDiscount)
      }
    }

    const effectiveLineNetHt = Decimal.max(0, line.netAmountHt.minus(lineGlobalDiscount))
    const lineVatAmount = roundMoney(effectiveLineNetHt.mul(line.vatRate).div(100))
    const lineTotalTtc = roundMoney(effectiveLineNetHt.plus(lineVatAmount))

    totalVatDec = totalVatDec.plus(lineVatAmount)

    // Accumulate VAT rate breakdown
    const rateStr = line.vatRate.toFixed(2)
    const existing = vatMap.get(rateStr) || { netAmountHt: new Decimal(0), vatAmount: new Decimal(0) }
    vatMap.set(rateStr, {
      netAmountHt: existing.netAmountHt.plus(effectiveLineNetHt),
      vatAmount: existing.vatAmount.plus(lineVatAmount)
    })

    return {
      position: line.position,
      title: line.title,
      description: line.description,
      quantity: line.quantity.toFixed(3),
      unit: line.unit,
      unitPriceHt: line.unitPriceHt.toFixed(2),
      discountRate: line.discountRate.toFixed(2),
      vatRate: line.vatRate.toFixed(2),
      grossAmountHt: line.grossAmountHt.toFixed(2),
      discountAmount: line.discountAmount.toFixed(2),
      netAmountHt: line.netAmountHt.toFixed(2),
      vatAmount: lineVatAmount.toFixed(2),
      totalTtc: lineTotalTtc.toFixed(2)
    }
  })

  const totalTtcDec = roundMoney(totalNetHtDec.plus(totalVatDec))

  const vatBreakdown: VatRateBreakdown[] = Array.from(vatMap.entries())
    .map(([rate, data]) => ({
      rate: new Decimal(rate).toFixed(2),
      netAmountHt: data.netAmountHt.toFixed(2),
      vatAmount: data.vatAmount.toFixed(2)
    }))
    .sort((a, b) => Number(a.rate) - Number(b.rate))

  return {
    subtotalHt: subtotalHtDec.toFixed(2),
    lineDiscountsTotal: lineDiscountsTotalDec.toFixed(2),
    globalDiscountTotal: globalDiscountTotalDec.toFixed(2),
    discountAmount: totalDiscountsCombinedDec.toFixed(2),
    totalNetHt: totalNetHtDec.toFixed(2),
    totalVat: totalVatDec.toFixed(2),
    totalTtc: totalTtcDec.toFixed(2),
    vatBreakdown,
    items: calculatedItems
  }
}

export function formatMoney(amount: number | string | Decimal): string {
  const dec = new Decimal(amount || 0)
  const formatted = dec.toFixed(2).replace('.', ',')
  const parts = formatted.split(',')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${parts.join(',')} MAD`
}
