export function NeuraLogo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="neura-grad" x1="0" y1="0" x2="32" y2="32">
              <stop offset="0%" stopColor="#59a3ff" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <path
            d="M16 2L4 9v14l12 7 12-7V9L16 2z"
            stroke="url(#neura-grad)"
            strokeWidth="1.5"
            opacity="0.3"
          />
          <circle cx="16" cy="16" r="6" fill="url(#neura-grad)" />
          <circle cx="16" cy="16" r="9" stroke="url(#neura-grad)" strokeWidth="1" opacity="0.4" />
          <circle cx="16" cy="16" r="12" stroke="url(#neura-grad)" strokeWidth="0.5" opacity="0.2" />
          <circle cx="8" cy="11" r="1.5" fill="#3b82f6" opacity="0.7" />
          <circle cx="24" cy="11" r="1.5" fill="#06b6d4" opacity="0.7" />
          <circle cx="8" cy="21" r="1.5" fill="#06b6d4" opacity="0.5" />
          <circle cx="24" cy="21" r="1.5" fill="#3b82f6" opacity="0.5" />
          <line x1="8" y1="11" x2="16" y2="16" stroke="url(#neura-grad)" strokeWidth="0.5" opacity="0.4" />
          <line x1="24" y1="11" x2="16" y2="16" stroke="url(#neura-grad)" strokeWidth="0.5" opacity="0.4" />
          <line x1="8" y1="21" x2="16" y2="16" stroke="url(#neura-grad)" strokeWidth="0.5" opacity="0.3" />
          <line x1="24" y1="21" x2="16" y2="16" stroke="url(#neura-grad)" strokeWidth="0.5" opacity="0.3" />
        </svg>
      </div>
      <span className="font-semibold text-white tracking-tight" style={{ fontSize: size * 0.6 }}>
        Neura
      </span>
    </div>
  );
}
