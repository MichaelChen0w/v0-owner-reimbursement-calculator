// lib/orc-calculator.ts

interface OrcCalculatorParams {
  size: number
  yield: number
  price: number
  taxRate: number
  discountRate: number
}

interface OrcCalculatorResult {
  npv: number
  irr: number
  paybackPeriod: number
}

// Update the defaultValues to set all numeric fields to 0
export const defaultValues = {
  // Crop selection
  cropType: "perennial",
  cropCategory: "banana",
  cropVariety: "cavendish",

  // Basic information
  region: "wet-tropics",
  cropArea: 0,
  cropAge: 0,
  yield: 0,
  price: 0,
  isPlantCrop: false,
  harvestingCosts: 0,

  // Advanced parameters
  destructionCosts: 0,
  replantingCosts: 0,
  productionCosts: 0,
  grossMargin: 0,
  fallowPeriod: 0,
  normalFallowPeriod: 0,
  discountRate: 0,

  // Additional costs
  additionalCosts: 0,
  capitalItemsValue: 0,
  hasStoredProduce: false,
  storedProduceAmount: 0,
  storedProducePrice: 0,
  biosecurityOperatingCosts: 0,
  biosecurityCapitalCosts: 0,

  // Annual Broad Acre specific fields
  grainType: "wheat",
  alternativeEnterpriseProfit: 0,
  forwardContractPrice: 0,
  hasForwardContract: false,

  // Perennial Trees/Vine Crops specific fields
  treeType: "fruit-trees",
  fruitType: "apple",
  vineType: "grapes",
  nutType: "almonds",
  bareRootType: "nursery-stock",
  nonBearingPeriod: 0,
  rotationPeriod: 0,
  immatureLoss: 0,

  // Annual Short Rotation Crops specific fields
  shortRotationType: "vegetables",
  vegetableType: "leafy-greens",
  nurseryType: "seedlings",
  unitType: "weight",
  unitCount: 0,
  packagingCosts: 0,
  treatmentCosts: 0,
  glassHouseCosts: 0,
  minFallowPeriod: 10,
}

class OrcCalculator {
  private size: number
  private yield: number
  private price: number
  private taxRate: number
  private discountRate: number

  constructor(params: OrcCalculatorParams = defaultValues) {
    this.size = params.size
    this.yield = params.yield
    this.price = params.price
    this.taxRate = params.taxRate
    this.discountRate = params.discountRate
  }

  calculate(): OrcCalculatorResult {
    const cashFlows = this.getCashFlows()
    const npv = this.calculateNPV(cashFlows)
    const irr = this.calculateIRR(cashFlows)
    const paybackPeriod = this.calculatePaybackPeriod(cashFlows)

    return {
      npv,
      irr,
      paybackPeriod,
    }
  }

  private getCashFlows(): number[] {
    const initialInvestment = -this.size
    const annualRevenue = this.yield * this.price
    const annualCosts = this.size * 0.1 // Example: 10% of size as costs
    const preTaxProfit = annualRevenue - annualCosts
    const tax = preTaxProfit * this.taxRate
    const afterTaxProfit = preTaxProfit - tax
    const cashFlow = afterTaxProfit

    const cashFlows: number[] = [initialInvestment]
    for (let i = 0; i < 10; i++) {
      cashFlows.push(cashFlow)
    }

    return cashFlows
  }

  private calculateNPV(cashFlows: number[]): number {
    let npv = 0
    for (let i = 0; i < cashFlows.length; i++) {
      npv += cashFlows[i] / Math.pow(1 + this.discountRate, i)
    }
    return npv
  }

  private calculateIRR(cashFlows: number[], iterations = 100): number {
    let irr = 0.1 // Initial guess
    for (let i = 0; i < iterations; i++) {
      let npv = 0
      let derivative = 0
      for (let j = 0; j < cashFlows.length; j++) {
        npv += cashFlows[j] / Math.pow(1 + irr, j)
        derivative -= (j * cashFlows[j]) / Math.pow(1 + irr, j + 1)
      }
      irr -= npv / derivative
    }
    return irr
  }

