import { money } from '../utils/format';

export default function OrderHistory({ orders, todaysOrders, todaysTotal }) {
  return (
    <section className="grid grid-cols-[minmax(220px,300px)_minmax(0,1fr)] gap-4.5 items-start max-[768px]:grid-cols-1">
      <div className="border border-[#ded8ca] rounded-lg bg-[#fffdfa] shadow-[0_10px_24px_rgba(52,45,35,0.07)] p-4.5 grid gap-3.5">
        <h3 className="m-0 text-brand-dark text-lg font-bold">Today</h3>
        <strong className="text-brand-dark text-[38px] leading-none font-bold">{money(todaysTotal)}</strong>
        <span className="text-brand-subtext text-sm font-extrabold">{todaysOrders.length} paid orders</span>
      </div>

      <div className="border border-[#ded8ca] rounded-lg bg-[#fffdfa] shadow-[0_10px_24px_rgba(52,45,35,0.07)] p-4.5 grid gap-2.5">
        <h3 className="m-0 text-brand-dark text-lg font-bold">Order history</h3>
        {orders.length === 0 ? (
          <div className="p-5.5 border border-dashed border-[#ded8ca] rounded-lg text-[#756c61] text-sm font-bold text-center">No paid orders yet.</div>
        ) : (
          orders.map((order) => (
            <div className="py-3.25 px-0 border-t border-[#eee7db] grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center first-of-type:border-t-0" key={order.id}>
              <div>
                <strong className="block text-brand-text text-[15px] font-bold">
                  {order.orderNo} - {money(order.total)}
                </strong>
                <span className="block mt-1 text-brand-subtext text-[13px] font-bold">
                  {order.paymentMethod} - {order.cashierName} -{' '}
                  {new Date(order.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="m-0 py-1.75 px-2.5 rounded-full bg-[#e6f4eb] text-[#126149] text-xs font-black">{order.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
