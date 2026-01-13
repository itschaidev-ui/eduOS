import React, { useRef, useState, useEffect } from 'react';
import { KnowledgeNode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Gift, Lock, Check, Zap, HelpCircle } from 'lucide-react';

interface Props {
  nodes: KnowledgeNode[];
  onNodeSelect: (nodeId: string) => void;
  activeNodeId: string | null;
  onNodeMove: (id: string, x: number, y: number) => void;
}

const ConstellationMap: React.FC<Props> = ({ nodes, onNodeSelect, activeNodeId, onNodeMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction State
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  // Calculations State
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  // --- Handlers ---

  const handleContainerPointerDown = (e: React.PointerEvent) => {
      // Only trigger pan if we are clicking directly on the background (container)
      if (draggingId) return;

      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handleNodePointerDown = (e: React.PointerEvent, node: KnowledgeNode) => {
      e.stopPropagation(); // Don't trigger pan
      e.preventDefault();
      
      setDraggingId(node.id);
      setHasMoved(false); // Reset move tracking for click detection

      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mouseRelX = e.clientX - rect.left;
          const mouseRelY = e.clientY - rect.top;
          
          // Calculate where we grabbed the node relative to its visual center
          // Visual Position = NodeWorldPos + ViewOffset
          const visualX = node.x + viewOffset.x;
          const visualY = node.y + viewOffset.y;

          setDragOffset({
              x: mouseRelX - visualX,
              y: mouseRelY - visualY
          });
      }
      
      (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();

      if (draggingId) {
          setHasMoved(true);
          const rect = containerRef.current.getBoundingClientRect();
          const mouseRelX = e.clientX - rect.left;
          const mouseRelY = e.clientY - rect.top;

          // Inverse the ViewOffset to find new World Position
          // Visual = mouse - dragOffset
          // World = Visual - ViewOffset
          const newWorldX = (mouseRelX - dragOffset.x) - viewOffset.x;
          const newWorldY = (mouseRelY - dragOffset.y) - viewOffset.y;

          onNodeMove(draggingId, newWorldX, newWorldY);
      } 
      else if (isPanning) {
          const dx = e.clientX - lastPanPoint.x;
          const dy = e.clientY - lastPanPoint.y;
          
          setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          setLastPanPoint({ x: e.clientX, y: e.clientY });
      }
  };

  const handleContainerPointerUp = (e: React.PointerEvent) => {
      if (isPanning) {
          setIsPanning(false);
          (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      }
  };

  const handleNodePointerUp = (e: React.PointerEvent, node: KnowledgeNode) => {
      if (draggingId === node.id) {
          setDraggingId(null);
          (e.target as Element).releasePointerCapture(e.pointerId);
          
          // Click detection
          if (!hasMoved && node.status !== 'locked') {
              onNodeSelect(node.id);
          }
      }
  };

  // --- Render Helpers ---

  const renderConnections = () => {
    const lines: React.ReactElement[] = [];
    nodes.forEach(node => {
      node.connections.forEach(targetId => {
        const target = nodes.find(n => n.id === targetId);
        if (target) {
          const key = `${node.id}-${target.id}`;
          const isMasteredConnection = node.status === 'mastered' && target.status === 'mastered';
          
          lines.push(
            <motion.line
              key={key}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: isMasteredConnection ? 0.6 : 0.2 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              x1={node.x + viewOffset.x}
              y1={node.y + viewOffset.y}
              x2={target.x + viewOffset.x}
              y2={target.y + viewOffset.y}
              stroke={isMasteredConnection ? "#22d3ee" : "#52525b"}
              strokeWidth={isMasteredConnection ? "2" : "1"}
              strokeDasharray={isMasteredConnection ? "none" : "4 4"}
            />
          );
        }
      });
    });
    return lines;
  };

  return (
    <div 
        ref={containerRef}
        className={`relative w-full h-full bg-black overflow-hidden rounded-3xl border border-zinc-900 shadow-2xl touch-none 
            ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}
        `}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handleContainerPointerUp}
    >
      {/* Dynamic Void Background */}
      <div className="absolute inset-0 pointer-events-none">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black"></div>
           <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-[0.03]" 
                style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    transform: `translate(${viewOffset.x * 0.1}px, ${viewOffset.y * 0.1}px)`
                }}>
           </div>
           
           {/* Grid with parallax */}
           <div className="absolute inset-0 opacity-10" 
               style={{
                 backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', 
                 backgroundSize: '100px 100px',
                 backgroundPosition: `${viewOffset.x}px ${viewOffset.y}px`
               }}>
           </div>
      </div>
      
      {/* Reset button if lost */}
      {(viewOffset.x !== 0 || viewOffset.y !== 0) && (
          <button 
            onClick={(e) => { e.stopPropagation(); setViewOffset({x:0, y:0}); }}
            className="absolute bottom-6 right-6 bg-zinc-900/80 backdrop-blur text-zinc-400 hover:text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest z-50 border border-zinc-800 transition-all hover:bg-zinc-800"
          >
            Recenter View
          </button>
      )}

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {renderConnections()}
      </svg>

      <AnimatePresence>
      {nodes.map((node) => {
        const isActive = activeNodeId === node.id;
        const isMastered = node.status === 'mastered';
        const isLocked = node.status === 'locked';
        const isDragging = draggingId === node.id;
        
        // Adventure Types
        const isChaos = node.type === 'chaos';
        const isTreasure = node.type === 'treasure';
        const isMystery = node.type === 'mystery';
        
        // Calculate Visual Position
        const visualX = node.x + viewOffset.x;
        const visualY = node.y + viewOffset.y;

        return (
          <motion.div
            key={node.id}
            initial={{ scale: 0, opacity: 0 }} 
            animate={{ 
                scale: isDragging ? 1.1 : 1, 
                opacity: 1,
                zIndex: isDragging ? 50 : isActive ? 40 : 10
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`absolute flex flex-col items-center justify-center cursor-pointer group`}
            style={{ left: visualX, top: visualY, x: "-50%", y: "-50%" }}
            onPointerDown={(e) => handleNodePointerDown(e, node)}
            onPointerUp={(e) => handleNodePointerUp(e, node)}
          >
            {/* Glow Effect for Active/Mastered */}
            {(isActive || isMastered) && (
                <div className={`absolute inset-0 rounded-full blur-xl opacity-40 transition-all duration-500 ${isActive ? 'bg-cyan-500 scale-150' : 'bg-emerald-500 scale-125'}`}></div>
            )}

            <div 
              className={`
                relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                ${isDragging ? 'scale-110' : ''}
                ${isActive ? 'bg-black border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]' : 
                  isChaos ? 'bg-black border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 
                  isTreasure ? 'bg-black border-2 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 
                  isMystery ? 'bg-black border-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]' :
                  isMastered ? 'bg-black border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 
                  'bg-zinc-900 border border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'}
              `}
            >
              {isChaos ? (
                 <Skull size={24} className="text-red-500 animate-pulse" />
              ) : isTreasure ? (
                 <Gift size={24} className="text-yellow-500 animate-bounce" />
              ) : isMystery ? (
                 <HelpCircle size={24} className="text-purple-500 animate-pulse" />
              ) : isLocked ? (
                 <Lock size={20} className="text-zinc-600" />
              ) : isMastered ? (
                <Check size={24} className="text-emerald-500" strokeWidth={3} />
              ) : isActive ? (
                <Zap size={24} className="text-cyan-400 fill-cyan-400/20" />
              ) : (
                <div className="w-2 h-2 bg-zinc-600 rounded-full group-hover:scale-150 transition-transform" />
              )}
            </div>
            
            <motion.div 
                className={`mt-4 px-3 py-1.5 rounded-lg backdrop-blur-md border pointer-events-none select-none whitespace-nowrap transition-all duration-300
                  ${isActive ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200' : 
                    isChaos ? 'bg-red-950/50 border-red-500/50 text-red-200' : 
                    isTreasure ? 'bg-yellow-950/50 border-yellow-500/50 text-yellow-200' :
                    isMystery ? 'bg-purple-950/50 border-purple-500/50 text-purple-200' :
                    isMastered ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200' :
                    'bg-black/50 border-zinc-800 text-zinc-500 group-hover:text-zinc-300 group-hover:border-zinc-600'}
                `}
                animate={{ y: isActive ? [0, -5, 0] : 0 }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">{node.label}</span>
            </motion.div>
          </motion.div>
        );

      })}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(ConstellationMap);
