import { money } from '../utils/format';

export default function OrderHistory({ orders, todaysOrders, todaysTotal }) {
  return (
    <section className="grid grid-cols-[minmax(220px,300px)_minmax(0,1fr)] gap-6 items-start max-[768px]:grid-cols-1">
      {/* Today Widget Card */}
      <div className="border border-brand-border rounded-3xl bg-brand-card shadow-[0_12px_36px_rgba(52,45,35,0.04)] p-6 grid gap-3.5">
        <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight border-b border-gray-100 pb-3">Today</h3>
        <div className="space-y-1 mt-1">
          <strong className="block text-[38px] leading-none font-black text-brand-action tracking-tight">
            {money(todaysTotal)}
          </strong>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#e6f4eb] text-[#126149] border border-[#b9dec9] w-fit">
            {todaysOrders.length} paid orders
          </span>
        </div>
      </div>

      {/* History List Card */}
      <div className="border border-brand-border rounded-3xl bg-brand-card shadow-[0_12px_36px_rgba(52,45,35,0.04)] p-6 grid gap-2">
        <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight border-b border-gray-100 pb-3">Order history</h3>
        {orders.length === 0 ? (
          <div className="py-8 px-4 border border-dashed border-brand-border rounded-xl text-gray-400 text-sm font-bold text-center mt-2">
            No paid orders yet.
          </div>
        ) : (
          orders.map((order) => (
            <div 
              className="py-4.5 px-0 border-t border-gray-100 grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center first-of-type:border-t-0" 
              key={order.id}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-black text-brand-dark">
                    Order #{order.orderNo}
                  </span>
                  <span className="text-[15px] font-black text-brand-action">
                    {money(order.total)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 font-bold">
                  <span className="bg-gray-50 border border-gray-150 px-1.5 py-0.5 rounded uppercase font-extrabold">
                    {order.paymentMethod}
                  </span>
                  <span>•</span>
                  <span>{order.cashierName}</span>
                  <span>•</span>
                  <span>{new Date(order.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="m-0 py-0.5 px-2.5 rounded-full bg-[#e6f4eb] text-[#126149] border border-[#b9dec9] text-[10px] font-extrabold uppercase tracking-wide">
                  {order.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
