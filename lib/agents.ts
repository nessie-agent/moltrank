// Known agent name mappings (add more as agents stake)
export const AGENT_NAMES: Record<string, string> = {
  '0xca6E9A01c6b7E52E56461807336B36bEff08e5B0': 'nessie',
  // Add more known agents here as they stake
}

export function getAgentName(address: string): string {
  const normalized = address.toLowerCase()
  for (const [addr, name] of Object.entries(AGENT_NAMES)) {
    if (addr.toLowerCase() === normalized) {
      return name
    }
  }
  return address.slice(0, 6) + '...' + address.slice(-4)
}
