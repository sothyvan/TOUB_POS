export function mergeConfirmedOrder(currentOrders, confirmedOrder) {
  const orders = Array.isArray(currentOrders) ? currentOrders : [];
  if (confirmedOrder?.id === undefined || confirmedOrder?.id === null) {
    return [...orders];
  }

  let replaced = false;
  const merged = orders.map((order) => {
    if (String(order?.id) !== String(confirmedOrder.id)) {
      return order;
    }
    replaced = true;
    return { ...order, ...confirmedOrder };
  });

  return replaced ? merged : [{ ...confirmedOrder }, ...merged];
}

export function applyOrderSnapshotIfCurrent({
  requestGeneration,
  currentGeneration,
  orders,
  applySnapshot,
}) {
  if (requestGeneration !== currentGeneration) {
    return false;
  }

  applySnapshot(orders);
  return true;
}

export function completeCheckoutWithoutBlocking({
  finalOrder,
  updateOrders,
  clearPendingCheckout,
  clearCart,
  refreshOrders,
  onRefreshError,
}) {
  updateOrders((currentOrders) => mergeConfirmedOrder(currentOrders, finalOrder));
  clearPendingCheckout();
  clearCart();

  void Promise.resolve()
    .then(() => refreshOrders())
    .catch((error) => onRefreshError?.(error));

  return finalOrder;
}
