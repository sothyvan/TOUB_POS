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
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <p className="eyebrow">Secure register</p>
            <h1>SabaY POS</h1>
          </div>
        </div>

        <form className="login-form" onSubmit={onLogin}>
          <label>
            User
            <select value={effectiveLoginUserId} onChange={(event) => onUserChange(event.target.value)}>
              {activeUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            PIN
            <input
              type="password"
              inputMode="numeric"
              value={loginPin}
              onChange={(event) => onPinChange(event.target.value)}
              placeholder="Enter staff PIN"
            />
          </label>
          {loginError ? <p className="login-error">{loginError}</p> : null}
          <button type="submit">Log in</button>
        </form>

        <div className="demo-pins">
          <span>Admin - 1234</span>
          <span>Manager - 2222</span>
          <span>Cashier - 1111</span>
        </div>
      </section>
    </main>
  );
}
