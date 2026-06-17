const SEED_STALLS = [
  { id: 'stall-1', name: 'Stall 1', location: 'BKK1',           online: true  },
  { id: 'stall-2', name: 'Stall 2', location: 'Russian Market',  online: true  },
  { id: 'stall-3', name: 'Stall 3', location: 'Toul Tom Poung',  online: false },
];

/**
 * Returns the stall object a given user is currently assigned to,
 * or null if they aren't assigned anywhere.
 */
export function getAssignedStall(userId) {
  try {
    const assignments = JSON.parse(localStorage.getItem('toub_stall_assignments')) || {};
    const stalls      = JSON.parse(localStorage.getItem('toub_stalls')) || SEED_STALLS;

    const stallId = Object.entries(assignments).find(([, ids]) => ids.includes(userId))?.[0];
    return stallId ? (stalls.find(s => s.id === stallId) ?? null) : null;
  } catch {
    return null;
  }
}
