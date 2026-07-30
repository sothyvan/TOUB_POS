export function maskTelegramUserId(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return null;
  }
  return `••••${normalized.slice(-4)}`;
}

export function maskTelegramChatId(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length <= 8) {
    return `••••${normalized.slice(-4)}`;
  }
  return `${normalized.slice(0, 4)}••••${normalized.slice(-4)}`;
}

function sanitizeTicket(ticket) {
  const plainTicket = ticket?.toJSON ? ticket.toJSON() : ticket;
  if (!plainTicket) {
    return plainTicket;
  }

  const safeTicket = { ...plainTicket };
  delete safeTicket.telegram_chat_id;
  delete safeTicket.telegram_msg_id;
  delete safeTicket.completed_by_telegram_user_id;
  return safeTicket;
}

export function sanitizeOrderTelegramMetadata(order) {
  const plainOrder = order?.toJSON ? order.toJSON() : order;
  if (!plainOrder) {
    return plainOrder;
  }

  const safeOrder = { ...plainOrder };
  for (const stallKey of ['Stall', 'stall']) {
    if (safeOrder[stallKey]) {
      safeOrder[stallKey] = { ...safeOrder[stallKey] };
      delete safeOrder[stallKey].telegram_chat_id;
    }
  }
  for (const ticketKey of ['TelegramTickets', 'telegramTickets', 'telegram_tickets']) {
    if (Array.isArray(safeOrder[ticketKey])) {
      safeOrder[ticketKey] = safeOrder[ticketKey].map(sanitizeTicket);
    }
  }
  return safeOrder;
}