  private calculatePaybackPeriod(cashFlows: number[]): number {
    let cumulativeCashFlow = 0
    for (let i = 1; i < cashFlows.length; i++) {
      cumulativeCashFlow += cashFlows[i]
      if (cumulativeCashFlow >= Math.abs(cashFlows[0])) {
        return i
      }
    }
    return Number.NaN // Payback period not reached
  }
}

// Update the calculateORC function to properly handle the tree-vine-nut crop type
export function calculateORC(formData: any) {
  // Check if this is a nursery root stock or large rooted plants
  if (
    formData.cropType === "tree-vine-nut" &&
    (formData.bareRootType === "nursery-root-stock" || formData.bareRootType === "nursery-large-rooted-plants")
  ) {
    return calculateNurseryRootStockORC(formData)
  }
  // Keep the existing conditions
  else if (formData.cropType === "perennial" && formData.cropCategory === "banana") {
    return calculateBananaORC(formData)
  } else if (formData.cropType === "perennial" && formData.cropCategory === "sugar-cane") {
    // For now, use the same calculation as banana
    return calculateBananaORC(formData)
  } else if (formData.cropType === "tree-vine-nut") {
    return calculateTreeVineNutORC(formData)
  } else if (formData.cropType === "annual-broad-acre") {
    return calculateAnnualBroadAcreORC(formData)
  } else if (formData.cropType === "annual-short-rotation") {
    return calculateAnnualShortRotationORC(formData)
  }

  // Default to annual broad acre calculation if no valid crop type
  return calculateAnnualBroadAcreORC(formData)
}

// Calculate ORC for Banana: ORC = (A - H) + B + C + D + E + F + G
function calculateBananaORC(formData: any) {
  // A: Value of the Crop destroyed = a * y * p
  const valueOfCrop = formData.cropArea * formData.yield * formData.price

  // H: 'Best practice' harvesting costs plus other costs
  const harvestingCosts = ((formData.harvestingCosts || 0) + (formData.productionCosts || 0)) * formData.cropArea

  // B: Costs of Crop destruction (depreciated)
  // Use a default discount rate of 5% if user entered 0
  const discountRate = formData.discountRate || 5
  const destructionDepreciationFactor = Math.max(
    0,
    Math.min(1, calculateDepreciationFactor(formData.cropAge || 0, discountRate)),
  )
  const destructionCosts = (formData.destructionCosts || 0) * formData.cropArea * destructionDepreciationFactor

  // C: Other costs incurred due to Response Plan
  const additionalCosts =
    ((formData.additionalCosts || 0) + (formData.biosecurityOperatingCosts || 0)) * formData.cropArea +
    (formData.biosecurityCapitalCosts || 0)

  // D: 'Depreciated' Crop replanting costs
  const replantingDepreciationFactor = Math.max(
    0,
    Math.min(1, calculateDepreciationFactor(formData.cropAge || 0, discountRate)),
  )
  const replantingCosts = (formData.replantingCosts || 0) * formData.cropArea * replantingDepreciationFactor

  // E: Loss of net profit from compulsory fallow
  // Only count additional fallow beyond normal fallow period, up to 3 years max
  const additionalFallow = Math.min(3, Math.max(0, (formData.fallowPeriod || 0) - (formData.normalFallowPeriod || 0)))
  const fallowLoss = (formData.grossMargin || 0) * formData.cropArea * additionalFallow

  // F: Replacement value of capital items destroyed
  const capitalItemsValue = formData.capitalItemsValue || 0

  // G: Value of stored produce destroyed - 修复这里的问题
  const storedProduceValue = (formData.storedProduceAmount || 0) * (formData.storedProducePrice || 0)

  // Calculate total ORC
  const totalORC =
    valueOfCrop -
    harvestingCosts +
    destructionCosts +
    additionalCosts +
    replantingCosts +
    fallowLoss +
    capitalItemsValue +
    storedProduceValue

  // Calculate ORC per hectare
  const orcPerHectare = formData.cropArea > 0 ? totalORC / formData.cropArea : 0

  return {
    valueOfCrop,
    harvestingCosts,
    destructionCosts,
    destructionDepreciationFactor,
    additionalCosts,
    replantingCosts,
    replantingDepreciationFactor,
    fallowLoss,
    capitalItemsValue,
    storedProduceValue,
    totalORC,
    orcPerHectare,
    formula: "banana",
  }
}

