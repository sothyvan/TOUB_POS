export default function MetricCard({
  title,
  icon,
  value,
  subtitle,
  iconBgColor = 'bg-gray-100',
  subtitleColor = 'text-gray-500',
  valueClassName = 'text-gray-900',
}) {
  return (
    <div className="flex-1 px-5 py-4 bg-ui-surface rounded-lg border border-ui-border border-t-brand-action/70 flex flex-col justify-start items-start gap-3">
      <div className="self-stretch flex justify-between items-start">
        <div className="w-auto relative">
          <div className="text-gray-500 text-xs font-bold font-sans uppercase leading-4 tracking-wide">
            {title}
          </div>
        </div>
        <div className={`w-8 h-8 ${iconBgColor} rounded-md border border-ui-border flex justify-center items-center`}>
          {icon}
        </div>
      </div>
      <div className="self-stretch flex flex-col justify-start items-start">
        <div className={`justify-start text-2xl font-extrabold font-sans leading-7 ${valueClassName}`}>
          {value}
        </div>
      </div>
      <div className="w-full relative flex flex-col justify-start items-start">
        <div className="w-full flex flex-col justify-start items-start">
          <div className={`justify-start ${subtitleColor} text-xs font-medium font-sans leading-4`}>
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}
