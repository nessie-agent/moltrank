import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { MOLT_TOKEN_ADDRESS, calculateReputation, getTier } from '@/lib/constants'

// MoltRank ABI (subset we need)
const MOLTRANK_ABI = [
  'function getStakeInfo(address) view returns (uint256 amount, uint256 stakedAt, uint256 slashCount, uint256 totalSlashed, uint256 pendingUnstake, uint256 unstakeAvailableAt)',
  'function getReputation(address) view returns (uint256)',
  'function getTier(address) view returns (uint8)',
]

// For demo, return mock data. Replace with contract calls once deployed.
const MOCK_DATA: Record<string, { staked: number; stakedAt: number; slashCount: number }> = {
  '0xca6E9A01c6b7E52E56461807336B36bEff08e5B0': { staked: 50886, stakedAt: Date.now() / 1000 - 86400, slashCount: 0 },
}

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address

    // Validate address format
    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Ethereum address' },
        { status: 400 }
      )
    }

    const checksumAddress = ethers.getAddress(address)

    // Check mock data first (for demo)
    const mockAgent = MOCK_DATA[checksumAddress]
    if (mockAgent) {
      const stakeDays = Math.floor((Date.now() / 1000 - mockAgent.stakedAt) / 86400)
      const reputation = calculateReputation(mockAgent.staked, stakeDays, mockAgent.slashCount)
      const tier = getTier(mockAgent.staked)

      return NextResponse.json({
        success: true,
        address: checksumAddress,
        staked: mockAgent.staked,
        stakeDays,
        slashCount: mockAgent.slashCount,
        reputation: Math.round(reputation * 10) / 10,
        tier: tier.name,
        badge: tier.badge,
      })
    }

    // No data found - return unranked
    return NextResponse.json({
      success: true,
      address: checksumAddress,
      staked: 0,
      stakeDays: 0,
      slashCount: 0,
      reputation: 0,
      tier: 'Unranked',
      badge: '⚫',
    })

  } catch (error) {
    console.error('Reputation lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to lookup reputation' },
      { status: 500 }
    )
  }
}
