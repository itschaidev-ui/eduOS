import React, { useState } from 'react';
import { Bot } from 'lucide-react';

type Props = {
  /** Public URL, e.g. "/companion/avatars/halfbodynobg.png" */
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
  objectPosition?: string;
};

export const CompanionAvatar: React.FC<Props> = ({
  src = '/companion/avatars/halfbodynobg.png',
  alt = 'Companion avatar',
  size = 32,
  className = '',
  objectPosition = 'center 15%'
}) => {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
        title={alt}
      >
        <Bot size={Math.max(12, Math.floor(size * 0.5))} className="text-zinc-400" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-white/10 bg-black/40 ${className}`}
      style={{ width: size, height: size }}
      title={alt}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        style={{ objectPosition }}
        onError={() => setErrored(true)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};

