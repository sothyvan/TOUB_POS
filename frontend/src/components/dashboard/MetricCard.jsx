export default function MetricCard({
  title,
  icon,
  value,
  subtitle,
  iconBgColor = 'bg-gray-100',
  subtitleColor = 'text-gray-500'
}) {
  return (
    <div className="flex-1 px-5 py-4 bg-white rounded-2xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.05)] border-l-[0.80px] border-r-[0.80px] border-t-[2.40px] border-b-[0.80px] border-gray-200 flex flex-col justify-start items-start gap-3">
      <div className="self-stretch flex justify-between items-start">
        <div className="w-auto relative">
          <div className="text-gray-500 text-xs font-bold font-sans uppercase leading-4 tracking-wide">
            {title}
          </div>
        </div>
        <div className={`w-8 h-8 ${iconBgColor} rounded-lg flex justify-center items-center`}>
          {icon}
        </div>
      </div>
      <div className="self-stretch flex flex-col justify-start items-start">
        <div className="justify-start text-gray-900 text-2xl font-extrabold font-sans leading-7">
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
