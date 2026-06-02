import { initials } from '../utils/format';

export default function Topbar({ currentUser, isCashier, isOnline, itemCount, onCartOpen, onLogout }) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark">S</div>
        <div>
          <p className="eyebrow">{currentUser.role} session</p>
          <h1>SabaY POS</h1>
        </div>
      </div>

      <div className="shift-strip" aria-label="Session status">
        <span className={`status-pill ${isOnline ? 'online' : 'offline'}`}>
          <span aria-hidden="true" />
          {isOnline ? 'Online' : 'Offline'}
        </span>
        {isCashier ? (
          <button
            className="cart-toggle"
            type="button"
            aria-label={`Open cart with ${itemCount} items`}
            onClick={onCartOpen}
          >
            <span className="cart-icon" aria-hidden="true" />
            <strong>{itemCount}</strong>
          </button>
        ) : null}
        <div className="session-badge">
          <span>{initials(currentUser.name)}</span>
          <div>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.station}</small>
          </div>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
