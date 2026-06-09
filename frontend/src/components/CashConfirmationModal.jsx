export default function CashConfirmationModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-brand-yellow rounded-4xl w-135 max-w-full p-8 flex flex-col items-center text-center shadow-[0_24px_64px_rgba(0,0,0,0.24)] animate-in fade-in zoom-in-95 duration-200 border-0">
        <h3 className="m-0 text-3xl font-extrabold text-[#1a1c1e] mb-8 mt-2 tracking-tight">
          Did you received the cash?
        </h3>
        <div className="flex items-center justify-center gap-6 w-full mb-2">
          <button
            className="flex-1 h-15 bg-[#c70000] hover:brightness-105 active:scale-[0.98] text-white text-2xl font-black rounded-2xl transition-all cursor-pointer border-0 shadow-md flex items-center justify-center"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 h-15 bg-[#157811] hover:brightness-105 active:scale-[0.98] text-white text-2xl font-black rounded-2xl transition-all cursor-pointer border-0 shadow-md flex items-center justify-center"
            type="button"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
