const PHASES = Object.freeze({
  STARTING: 'starting',
  READY: 'ready',
  DRAINING: 'draining',
});

let applicationPhase = PHASES.STARTING;

export function getApplicationPhase() {
  return applicationPhase;
}

export function markApplicationStarting() {
  applicationPhase = PHASES.STARTING;
}

export function markApplicationReady() {
  applicationPhase = PHASES.READY;
}

export function markApplicationDraining() {
  applicationPhase = PHASES.DRAINING;
}

export function rejectRequestsWhileDraining(_req, res, next) {
  if (applicationPhase !== PHASES.DRAINING) {
    return next();
  }

  res.set('Connection', 'close');
  res.set('Retry-After', '5');
  return res.status(503).json({
    success: false,
    code: 'SERVICE_DRAINING',
    message: 'The service is restarting. Please retry shortly.',
  });
}
