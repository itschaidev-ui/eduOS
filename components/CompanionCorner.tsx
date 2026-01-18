import React, { useMemo, useState } from 'react';
import { X, MessageSquare } from 'lucide-react';

type Props = {
  onOpenChat: () => void;
  sidebarOpen: boolean;
};

export const CompanionCorner: React.FC<Props> = ({ onOpenChat, sidebarOpen }) => {
  const [hidden, setHidden] = useState<boolean>(() => localStorage.getItem('eduos:companionHidden') === 'true');
  const name = useMemo(() => localStorage.getItem('eduos:companionName') || 'Nova', []);

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none" style={{ pointerEvents: 'none' }}>
      <div
        className={`relative transition-all duration-300 ${sidebarOpen ? 'opacity-30 translate-x-2' : 'opacity-100'}`}
        style={{ pointerEvents: 'auto' }}
      >
        <button
          onClick={() => {
            localStorage.setItem('eduos:companionHidden', 'true');
            setHidden(true);
          }}
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/70 border border-white/10 text-zinc-300 hover:text-white hover:bg-black flex items-center justify-center transition-colors"
          title="Hide companion"
        >
          <X size={14} />
        </button>

        <div className="absolute right-28 bottom-20 hidden md:block">
          <button
            onClick={onOpenChat}
            className="group px-3 py-2 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl text-xs font-mono text-zinc-300 hover:text-white hover:border-cyan-500/30 transition-all shadow-lg"
            title="Open Mentor Core"
          >
            <span className="text-zinc-500">{name}:</span> open chat
            <span className="inline-flex items-center ml-2 text-cyan-400/80 group-hover:text-cyan-300 transition-colors">
              <MessageSquare size={14} />
            </span>
          </button>
        </div>

        <button
          onClick={onOpenChat}
          className="relative w-[108px] h-[220px] md:w-[128px] md:h-[260px] rounded-3xl bg-black/20 border border-white/10 backdrop-blur-sm hover:border-cyan-500/30 transition-all shadow-2xl overflow-hidden"
          title="Open Mentor Core"
        >
          <img src="/companion/avatars/FullBodyNoBgUpscaled.png" alt="Companion" className="w-full h-full object-contain" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
};

