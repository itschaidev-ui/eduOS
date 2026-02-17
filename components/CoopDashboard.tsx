import React, { useState, useEffect } from 'react';
import { CoopTeam, CoopMember } from '../types';
import { Users, Copy, Shield, PenTool, AlertTriangle, Check, Crown, Share2, Plus, Zap, ArrowLeft, LayoutGrid, Swords, LogIn, Lock, Trash2, Crosshair, Radio } from 'lucide-react';
import { SparkleButton } from '@chaidev/ui';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  teams: CoopTeam[];
  onCreateTeam: (name: string) => Promise<boolean>;
  onDeleteTeam: (teamId: string) => Promise<void>;
  onJoinTeam: (code: string) => Promise<boolean>;
  currentUser: string;
  currentUserId: string;
  onNavigateToMap: () => void;
  onEnterRaid: (team: CoopTeam) => void;
}

const CoopDashboard: React.FC<Props> = ({ teams, onCreateTeam, onDeleteTeam, onJoinTeam, currentUser, currentUserId, onNavigateToMap, onEnterRaid }) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams.length > 0 ? teams[0].id : null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'manager'>(teams.length > 0 ? 'dashboard' : 'manager');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Manager State
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync selected team
  useEffect(() => {
      if (teams.length > 0 && (!selectedTeamId || !teams.find(t => t.id === selectedTeamId))) {
          setSelectedTeamId(teams[teams.length - 1].id);
          setViewMode('dashboard');
      } else if (teams.length === 0) {
          setViewMode('manager');
      }
  }, [teams]);

  const activeTeam = teams.find(t => t.id === selectedTeamId);
  const isCaptainOfAny = teams.some(t => t.members.find(m => m.uid === currentUserId && m.role === 'Captain'));

  const handleCopy = () => {
    if (!activeTeam) return;
    const link = `${window.location.origin}/#/join/${activeTeam.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCreateClick = async () => {
      if(!createName) return;
      const success = await onCreateTeam(createName);
      if (success) setCreateName('');
  };

  const handleJoinClick = async () => {
      if(!joinCode) return;
      const success = await onJoinTeam(joinCode);
      if (success) setJoinCode('');
  };

  // --- RENDER HELPERS ---

  const renderSidebar = () => (
      <div className="w-20 bg-black border-l border-zinc-900 flex flex-col items-center py-8 gap-6 z-20 overflow-hidden relative">
          <button 
            onClick={onNavigateToMap}
            className="w-12 h-12 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all group border border-zinc-800"
            title="Return to Map"
          >
              <LayoutGrid size={20} className="group-hover:scale-110 transition-transform" />
          </button>
          
          <div className="w-8 h-px bg-zinc-800"></div>

          {/* Scrollable Team List */}
          <div className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-4 py-2 custom-scrollbar">
              {teams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTeamId(t.id); setViewMode('dashboard'); }}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all relative group flex-shrink-0
                        ${selectedTeamId === t.id && viewMode === 'dashboard'
                            ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                            : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                        }
                    `}
                  >
                      {t.name.substring(0, 2).toUpperCase()}
                      {/* Tooltip */}
                      <div className="absolute right-16 bg-zinc-900 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded border border-zinc-800 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
                          {t.name}
                      </div>
                  </button>
              ))}
          </div>

          <div className="w-8 h-px bg-zinc-800 mt-2"></div>

          <button
            onClick={() => setViewMode('manager')}
            className={`w-12 h-12 rounded-xl border border-dashed border-zinc-700 text-zinc-600 hover:text-white hover:border-zinc-500 flex items-center justify-center transition-all mt-2
                ${viewMode === 'manager' ? 'bg-zinc-900 border-zinc-600 text-white' : ''}
            `}
            title="Join or Create Squad"
          >
              <Plus size={20} />
          </button>
      </div>
  );

  const renderManager = () => (
      <div className="flex-1 flex items-center justify-center p-8 bg-black">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12">
            
            {/* JOIN PANEL */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-10 relative overflow-hidden group hover:border-zinc-700 transition-colors"
            >
                 <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>
                 <div className="relative z-10">
                     <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mb-8 text-emerald-400 border border-zinc-800">
                         <Radio size={28} />
                     </div>
                     <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Join Squad</h2>
                     <p className="text-zinc-400 mb-10 text-sm leading-relaxed">Enter an encrypted invite code to sync with an existing operational cell.</p>
                     
                     <div className="space-y-6">
                        <div className="relative">
                            <input 
                                type="text" 
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="INVITE-CODE"
                                className="w-full bg-black border border-zinc-800 rounded-xl px-6 py-4 text-white placeholder-zinc-700 focus:border-emerald-500/50 focus:outline-none font-mono tracking-widest text-lg transition-colors"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/20">
                                <HashIcon />
                            </div>
                        </div>
                        <SparkleButton
                            text="Connect"
                            size="md"
                            hue={160}
                            onClick={handleJoinClick}
                            disabled={!joinCode}
                            className="w-full !py-4 !text-xs !font-bold !uppercase !tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                     </div>
                 </div>
            </motion.div>

            {/* CREATE PANEL */}
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={`bg-zinc-900/30 border border-zinc-800 rounded-3xl p-10 relative overflow-hidden transition-all ${isCaptainOfAny ? 'opacity-50 grayscale' : 'group hover:border-zinc-700'}`}
            >
                 <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>
                 
                 {isCaptainOfAny && (
                     <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
                         <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                             <Lock size={24} className="text-zinc-500" />
                         </div>
                         <h3 className="text-white font-bold text-lg mb-2 uppercase tracking-widest">Command Limit</h3>
                         <p className="text-zinc-500 text-sm max-w-xs">You are already deployed as a Captain. Abort current command to initialize new squad.</p>
                     </div>
                 )}

                 <div className="relative z-10">
                     <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mb-8 text-indigo-400 border border-zinc-800">
                         <Crosshair size={28} />
                     </div>
                     <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Initialize Squad</h2>
                     <p className="text-zinc-400 mb-10 text-sm leading-relaxed">Establish a new tactical protocol. You will be assigned as Captain.</p>
                     
                     <div className="space-y-6">
                        <input 
                            type="text" 
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            placeholder="Squad Designation"
                            disabled={isCaptainOfAny}
                            className="w-full bg-black border border-zinc-800 rounded-xl px-6 py-4 text-white placeholder-zinc-700 focus:border-indigo-500/50 focus:outline-none text-lg transition-colors"
                        />
                        <SparkleButton
                            text="Establish Link"
                            size="md"
                            hue={250}
                            onClick={handleCreateClick}
                            disabled={!createName || isCaptainOfAny}
                            className="w-full !py-4 !text-xs !font-bold !uppercase !tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                     </div>
                 </div>
            </motion.div>

        </div>
      </div>
  );

  const renderDashboard = () => {
    if (!activeTeam) return null;

    const activeMembers = activeTeam.members.filter(m => m.status === 'online').length;
    const raidStatus = activeMembers >= 1 ? 'Ready' : 'Locked';
    const isCaptain = !!activeTeam.members.find(m => m.uid === currentUserId && m.role === 'Captain');

    return (
        <div className="flex-1 overflow-y-auto p-8 md:p-16 bg-black">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <h1 className="text-5xl font-bold text-white tracking-tighter">{activeTeam.name}</h1>
                        <span className="px-3 py-1 bg-white/5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/10">
                            Unit Lvl 1
                        </span>
                        
                        {isCaptain && (
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (deleteConfirm === activeTeam.id) {
                                        onDeleteTeam(activeTeam.id);
                                        setDeleteConfirm(null);
                                    } else {
                                        setDeleteConfirm(activeTeam.id);
                                        setTimeout(() => setDeleteConfirm(null), 3000);
                                    }
                                }}
                                className={`ml-2 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 border ${
                                    deleteConfirm === activeTeam.id 
                                    ? 'bg-red-950/50 text-red-200 border-red-900' 
                                    : 'bg-transparent text-zinc-600 border-transparent hover:text-red-400 hover:bg-red-500/5'
                                }`}
                                title="Disband Unit"
                             >
                                 <Trash2 size={14} />
                                 {deleteConfirm === activeTeam.id && <span className="text-[10px] font-bold uppercase animate-pulse">Confirm?</span>}
                             </button>
                        )}
                    </div>
                    <p className="text-zinc-500 text-sm font-mono tracking-wide">OBJECTIVE: <span className="text-white">{activeTeam.weeklyGoal}</span></p>
                </div>
                
                <div className={`flex flex-col items-end gap-3`}>
                    <div className={`flex items-center gap-6 px-8 py-4 rounded-2xl border ${raidStatus === 'Ready' ? 'bg-emerald-950/10 border-emerald-500/20' : 'bg-zinc-900/30 border-zinc-800'}`}>
                        <div className="text-right">
                            <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${raidStatus === 'Ready' ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                Raid Status
                            </div>
                            <div className={`text-2xl font-mono font-bold ${raidStatus === 'Ready' ? 'text-white' : 'text-zinc-500'}`}>
                                {raidStatus === 'Ready' ? (activeMembers === 1 ? 'SOLO' : 'ACTIVE') : 'OFFLINE'}
                            </div>
                        </div>
                        <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center border border-zinc-800 relative">
                            <Users size={24} className={raidStatus === 'Ready' ? 'text-emerald-500' : 'text-zinc-700'} />
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-4 border-black ${raidStatus === 'Ready' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                {activeMembers}
                            </div>
                        </div>
                    </div>
                    
                    {raidStatus === 'Ready' && (
                        <SparkleButton
                            text="Deploy Squad"
                            size="md"
                            hue={0}
                            onClick={() => onEnterRaid(activeTeam)}
                            className="w-full !px-6 !py-4 !font-bold !uppercase !tracking-widest !text-xs"
                        />
                    )}
                </div>
            </div>

            {/* Invite Module - HUD Style */}
            <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden group mb-12">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex flex-col md:flex-row gap-8 items-center justify-between relative z-10">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-3">
                            <Share2 size={18} className="text-indigo-400" />
                            Expand Unit
                        </h3>
                        <p className="text-zinc-500 text-sm leading-relaxed max-w-md">
                            Invite members to unlock <span className="text-white">Synchronous Raids</span>. 
                            Requires 2+ active operators.
                        </p>
                    </div>
                    
                    <div className="w-full md:w-auto flex items-center gap-3 bg-black p-2 rounded-xl border border-zinc-800">
                        <code className="text-zinc-300 font-mono text-xs px-6 tracking-wider">
                            {activeTeam.inviteCode}
                        </code>
                        <div className="h-8 w-px bg-zinc-800"></div>
                        <button 
                            onClick={handleCopy}
                            className={`p-3 rounded-lg transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Members Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTeam.members.map((member) => (
                    <motion.div 
                        key={member.uid} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-6 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all group"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white ${member.role === 'Captain' ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-zinc-800'}`}>
                                    {member.name[0]}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm tracking-wide">{member.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'online' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`}></div>
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{member.status}</span>
                                    </div>
                                </div>
                            </div>
                            {member.role === 'Captain' && <Crown size={16} className="text-yellow-500" />}
                        </div>

                        <div className="pt-6 border-t border-zinc-800">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Unit Role</div>
                            
                            {/* Role Badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium w-full
                                ${member.role === 'Captain' ? 'bg-blue-950/20 border-blue-500/20 text-blue-300' : 
                                member.role === 'Scribe' ? 'bg-purple-950/20 border-purple-500/20 text-purple-300' :
                                member.role === 'Skeptic' ? 'bg-red-950/20 border-red-500/20 text-red-300' :
                                'bg-zinc-900 border-zinc-800 text-zinc-400'
                                }
                            `}>
                                {member.role === 'Captain' && <Shield size={12} />}
                                {member.role === 'Scribe' && <PenTool size={12} />}
                                {member.role === 'Skeptic' && <AlertTriangle size={12} />}
                                {member.role}
                            </div>
                        </div>
                    </motion.div>
                ))}
                
                {/* Empty Slots */}
                {Array.from({ length: Math.max(0, 5 - activeTeam.members.length) }).map((_, i) => (
                    <div key={i} className="border border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 opacity-40 hover:opacity-100 transition-opacity cursor-default">
                        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600">
                            <Plus size={20} />
                        </div>
                        <div className="text-xs font-bold uppercase tracking-widest text-zinc-600">Open Slot</div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
      <div className="w-full h-full flex bg-black overflow-hidden flex-row">
          {renderSidebar()}
          {viewMode === 'manager' ? renderManager() : renderDashboard()}
      </div>
  );
};

const HashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="9" x2="20" y2="9"></line>
        <line x1="4" y1="15" x2="20" y2="15"></line>
        <line x1="10" y1="3" x2="8" y2="21"></line>
        <line x1="16" y1="3" x2="14" y2="21"></line>
    </svg>
);

export default React.memo(CoopDashboard);
