export default function InstagramHeader() {
  return (
    <header className="w-full h-[44px] bg-instagram-bg border-b border-instagram-border flex items-center justify-between px-3">
      <div className="flex items-center">
        <svg
          width="103"
          height="29"
          viewBox="0 0 103 29"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white"
        >
          <text
            x="0"
            y="22"
            fill="currentColor"
            fontSize="24"
            fontFamily="'Brush Script MT', cursive"
            fontStyle="italic"
          >
            Instagram
          </text>
        </svg>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
