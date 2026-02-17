import React from 'react';
import { motion } from 'framer-motion';
import { Book, Users, Plus, ArrowRight, Brain, Trophy, Star, Zap, Layout, Target, CheckCircle2, Circle } from 'lucide-react';
import { Badge, SparkleButton } from '@chaidev/ui';
import { UserState, CoopTeam } from '../types';

interface DashboardHubProps {
  userState: UserState;
  teams: CoopTeam[];
  curriculumTitle: string;
  onSelectSubject: () => void;
  onSelectTeam: (teamId: string) => void;
  onCreateTeam: () => void;
}

const DashboardHub: React.FC<DashboardHubProps> = ({ 
  userState, 
  teams, 
  curriculumTitle, 
  onSelectSubject, 
  onSelectTeam,
  onCreateTeam
}) => {

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-full p-4 sm:p-6 md:p-8 lg:p-12 pb-16 sm:pb-20 md:pb-24 overflow-y-auto bg-black">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12 md:space-y-16">
        
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-6 border-b border-white/10 pb-6 sm:pb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-white tracking-tighter mb-1 sm:mb-2">
              Command Center
            </h1>
            <p className="text-zinc-400 font-mono text-xs sm:text-sm uppercase tracking-widest">
              Welcome back, {userState.displayName}
            </p>
          </div>
          
          <div className="flex gap-2 sm:gap-3 md:gap-4 text-xs font-mono w-full md:w-auto">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 flex-1 md:flex-none">
              <div className="p-1 sm:p-1.5 bg-yellow-500/10 rounded-lg">
                <Star size={12} className="sm:w-3.5 sm:h-3.5 text-yellow-500" />
              </div>
              <div className="min-w-0">
                <div className="text-zinc-500 uppercase tracking-wider text-[9px] sm:text-[10px]">Total XP</div>
                <div className="text-white font-bold text-sm sm:text-base truncate">{userState.xp.toLocaleString()}</div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 flex-1 md:flex-none">
              <div className="p-1 sm:p-1.5 bg-blue-500/10 rounded-lg">
                <Zap size={12} className="sm:w-3.5 sm:h-3.5 text-blue-500" />
              </div>
              <div>
                <div className="text-zinc-500 uppercase tracking-wider text-[9px] sm:text-[10px]">Momentum</div>
                <div className="text-white font-bold text-sm sm:text-base">{userState.momentum}%</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Daily Quests Section */}
        {userState.quests && userState.quests.length > 0 && (
            <motion.section variants={container} initial="hidden" animate="show">
                <div className="flex items-center gap-3 mb-6">
                    <Trophy className="text-yellow-500" size={20} />
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">Daily Protocols</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    {userState.quests.map((quest) => (
                        <motion.div 
                            key={quest.id} 
                            variants={item}
                            className={`p-4 rounded-xl border flex items-center justify-between ${
                                quest.completed 
                                ? 'bg-emerald-950/10 border-emerald-500/30' 
                                : 'bg-zinc-900/30 border-zinc-800'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                {quest.completed ? (
                                    <CheckCircle2 size={20} className="text-emerald-500" />
                                ) : (
                                    <Circle size={20} className="text-zinc-600" />
                                )}
                                <div>
                                    <h4 className={`text-sm font-bold ${quest.completed ? 'text-emerald-400 line-through' : 'text-zinc-200'}`}>
                                        {quest.title}
                                    </h4>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                        {quest.description} • <span className="text-yellow-500">+{quest.xpReward} XP</span>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.section>
        )}

        {/* Subjects Grid */}
        <motion.section variants={container} initial="hidden" animate="show">
          <div className="flex flex-col gap-2 mb-8">
            <div className="flex items-center justify-between gap-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Book className="text-cyan-400" size={24} />
                Active Modules
              </h2>
              <div className="flex items-center gap-2">
                <button className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center gap-2">
                  View All <ArrowRight size={14} />
                </button>
              </div>
              <div
                className="group flex items-center gap-3"
                aria-label="Nova supervising modules"
              >
                <img
                  src="/companion/avatars/sitting.png"
                  alt="Nova sitting beside Active Modules"
                  className="w-32 h-32 rounded-full object-cover shadow-[0_10px_45px_rgba(0,0,0,0.55)]"
                  loading="lazy"
                />
                <div className="text-left text-sm relative">
                  <p className="text-white text-[10px] uppercase tracking-[0.4em]">Nova</p>
                  <p className="text-[12px] text-zinc-400 leading-tight">
                    Watching your modules and ready to guide each step.
                  </p>
                  <span className="absolute left-0 top-full mt-1 text-[10px] tracking-[0.6em] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    N O V A
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Current Active Subject */}
            <motion.div 
              variants={item}
              onClick={onSelectSubject}
              className="group relative h-56 sm:h-64 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 cursor-pointer transition-all overflow-hidden touch-manipulation"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <Badge label="In Progress" tone="info" appearance="soft" size="sm" className="uppercase tracking-widest" />
                    <ArrowRight className="text-zinc-600 group-hover:text-cyan-400 -rotate-45 group-hover:rotate-0 transition-all" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 line-clamp-2">
                    {curriculumTitle}
                  </h3>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-4">
                    <div 
                      className="h-full bg-cyan-400" 
                      style={{ width: `${Math.min(100, (userState.completedNodes.length / Math.max(1, userState.completedNodes.length + 5)) * 100)}%` }} 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
                  <Target size={14} />
                  <span>{userState.completedNodes.length} Nodes Mastered</span>
                </div>
              </div>
            </motion.div>

            {/* Placeholder Subjects */}
            <motion.div variants={item} className="group relative h-56 sm:h-64 bg-zinc-950/30 border border-zinc-800/50 border-dashed rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center text-center gap-3 sm:gap-4 hover:bg-zinc-900/20 transition-colors touch-manipulation">
               <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600 group-hover:text-zinc-400 transition-colors">
                 <Plus size={24} className="sm:w-8 sm:h-8" />
               </div>
               <div>
                 <h3 className="text-zinc-500 font-bold mb-1 text-sm sm:text-base">Add Module</h3>
                 <p className="text-zinc-600 text-[10px] sm:text-xs max-w-[200px]">Expand your knowledge graph with a new subject.</p>
               </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Co-ops Section */}
        <motion.section variants={container} initial="hidden" animate="show" className="pt-8 border-t border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="text-emerald-400" size={24} />
              Active Squads
            </h2>
            <SparkleButton
              text="Initialize Squad"
              size="sm"
              hue={160}
              onClick={onCreateTeam}
              className="!text-[10px] sm:!text-xs !font-bold !uppercase !tracking-widest"
            />
          </div>

          {teams.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team, idx) => (
                <motion.div 
                  key={team.id}
                  variants={item}
                  onClick={() => onSelectTeam(team.id)}
                  className="group bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 cursor-pointer transition-all touch-manipulation"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-lg font-bold text-white border border-zinc-700">
                      {team.name.substring(0, 2).toUpperCase()}
                    </div>
                    {team.raidReady && (
                      <Badge label="Raid Ready" tone="success" appearance="soft" size="sm" />
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{team.name}</h3>
                  <p className="text-zinc-500 text-xs mb-6 line-clamp-1">{team.weeklyGoal}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 3).map((m, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-[10px] text-white font-bold" title={m.name}>
                          {m.name[0]}
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-zinc-900 border-2 border-black flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                          +{team.members.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                      {team.raidReady ? 'Raid Active' : 'Training'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
             <div className="w-full p-12 border border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center gap-4 bg-zinc-950/30">
                <Users size={48} className="text-zinc-700" />
                <h3 className="text-zinc-400 font-bold">No Active Squads</h3>
                <p className="text-zinc-600 text-sm max-w-md">Join or create a squad to unlock cooperative learning modes and synchronous raids.</p>
             </div>
          )}
        </motion.section>

      </div>
    </div>
  );
};

export default React.memo(DashboardHub);