// Calculate ORC for Annual Broad Acre: ORC = (A - B) + C + D + E - F + G
function calculateAnnualBroadAcreORC(formData: any) {
  // A: Estimated farm gate value of the Crop(s) destroyed = a * y * p
  const price = formData.hasForwardContract ? formData.forwardContractPrice : formData.price
  const valueOfCrop = formData.cropArea * formData.yield * price

  // B: 'Best practice' harvesting costs plus other costs
  const harvestingCosts = ((formData.harvestingCosts || 0) + (formData.productionCosts || 0)) * formData.cropArea

  // C: Direct costs associated with the Response Plan
  const additionalCosts = (formData.additionalCosts || 0) * formData.cropArea

  // D: Replacement value of capital items destroyed
  const capitalItemsValue = formData.capitalItemsValue || 0

  // E: Loss of profits from fallow land in subsequent years
  const additionalFallow = Math.min(3, Math.max(0, (formData.fallowPeriod || 0) - (formData.normalFallowPeriod || 0)))
  const fallowLoss = (formData.grossMargin || 0) * formData.cropArea * additionalFallow

  // F: Profits from alternative enterprise
  const alternativeProfit = (formData.alternativeEnterpriseProfit || 0) * formData.cropArea

  // G: Value of stored produce destroyed - 修复这里的问题
  const storedProduceValue = (formData.storedProduceAmount || 0) * (formData.storedProducePrice || 0)

  // Calculate total ORC
  const totalORC =
    valueOfCrop -
    harvestingCosts +
    additionalCosts +
    capitalItemsValue +
    fallowLoss -
    alternativeProfit +
    storedProduceValue

  // Calculate ORC per hectare
  const orcPerHectare = formData.cropArea > 0 ? totalORC / formData.cropArea : 0

  return {
    valueOfCrop,
    harvestingCosts,
    additionalCosts,
    capitalItemsValue,
    fallowLoss,
    alternativeProfit,
    storedProduceValue,
    totalORC,
    orcPerHectare,
    formula: "annual-broad-acre",
  }
}

