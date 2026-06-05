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
      className="relative min-h-[100svh] p-6 grid place-items-center bg-brand-yellow text-gray-800 selection:bg-brand-blue/20"
    >
      <section className="w-[min(380px,calc(100%-1.5rem))] p-8 rounded-[24px] bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] flex flex-col gap-6">
        {/* Header Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] text-brand-yellow grid place-items-center text-3xl font-black shadow-[inset_0_-3px_0_rgba(255,255,255,0.06)] shrink-0">
            T
          </div>
          <div>
            <p className="m-0 mb-1 text-gray-500 text-[10px] font-extrabold tracking-wider uppercase">Secure register</p>
            <h1 className="m-0 text-brand-blue text-[26px] leading-none font-bold tracking-tight">ToubPOS</h1>
          </div>
        </div>

        {/* Login Form */}
        <form className="flex flex-col gap-5" onSubmit={onLogin}>
          {/* User Select */}
          <div>
            <label htmlFor="user-select" className="block text-gray-700 text-[14px] font-bold mb-1.5">
              User
            </label>
            <div className="relative">
              <select
                id="user-select"
                value={effectiveLoginUserId}
                onChange={(event) => onUserChange(event.target.value)}
                className="w-full h-12 pl-3.5 pr-10 border border-gray-200 rounded-xl bg-white text-gray-800 text-[15px] font-semibold appearance-none cursor-pointer focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              >
                {activeUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.role}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-500">
                <svg className="h-4.5 w-4.5 stroke-2 stroke-current fill-none" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* PIN Input */}
          <div>
            <label htmlFor="pin-input" className="block text-gray-700 text-[14px] font-bold mb-1.5">
              PIN
            </label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              value={loginPin}
              onChange={(event) => onPinChange(event.target.value)}
              placeholder="Enter staff PIN"
              className="w-full h-12 px-3.5 border border-gray-200 rounded-xl bg-white text-gray-800 text-[15px] font-medium placeholder-gray-400 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          {/* Error Message */}
          {loginError ? (
            <p className="m-0 text-red-500 text-xs font-semibold">{loginError}</p>
          ) : null}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-12 mt-1 bg-brand-blue text-white text-[15px] font-bold rounded-xl hover:bg-brand-blue/95 active:scale-[0.98] transition-all cursor-pointer shadow-[0_2px_4px_rgba(0,71,204,0.1)]"
          >
            Log in
          </button>
        </form>
      </section>

      {/* Floating Demo Credentials at page bottom */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/25 text-[11px] font-semibold text-brand-blue shadow-sm">
        <span className="opacity-80">Demo Credentials:</span>
        <span className="bg-white/35 px-2 py-0.5 rounded-full">Admin (1234)</span>
        <span className="bg-white/35 px-2 py-0.5 rounded-full">Manager (2222)</span>
        <span className="bg-white/35 px-2 py-0.5 rounded-full">Cashier (1111)</span>
      </div>
    </main>
  );
}
