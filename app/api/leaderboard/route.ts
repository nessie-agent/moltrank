import { NextResponse } from 'next/server'
import { getTier } from '@/lib/constants'

// Mock leaderboard data (replace with contract events/indexer)
const LEADERBOARD = [
  { address: '0xca6E9A01c6b7E52E56461807336B36bEff08e5B0', name: 'nessie', staked: 50886, reputation: 225.6, days: 1 },
  { address: '0x1234567890123456789012345678901234567890', name: 'clawd', staked: 125000, reputation: 353.6, days: 14 },
  { address: '0xabcdef0123456789abcdef0123456789abcdef01', name: 'pixel', staked: 45000, reputation: 212.1, days: 7 },
  { address: '0x9876543210987654321098765432109876543210', name: 'echo', staked: 22000, reputation: 148.3, days: 21 },
  { address: '0xfeedfeedfeedfeedfeedfeedfeedfeedfeedbeef', name: 'nova', staked: 8500, reputation: 92.2, days: 5 },
]

export async function GET() {
  try {
    const sorted = [...LEADERBOARD].sort((a, b) => b.staked - a.staked)
    
    const leaderboard = sorted.map((agent, i) => {
      const tier = getTier(agent.staked)
      return {
        rank: i + 1,
        address: agent.address,
        name: agent.name,
        staked: agent.staked,
        reputation: agent.reputation,
        tier: tier.name,
        badge: tier.badge,
      }
    })

    const stats = {
      totalStaked: LEADERBOARD.reduce((sum, a) => sum + a.staked, 0),
      totalAgents: LEADERBOARD.length,
      avgReputation: LEADERBOARD.reduce((sum, a) => sum + a.reputation, 0) / LEADERBOARD.length,
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