// Calculate ORC for Perennial Trees/Vine Crops/Nut Crops: ORC = (A - B) + C + D + E + F + G + H + I
function calculateTreeVineNutORC(formData: any) {
  // A: Loss of profit from the current Crop destroyed = a * y * p
  const valueOfCrop = formData.cropArea * formData.yield * formData.price

  // B: Harvesting costs based on 'best practice' plus other costs
  const harvestingCosts = ((formData.harvestingCosts || 0) + (formData.productionCosts || 0)) * formData.cropArea

  // C: Direct costs associated with the Response Plan
  const additionalCosts = (formData.additionalCosts || 0) * formData.cropArea

  // D: Replacement value of capital items destroyed
  const capitalItemsValue = formData.capitalItemsValue || 0

  // E: Loss of net profits for any fallow period
  const fallowPeriod = formData.fallowPeriod || 0
  const normalFallowPeriod = formData.normalFallowPeriod || 0
  const additionalFallow = Math.max(0, fallowPeriod - normalFallowPeriod)
  const grossMargin = formData.grossMargin || 0
  const fallowLoss = grossMargin * formData.cropArea * additionalFallow

  // Calculate depreciation factor based on orchard age and rotation period
  const rotationPeriod = formData.rotationPeriod || 0 // 不再使用默认值20
  // 确保折旧因子不为0，除非作物年龄等于或超过轮作周期
  const cropAge = formData.cropAge || 0
  // 如果轮作周期为0，则使用1作为折旧因子（不折旧）
  const depreciationFactor =
    rotationPeriod === 0
      ? 1
      : cropAge >= rotationPeriod
        ? 0
        : Math.max(0.1, Math.min(1, calculateTreeDepreciationFactor(cropAge, rotationPeriod)))

  // F: Tree destruction costs 'depreciated'
  const destructionCosts = (formData.destructionCosts || 0) * formData.cropArea * depreciationFactor

  // G: 'Depreciated' tree replanting costs
  const replantingCosts = (formData.replantingCosts || 0) * formData.cropArea * depreciationFactor

  // H: 'Depreciated' loss of profit during the non-bearing period
  const nonBearingPeriod = formData.nonBearingPeriod || 0 // 不再使用默认值3
  const immatureLoss = formData.immatureLoss || formData.grossMargin || 0 // Use gross margin if not specified, or 0 if both are undefined
  const immatureLossTotal = immatureLoss * formData.cropArea * nonBearingPeriod * depreciationFactor

  // I: Value of stored produce destroyed
  const storedProduceValue = (formData.storedProduceAmount || 0) * (formData.storedProducePrice || 0)

  // Calculate total ORC
  const totalORC =
    valueOfCrop -
    harvestingCosts +
    additionalCosts +
    capitalItemsValue +
    fallowLoss +
    destructionCosts +
    replantingCosts +
    immatureLossTotal +
    storedProduceValue

  // Calculate ORC per hectare
  const orcPerHectare = formData.cropArea > 0 ? totalORC / formData.cropArea : 0

  return {
    valueOfCrop,
    harvestingCosts,
    additionalCosts,
    capitalItemsValue,
    fallowLoss,
    destructionCosts,
    depreciationFactor,
    replantingCosts,
    immatureLossTotal,
    nonBearingPeriod,
    storedProduceValue,
    totalORC,
    orcPerHectare,
    formula: "tree-vine-nut",
  }
}

// Helper function to calculate depreciation factor for bananas
function calculateDepreciationFactor(age: number, discountRate: number) {
  // Simple depreciation factor based on age and discount rate
  // In a real implementation, this would use Method 2 as described in the EPPRD
  const rate = discountRate / 100
  return Math.max(0, 1 - age * rate)
}

// Helper function to calculate depreciation factor for trees/vines based on straight line method
function calculateTreeDepreciationFactor(age: number, rotationPeriod: number) {
  // Straight line depreciation from full cost at beginning of commercial production to end of rotation
  if (age <= 0) return 1 // Full reimbursement for new plantings
  if (age >= rotationPeriod) return 0 // No reimbursement at end of rotation

  // Linear depreciation between start and end of rotation
  // 确保即使接近轮作周期末期也有最小折旧因子
  return Math.max(0.1, 1 - age / rotationPeriod)
}

