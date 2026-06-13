export default function RevenueChart() {
  return (
    <div className="flex-1 w-[770.04px] max-w-full min-h-96 bg-white rounded-2xl shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)] outline outline-[0.80px] outline-offset-[-0.80px] outline-gray-200 flex flex-col justify-start items-start overflow-hidden">
      <div className="self-stretch px-5 py-4 border-b-[0.80px] border-gray-100 flex justify-between items-center">
        <div className="w-72 flex flex-col justify-start items-start">
          <div className="self-stretch flex flex-col justify-start items-start">
            <div className="justify-start text-gray-900 text-base font-bold font-['Inter'] leading-6">Hourly Revenue Breakdown</div>
          </div>
          <div className="w-72 h-5 pt-[3px] flex flex-col justify-start items-start">
            <div className="justify-start text-gray-400 text-xs font-normal font-['Inter'] leading-4">Peaks at 8AM · 12PM · 6PM — Total $1,240.00 today</div>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-white rounded-lg outline outline-[0.80px] outline-offset-[-0.80px] outline-gray-200 flex justify-start items-center gap-1.5">
          <div className="text-center justify-start text-gray-700 text-xs font-semibold font-['Inter'] leading-5">Today</div>
          <div className="relative">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.25 4.875L6.5 8.125L9.75 4.875" stroke="#6B7280" strokeWidth="1.08333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      <div className="w-full flex-1 px-4 pt-5 pb-3 flex flex-col justify-start items-start overflow-x-auto">
        <div className="w-[736px] h-52 flex flex-col justify-start items-start">
          <div className="self-stretch h-52 relative overflow-hidden">
            <div className="left-[42px] top-[180px] absolute">
              <svg width="686" height="1" viewBox="0 0 686 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0.5H686" stroke="#F0F2F5" strokeDasharray="3 3"/>
              </svg>
            </div>
            <div className="left-[42px] top-[136px] absolute">
              <svg width="686" height="1" viewBox="0 0 686 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0.5H686" stroke="#F0F2F5" strokeDasharray="3 3"/>
              </svg>
            </div>
            <div className="left-[42px] top-[92px] absolute">
              <svg width="686" height="1" viewBox="0 0 686 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0.5H686" stroke="#F0F2F5" strokeDasharray="3 3"/>
              </svg>
            </div>
            <div className="left-[42px] top-[48px] absolute">
              <svg width="686" height="1" viewBox="0 0 686 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0.5H686" stroke="#F0F2F5" strokeDasharray="3 3"/>
              </svg>
            </div>
            <div className="left-[42px] top-[4px] absolute">
              <svg width="686" height="1" viewBox="0 0 686 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0.5H686" stroke="#F0F2F5" strokeDasharray="3 3"/>
              </svg>
            </div>
            <div className="left-[29.50px] top-[184.81px] absolute text-center justify-start text-gray-400 text-xs font-normal font-['Inter']">6AM</div>
            <div className="left-[144.33px] top-[184.81px] absolute text-center justify-start text-gray-400 text-xs font-normal font-['Inter']">8AM</div>
            <div className="left-[255.67px] top-[184.81px] absolute text-center justify-start text-gray-400 text-xs font-normal font-['Inter']">10AM</div>
            <div className="left-[370.50px] top-[184.81px] absolute text-center justify-start text-gray-400 text-xs font-normal font-['Inter']">12PM</div>
            <div className="left-[487.33px] top-[184.81px] absolute text-center justify-start text-gray-400 text-xs font-normal font-['Inter']">2PM</div>
            <div className="left-[601.67px] top-[184.81px] absolute text-center justify-start text-gray-400 text-xs font-normal font-['Inter']">4PM</div>
            <div className="left-[716px] top-[184.81px] absolute text-center justify-start text-gray-400 text-xs font-normal font-['Inter']">6PM</div>
            <div className="left-[20px] top-[172.91px] absolute text-right justify-start text-gray-400 text-xs font-normal font-['Inter']">$0</div>
            <div className="left-[13px] top-[128.91px] absolute text-right justify-start text-gray-400 text-xs font-normal font-['Inter']">$50</div>
            <div className="left-[8px] top-[84.91px] absolute text-right justify-start text-gray-400 text-xs font-normal font-['Inter']">$100</div>
            <div className="left-[8px] top-[40.91px] absolute text-right justify-start text-gray-400 text-xs font-normal font-['Inter']">$150</div>
            <div className="left-[6px] top-[1.16px] absolute text-right justify-start text-gray-400 text-xs font-normal font-['Inter']">$200</div>
            <div className="left-[42px] top-[19.84px] absolute">
              <svg width="686" height="161" viewBox="0 0 686 161" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 129.36C19.056 125.4 38.111 121.44 57.167 105.6C76.222 89.76 95.278 29.92 114.333 29.92C133.389 29.92 152.444 70.547 171.5 82.72C190.556 94.893 209.611 102.96 228.667 102.96C247.722 102.96 266.778 93.72 285.833 76.56C304.889 59.4 323.944 0 343 0C362.056 0 381.111 34.907 400.167 50.16C419.222 65.413 438.278 81.987 457.333 91.52C476.389 101.053 495.444 107.36 514.5 107.36C533.556 107.36 552.611 95.04 571.667 88C590.722 80.96 609.778 67.467 628.833 65.12C647.889 62.773 666.944 62.187 686 61.6V160.16C666.944 160.16 647.889 160.16 628.833 160.16C609.778 160.16 590.722 160.16 571.667 160.16C552.611 160.16 533.556 160.16 514.5 160.16C495.444 160.16 476.389 160.16 457.333 160.16C438.278 160.16 419.222 160.16 400.167 160.16C381.111 160.16 362.056 160.16 343 160.16C323.944 160.16 304.889 160.16 285.833 160.16C266.778 160.16 247.722 160.16 228.667 160.16C209.611 160.16 190.556 160.16 171.5 160.16C152.444 160.16 133.389 160.16 114.333 160.16C95.278 160.16 76.222 160.16 57.167 160.16C38.111 160.16 19.056 160.16 0 160.16V129.36Z" fill="url(#paint0_linear)" fillOpacity="0.6"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="0" y1="0" x2="0" y2="160.16" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4F46E5" stopOpacity="0.22"/>
                    <stop offset="0.9" stopColor="#4F46E5" stopOpacity="0.01"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="left-[42px] top-[19.84px] absolute">
              <svg width="686" height="132" viewBox="0 0 686 132" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 130.61C19.056 126.65 38.111 122.69 57.167 106.85C76.222 91.01 95.278 31.17 114.333 31.17C133.389 31.17 152.444 71.797 171.5 83.97C190.556 96.143 209.611 104.21 228.667 104.21C247.722 104.21 266.778 94.97 285.833 77.81C304.889 60.65 323.944 1.25 343 1.25C362.056 1.25 381.111 36.157 400.167 51.41C419.222 66.663 438.278 83.237 457.333 92.77C476.389 102.303 495.444 108.61 514.5 108.61C533.556 108.61 552.611 96.29 571.667 89.25C590.722 82.21 609.778 68.717 628.833 66.37C647.889 64.023 666.944 63.437 686 62.85" stroke="#003EC7" strokeWidth="2.5"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full px-5 py-3 bg-neutral-50 border-t-[0.80px] border-gray-100 flex justify-start items-start gap-5">
        <div className="flex-1 flex justify-start items-center gap-2.5">
          <div className="relative">
            <svg width="3" height="28" viewBox="0 0 3 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 1.5C0 0.671572 0.671573 0 1.5 0C2.32843 0 3 0.671573 3 1.5V26.5C3 27.3284 2.32843 28 1.5 28C0.671573 28 0 27.3284 0 26.5V1.5Z" fill="#003EC7"/>
            </svg>
          </div>
          <div className="w-32 flex flex-col justify-start items-start">
            <div className="justify-start text-gray-400 text-xs font-medium font-['Inter'] leading-4">Morning Peak · 8:00 AM</div>
            <div className="justify-start text-blue-700 text-sm font-bold font-['Inter'] leading-5">$148</div>
          </div>
        </div>
        <div className="flex-1 flex justify-start items-center gap-2.5">
          <div className="relative">
            <svg width="3" height="28" viewBox="0 0 3 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 1.5C0 0.671572 0.671573 0 1.5 0C2.32843 0 3 0.671573 3 1.5V26.5C3 27.3284 2.32843 28 1.5 28C0.671573 28 0 27.3284 0 26.5V1.5Z" fill="#003EC7"/>
            </svg>
          </div>
          <div className="w-28 flex flex-col justify-start items-start">
            <div className="justify-start text-gray-400 text-xs font-medium font-['Inter'] leading-4">Lunch Peak · 12:00 PM</div>
            <div className="justify-start text-blue-700 text-sm font-bold font-['Inter'] leading-5">$182</div>
          </div>
        </div>
        <div className="flex-1 flex justify-start items-center gap-2.5">
          <div className="relative">
            <svg width="3" height="28" viewBox="0 0 3 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 1.5C0 0.671572 0.671573 0 1.5 0C2.32843 0 3 0.671573 3 1.5V26.5C3 27.3284 2.32843 28 1.5 28C0.671573 28 0 27.3284 0 26.5V1.5Z" fill="#003EC7"/>
            </svg>
          </div>
          <div className="w-32 flex flex-col justify-start items-start">
            <div className="justify-start text-gray-400 text-xs font-medium font-['Inter'] leading-4">Evening Peak · 6:00 PM</div>
            <div className="justify-start text-blue-700 text-sm font-bold font-['Inter'] leading-5">$112</div>
          </div>
        </div>
      </div>
    </div>
  );
}
