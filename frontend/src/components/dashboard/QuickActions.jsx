import Icon from '../ui/Icon';

export default function QuickActions() {
  const actions = [
    {
      id: 1,
      text: 'Add New Stall Location',
      bgColor: 'bg-indigo-50',
      borderColor: 'outline-indigo-200',
      iconColor: '#003EC7',
      icon: (
        <Icon name="plus" className="w-4.5 h-4.5" strokeWidth={2.2} color="#003EC7" />
      )
    },
    {
      id: 2,
      text: 'Register New Employee User',
      bgColor: 'bg-green-100',
      borderColor: 'outline-green-200',
      iconColor: '#15803D',
      icon: (
        <Icon name="userPlus" className="w-4.5 h-4.5" strokeWidth={2.2} color="#15803D" />
      )
    },
    {
      id: 3,
      text: 'Global POS Configurations',
      bgColor: 'bg-amber-100',
      borderColor: 'outline-amber-200',
      iconColor: '#B45309',
      icon: (
        <Icon name="settings" className="w-4.5 h-4.5" strokeWidth={2.2} color="#B45309" />
      )
    }
  ];

  return (
    <div className="self-stretch px-5 py-4 bg-white rounded-2xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.04)] outline outline-[0.80px] outline-offset-[-0.80px] outline-gray-200 flex flex-col justify-start items-start">
      <div className="self-stretch flex flex-col justify-start items-start">
        <div className="justify-start text-gray-500 text-xs font-bold font-['Inter'] uppercase leading-4 tracking-wide">Quick Tasks</div>
      </div>
      <div className="self-stretch pt-3.5 flex flex-col justify-start items-start">
        <div className="w-full flex justify-start items-start gap-3 flex-wrap max-[768px]:flex-col">
          {actions.map((action) => (
            <button key={action.id} type="button" className={`flex-1 self-stretch min-w-[200px] min-h-16 px-4 py-3 ${action.bgColor} rounded-xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.05)] outline outline-[0.80px] outline-offset-[-0.80px] ${action.borderColor} flex justify-start items-center gap-3 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-all`}>
              <div className="w-8 h-8 bg-white rounded-lg shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)] flex justify-center items-center">
                {action.icon}
              </div>
              <div className="flex-1 text-left relative">
                <div className="justify-start text-gray-700 text-xs font-semibold font-['Inter'] leading-5 break-words">
                  {action.text}
                </div>
              </div>
              <div className="flex justify-end items-start">
                <div className="relative">
                  <Icon name="arrowRight" className="w-3.5 h-3.5" strokeWidth={2.2} color="#9CA3AF" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
