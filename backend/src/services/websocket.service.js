import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

let ioServer = null;
const cashierSockets = new Map();
const managementSockets = new Map();

function isAllowedDevelopmentOrigin(origin) {
  return !origin
    || /^https?:\/\/localhost(:\d+)?$/.test(origin)
    || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
}

function resolveSocketCorsOrigin(origin, callback) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const configuredOrigin = process.env.FRONTEND_ORIGIN || (isDevelopment ? 'http://localhost:5173' : null);

  if (isDevelopment && isAllowedDevelopmentOrigin(origin)) {
    return callback(null, true);
  }

  if (!configuredOrigin) {
    return callback(new Error('FRONTEND_ORIGIN is required for WebSocket CORS.'));
  }

  if (!origin || origin === configuredOrigin) {
    return callback(null, true);
  }

  return callback(new Error('WebSocket origin is not allowed.'));
}

function getSocketToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken;
  }

  const header = socket.handshake.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7);
  }

  return null;
}

function addSocket(socketMap, key, socketId) {
  const socketIds = socketMap.get(key) || new Set();
  socketIds.add(socketId);
  socketMap.set(key, socketIds);
}

function removeSocket(socketMap, key, socketId) {
  const socketIds = socketMap.get(key);
  if (!socketIds) {
    return;
  }

  socketIds.delete(socketId);
  if (socketIds.size === 0) {
    socketMap.delete(key);
  }
}

function addCashierSocket(cashierId, socketId) {
  addSocket(cashierSockets, cashierId, socketId);
}

function removeCashierSocket(cashierId, socketId) {
  removeSocket(cashierSockets, cashierId, socketId);
}

function addManagementSocket(ownerId, socketId) {
  addSocket(managementSockets, ownerId, socketId);
}

function removeManagementSocket(ownerId, socketId) {
  removeSocket(managementSockets, ownerId, socketId);
}

function resolveManagementOwnerId(user) {
  if (user?.role === 'owner') {
    return Number(user.id);
  }

  if (user?.role === 'manager') {
    return Number(user.owner_id);
  }

  return null;
}

function authenticateSocket(socket, next) {
  const token = getSocketToken(socket);
  if (!token) {
    return next(new Error('Missing socket auth token.'));
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const role = String(user?.role || '').toLowerCase();
    if (!['owner', 'manager', 'cashier'].includes(role)) {
      return next(new Error('This role cannot connect to live POS events.'));
    }

    const userId = Number(user.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return next(new Error('Invalid socket identity.'));
    }

    socket.data.user = user;
    socket.data.role = role;

    if (role === 'cashier') {
      socket.data.cashierId = userId;
    } else {
      const ownerId = resolveManagementOwnerId({ ...user, role });
      if (!Number.isInteger(ownerId) || ownerId <= 0) {
        return next(new Error('Invalid management socket owner scope.'));
      }
      socket.data.ownerId = ownerId;
    }

    return next();
  } catch {
    return next(new Error('Invalid or expired socket auth token.'));
  }
}

export function initializeWebSocketServer(httpServer) {
  if (ioServer) {
    return ioServer;
  }

  ioServer = new Server(httpServer, {
    cors: {
      origin: resolveSocketCorsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  ioServer.use(authenticateSocket);

  ioServer.on('connection', (socket) => {
    const { role } = socket.data;

    if (role === 'cashier') {
      const cashierId = socket.data.cashierId;
      addCashierSocket(cashierId, socket.id);

      socket.on('disconnect', () => {
        removeCashierSocket(cashierId, socket.id);
      });

      return;
    }

    const ownerId = socket.data.ownerId;
    addManagementSocket(ownerId, socket.id);

    socket.on('disconnect', () => {
      removeManagementSocket(ownerId, socket.id);
    });
  });

  return ioServer;
}

export function emitPaymentConfirmed(cashierId, payment) {
  if (!ioServer) {
    return false;
  }

  const normalizedCashierId = Number(cashierId);
  if (!Number.isInteger(normalizedCashierId) || normalizedCashierId <= 0) {
    return false;
  }

  const socketIds = cashierSockets.get(normalizedCashierId);
  if (!socketIds || socketIds.size === 0) {
    return false;
  }

  for (const socketId of socketIds) {
    ioServer.to(socketId).emit('payment_confirmed', payment);
  }

  return true;
}

function emitToSocketSet(socketIds, eventName, payload) {
  if (!socketIds || socketIds.size === 0) {
    return 0;
  }

  let emittedCount = 0;
  for (const socketId of socketIds) {
    ioServer.to(socketId).emit(eventName, payload);
    emittedCount += 1;
  }

  return emittedCount;
}

export function emitKitchenTicketUpdated({ cashierId, ownerId, orderId, ticketId, status, completedAt }) {
  if (!ioServer) {
    return false;
  }

  const payload = {
    orderId,
    ticketId,
    status,
    completedAt,
  };

  let emittedCount = 0;

  const normalizedCashierId = Number(cashierId);
  if (Number.isInteger(normalizedCashierId) && normalizedCashierId > 0) {
    emittedCount += emitToSocketSet(
      cashierSockets.get(normalizedCashierId),
      'kitchen_ticket_updated',
      payload
    );
  }

  const normalizedOwnerId = Number(ownerId);
  if (Number.isInteger(normalizedOwnerId) && normalizedOwnerId > 0) {
    emittedCount += emitToSocketSet(
      managementSockets.get(normalizedOwnerId),
      'kitchen_ticket_updated',
      payload
    );
  }

  return emittedCount > 0;
}

export function emitManagementOrderUpdated({ ownerId, orderId, status, paymentMethod, changeType }) {
  if (!ioServer) {
    return false;
  }

  const normalizedOwnerId = Number(ownerId);
  if (!Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
    return false;
  }

  const emittedCount = emitToSocketSet(
    managementSockets.get(normalizedOwnerId),
    'order_updated',
    {
      orderId,
      status,
      paymentMethod,
      changeType,
    }
  );

  return emittedCount > 0;
}

export function getWebSocketConnectionStats() {
  let socketCount = 0;
  for (const socketIds of cashierSockets.values()) {
    socketCount += socketIds.size;
  }
  for (const socketIds of managementSockets.values()) {
    socketCount += socketIds.size;
  }

  return {
    cashierCount: cashierSockets.size,
    managementOwnerCount: managementSockets.size,
    socketCount,
  };
}
