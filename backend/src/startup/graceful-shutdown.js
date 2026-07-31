function writeLifecycleEvent(event, details = {}) {
  process.stdout.write(`${JSON.stringify({
    level: 'info',
    event,
    ...details,
  })}\n`);
}

export function closeHttpServer(httpServer) {
  if (!httpServer?.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') {
        reject(error);
        return;
      }
      resolve();
    });
    httpServer.closeIdleConnections?.();
  });
}

export function createGracefulShutdown({
  httpServer,
  gracePeriodMs,
  markDraining,
  stopBackgroundWorkers,
  closeWebSockets,
  closeRateLimitStore,
  closeDatabase,
  writeEvent = writeLifecycleEvent,
}) {
  let shutdownPromise = null;

  return function shutdown(signal = 'manual') {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    markDraining();
    writeEvent('shutdown_started', { signal, gracePeriodMs });

    const orderlyShutdown = async () => {
      const httpClosePromise = closeHttpServer(httpServer);
      const trafficResults = await Promise.allSettled([
        stopBackgroundWorkers(),
        closeWebSockets(),
        httpClosePromise,
      ]);
      const rateLimitResult = await Promise.resolve()
        .then(() => closeRateLimitStore())
        .then(
          () => ({ status: 'fulfilled' }),
          (reason) => ({ status: 'rejected', reason }),
        );
      const databaseResult = await Promise.resolve()
        .then(() => closeDatabase())
        .then(
          () => ({ status: 'fulfilled' }),
          (reason) => ({ status: 'rejected', reason }),
        );
      const failedResult = [
        ...trafficResults,
        rateLimitResult,
        databaseResult,
      ].find((result) => result.status === 'rejected');

      if (failedResult) {
        throw failedResult.reason;
      }
    };

    shutdownPromise = new Promise((resolve, reject) => {
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        httpServer.closeAllConnections?.();
        const error = new Error(
          `Graceful shutdown exceeded ${gracePeriodMs}ms.`,
        );
        error.code = 'SHUTDOWN_TIMEOUT';
        reject(error);
      }, gracePeriodMs);

      orderlyShutdown()
        .then(() => {
          clearTimeout(timeoutId);
          if (timedOut) {
            return;
          }
          writeEvent('shutdown_completed', { signal });
          resolve({ forced: false });
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          if (!timedOut) {
            reject(error);
          }
        });
    });

    return shutdownPromise;
  };
}