// Calculate ORC for Annual Short Rotation Crops: ORC = (A - B) + C + D + E - F + G
function calculateAnnualShortRotationORC(formData: any) {
  // A: Estimated farm gate value of the Crop(s) destroyed = a * y * p
  // For count-based crops, use unitCount instead of yield
  let valueOfCrop = 0
  if (formData.unitType === "count") {
    valueOfCrop = formData.cropArea * (formData.unitCount || 0) * formData.price
  } else {
    // For weight-based crops (default)
    const price = formData.hasForwardContract ? formData.forwardContractPrice : formData.price
    valueOfCrop = formData.cropArea * formData.yield * price
  }

  // B: Harvesting costs plus any other costs normally associated with Crop production
  // Include packaging and treatment costs for short rotation crops
  const harvestingCosts =
    ((formData.harvestingCosts || 0) +
      (formData.productionCosts || 0) +
      (formData.packagingCosts || 0) +
      (formData.treatmentCosts || 0)) *
    formData.cropArea

  // C: Direct costs associated with the Response Plan
  // Include glasshouse cleaning costs for nursery/greenhouse crops
  const additionalCosts = ((formData.additionalCosts || 0) + (formData.glassHouseCosts || 0)) * formData.cropArea

  // D: Replacement value of capital items destroyed
  const capitalItemsValue = formData.capitalItemsValue || 0

  // E: Loss of profits from fallow land or empty glasshouses
  // Only available if fallow period exceeds 10 weeks (converted to years for calculation)
  const minFallowPeriodYears = (formData.minFallowPeriod || 10) / 52 // Convert weeks to years
  let fallowLoss = 0

  if ((formData.fallowPeriod || 0) > minFallowPeriodYears) {
    // Calculate for a maximum of 3 years
    const effectiveFallowPeriod = Math.min(3, (formData.fallowPeriod || 0) - minFallowPeriodYears)
    fallowLoss = (formData.grossMargin || 0) * formData.cropArea * effectiveFallowPeriod
  }

  // F: Profits from alternative enterprise
  const alternativeProfit = (formData.alternativeEnterpriseProfit || 0) * formData.cropArea

  // G: Value of stored produce destroyed - 修复这里的问题
  const storedProduceValue = (formData.storedProduceAmount || 0) * (formData.storedProducePrice || 0)

  // Calculate total ORC
  const totalORC =
    valueOfCrop -
    harvestingCosts +
    additionalCosts +
    capitalItemsValue +
    fallowLoss -
    alternativeProfit +
    storedProduceValue

  // Calculate ORC per hectare
  const orcPerHectare = formData.cropArea > 0 ? totalORC / formData.cropArea : 0

  return {
    valueOfCrop,
    harvestingCosts,
    additionalCosts,
    capitalItemsValue,
    fallowLoss,
    alternativeProfit,
    storedProduceValue,
    totalORC,
    orcPerHectare,
    formula: "annual-short-rotation",
    minFallowPeriodWeeks: formData.minFallowPeriod || 10,
    effectiveFallowPeriod:
      (formData.fallowPeriod || 0) > minFallowPeriodYears
        ? Math.min(3, (formData.fallowPeriod || 0) - minFallowPeriodYears)
        : 0,
  }
}

// Add a new calculation function for Nursery Root Stock and Large Rooted Plants
// Add this function after the existing calculation functions

// Calculate ORC for Nursery Root Stock Production and Nursery Large Rooted Plants: ORC = A + B + C + D
function calculateNurseryRootStockORC(formData: any) {
  // A: Market value or estimated market value of the plants at the time of their destruction
  const valueOfCrop = formData.cropArea * formData.yield * formData.price

  // B: Direct costs associated with the Response Plan incurred by the Owner
  // This includes tree destruction costs
  const additionalCosts =
    (formData.additionalCosts || 0) * formData.cropArea + (formData.destructionCosts || 0) * formData.cropArea

  // C: Replacement value of any capital items destroyed as part of the Response Plan
  const capitalItemsValue = formData.capitalItemsValue || 0

  // D: Any stocks on hand which are destroyed due to the Response Plan - 修复这里的问题
  const storedProduceValue = (formData.storedProduceAmount || 0) * (formData.storedProducePrice || 0)

  // Calculate total ORC
  const totalORC = valueOfCrop + additionalCosts + capitalItemsValue + storedProduceValue

  // Calculate ORC per hectare
  const orcPerHectare = formData.cropArea > 0 ? totalORC / formData.cropArea : 0

  return {
    valueOfCrop,
    additionalCosts,
    capitalItemsValue,
    storedProduceValue,
    totalORC,
    orcPerHectare,
    formula: "nursery-root-stock",
  }
}

export default OrcCalculator
