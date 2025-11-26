export default function DeepGramLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white"
      >
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 12L20 12M12 16L20 16M12 20L20 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="3" fill="url(#logo-gradient)" />
        <defs>
          <linearGradient id="logo-gradient" x1="13" y1="13" x2="19" y2="19">
            <stop offset="0%" stopColor="#f56040" />
            <stop offset="100%" stopColor="#fcaf45" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="text-white font-bold text-xl">Deep</span>
        <span className="instagram-gradient-text font-bold text-xl">Gram</span>
      </div>
    </div>
  );
}
