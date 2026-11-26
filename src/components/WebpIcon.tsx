import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface WebpIconProps {
  src: string;
  alt: string;
  className?: string;
}

export function WebpIcon({ src, alt, className = 'w-full h-full' }: WebpIconProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center bg-[#14171E] text-slate-400 select-none`}
        role="img"
        aria-label={alt}
      >
        <Shield className="w-6 h-6 opacity-70" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasError(true)}
      className={`${className} object-cover block`}
    />
  );
}
