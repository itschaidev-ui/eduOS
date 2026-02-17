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
  // Default to Halfbody image which exists in the avatars folder
  // We crop toward the face via objectPosition in callers.
  src = '/companion/avatars/Halfbody.png',
  alt = 'Companion avatar',
  size = 32,
  className = '',
  objectPosition = 'center 15%'
}) => {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`bg-zinc-900 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
        title={alt}
      >
        <Bot size={Math.max(12, Math.floor(size * 0.5))} className="text-zinc-400" style={{ transform: 'rotate(90deg)' }} />
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      title={alt}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        style={{ objectPosition, transform: 'rotate(90deg)' }}
        onError={() => setErrored(true)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};

