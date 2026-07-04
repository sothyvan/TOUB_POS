import { useState } from 'react';
import Icon from './ui/Icon';
import FormInput from './ui/FormInput';
import Logo from './ui/Logo';
import { initials } from '../utils/format';

export default function LoginScreen({
  loginMode,
  setLoginMode,
  flowStep,
  setFlowStep,
  deviceRegistered,
  onDeregister,
  activeCashiers,
  selectedUser,
  setSelectedUser,
  typedPin,
  onKeyPress,
  onErase,
  loginError,
  setLoginError,
  onManagementLogin,
  onSelectProfile,
  showDemoCredentials = false,
  ownerToken,
  availableStalls,
  onRegisterDevice,
  onCancelRegistration,
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStallId, setSelectedStallId] = useState('');

  const handleSubmitManagement = async (event) => {
    event.preventDefault();
    const isRegisterStep = loginMode === 'cashier' && flowStep === 'register';
    setIsSubmitting(true);
    try {
    const success = await onManagementLogin(username, password, isRegisterStep);
      if (success) {
        setUsername('');
        setPassword('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeregister = () => {
    onDeregister();
  };

  const handleBackToProfiles = () => {
    setFlowStep('select-profile');
    setSelectedUser(null);
  };

  const renderRegister = () => (
    <section className="w-[min(380px,calc(100%-1.5rem))] p-8 rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-4">
        <Logo variant="login" />
        <div>
          <p className="m-0 mb-1 text-gray-500 text-[10px] font-extrabold tracking-wider uppercase">Fast Login</p>
          <h1 className="m-0 text-brand-blue text-[26px] leading-none font-bold tracking-tight">ToubPOS</h1>
        </div>
      </div>

      <div>
        <h2 className="m-0 text-xl font-bold text-gray-900 leading-snug">Register Device for Cashier</h2>
        <p className="m-0 mt-1.5 text-gray-500 text-xs font-semibold leading-relaxed">
          First time registration needs owner or manager credentials
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmitManagement}>
        <FormInput
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          required
        />
        <FormInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />

        {loginError && <p className="m-0 text-red-500 text-xs font-semibold">{loginError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 mt-1 bg-brand-blue text-white text-[15px] font-bold rounded-xl hover:bg-brand-blue/95 active:scale-[0.98] transition-all cursor-pointer shadow-[0_2px_4px_rgba(0,71,204,0.1)]"
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setLoginMode('management');
          setLoginError('');
        }}
        className="text-xs font-bold text-brand-action/90 hover:underline cursor-pointer border-0 bg-transparent text-center"
      >
        Management Portal Login
      </button>
    </section>
  );

  const renderSelectProfile = () => (
    <section className="w-[min(480px,calc(100%-1.5rem))] p-8 rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-4">
        <Logo variant="login" />
        <div>
          <p className="m-0 mb-1 text-gray-500 text-[10px] font-extrabold tracking-wider uppercase">Fast Login</p>
          <h1 className="m-0 text-brand-blue text-[26px] leading-none font-bold tracking-tight">ToubPOS</h1>
        </div>
      </div>

      <div className="text-center">
        <h2 className="m-0 text-xl font-bold text-gray-900 leading-snug">Select Your Profile</h2>
        <p className="m-0 mt-1.5 text-gray-500 text-xs font-semibold leading-relaxed">
          Choose your account to continue
        </p>
      </div>

      {activeCashiers.length === 0 ? (
        <div className="py-8 px-4 border border-dashed border-brand-border rounded-2xl text-center text-gray-400 text-sm font-bold">
          No cashier accounts available. Please configure them in the Management Portal.
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-5 my-2">
          {activeCashiers.map((user, index) => {
            const colors = [
              'border-sky-400 bg-sky-50 text-sky-700',
              'border-purple-400 bg-purple-50 text-purple-700',
              'border-pink-400 bg-pink-50 text-pink-700',
            ];
            const borderRing = colors[index % colors.length];

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelectProfile(user)}
                className="w-28 p-3.5 border border-brand-border/60 hover:border-brand-action rounded-2xl bg-brand-card hover:bg-white flex flex-col items-center shadow-sm hover:shadow active:scale-95 hover:translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <div className={`w-15 h-15 rounded-full border-3 ${borderRing} flex items-center justify-center text-lg font-black shadow-inner`}>
                  {initials(user.name)}
                </div>
                <strong className="mt-3 block text-brand-text text-[14px] font-bold truncate w-full text-center leading-tight">
                  {user.name}
                </strong>
                <small className="mt-0.5 block text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  {user.role}
                </small>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2.5 items-center mt-2">
        <button
          type="button"
          onClick={() => {
            setLoginMode('management');
            setLoginError('');
          }}
          className="text-xs font-bold text-brand-action/90 hover:underline cursor-pointer border-0 bg-transparent"
        >
          Management Portal Login
        </button>
        <button
          type="button"
          onClick={handleDeregister}
          className="text-[10px] font-extrabold text-red-500/80 hover:text-red-600 uppercase tracking-wider hover:underline cursor-pointer border-0 bg-transparent"
        >
          Deregister Device
        </button>
      </div>
    </section>
  );

  const renderPinPad = () => {
    if (!selectedUser) return null;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'erase'];

    return (
      <section className="w-full max-w-105 min-h-[580px] rounded-4xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-brand-border/20">
        {/* Top 35% solid royal blue container */}
        <div className="h-48 bg-brand-action flex flex-col items-center justify-center relative select-none shadow-md shrink-0">
          <button
            type="button"
            onClick={handleBackToProfiles}
            className="absolute top-5 left-5 border-0 bg-transparent flex items-center gap-1.5 text-white/80 hover:text-white cursor-pointer font-bold text-xs transition-colors"
          >
            <Icon name="arrowLeft" className="w-4 h-4" />
            Switch User
          </button>

          <div className="w-16 h-16 rounded-full border-3 border-white/40 bg-white/10 flex items-center justify-center text-white text-lg font-black shadow-inner">
            {initials(selectedUser.name)}
          </div>
          <strong className="mt-2.5 text-white text-lg font-black tracking-tight">{selectedUser.name}</strong>
          <small className="mt-0.5 text-white/75 text-[10px] font-extrabold uppercase tracking-widest">{selectedUser.role}</small>
        </div>

        {/* Bottom 65% white numeric canvas */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4 bg-brand-card">
          <div className="text-center">
            <p className="m-0 text-[#776f63] text-[11px] font-extrabold uppercase tracking-widest mb-3">
              Enter your 4-digit PIN
            </p>
            <div className="flex justify-center gap-3.5">
              {[0, 1, 2, 3].map((idx) => (
                <span
                  key={idx}
                  className={`w-3 h-3 rounded-full border border-gray-300 transition-all duration-150 ${
                    typedPin.length > idx ? 'bg-brand-action border-brand-action scale-110 shadow-sm' : 'bg-gray-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {loginError && (
            <p className="m-0 text-red-500 text-xs font-semibold text-center animate-bounce">{loginError}</p>
          )}

          {/* Keypad Matrix layout */}
          <div className="grid grid-cols-3 gap-3.5 w-full max-w-[270px] mt-2">
            {keys.map((key, idx) => {
              if (key === '') return <div key={idx} className="h-14 bg-transparent" />;
              if (key === 'erase') {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={onErase}
                    className="h-14 rounded-2xl border border-brand-border/40 bg-white hover:bg-gray-50 active:scale-95 transition-all text-[#776f63] grid place-items-center shadow-sm cursor-pointer"
                    aria-label="Backspace"
                  >
                    <Icon name="backspace" className="w-5.5 h-5.5" strokeWidth={2} />
                  </button>
                );
              }
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onKeyPress(key)}
                  className="h-14 rounded-2xl border border-brand-border/40 bg-white hover:bg-gray-50 active:scale-95 transition-all text-brand-dark text-xl font-bold shadow-sm cursor-pointer"
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  const renderManagementLogin = () => (
    <section className="w-[min(380px,calc(100%-1.5rem))] p-8 rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-4">
        <Logo variant="login" />
        <div>
          <p className="m-0 mb-1 text-gray-500 text-[10px] font-extrabold tracking-wider uppercase">Portal Login</p>
          <h1 className="m-0 text-brand-blue text-[26px] leading-none font-bold tracking-tight">ToubPOS</h1>
        </div>
      </div>

      <div>
        <h2 className="m-0 text-xl font-bold text-gray-900 leading-snug">Management Portal Login</h2>
        <p className="m-0 mt-1.5 text-gray-500 text-xs font-semibold leading-relaxed">
          Log in with owner or manager credentials
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmitManagement}>
        <FormInput
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          required
        />
        <FormInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />

        {loginError && <p className="m-0 text-red-500 text-xs font-semibold">{loginError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 mt-1 bg-brand-blue text-white text-[15px] font-bold rounded-xl hover:bg-brand-blue/95 active:scale-[0.98] transition-all cursor-pointer shadow-[0_2px_4px_rgba(0,71,204,0.1)]"
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setLoginMode('cashier');
          setLoginError('');
        }}
        className="text-xs font-bold text-brand-action/90 hover:underline cursor-pointer border-0 bg-transparent text-center"
      >
        Switch to Cashier Terminal
      </button>
    </section>
  );

  const handleStallRegisterSubmit = (e) => {
    e.preventDefault();
    if (!selectedStallId) return;
    setIsSubmitting(true);
    onRegisterDevice(selectedStallId).finally(() => {
      setIsSubmitting(false);
    });
  };

  const renderSelectStall = () => (
    <section className="w-[min(380px,calc(100%-1.5rem))] p-8 rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-4">
        <Logo variant="login" />
        <div>
          <p className="m-0 mb-1 text-gray-500 text-[10px] font-extrabold tracking-wider uppercase">Provisioning</p>
          <h1 className="m-0 text-brand-blue text-[26px] leading-none font-bold tracking-tight">ToubPOS</h1>
        </div>
      </div>

      <div>
        <h2 className="m-0 text-xl font-bold text-gray-900 leading-snug">Select Stall for Device</h2>
        <p className="m-0 mt-1.5 text-gray-500 text-xs font-semibold leading-relaxed">
          Assign this terminal to a specific stall
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleStallRegisterSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-extrabold text-[#776f63] uppercase tracking-wider">Stall</label>
          <select
            value={selectedStallId}
            onChange={(e) => setSelectedStallId(e.target.value)}
            required
            className="w-full h-12 px-3.5 border border-brand-border rounded-xl bg-brand-card font-semibold text-brand-dark focus:outline-none focus:border-brand-action transition-colors cursor-pointer"
          >
            <option value="">Select a stall...</option>
            {availableStalls.map((stall) => (
              <option key={stall.id} value={stall.id}>
                {stall.name} {stall.location ? `— ${stall.location}` : ''}
              </option>
            ))}
          </select>
        </div>

        {loginError && <p className="m-0 text-red-500 text-xs font-semibold">{loginError}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !selectedStallId}
          className="w-full h-12 mt-1 bg-brand-blue text-white text-[15px] font-bold rounded-xl hover:bg-brand-blue/95 active:scale-[0.98] transition-all cursor-pointer shadow-[0_2px_4px_rgba(0,71,204,0.1)]"
        >
          {isSubmitting ? 'Registering...' : 'Register Device'}
        </button>
      </form>

      <button
        type="button"
        onClick={onCancelRegistration}
        className="text-xs font-bold text-red-500/80 hover:underline cursor-pointer border-0 bg-transparent text-center"
      >
        Cancel
      </button>
    </section>
  );

  return (
    <main className="relative min-h-svh p-6 grid place-items-center bg-brand-yellow text-gray-800 selection:bg-brand-blue/20">
      {loginMode === 'management' && renderManagementLogin()}
      {loginMode === 'cashier' && flowStep === 'register' && (ownerToken ? renderSelectStall() : renderRegister())}
      {loginMode === 'cashier' && flowStep === 'select-profile' && renderSelectProfile()}
      {loginMode === 'cashier' && flowStep === 'pin-pad' && renderPinPad()}

      {showDemoCredentials && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-3 bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/25 text-[11px] font-semibold text-brand-blue shadow-sm">
          <span className="opacity-80">Development Credentials:</span>
          <span className="bg-white/35 px-2 py-0.5 rounded-full">Owner (owner / owner123)</span>
          <span className="bg-white/35 px-2 py-0.5 rounded-full">Cashier: profile + PIN</span>
        </div>
      )}
    </main>
  );
}
