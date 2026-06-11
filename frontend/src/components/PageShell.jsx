import Topbar from './Topbar';

export default function PageShell({
  children,
  currentUser,
  isCashier,
  itemCount,
  onCartOpen,
  onLogout,
}) {
  return (
    <div
      className="h-svh max-h-svh flex flex-col bg-brand-bg text-brand-text overflow-hidden"
    >
      <Topbar
        currentUser={currentUser}
        isCashier={isCashier}
        itemCount={itemCount}
        onCartOpen={onCartOpen}
        onLogout={onLogout}
      />
      {children}
    </div>
  );
}
