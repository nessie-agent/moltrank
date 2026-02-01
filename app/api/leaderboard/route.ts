import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { MOLTRANK_ADDRESS, getTier, calculateReputation } from '@/lib/constants'

const MOLTRANK_ABI = [
  'function getStakeInfo(address) view returns (uint256 amount, uint256 stakedAt, uint256 slashCount, uint256 totalSlashed, uint256 pendingUnstake, uint256 unstakeAvailableAt)',
  'event Staked(address indexed agent, uint256 amount, uint256 totalStaked)',
]

// Contract deployment block (to start scanning from)
const DEPLOYMENT_BLOCK = 41577100

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')

async function discoverStakers(): Promise<string[]> {
  try {
    const contract = new ethers.Contract(MOLTRANK_ADDRESS, MOLTRANK_ABI, provider)
    
    // Get Staked events from deployment to now
    const filter = contract.filters.Staked()
    const currentBlock = await provider.getBlockNumber()
    
    // Scan in chunks to avoid rate limits (max 10k blocks per query)
    const stakers = new Set<string>()
    let fromBlock = DEPLOYMENT_BLOCK
    
    while (fromBlock < currentBlock) {
      const toBlock = Math.min(fromBlock + 10000, currentBlock)
      try {
        const events = await contract.queryFilter(filter, fromBlock, toBlock)
        for (const event of events) {
          const eventLog = event as ethers.EventLog
          if (eventLog.args) {
            stakers.add(eventLog.args[0]) // agent address
          }
        }
      } catch (e) {
        console.error(`Error scanning blocks ${fromBlock}-${toBlock}:`, e)
      }
      fromBlock = toBlock + 1
    }
    
    return Array.from(stakers)
  } catch (error) {
    console.error('Failed to discover stakers:', error)
    return []
  }
}

async function getStakerDetails(address: string) {
  const contract = new ethers.Contract(MOLTRANK_ADDRESS, MOLTRANK_ABI, provider)
  
  try {
    const [amount, stakedAt, slashCount] = await contract.getStakeInfo(address)
    const staked = Number(ethers.formatEther(amount))
    
    if (staked === 0) return null
    
    const days = stakedAt > 0 
      ? Math.floor((Date.now() / 1000 - Number(stakedAt)) / 86400)
      : 0
    const reputation = calculateReputation(staked, days, Number(slashCount))
    const tier = getTier(staked)
    
    return {
      address,
      staked: Math.round(staked),
      stakeDays: days,
      slashCount: Number(slashCount),
      reputation: Math.round(reputation * 10) / 10,
      tier: tier.name,
      badge: tier.badge,
    }
  } catch {
    return null
  }
}

export async function GET() {
  try {
    // Discover all stakers from events
    const stakerAddresses = await discoverStakers()
    
    // Get details for each staker
    const stakerDetails = await Promise.all(
      stakerAddresses.map(addr => getStakerDetails(addr))
    )
    
    // Filter out null results (unstaked) and sort by stake amount
    const activeStakers = stakerDetails
      .filter((s): s is NonNullable<typeof s> => s !== null && s.staked > 0)
      .sort((a, b) => b.staked - a.staked)
    
    // Build leaderboard with ranks
    const leaderboard = activeStakers.map((staker, i) => ({
      rank: i + 1,
      ...staker,
    }))

    // Calculate stats
    const stats = {
      totalStaked: activeStakers.reduce((sum, s) => sum + s.staked, 0),
      totalAgents: activeStakers.length,
      avgReputation: activeStakers.length > 0
        ? Math.round(activeStakers.reduce((sum, s) => sum + s.reputation, 0) / activeStakers.length * 10) / 10
        : 0,
    }

    return NextResponse.json({
      success: true,
      leaderboard,
      stats,
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
