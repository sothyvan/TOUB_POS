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
      className="h-[100svh] max-h-[100svh] flex flex-col bg-brand-bg text-brand-text overflow-hidden"
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
