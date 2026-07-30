import { io } from 'socket.io-client';
import { AUTH_STORAGE_KEYS, readStoredDeviceToken } from '../features/auth/authStorage';
import { API_BASE_URL } from './apiClient';

let cashierSocket = null;
let managementSocket = null;
const managementUpdateListeners = new Set();

function getSocketBaseUrl() {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}

function attachKitchenTicketListener(socket, onKitchenTicketUpdated) {
  socket.on('kitchen_ticket_updated', (payload) => {
    if (onKitchenTicketUpdated) {
      onKitchenTicketUpdated(payload);
    }
  });
}

function attachOrderUpdatedListener(socket, onOrderUpdated) {
  socket.on('order_updated', (payload) => {
    if (onOrderUpdated) {
      onOrderUpdated(payload);
    }
  });
}

function notifyManagementUpdate(eventName, payload) {
  for (const listener of managementUpdateListeners) {
    listener({ eventName, payload });
  }
}

export function subscribeToManagementUpdates(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  managementUpdateListeners.add(listener);
  return () => managementUpdateListeners.delete(listener);
}

export function connectCashierSocket({
  onPaymentConfirmed,
  onKitchenTicketUpdated,
  onDeviceRevoked,
  onConnectError,
} = {}) {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
  const deviceToken = readStoredDeviceToken();
  if (!token || !deviceToken) {
    return null;
  }

  disconnectCashierSocket();

  cashierSocket = io(getSocketBaseUrl(), {
    auth: { token, deviceToken },
    reconnection: true,
  });

  cashierSocket.on('payment_confirmed', (payload) => {
    if (onPaymentConfirmed) {
      onPaymentConfirmed(payload);
    }
  });

  attachKitchenTicketListener(cashierSocket, onKitchenTicketUpdated);

  cashierSocket.on('device:revoked', (payload) => {
    onDeviceRevoked?.(payload);
  });

  cashierSocket.on('connect_error', (error) => {
    if (onConnectError) {
      onConnectError(error);
    }
  });

  return cashierSocket;
}

export function connectManagementSocket({
  onKitchenTicketUpdated,
  onOrderUpdated,
  onConnectError,
} = {}) {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
  if (!token) {
    return null;
  }

  disconnectManagementSocket();

  managementSocket = io(getSocketBaseUrl(), {
    auth: { token },
    reconnection: true,
  });

  attachKitchenTicketListener(managementSocket, (payload) => {
    onKitchenTicketUpdated?.(payload);
    notifyManagementUpdate('kitchen_ticket_updated', payload);
  });
  attachOrderUpdatedListener(managementSocket, (payload) => {
    onOrderUpdated?.(payload);
    notifyManagementUpdate('order_updated', payload);
  });
  managementSocket.on('device_registry_updated', (payload) => {
    notifyManagementUpdate('device_registry_updated', payload);
  });
  managementSocket.on('telegram_group_updated', (payload) => {
    notifyManagementUpdate('telegram_group_updated', payload);
  });

  managementSocket.on('connect_error', (error) => {
    if (onConnectError) {
      onConnectError(error);
    }
  });

  return managementSocket;
}

export function disconnectCashierSocket() {
  if (!cashierSocket) {
    return;
  }

  cashierSocket.disconnect();
  cashierSocket = null;
}

export function disconnectManagementSocket() {
  if (!managementSocket) {
    return;
  }

  managementSocket.disconnect();
  managementSocket = null;
}
