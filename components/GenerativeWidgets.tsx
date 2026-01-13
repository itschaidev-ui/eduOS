import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Play, RotateCcw, Terminal, HelpCircle, Eye, Lightbulb, Code2, Check, X, ArrowDown, ArrowUp, GitBranch, Shuffle, Sliders, PenTool, Brain, Sparkles, MessageSquare, MousePointer2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WidgetProps {
  type: string;
  config: any;
  onComplete?: (xp: number) => void;
}

const GenerativeWidget: React.FC<WidgetProps> = ({ type, config, onComplete }) => {
  const safeConfig = config || {};

  // --- STATE MANAGEMENT ---
  const [code, setCode] = useState(safeConfig.initialCode || "// No code provided");
  const [output, setOutput] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'incorrect' | null>(null);
  const [sortItems, setSortItems] = useState<any[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Socratic Duel State
  const [duelMessages, setDuelMessages] = useState<{role: 'bot' | 'user', text: string}[]>(
      safeConfig.initialStatement ? [{ role: 'bot', text: safeConfig.initialStatement }] : []
  );
  const [duelInput, setDuelInput] = useState('');
  const [duelWon, setDuelWon] = useState(false);

  // Design Canvas State
  const [canvasNodes, setCanvasNodes] = useState<{id: string, x: number, y: number, label: string}[]>([]);
  const [canvasConnections, setCanvasConnections] = useState<[string, string][]>([]);
  const [draggedNode, setDraggingNode] = useState<string | null>(null);

  // Initialize sort items shuffled
  useEffect(() => {
    if (type === 'speed-run' && safeConfig.items) {
        setSortItems([...safeConfig.items].sort(() => Math.random() - 0.5));
    }
  }, [type, safeConfig.items]);

  // Code Fixer Logic (The Debugger)
  const handleRunCodeFixer = () => {
      setOutput([]);
      const logs: string[] = [];
      const mockConsole = {
          log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
          error: (...args: any[]) => logs.push('Error: ' + args.map(a => String(a)).join(' ')),
      };
      
      try {
          const run = new Function('console', code);
          run(mockConsole);
          
          // Simple validation: check if code matches solution or produces expected output (simulated)
          const isCorrect = safeConfig.solution && code.replace(/\s/g, '').includes(safeConfig.solution.replace(/\s/g, ''));
          
          if (isCorrect || (safeConfig.expectedOutput && logs.join('').includes(safeConfig.expectedOutput))) {
              logs.push("✅ SUCCESS: Logic repaired.");
          } else {
              logs.push("⚠️ SYSTEM: Output technically valid, but logic still flawed based on specs.");
          }
      } catch (e: any) {
          logs.push(`Runtime Error: ${e.message}`);
      }
      setOutput(logs);
  };

  // Socratic Duel Logic (The Skeptic)
  const handleDuelSubmit = () => {
      if (!duelInput.trim()) return;
      
      const newMessages = [...duelMessages, { role: 'user' as const, text: duelInput }];
      setDuelMessages(newMessages);
      setDuelInput('');

      // Simple keyword simulation for "winning" the argument
      // In a real app, this would call an LLM to evaluate the argument
      setTimeout(() => {
          if (safeConfig.winningKeywords && safeConfig.winningKeywords.some((k: string) => duelInput.toLowerCase().includes(k.toLowerCase()))) {
              setDuelMessages(prev => [...prev, { role: 'bot', text: "Hmm. That is a valid point. I concede this argument." }]);
              setDuelWon(true);
          } else {
              const rebuttals = [
                  "I remain unconvinced. Elaborate.",
                  "But does that account for edge cases?",
                  "That sounds like an assumption, not a fact.",
                  "Prove it with a concrete example."
              ];
              const randomRebuttal = rebuttals[Math.floor(Math.random() * rebuttals.length)];
              setDuelMessages(prev => [...prev, { role: 'bot', text: randomRebuttal }]);
          }
      }, 1000);
  };

  // Design Canvas Logic (The Architect)
  useEffect(() => {
      if (type === 'design-canvas' && safeConfig.nodes) {
          // Initialize nodes in a grid or circle
          const newNodes = safeConfig.nodes.map((label: string, i: number) => ({
              id: `node-${i}`,
              label,
              x: 100 + (i % 3) * 150,
              y: 100 + Math.floor(i / 3) * 100
          }));
          setCanvasNodes(newNodes);
      }
  }, [type, safeConfig.nodes]);

  const handleCanvasDrag = (e: React.PointerEvent, id: string) => {
      setDraggingNode(id);
      e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCanvasMove = (e: React.PointerEvent) => {
      if (draggedNode) {
          const rect = e.currentTarget.getBoundingClientRect();
          setCanvasNodes(prev => prev.map(n => 
              n.id === draggedNode 
              ? { ...n, x: e.clientX - rect.left - 50, y: e.clientY - rect.top - 25 } 
              : n
          ));
      }
  };

  const handleCanvasUp = (e: React.PointerEvent) => {
      setDraggingNode(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const toggleConnection = (id1: string, id2: string) => {
      setCanvasConnections(prev => {
          const exists = prev.some(([a, b]) => (a === id1 && b === id2) || (a === id2 && b === id1));
          if (exists) return prev.filter(([a, b]) => !((a === id1 && b === id2) || (a === id2 && b === id1)));
          return [...prev, [id1, id2]];
      });
  };

  // --- RENDERERS ---

  // 1. THE DEBUGGER (Code Fixer)
  if (type === 'code-fixer') {
    return (
      <div className="w-full bg-zinc-950 rounded-2xl border border-red-900/30 my-8 overflow-hidden font-mono text-sm shadow-2xl relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="bg-zinc-900/50 px-6 py-3 border-b border-red-900/30 flex justify-between items-center backdrop-blur-sm">
            <div className="flex items-center gap-3 text-red-400">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-wider ml-2">CORRUPTED_LOGIC.js</span>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setCode(safeConfig.initialCode || "")} className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 rounded text-[10px] text-zinc-400 uppercase font-bold transition-all">
                    Reset
                </button>
                <button onClick={handleRunCodeFixer} className="px-4 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] uppercase font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                    <Play size={10} className="inline mr-1" /> Patch
                </button>
            </div>
        </div>
        <div className="flex flex-col md:flex-row h-96">
            <textarea 
                className="flex-1 bg-black text-zinc-300 p-6 focus:outline-none resize-none font-mono text-sm leading-relaxed border-r border-zinc-900" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
            />
            <div className="w-full md:w-1/3 bg-zinc-900/30 flex flex-col">
                <div className="px-4 py-2 border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-500">System Logs</div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
                    {output.length > 0 ? output.map((line, i) => (
                        <div key={i} className={`mb-2 ${line.includes('SUCCESS') ? 'text-emerald-400' : line.includes('Error') ? 'text-red-400' : 'text-zinc-400'}`}>
                            {line}
                        </div>
                    )) : (
                        <div className="text-zinc-700 italic">Waiting for patch...</div>
                    )}
                </div>
            </div>
        </div>
      </div>
    );
  }

  // 2. THE SKEPTIC (Socratic Duel)
  if (type === 'socratic-duel') {
      return (
          <div className="w-full my-10 bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col h-[500px]">
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                          <Brain size={20} className="text-zinc-400" />
                      </div>
                      <div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">The Skeptic</h4>
                          <div className="text-[10px] text-zinc-500 font-mono">STATUS: UNCONVINCED</div>
                      </div>
                  </div>
                  {duelWon && <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase rounded border border-emerald-500/20">Argument Won</div>}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {duelMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                              msg.role === 'user' 
                              ? 'bg-zinc-800 text-white rounded-tr-sm' 
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm'
                          }`}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
              </div>

              <div className="p-4 border-t border-zinc-800 bg-black">
                  <div className="relative">
                      <input 
                        type="text" 
                        value={duelInput}
                        onChange={(e) => setDuelInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleDuelSubmit()}
                        disabled={duelWon}
                        placeholder={duelWon ? "Debate concluded." : "Construct your argument..."}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-12 py-4 text-sm focus:outline-none focus:border-zinc-700 text-white placeholder-zinc-600 transition-all"
                      />
                      <button 
                        onClick={handleDuelSubmit}
                        disabled={!duelInput.trim() || duelWon}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-lg hover:bg-zinc-200 disabled:opacity-0 transition-all"
                      >
                          <ArrowUp size={16} />
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // 3. THE ARCHITECT (Design Canvas)
  if (type === 'design-canvas') {
      return (
          <div className="w-full h-[500px] bg-zinc-950 rounded-2xl border border-zinc-800 my-8 relative overflow-hidden select-none">
              <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur px-4 py-2 rounded-full border border-zinc-800">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <GitBranch size={12} /> System Architect
                  </h4>
              </div>
              
              <div 
                className="w-full h-full relative cursor-crosshair"
                onPointerMove={handleCanvasMove}
                onPointerUp={handleCanvasUp}
              >
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {canvasConnections.map(([id1, id2], i) => {
                          const n1 = canvasNodes.find(n => n.id === id1);
                          const n2 = canvasNodes.find(n => n.id === id2);
                          if (!n1 || !n2) return null;
                          return (
                              <line 
                                key={i}
                                x1={n1.x + 50} y1={n1.y + 25}
                                x2={n2.x + 50} y2={n2.y + 25}
                                stroke="#52525b" strokeWidth="2"
                              />
                          );
                      })}
                  </svg>

                  {canvasNodes.map(node => (
                      <div
                        key={node.id}
                        onPointerDown={(e) => handleCanvasDrag(e, node.id)}
                        className={`absolute w-[100px] h-[50px] bg-zinc-900 border border-zinc-700 rounded-lg flex items-center justify-center shadow-xl hover:border-white transition-colors z-20 ${draggedNode === node.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                        style={{ left: node.x, top: node.y }}
                      >
                          <span className="text-[10px] font-bold text-zinc-300 uppercase">{node.label}</span>
                          {/* Connection Points */}
                          <div 
                            className="absolute -right-1 w-2 h-2 bg-zinc-500 rounded-full cursor-pointer hover:scale-150 hover:bg-white transition-all"
                            onClick={(e) => { e.stopPropagation(); /* Logic to start connection */ }}
                          />
                      </div>
                  ))}
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-zinc-600 font-mono">
                  DRAG to move nodes • System will validate connectivity automatically
              </div>
          </div>
      );
  }

  // 4. THE DATA ANALYST (Interactive Chart)
  if (type === 'data-vis' || type === 'chart') {
    // Normalize data to ensure 'name' and 'value' keys exist
    const rawData = Array.isArray(safeConfig.data) ? safeConfig.data : [];

    const normalizedData = rawData.map((item: any) => {
        // Try to find a logical 'name' (string/label) and 'value' (number)
        const nameKey = Object.keys(item).find(k => ['name', 'label', 'x', 'month', 'year', 'category'].includes(k.toLowerCase())) || Object.keys(item)[0];
        const valueKey = Object.keys(item).find(k => ['value', 'amount', 'y', 'count', 'score', 'price'].includes(k.toLowerCase())) || Object.keys(item)[1];
        
        return {
            name: item.name || item[nameKey] || '?',
            value: Number(item.value || item[valueKey]) || 0
        };
    });

    return (
      <div className="w-full h-96 bg-black rounded-2xl p-6 border border-zinc-800 my-8 flex flex-col shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <h4 className="text-center text-xs font-mono text-cyan-400 mb-6 uppercase tracking-widest flex-none border-b border-zinc-800 pb-4">{safeConfig.title || "Data Interpretation"}</h4>
        
        {normalizedData.length > 0 ? (
            <div className="flex-1 min-h-0 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={normalizedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#e4e4e7', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#22d3ee' }}
                    cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={{ r: 4, fill: '#000', stroke: '#22d3ee', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#22d3ee' }} />
                </LineChart>
            </ResponsiveContainer>
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs">
                NO_DATA_STREAM
            </div>
        )}
      </div>
    );
  }

  // 5. THE SPEED RUN (Rapid Sorting)
  if (type === 'speed-run') {
      return (
          <div className="w-full my-10 bg-zinc-950 border border-yellow-500/20 rounded-3xl relative overflow-hidden flex flex-col h-[500px]">
              {/* Background Effects */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.05),transparent_70%)] pointer-events-none"></div>
              
              {!gameStarted ? (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-8 text-center animate-in fade-in">
                      <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6 border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                          <Zap size={32} className="text-yellow-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{safeConfig.title || "Neural Reflex Test"}</h3>
                      <p className="text-zinc-400 max-w-md mb-8 leading-relaxed">
                          {safeConfig.description || "Sort the incoming data streams into their correct categories. Speed and accuracy are required for system synchronization."}
                      </p>
                      
                      <div className="flex gap-4 mb-8 text-xs font-mono text-zinc-500">
                          <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-zinc-700"></span>
                              {sortItems.length} ITEMS
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-zinc-700"></span>
                              45 SECONDS
                          </div>
                      </div>

                      <button 
                        onClick={() => setGameStarted(true)}
                        className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-105 flex items-center gap-2"
                      >
                          <Play size={14} fill="currentColor" /> Initialize Sequence
                      </button>
                  </div>
              ) : (
                  <>
                    <div className="flex justify-between items-center p-6 border-b border-yellow-500/10 bg-yellow-950/5 relative z-10">
                        <h4 className="text-yellow-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                            <Zap size={14} /> Speed Run
                        </h4>
                        <div className="text-yellow-500 font-mono text-xl font-bold animate-pulse">
                            {sortItems.length === 0 ? "COMPLETE" : "00:45"}
                        </div>
                    </div>
                    
                    <div className="flex-1 relative">
                        {/* Drop Zones */}
                        <div className="absolute inset-0 grid grid-cols-2 gap-4 p-4 pointer-events-none">
                            <div className="border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center bg-black/20 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-yellow-500/0 group-hover:bg-yellow-500/5 transition-colors"></div>
                                <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest z-10">{safeConfig.categories?.[0] || "Category A"}</span>
                            </div>
                            <div className="border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center bg-black/20 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-yellow-500/0 group-hover:bg-yellow-500/5 transition-colors"></div>
                                <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest z-10">{safeConfig.categories?.[1] || "Category B"}</span>
                            </div>
                        </div>

                        {/* Draggable Items */}
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                            <AnimatePresence>
                                {sortItems.length > 0 ? (
                                    sortItems.map((item, i) => (
                                        <motion.div 
                                            key={typeof item === 'string' ? item : item.text}
                                            layoutId={typeof item === 'string' ? item : item.text}
                                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                                            animate={{ 
                                                scale: i === sortItems.length - 1 ? 1 : 0.9 - (i * 0.05), 
                                                opacity: 1, 
                                                y: i === sortItems.length - 1 ? 0 : -10 * i,
                                                zIndex: i 
                                            }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            drag
                                            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                            dragElastic={0.6}
                                            whileDrag={{ scale: 1.1, cursor: 'grabbing', zIndex: 100 }}
                                            onDragEnd={(e: any, info: any) => {
                                                const draggedRight = info.offset.x > 100;
                                                const draggedLeft = info.offset.x < -100;
                                                
                                                if (draggedRight || draggedLeft) {
                                                    const targetIndex = draggedLeft ? 0 : 1;
                                                    // Allow strings (legacy) or check categoryIndex
                                                    const isCorrect = typeof item === 'string' || item.categoryIndex === undefined ? true : item.categoryIndex === targetIndex;
                                                    
                                                    if (isCorrect) {
                                                        const newItems = sortItems.filter(t => t !== item);
                                                        setSortItems(newItems);
                                                        if (newItems.length === 0 && onComplete) {
                                                            onComplete(500);
                                                        }
                                                    }
                                                }
                                            }}
                                            className="absolute w-64 p-6 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex items-center justify-center text-center cursor-grab active:cursor-grabbing backdrop-blur-xl"
                                            style={{ 
                                                display: i >= sortItems.length - 3 ? 'flex' : 'none', // Only show top 3 cards
                                            }}
                                        >
                                            <span className="text-sm font-bold text-zinc-200">{typeof item === 'string' ? item : item.text}</span>
                                        </motion.div>
                                    ))
                                ) : (
                                    <motion.div 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-center"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4 text-yellow-500 border border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                                            <Check size={40} />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Sequence Complete</h3>
                                        <p className="text-zinc-500 text-sm font-mono">+500 XP AWARDED</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                  </>
              )}
          </div>
      );
  }

  // 6. THE NEGOTIATOR (Persuasion Scenario)
  if (type === 'negotiator') {
    return (
        <div className="w-full my-10 bg-zinc-950 border border-indigo-900/30 rounded-3xl overflow-hidden flex flex-col h-[500px]">
            <div className="p-6 border-b border-indigo-900/30 bg-indigo-950/10 backdrop-blur flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-900/20 border border-indigo-500/30 flex items-center justify-center">
                        <MessageSquare size={20} className="text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">The Negotiator</h4>
                        <div className="text-[10px] text-indigo-300 font-mono">{safeConfig.goal || "OBJECTIVE: Persuade the AI"}</div>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex justify-start">
                    <div className="max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed bg-zinc-900 border border-indigo-900/30 text-zinc-300 rounded-tl-sm">
                        {safeConfig.scenario || "I am listening. Present your proposal."}
                    </div>
                </div>
                {duelMessages.filter(m => m.role === 'user').map((msg, i) => (
                    <div key={i} className="flex justify-end">
                        <div className="max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed bg-indigo-600 text-white rounded-tr-sm">
                            {msg.text}
                        </div>
                    </div>
                ))}
                {duelWon && (
                    <div className="flex justify-start">
                         <div className="max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed bg-emerald-950/30 border border-emerald-500/50 text-emerald-200 rounded-tl-sm">
                            Terms accepted. Deal concluded.
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-indigo-900/30 bg-black">
                <div className="relative">
                    <input 
                      type="text" 
                      value={duelInput}
                      onChange={(e) => setDuelInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDuelSubmit()}
                      disabled={duelWon}
                      placeholder={duelWon ? "Negotiation complete." : "Type your offer..."}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-12 py-4 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-600 transition-all"
                    />
                    <button 
                      onClick={handleDuelSubmit}
                      disabled={!duelInput.trim() || duelWon}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-0 transition-all"
                    >
                        <ArrowUp size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // STANDARD QUIZ FALLBACK
  if (type === 'quiz') {
      return (
          <div className="w-full my-10 bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none"></div>
              
              <div className="flex items-center gap-3 mb-6 text-cyan-400 text-xs font-bold uppercase tracking-widest border-b border-zinc-800 pb-4">
                  <HelpCircle size={14} /> Knowledge Check
              </div>
              <h3 className="text-2xl font-bold text-white mb-8">{safeConfig.question}</h3>
              <div className="grid gap-3 relative z-10">
                  {safeConfig.options?.map((opt: string, idx: number) => {
                      let stateClass = "bg-black border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900";
                      if (quizResult && idx === safeConfig.correctIndex) stateClass = "bg-emerald-950/30 border-emerald-500 text-emerald-400";
                      else if (quizResult === 'incorrect' && idx === quizSelected) stateClass = "bg-red-950/30 border-red-500 text-red-400";
                      else if (quizResult && idx !== safeConfig.correctIndex) stateClass = "bg-zinc-950 border-zinc-900 opacity-50";
                      
                      return (
                          <button
                            key={idx}
                            disabled={!!quizResult}
                            onClick={() => {
                                setQuizSelected(idx);
                                setQuizResult(idx === safeConfig.correctIndex ? 'correct' : 'incorrect');
                            }}
                            className={`w-full p-5 rounded-xl border text-left transition-all font-medium text-sm flex justify-between items-center group ${stateClass}`}
                          >
                              <span className="flex items-center gap-4">
                                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] transition-colors ${quizResult && idx === safeConfig.correctIndex ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-zinc-700 text-zinc-500 group-hover:border-zinc-500'}`}>
                                      {String.fromCharCode(65 + idx)}
                                  </div>
                                  {opt}
                              </span>
                              {quizResult && idx === safeConfig.correctIndex && <Check size={18} className="text-emerald-500" />}
                              {quizResult === 'incorrect' && idx === quizSelected && <X size={18} className="text-red-500" />}
                          </button>
                      );
                  })}
              </div>
              <AnimatePresence>
                  {quizResult && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`mt-6 p-6 rounded-2xl border text-sm overflow-hidden ${quizResult === 'correct' ? 'bg-emerald-950/20 border-emerald-900 text-emerald-200' : 'bg-red-950/20 border-red-900 text-red-200'}`}
                      >
                          <p className="font-bold mb-2 uppercase tracking-widest text-xs">{quizResult === 'correct' ? 'Correct Analysis' : 'Incorrect Analysis'}</p>
                          <p className="opacity-90 leading-relaxed">{safeConfig.explanation}</p>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
      );
  }

  // Generic fallback styled
  return (
    <div className="p-8 border border-dashed border-zinc-800 rounded-2xl text-zinc-600 text-center font-mono text-xs uppercase tracking-widest my-8">
      Widget type <span className="text-white">{type}</span> module not loaded.
    </div>
  );
};

export default React.memo(GenerativeWidget);
