// Contract address on Base
export const MOLTRANK_ADDRESS = '0x0000000000000000000000000000000000000000' // TODO: Deploy
export const MOLT_TOKEN_ADDRESS = '0xB695559b26BB2c9703ef1935c37AeaE9526bab07'

// Tier thresholds (in MOLT tokens, 18 decimals)
export const TIERS = {
  NONE: { min: 0, name: 'Unranked', badge: '⚫', color: 'text-gray-500' },
  BRONZE: { min: 100, name: 'Bronze', badge: '🥉', color: 'tier-bronze' },
  SILVER: { min: 1000, name: 'Silver', badge: '🥈', color: 'tier-silver' },
  GOLD: { min: 10000, name: 'Gold', badge: '🥇', color: 'tier-gold' },
  DIAMOND: { min: 100000, name: 'Diamond', badge: '💎', color: 'tier-diamond' },
}

export function getTier(stakedAmount: number): typeof TIERS[keyof typeof TIERS] {
  if (stakedAmount >= TIERS.DIAMOND.min) return TIERS.DIAMOND
  if (stakedAmount >= TIERS.GOLD.min) return TIERS.GOLD
  if (stakedAmount >= TIERS.SILVER.min) return TIERS.SILVER
  if (stakedAmount >= TIERS.BRONZE.min) return TIERS.BRONZE
  return TIERS.NONE
}

export function calculateReputation(stakedAmount: number, stakeDays: number, slashCount: number): number {
  if (stakedAmount <= 0) return 0
  const sqrtStake = Math.sqrt(stakedAmount)
  const ageMultiplier = 1 + Math.min(stakeDays / 365, 1) // Cap at 2x
  const slashPenalty = Math.min(slashCount * 0.1, 1) // -10% per slash, max 100%
  return sqrtStake * ageMultiplier * (1 - slashPenalty)
}
