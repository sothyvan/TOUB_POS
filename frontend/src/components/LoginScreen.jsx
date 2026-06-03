export default function LoginScreen({
  activeUsers,
  effectiveLoginUserId,
  loginPin,
  loginError,
  onLogin,
  onPinChange,
  onUserChange,
}) {
  return (
    <main
      style={{
        background:
          'linear-gradient(135deg, rgba(247, 198, 78, 0.16), transparent 34%), linear-gradient(315deg, rgba(53, 139, 139, 0.14), transparent 38%), #f6f4ef',
      }}
      className="min-h-[100svh] p-5.5 grid place-items-center text-brand-text"
    >
      <section className="w-[min(440px,100%)] p-6.5 border border-[#ded8ca] rounded-lg bg-[#fffdfa]/90 shadow-[0_18px_54px_rgba(52,45,35,0.14)] grid gap-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#23211f] text-[#f8d36b] grid place-items-center text-2xl font-extrabold shadow-[inset_0_-4px_0_rgba(255,255,255,0.08)]">
            T
          </div>
          <div>
            <p className="m-0 mb-[3px] text-[#776f63] text-[11px] font-extrabold tracking-wider uppercase">Secure register</p>
            <h1 className="m-0 text-brand-dark text-3xl leading-[1.1] font-bold">Toub POS</h1>
          </div>
        </div>

        <form className="grid gap-3.5" onSubmit={onLogin}>
          <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
            User
            <select
              value={effectiveLoginUserId}
              onChange={(event) => onUserChange(event.target.value)}
              className="w-full min-h-[48px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-bold"
            >
              {activeUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.role}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
            PIN
            <input
              type="password"
              inputMode="numeric"
              value={loginPin}
              onChange={(event) => onPinChange(event.target.value)}
              placeholder="Enter staff PIN"
              className="w-full min-h-[48px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-bold"
            />
          </label>
          {loginError ? <p className="m-0 text-[#8f3c28] text-[13px] font-black">{loginError}</p> : null}
          <button
            type="submit"
            className="min-h-[50px] border-0 rounded-lg bg-[#24211f] text-[#fff9ee] text-base font-black cursor-pointer"
          >
            Log in
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <span className="min-h-[30px] py-1.75 px-2.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black">Admin - 1234</span>
          <span className="min-h-[30px] py-1.75 px-2.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black">Manager - 2222</span>
          <span className="min-h-[30px] py-1.75 px-2.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black">Cashier - 1111</span>
        </div>
      </section>
    </main>
  );
}
