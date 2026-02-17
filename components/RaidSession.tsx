import React, { useState, useEffect } from 'react';
import { CoopTeam, RaidData, RaidQuestion, UserState } from '../types';
import { generateRaid } from '../services/gemini';
import { Timer, Zap, Users, AlertTriangle, CheckCircle2, Shield, Crown, Swords, Loader2, ArrowRight, Heart, Skull, Activity, Radio, Lock } from 'lucide-react';
import { SparkleButton } from '@chaidev/ui';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  team: CoopTeam;
  currentUser: UserState;
  onExit: () => void;
}

type RaidState = 'setup' | 'loading' | 'active' | 'complete';

const RaidSession: React.FC<Props> = ({ team, currentUser, onExit }) => {
  const [raidState, setRaidState] = useState<RaidState>('setup');
  const [raidSubject, setRaidSubject] = useState('');
  const [raidData, setRaidData] = useState<RaidData | null>(null);
  
  // Gameplay State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [votes, setVotes] = useState<Record<string, string>>({}); // uid -> optionId
  const [roundResult, setRoundResult] = useState<'pending' | 'success' | 'fail'>('pending');
  const [bossHealth, setBossHealth] = useState(100);
  const [teamScore, setTeamScore] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Tie Breaker State
  const [isTieBreaking, setIsTieBreaking] = useState(false);
  const [tieBreakerHighlight, setTieBreakerHighlight] = useState<string | null>(null);

  // Derived
  const isCaptain = team.members.find(m => m.uid === currentUser.uid)?.role === 'Captain';
  const currentQuestion = raidData?.questions[currentQIndex];

  // --- PHASE 1: GENERATION ---
  const handleStartRaid = async () => {
      if (!raidSubject) return;
      setRaidState('loading');
      const data = await generateRaid(raidSubject);
      if (data) {
          setRaidData(data);
          setRaidState('active');
          setTimeLeft(15);
          setLogs([`> RAID INITIALIZED: ${data.title}`, `> SCENARIO: ${data.description}`]);
      } else {
          setRaidState('setup'); // Fallback
          setLogs(['> ERROR: Failed to generate raid parameters.']);
      }
  };

  // --- PHASE 2: GAME LOOP ---
  
  // Timer Logic
  useEffect(() => {
    // Stop timer if tie breaking or round done
    if (raidState !== 'active' || roundResult !== 'pending' || isTieBreaking) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          resolveRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
        clearInterval(timer);
    };
  }, [raidState, roundResult, timeLeft, currentQuestion, votes, isTieBreaking]);

  const handleVote = (optionId: string) => {
      if (roundResult !== 'pending' && !isTieBreaking) return;
      setVotes(prev => ({...prev, [currentUser.uid]: optionId}));
  };

  const resolveRound = () => {
      if (!currentQuestion) return;

      // 1. Tally Votes
      const counts: Record<string, number> = {};
      Object.values(votes).forEach((v: string) => counts[v] = (counts[v] || 0) + 1);

      // 2. Find Max
      let maxVotes = 0;
      Object.values(counts).forEach(c => maxVotes = Math.max(maxVotes, c));
      
      let winningOptions = Object.keys(counts).filter(k => counts[k] === maxVotes);
      
      // If no votes, consider all options as candidates for random selection
      if (winningOptions.length === 0) {
          winningOptions = currentQuestion.options.map(o => o.id);
      }
      
      // 3. Check for Tie
      if (winningOptions.length > 1) {
          // Initiate Tie Breaker Animation
          setIsTieBreaking(true);
          setLogs(prev => [...prev, `> ALERT: Consensus Tie Detected (${winningOptions.length} ways). Rerouting power...`]);

          let ticks = 0;
          const maxTicks = 20; // Run animation for ~2 seconds
          const interval = setInterval(() => {
              const randomIdx = Math.floor(Math.random() * winningOptions.length);
              setTieBreakerHighlight(winningOptions[randomIdx]);
              ticks++;

              if (ticks >= maxTicks) {
                  clearInterval(interval);
                  // Final Decision
                  const finalWinner = winningOptions[Math.floor(Math.random() * winningOptions.length)];
                  setTieBreakerHighlight(finalWinner);
                  
                  setTimeout(() => {
                      setIsTieBreaking(false);
                      setTieBreakerHighlight(null);
                      finalizeRound(finalWinner);
                  }, 800); // Pause to show winner
              }
          }, 100); // 100ms shuffle speed
      } else {
          finalizeRound(winningOptions[0]);
      }
  };

  const finalizeRound = (finalChoiceId: string) => {
      if (!currentQuestion) return;

      // 4. Check Correctness
      const correctOption = currentQuestion.options.find(o => o.isCorrect);
      const isWin = finalChoiceId === correctOption?.id;

      if (isWin) {
          setRoundResult('success');
          setBossHealth(prev => Math.max(0, prev - 34)); // 3 questions to kill approx
          setTeamScore(prev => prev + 150);
          setLogs(prev => [...prev, `> ROUND ${currentQIndex + 1}: SUCCESS. Damage dealt.`]);
      } else {
          setRoundResult('fail');
          setLogs(prev => [...prev, `> ROUND ${currentQIndex + 1}: FAILED. Target consensus missed.`]);
      }

      // 5. Next Round Delay
      setTimeout(() => {
          if (currentQIndex < (raidData?.questions.length || 0) - 1) {
              setCurrentQIndex(prev => prev + 1);
              setVotes({});
              setRoundResult('pending');
              setTimeLeft(15);
          } else {
              setRaidState('complete');
          }
      }, 4000);
  };

  // --- RENDERS ---

  if (raidState === 'setup') {
      return (
        <div className="w-full h-full flex items-center justify-center p-6 bg-black">
            <div className="max-w-2xl w-full bg-zinc-900/30 border border-zinc-800 rounded-3xl p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] pointer-events-none"></div>
                
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-red-950/30 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(220,38,38,0.2)] animate-pulse">
                        <Swords size={40} />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-3 tracking-tighter">Initialize Raid Protocol</h2>
                    <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">
                        {isCaptain 
                         ? "Captain, select a target vector for the squad." 
                         : "Waiting for Captain to select a target..."}
                    </p>
                </div>

                {isCaptain ? (
                    <div className="space-y-6 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                            {['React Performance', 'System Design', 'Cybersecurity', 'Algorithms'].map(subj => (
                                <button
                                    key={subj}
                                    onClick={() => setRaidSubject(subj)}
                                    className={`p-4 rounded-xl border text-sm font-bold transition-all ${raidSubject === subj ? 'bg-red-600 text-white border-red-500 shadow-lg scale-105' : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'}`}
                                >
                                    {subj}
                                </button>
                            ))}
                        </div>
                        <input 
                            type="text" 
                            placeholder="Or enter custom subject..."
                            value={raidSubject}
                            onChange={(e) => setRaidSubject(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:border-red-500 focus:outline-none transition-colors"
                        />
                        <SparkleButton
                            text="Generate Raid"
                            size="md"
                            hue={0}
                            onClick={handleStartRaid}
                            disabled={!raidSubject}
                            className="w-full !py-5 !rounded-2xl !font-bold !uppercase !tracking-widest !text-xs disabled:opacity-50 disabled:shadow-none"
                        />
                         <button onClick={onExit} className="w-full text-xs text-zinc-500 hover:text-white mt-4 uppercase tracking-widest font-bold">Abort Mission</button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 py-12">
                         <div className="relative">
                             <div className="w-12 h-12 border-t-2 border-red-500 rounded-full animate-spin"></div>
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <Radio size={16} className="text-red-500" />
                             </div>
                         </div>
                         <span className="text-xs font-mono text-zinc-500 tracking-widest animate-pulse">SYNCHRONIZING WITH COMMAND...</span>
                         <button onClick={onExit} className="text-xs text-zinc-600 hover:text-white underline mt-4">Leave Lobby</button>
                    </div>
                )}
            </div>
        </div>
      );
  }

  if (raidState === 'loading') {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black space-y-8">
               <div className="relative">
                    <div className="w-32 h-32 border-2 border-zinc-800 rounded-full"></div>
                    <div className="absolute inset-0 border-t-2 border-red-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-r-2 border-red-900 rounded-full animate-spin animation-delay-500"></div>
                    <Swords className="absolute inset-0 m-auto text-red-500 animate-pulse" size={40} />
               </div>
               <div className="text-center">
                   <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Constructing Simulation</h2>
                   <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Generative AI is building the dungeon...</p>
               </div>
          </div>
      );
  }

  if (raidState === 'complete') {
       const isSuccess = bossHealth <= 0;
       return (
          <div className="w-full h-full flex items-center justify-center bg-black animate-in zoom-in-95 duration-500">
              <div className={`text-center p-12 bg-zinc-900/50 border rounded-3xl shadow-2xl max-w-lg w-full backdrop-blur-xl ${isSuccess ? 'border-emerald-500/30 shadow-emerald-500/10' : 'border-red-500/30 shadow-red-500/10'}`}>
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg ${isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {isSuccess ? <CheckCircle2 size={48} /> : <AlertTriangle size={48} />}
                  </div>
                  <h1 className="text-5xl font-bold text-white mb-4 tracking-tighter">{isSuccess ? "MISSION ACCOMPLISHED" : "MISSION FAILED"}</h1>
                  <p className={`font-mono mb-8 text-sm uppercase tracking-widest ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isSuccess ? `Target Neutralized. +${teamScore} XP Distributed.` : "Squad Overwhelmed. Tactical Retreat."}
                  </p>
                  
                  <div className="bg-black p-6 rounded-xl mb-8 text-left font-mono text-[10px] text-zinc-500 max-h-40 overflow-y-auto border border-zinc-800">
                      {logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
                  </div>

                  <SparkleButton
                      text="Return to Base"
                      size="md"
                      hue={140}
                      onClick={onExit}
                      className="w-full !px-8 !py-4 !rounded-xl !font-bold !uppercase !tracking-widest !text-xs"
                  />
              </div>
          </div>
       );
  }

  // --- ACTIVE VIEW ---
  return (
    <div className="w-full h-full flex flex-col bg-black overflow-hidden relative">
        
        {/* Dynamic Background */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-gradient-x"></div>
        </div>

        {/* Top Bar */}
        <div className="h-28 bg-zinc-900/50 backdrop-blur-md border-b border-red-900/20 flex justify-between items-center px-8 md:px-16 relative z-20">
            <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-1">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{raidData?.title}</h1>
                </div>
                <p className="text-xs text-zinc-500 max-w-md truncate font-mono uppercase tracking-widest">{raidData?.description}</p>
            </div>

            <div className="flex items-center gap-12">
                {/* Boss Health */}
                <div className="text-right w-64">
                    <div className="flex justify-between text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">
                        <span>Target Integrity</span>
                        <span>{Math.round(bossHealth)}%</span>
                    </div>
                    <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-red-900/30">
                        <div className="h-full bg-gradient-to-r from-red-600 to-orange-600 transition-all duration-500" style={{ width: `${bossHealth}%` }}></div>
                    </div>
                </div>

                {/* Timer */}
                <div className={`flex flex-col items-center w-20 ${timeLeft <= 5 ? 'text-red-500 scale-110 animate-pulse' : 'text-white'} transition-all`}>
                    <span className="text-4xl font-mono font-bold leading-none">{timeLeft}</span>
                    <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">SEC</span>
                </div>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative z-10">
             
             {/* Question Area */}
             <div className="flex-1 p-8 md:p-16 overflow-y-auto flex flex-col items-center">
                 <div className="w-full max-w-5xl">
                     <div className="mb-4 text-red-400 font-mono text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                         <Swords size={14} /> Encounter {currentQIndex + 1} / {raidData?.questions.length}
                         {isTieBreaking && <span className="text-yellow-400 animate-pulse ml-6 font-bold flex items-center gap-2"><Zap size={14} /> Tie Detected // Rerouting</span>}
                     </div>
                     
                     <h2 className="text-3xl md:text-5xl font-bold text-white mb-12 leading-tight tracking-tighter">
                         {currentQuestion?.text}
                     </h2>

                     {/* Options Grid */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {currentQuestion?.options.map((option) => {
                             const isSelected = votes[currentUser.uid] === option.id;
                             const voteCount = Object.values(votes).filter(v => v === option.id).length;
                             const totalVotes = Object.keys(votes).length;
                             const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                             
                             // Reveal state
                             const isCorrect = option.isCorrect;
                             const showResult = roundResult !== 'pending';
                             const isTieHighlight = isTieBreaking && tieBreakerHighlight === option.id;

                             return (
                                 <button
                                    key={option.id}
                                    onClick={() => handleVote(option.id)}
                                    disabled={roundResult !== 'pending' || isTieBreaking}
                                    className={`relative p-8 rounded-2xl border-2 text-left transition-all group overflow-hidden
                                        ${showResult 
                                            ? isCorrect 
                                                ? 'bg-emerald-900/20 border-emerald-500' 
                                                : isSelected 
                                                    ? 'bg-red-900/20 border-red-500' 
                                                    : 'bg-zinc-900/50 border-zinc-800 opacity-40'
                                            : isTieHighlight
                                                ? 'bg-yellow-900/40 border-yellow-400 scale-[1.02] shadow-[0_0_30px_rgba(250,204,21,0.3)] z-20'
                                                : isSelected 
                                                    ? 'bg-indigo-900/20 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]' 
                                                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
                                        }
                                    `}
                                 >
                                    {/* Progress Bar Background for Votes */}
                                    <div 
                                        className="absolute top-0 left-0 h-full bg-white/5 transition-all duration-500" 
                                        style={{ width: `${percentage}%` }}
                                    ></div>

                                    <div className="relative z-10 flex justify-between items-start">
                                        <div className="flex-1 pr-6">
                                            <span className={`text-xl font-medium ${showResult && isCorrect ? 'text-emerald-400' : 'text-zinc-200'}`}>
                                                {option.text}
                                            </span>
                                        </div>
                                        {voteCount > 0 && (
                                            <div className="flex -space-x-3">
                                                {Array.from({length: Math.min(3, voteCount)}).map((_, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-xs text-white">
                                                        <Users size={14} />
                                                    </div>
                                                ))}
                                                {voteCount > 3 && <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">+{voteCount-3}</div>}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {showResult && isCorrect && (
                                        <div className="absolute right-6 bottom-6 text-emerald-500 animate-in zoom-in spin-in-90 duration-300">
                                            <CheckCircle2 size={28} />
                                        </div>
                                    )}
                                 </button>
                             );
                         })}
                     </div>

                     {/* Result Feedback */}
                     {roundResult !== 'pending' && (
                         <div className={`mt-12 p-6 rounded-2xl border ${roundResult === 'success' ? 'bg-emerald-950/30 border-emerald-900 text-emerald-200' : 'bg-red-950/30 border-red-900 text-red-200'} animate-in slide-in-from-bottom-4`}>
                             <div className="font-bold mb-2 flex items-center gap-3 text-lg uppercase tracking-wider">
                                 {roundResult === 'success' ? <CheckCircle2 size={24}/> : <AlertTriangle size={24}/>}
                                 {roundResult === 'success' ? "Consensus Correct // Target Damaged" : "Consensus Incorrect // Attack Failed"}
                             </div>
                             <p className="text-base opacity-80 leading-relaxed max-w-3xl">{currentQuestion?.explanation}</p>
                             <div className="mt-4 text-xs font-mono opacity-50 flex items-center gap-2 uppercase tracking-widest">
                                 Next encounter in 4s <ArrowRight size={12} />
                             </div>
                         </div>
                     )}
                 </div>
             </div>

             {/* Sidebar: Squad Status */}
             <div className="w-80 bg-zinc-950/80 backdrop-blur-xl border-l border-zinc-800 p-6 hidden md:flex flex-col">
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Activity size={14} /> Squad Uplink
                 </h3>
                 <div className="space-y-4">
                     {team.members.map(m => (
                         <div key={m.uid} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${votes[m.uid] ? 'bg-zinc-900 border border-zinc-700' : 'opacity-40 grayscale'}`}>
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${m.role === 'Captain' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-zinc-800 text-zinc-300'}`}>
                                 {m.name[0]}
                             </div>
                             <div className="flex-1">
                                 <div className="text-sm font-bold text-zinc-200">{m.name}</div>
                                 <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                                     {votes[m.uid] ? 'Data Transmitted' : 'Calculating...'}
                                 </div>
                             </div>
                             {votes[m.uid] && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
                         </div>
                     ))}
                 </div>

                 <div className="mt-auto border-t border-zinc-800 pt-6">
                     <div className="text-[10px] font-mono text-zinc-600 mb-3 uppercase tracking-widest">// RAID LOG</div>
                     <div className="text-[10px] font-mono text-zinc-400 space-y-2 opacity-70">
                         {logs.slice(-6).map((l, i) => <div key={i} className="truncate">{l}</div>)}
                     </div>
                 </div>
             </div>
        </div>
    </div>
  );
};

export default React.memo(RaidSession);
