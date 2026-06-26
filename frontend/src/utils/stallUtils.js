export const STALL_STORAGE_KEY = 'toub_stalls';
export const STALL_ASSIGNMENTS_STORAGE_KEY = 'toub_stall_assignments';

export const DEFAULT_STALLS = [
  { id: 'stall-1', name: 'Stall 1', location: 'BKK1',           online: true  },
  { id: 'stall-2', name: 'Stall 2', location: 'Russian Market',  online: true  },
  { id: 'stall-3', name: 'Stall 3', location: 'Toul Tom Poung',  online: false },
];

export const DEFAULT_STALL_ASSIGNMENTS = {
  'stall-1': ['user-cashier'],
};

export function getStalls() {
  try {
    return JSON.parse(localStorage.getItem(STALL_STORAGE_KEY)) || DEFAULT_STALLS;
  } catch {
    return DEFAULT_STALLS;
  }
}

export function saveStalls(stalls) {
  localStorage.setItem(STALL_STORAGE_KEY, JSON.stringify(stalls));
}

export function getStallAssignments() {
  try {
    const savedAssignments = localStorage.getItem(STALL_ASSIGNMENTS_STORAGE_KEY);
    return savedAssignments ? JSON.parse(savedAssignments) : DEFAULT_STALL_ASSIGNMENTS;
  } catch {
    return DEFAULT_STALL_ASSIGNMENTS;
  }
}

export function saveStallAssignments(assignments) {
  localStorage.setItem(STALL_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
}

/**
 * Returns the stall object a given user is currently assigned to,
 * or null if they aren't assigned anywhere.
 */
export function getAssignedStall(userId) {
  try {
    const assignments = getStallAssignments();
    const stalls = getStalls();

    const stallId = Object.entries(assignments).find(([, ids]) => ids.includes(userId))?.[0];
    return stallId ? (stalls.find(s => s.id === stallId) ?? null) : null;
  } catch {
    return null;
  }
}
