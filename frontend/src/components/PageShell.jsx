import Topbar from './Topbar';

export default function PageShell({
  children,
  currentUser,
  isCashier,
  isOnline,
  itemCount,
  onCartOpen,
  onLogout,
}) {
  return (
    <div
      style={{
        background:
          'linear-gradient(135deg, rgba(247, 198, 78, 0.16), transparent 34%), linear-gradient(315deg, rgba(53, 139, 139, 0.14), transparent 38%), #f6f4ef',
      }}
      className="min-h-[100svh] flex flex-col text-brand-text"
    >
      <Topbar
        currentUser={currentUser}
        isCashier={isCashier}
        isOnline={isOnline}
        itemCount={itemCount}
        onCartOpen={onCartOpen}
        onLogout={onLogout}
      />
      {children}
    </div>
  );
}
