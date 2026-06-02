import { money } from '../utils/format';

export default function OrderHistory({ orders, todaysOrders, todaysTotal }) {
  return (
    <section className="admin-grid orders-grid">
      <div className="admin-form report-card">
        <h3>Today</h3>
        <strong>{money(todaysTotal)}</strong>
        <span>{todaysOrders.length} paid orders</span>
      </div>

      <div className="admin-list">
        <h3>Order history</h3>
        {orders.length === 0 ? (
          <div className="admin-empty">No paid orders yet.</div>
        ) : (
          orders.map((order) => (
            <div className="admin-row" key={order.id}>
              <div>
                <strong>
                  {order.orderNo} - {money(order.total)}
                </strong>
                <span>
                  {order.paymentMethod} - {order.cashierName} -{' '}
                  {new Date(order.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="row-actions">
                <span className="paid-pill">{order.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
