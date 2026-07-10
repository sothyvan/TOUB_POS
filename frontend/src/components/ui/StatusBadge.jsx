import Badge from './Badge';

export default function StatusBadge({ active, activeLabel, inactiveLabel, className = '' }) {
  return (
    <Badge
      className={className}
      dot
      variant={active ? 'success' : 'neutral'}
    >
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
