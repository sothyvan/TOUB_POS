export default function QuickActions() {
  const actions = [
    {
      id: 1,
      text: 'Add New Stall Location',
      bgColor: 'bg-indigo-50',
      borderColor: 'outline-indigo-200',
      iconColor: '#003EC7',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.33337 8H12.6667" stroke="#003EC7" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 3.33325V12.6666" stroke="#003EC7" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 2,
      text: 'Register New Employee User',
      bgColor: 'bg-green-100',
      borderColor: 'outline-green-200',
      iconColor: '#15803D',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_143_3018)">
            <path d="M10.6666 14V12.6667C10.6666 11.9594 10.3857 11.2811 9.8856 10.781C9.3855 10.281 8.70722 10 7.99998 10H3.99998C3.29274 10 2.61446 10.281 2.11436 10.781C1.61426 11.2811 1.33331 11.9594 1.33331 12.6667V14" stroke="#15803D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5.99998 7.33333C7.47274 7.33333 8.66665 6.13943 8.66665 4.66667C8.66665 3.19391 7.47274 2 5.99998 2C4.52722 2 3.33331 3.19391 3.33331 4.66667C3.33331 6.13943 4.52722 7.33333 5.99998 7.33333Z" stroke="#15803D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12.6667 5.33325V9.33325" stroke="#15803D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14.6667 7.33325H10.6667" stroke="#15803D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
          <defs>
            <clipPath id="clip0_143_3018">
              <rect width="16" height="16" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      )
    },
    {
      id: 3,
      text: 'Global POS Configurations',
      bgColor: 'bg-amber-100',
      borderColor: 'outline-amber-200',
      iconColor: '#B45309',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_143_3031)">
            <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="#B45309" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.14667 1.33325H7.85333C7.49971 1.33325 7.16057 1.47373 6.91053 1.72378C6.66048 1.97382 6.52 2.31296 6.52 2.66659V2.78659C6.51976 3.0204 6.45804 3.25005 6.34103 3.45248C6.22401 3.65491 6.05583 3.82301 5.85333 3.93992L5.56667 4.10659C5.36398 4.22361 5.13405 4.28522 4.9 4.28522C4.66595 4.28522 4.43603 4.22361 4.23333 4.10659L4.13333 4.05325C3.82738 3.87676 3.46389 3.82888 3.12267 3.92012C2.78145 4.01137 2.49037 4.23428 2.31333 4.53992L2.16667 4.79325C1.99018 5.09921 1.9423 5.46269 2.03354 5.80392C2.12478 6.14514 2.34769 6.43622 2.65333 6.61325L2.75333 6.67992C2.95485 6.79626 3.12241 6.96331 3.23937 7.16447C3.35632 7.36563 3.4186 7.5939 3.42 7.82659V8.16659C3.42093 8.40153 3.35977 8.63255 3.2427 8.83626C3.12563 9.03996 2.95681 9.20911 2.75333 9.32659L2.65333 9.38659C2.34769 9.56362 2.12478 9.8547 2.03354 10.1959C1.9423 10.5371 1.99018 10.9006 2.16667 11.2066L2.31333 11.4599C2.49037 11.7656 2.78145 11.9885 3.12267 12.0797C3.46389 12.171 3.82738 12.1231 4.13333 11.9466L4.23333 11.8933C4.43603 11.7762 4.66595 11.7146 4.9 11.7146C5.13405 11.7146 5.36398 11.7762 5.56667 11.8933L5.85333 12.0599C6.05583 12.1768 6.22401 12.3449 6.34103 12.5474C6.45804 12.7498 6.51976 12.9794 6.52 13.2133V13.3333C6.52 13.6869 6.66048 14.026 6.91053 14.2761C7.16057 14.5261 7.49971 14.6666 7.85333 14.6666H8.14667C8.50029 14.6666 8.83943 14.5261 9.08948 14.2761C9.33953 14.026 9.48 13.6869 9.48 13.3333V13.2133C9.48024 12.9794 9.54196 12.7498 9.65898 12.5474C9.77599 12.3449 9.94418 12.1768 10.1467 12.0599L10.4333 11.8933C10.636 11.7762 10.866 11.7146 11.1 11.7146C11.3341 11.7146 11.564 11.7762 11.7667 11.8933L11.8667 11.9466C12.1726 12.1231 12.5361 12.171 12.8773 12.0797C13.2186 11.9885 13.5096 11.7656 13.6867 11.4599L13.8333 11.1999C14.0098 10.894 14.0577 10.5305 13.9665 10.1893C13.8752 9.84803 13.6523 9.55695 13.3467 9.37992L13.2467 9.32659C13.0432 9.20911 12.8744 9.03996 12.7573 8.83626C12.6402 8.63255 12.5791 8.40153 12.58 8.16659V7.83325C12.5791 7.59831 12.6402 7.36728 12.7573 7.16358C12.8744 6.95988 13.0432 6.79072 13.2467 6.67325L13.3467 6.61325C13.6523 6.43622 13.8752 6.14514 13.9665 5.80392C14.0577 5.46269 14.0098 5.09921 13.8333 4.79325L13.6867 4.53992C13.5096 4.23428 13.2186 4.01137 12.8773 3.92012C12.5361 3.82888 12.1726 3.87676 11.8667 4.05325L11.7667 4.10659C11.564 4.22361 11.3341 4.28522 11.1 4.28522C10.866 4.28522 10.636 4.22361 10.4333 4.10659L10.1467 3.93992C9.94418 3.82301 9.77599 3.65491 9.65898 3.45248C9.54196 3.25005 9.48024 3.0204 9.48 2.78659V2.66659C9.48 2.31296 9.33953 1.97382 9.08948 1.72378C8.83943 1.47373 8.50029 1.33325 8.14667 1.33325Z" stroke="#B45309" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
          <defs>
            <clipPath id="clip0_143_3031">
              <rect width="16" height="16" fill="white"/>
            </clipPath>
          </defs>
        </svg>
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
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.91669 7H11.0834" stroke="#9CA3AF" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 2.91675L11.0833 7.00008L7 11.0834" stroke="#9CA3AF" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
