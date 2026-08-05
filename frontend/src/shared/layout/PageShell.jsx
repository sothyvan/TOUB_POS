import Topbar from './Topbar';
import SkipLink from '../../components/ui/SkipLink';

export default function PageShell({
  children,
  currentUser,
  isCashier,
  itemCount,
  onCartOpen,
  onLogout,
  assignedStall,
}) {
  return (
    <div
      className="h-svh max-h-svh flex flex-col bg-brand-bg text-brand-text overflow-hidden"
    >
      <SkipLink />
      {/* Global topbar — cashier only. Owner has its own header inside OwnerWorkspace */}
      {isCashier && (
        <Topbar
          currentUser={currentUser}
          isCashier={isCashier}
          itemCount={itemCount}
          onCartOpen={onCartOpen}
          onLogout={onLogout}
          assignedStall={assignedStall}
        />
      )}
      {children}
    </div>
  );
}

