import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { MOLTRANK_ADDRESS, calculateReputation, getTier } from '@/lib/constants'

// MoltRank ABI (subset we need)
const MOLTRANK_ABI = [
  'function getStakeInfo(address) view returns (uint256 amount, uint256 stakedAt, uint256 slashCount, uint256 totalSlashed, uint256 pendingUnstake, uint256 unstakeAvailableAt)',
  'function getReputation(address) view returns (uint256)',
]

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')

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

    // Read from contract
    const contract = new ethers.Contract(MOLTRANK_ADDRESS, MOLTRANK_ABI, provider)
    
    try {
      const [amount, stakedAt, slashCount] = await contract.getStakeInfo(checksumAddress)
      
      const stakedMOLT = Number(ethers.formatEther(amount))
      const stakeDays = stakedAt > 0 
        ? Math.floor((Date.now() / 1000 - Number(stakedAt)) / 86400)
        : 0
      const slashes = Number(slashCount)
      
      if (stakedMOLT === 0) {
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
      }
      
      const reputation = calculateReputation(stakedMOLT, stakeDays, slashes)
      const tier = getTier(stakedMOLT)

      return NextResponse.json({
        success: true,
        address: checksumAddress,
        staked: Math.round(stakedMOLT),
        stakeDays,
        slashCount: slashes,
        reputation: Math.round(reputation * 10) / 10,
        tier: tier.name,
        badge: tier.badge,
      })
    } catch (contractError) {
      console.error('Contract call error:', contractError)
      // Contract might not exist or other error - return unranked
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
    }

  } catch (error) {
    console.error('Reputation lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to lookup reputation' },
      { status: 500 }
    )
  }
}
