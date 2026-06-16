export default function LiveEvents() {
  const events = [
    {
      id: 1,
      text: 'Order #184 paid via KHQR at Stall 2 (Russian Market)',
      time: '1 min ago',
      type: 'success',
      color: 'bg-green-500',
      iconColor: '#22C55E'
    },
    {
      id: 2,
      text: 'Barista Bopha marked Order #183 as DONE via Telegram KDS',
      time: '4 mins ago',
      type: 'info',
      color: 'bg-blue-500',
      iconColor: '#3B82F6'
    },
    {
      id: 3,
      text: 'Cashier Dara logged into Stall 2 using Quick-PIN',
      time: '12 mins ago',
      type: 'warning',
      color: 'bg-orange-500',
      iconColor: '#F97316'
    },
    {
      id: 4,
      text: 'Order #182 paid via Cash at Stall 1 (BKK1)',
      time: '15 mins ago',
      type: 'success',
      color: 'bg-green-500',
      iconColor: '#22C55E'
    }
  ];

  return (
    <div className="flex-1 h-auto min-h-[452.95px] bg-white rounded-2xl shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)] outline outline-offset-[-0.80px] outline-gray-200 flex flex-col justify-start items-start overflow-hidden">
      <div className="self-stretch px-5 py-4 border-b-[0.80px] border-gray-100 flex justify-between items-center">
        <div className="w-44 flex flex-col justify-start items-start">
          <div className="self-stretch flex flex-col justify-start items-start">
            <div className="justify-start text-gray-900 text-base font-bold font-['Inter'] leading-6">Recent System Events</div>
          </div>
          <div className="w-44 h-5 pt-[3px] flex flex-col justify-start items-start">
            <div className="justify-start text-gray-400 text-xs font-normal font-['Inter'] leading-4">Last 4 actions · auto-refreshes</div>
          </div>
        </div>
        <div className="flex justify-start items-center gap-1.5">
          <div className="relative">
            <svg width="7" height="7" viewBox="0 0 7 7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g opacity="0.516637">
                <path d="M0 3.5C0 1.567 1.567 0 3.5 0C5.433 0 7 1.567 7 3.5C7 5.433 5.433 7 3.5 7C1.567 7 0 5.433 0 3.5Z" fill="#22C55E"/>
              </g>
            </svg>
          </div>
          <div className="w-6 h-4 relative">
            <div className="left-0 top-[0.60px] absolute justify-start text-green-500 text-xs font-semibold font-['Inter'] leading-4">LIVE</div>
          </div>
        </div>
      </div>
      <div className="self-stretch flex-1 py-2 flex flex-col justify-start items-start overflow-hidden">
        {events.map((event, index) => (
          <div key={event.id} className="w-full min-h-16 px-5 py-3.5 border-b-[0.80px] border-gray-50 flex justify-start items-start gap-3.5">
            <div className="flex flex-col justify-start items-center">
              <div className="w-4 h-4 pt-[3px] flex flex-col justify-start items-start">
                <div className="relative">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g filter={`url(#filter_${event.id})`}>
                      <path d="M3 8C3 5.23858 5.23858 3 8 3C10.7614 3 13 5.23858 13 8C13 10.7614 10.7614 13 8 13C5.23858 13 3 10.7614 3 8Z" fill={event.iconColor}/>
                    </g>
                    <defs>
                      <filter id={`filter_${event.id}`} x="0" y="0" width="16" height="16" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                        <feMorphology radius="3" operator="dilate" in="SourceAlpha" result="effect1_dropShadow"/>
                        <feOffset/>
                        <feComposite in2="hardAlpha" operator="out"/>
                        <feColorMatrix type="matrix" values={`0 0 0 0 ${event.iconColor === '#22C55E' ? '0.862745' : event.iconColor === '#3B82F6' ? '0.858824' : '1'} 0 0 0 0 ${event.iconColor === '#22C55E' ? '0.988235' : event.iconColor === '#3B82F6' ? '0.917647' : '0.929412'} 0 0 0 0 ${event.iconColor === '#22C55E' ? '0.905882' : event.iconColor === '#3B82F6' ? '0.996078' : '0.835294'} 0 0 0 1 0`}/>
                        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
                        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
                      </filter>
                    </defs>
                  </svg>
                </div>
              </div>
              {index < events.length - 1 && (
                <div className="flex-1 pt-1.5 flex flex-col justify-start items-start">
                  <div className="relative">
                    <svg width="2" height="100%" viewBox="0 0 2 22" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                      <rect width="1.5" height="100%" fill="#F0F2F5"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-start items-start">
              <div className="self-stretch flex flex-col justify-start items-start">
                <div className="w-full max-w-sm justify-start text-gray-700 text-xs font-medium font-['Inter'] leading-5 break-words">
                  {event.text}
                </div>
              </div>
              <div className="w-full h-5 pt-[5px] flex justify-start items-center gap-1.5">
                <div className="relative">
                  <svg width="5" height="5" viewBox="0 0 5 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 2.5C0 1.11929 1.11929 0 2.5 0C3.88071 0 5 1.11929 5 2.5C5 3.88071 3.88071 5 2.5 5C1.11929 5 0 3.88071 0 2.5Z" fill={event.iconColor}/>
                  </svg>
                </div>
                <div className="w-16 h-4 relative">
                  <div className="left-0 top-[0.60px] absolute justify-start text-gray-400 text-xs font-medium font-['Inter'] leading-4">
                    {event.time}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="self-stretch h-16 relative bg-neutral-50 border-t-[0.80px] border-gray-100 flex items-center justify-center">
        <button className="w-[90%] max-w-sm h-9 bg-white rounded-lg outline outline-offset-[-0.80px] outline-gray-200 text-center text-gray-500 text-xs font-semibold font-['Inter'] hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer">
          View Full Audit Log →
        </button>
      </div>
    </div>
  );
}
