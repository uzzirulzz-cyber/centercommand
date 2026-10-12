import { useId } from 'react';

export default function PlayBeatOrbitMark({ size = 'nav', className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <span
      className={`pb-orbit-mark pb-orbit-mark-${size} ${className}`.trim()}
      role="img"
      aria-label="PlayBeat Digital"
    >
      <span className="pb-orbit-mark-image" aria-hidden="true" />
      <span className="pb-orbit-word-glow" aria-hidden="true" />
      <span className="pb-orbit-p-glow" aria-hidden="true" />
      <svg className="pb-orbit-trail" viewBox="0 0 1254 1254" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-gradient`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1254" y2="0">
            <stop offset="0%" stopColor="#bfe9ff" stopOpacity="0" />
            <stop offset="85%" stopColor="#bfe9ff" stopOpacity=".9" />
            <stop offset="100%" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g className="pb-orbit-traveler" filter={`url(#${id}-glow)`}>
          <circle cx="627" cy="627" r="602" fill="none" stroke={`url(#${id}-gradient)`}
            strokeWidth="10" strokeLinecap="round" strokeDasharray="220 3600" />
        </g>
      </svg>
    </span>
  );
}
