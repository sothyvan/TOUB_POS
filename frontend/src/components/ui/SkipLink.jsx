export default function SkipLink({ targetId = 'main-content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md border border-brand-action bg-ui-elevated px-4 py-3 text-sm font-bold text-brand-action shadow-lg transition-transform focus:translate-y-0"
    >
      Skip to main content
    </a>
  );
}
