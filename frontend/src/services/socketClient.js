import { io } from 'socket.io-client';
import { AUTH_STORAGE_KEYS } from '../features/auth/authStorage';
import { API_BASE_URL } from './apiClient';

let cashierSocket = null;
let managementSocket = null;

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

export function connectCashierSocket({
  onPaymentConfirmed,
  onKitchenTicketUpdated,
  onConnectError,
} = {}) {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
  if (!token) {
    return null;
  }

  disconnectCashierSocket();

  cashierSocket = io(getSocketBaseUrl(), {
    auth: { token },
    reconnection: true,
  });

  cashierSocket.on('payment_confirmed', (payload) => {
    if (onPaymentConfirmed) {
      onPaymentConfirmed(payload);
    }
  });

  attachKitchenTicketListener(cashierSocket, onKitchenTicketUpdated);

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

  attachKitchenTicketListener(managementSocket, onKitchenTicketUpdated);
  attachOrderUpdatedListener(managementSocket, onOrderUpdated);

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
