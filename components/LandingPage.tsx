import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Brain, ArrowRight, Zap, Users, Globe, ChevronRight, Activity, Search, Sparkles, Layers, Code, Shield, Network, Bot, Check, Loader2, Play } from 'lucide-react';
import ClickSpark from './react-bits/ClickSpark';
import AnimatedList from './react-bits/AnimatedList';
import SplitText from './react-bits/SplitText';
import ColorBends from './react-bits/ColorBends';
import BounceCards from './react-bits/BounceCards';
import ChromaGrid from './react-bits/ChromaGrid';

interface Props {
  onStart: () => void;
  onGuest: () => void;
}

const LandingPage: React.FC<Props> = ({ onStart, onGuest }) => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]); // Reduced parallax intensity
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="w-full min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* Floating Interactive Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
          <ColorBends
            colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
            rotation={30}
            speed={0.3}
            scale={1.2}
            frequency={1.4}
            warpStrength={1.2}
            mouseInfluence={0.8}
            parallax={0.6}
            noise={0.08}
            transparent={false}
          />
          
          {/* Noise texture for film grain feel */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-4 sm:py-6 mix-blend-exclusion flex justify-between items-center">
          <div className="text-lg sm:text-xl font-bold tracking-tighter flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full" />
              eduOS
            </div>
          <div className="flex gap-4 sm:gap-8 text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-70">
              <button onClick={onGuest} className="hover:opacity-100 transition-opacity cursor-pointer text-cyan-400 px-2 py-1 touch-manipulation">Guest_Access</button>
        </div>
      </nav>

      {/* HERO SECTION - Refined Typography & Reduced Bounce */}
      <section className="relative h-screen flex flex-col items-center justify-center z-10 perspective-1000">
          <div className="text-center px-4 relative">
              
              {/* Text Scramble Effect would go here - simplified for now */}
              <div className="overflow-hidden mb-2 relative">
                  <SplitText
                    text="LEARN"
                    className="text-[10vw] md:text-[8vw] font-bold leading-[0.85] tracking-tighter mix-blend-difference"
                    delay={100}
                    animationFrom={{ opacity: 0, transform: 'translate3d(0,100%,0)' }}
                    animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
                  />
              </div>
              
              <div className="overflow-hidden relative">
                  <motion.h1 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[10vw] md:text-[8vw] font-bold leading-[0.85] tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 animate-gradient-x"
                  >
                    EVOLVE
                  </motion.h1>
              </div>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="mt-8 sm:mt-12 text-xs sm:text-sm md:text-base font-mono text-zinc-400 max-w-md mx-auto px-4 tracking-wide uppercase"
              >
                  The Operating System for your Neural Network. <br className="hidden sm:block"/>
                  Adaptive. Infinite. Yours.
              </motion.p>
          </div>

          <ClickSpark sparkColor="#22d3ee" sparkCount={12} sparkRadius={25} extraScale={1.1}>
            <motion.button 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               transition={{ delay: 1, duration: 0.5 }}
               onClick={onStart}
               className="mt-8 sm:mt-16 px-6 sm:px-10 py-3 sm:py-4 bg-white text-black font-bold rounded-full text-xs sm:text-sm uppercase tracking-widest hover:bg-zinc-200 transition-colors z-20 touch-manipulation"
            >
                Initialize Sequence
            </motion.button>
          </ClickSpark>

          {/* Scroll Indicator */}
          <motion.div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-widest text-zinc-600 flex flex-col items-center gap-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
              Scroll to Explore
          </motion.div>
      </section>

      {/* FLOATING CARDS SECTION - Smoother Parallax */}
      <section className="relative min-h-[150vh] z-20 py-16 sm:py-24 md:py-32 px-4 sm:px-8 md:px-20 overflow-hidden">
           
           <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-12 sm:gap-16 md:gap-24">
               
               {/* Centered Text */}
               <div className="text-center max-w-3xl mx-auto px-4">
                   <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-8 leading-tight tracking-tight">
                       Knowledge <br/>
                       <span className="text-zinc-600">Reimagined.</span>
                   </h2>
                   <p className="text-base sm:text-lg md:text-xl text-zinc-400 leading-relaxed font-light">
                       Traditional learning is linear. <span className="text-white font-medium">EduOS is spatial.</span> <br className="hidden sm:block"/>
                       Navigate through constellations of concepts, tailored to your cognitive level.
                   </p>
                    </div>

               {/* Moving Cards - Centered and below */}
               <div className="flex flex-col items-center justify-center w-full overflow-x-hidden">
                   <BounceCards
                      className="cursor-pointer"
                      containerWidth={isMobile ? 300 : 500}
                      containerHeight={isMobile ? 400 : 500}
                      animationDelay={0.5}
                      animationStagger={0.1}
                      enableHover={!isMobile}
                      transformStyles={
                          isMobile
                          ? [
                              "rotate(0deg) translate(0px)",
                              "rotate(0deg) translate(0px)",
                              "rotate(0deg) translate(0px)", 
                              "rotate(0deg) translate(0px)",
                              "rotate(0deg) translate(0px)"
                          ]
                          : [
                              "rotate(10deg) translate(-170px)",
                              "rotate(5deg) translate(-85px)",
                              "rotate(0deg)", 
                              "rotate(-5deg) translate(85px)",
                              "rotate(-10deg) translate(170px)"
                          ]
                      }
                   >
                       <ParallaxCard 
                          title="Spatial Graphs" 
                          subtitle="Visualize" 
                          icon={<Network size={32} />}
                          description="Connect concepts. Don't just memorize."
                       />
                       <ParallaxCard 
                          title="Co-op Raids" 
                          subtitle="Multiplayer" 
                          icon={<Users size={32} />}
                          description="Squad up. Defeat ignorance together."
                       />
                       <ParallaxCard 
                          title="Persona Tutors" 
                          subtitle="Adaptive AI" 
                          icon={<Bot size={32} />}
                          description="Drill Sergeant or Zen Master?"
                       />
                        <ParallaxCard 
                          title="Instant Paths" 
                          subtitle="Generative" 
                          icon={<Zap size={32} />}
                          description="Any topic. Full curriculum. Seconds."
                       />
                        <ParallaxCard 
                          title="Skill Trees" 
                          subtitle="Progression" 
                          icon={<Activity size={32} />}
                          description="Track mastery. Level up your brain."
                       />
                   </BounceCards>
                    </div>
                </div>
      </section>

      {/* COMMUNITY SECTION - Chroma Grid */}
      <section className="relative min-h-screen z-20 py-16 sm:py-24 md:py-32 px-4 sm:px-8 md:px-20 bg-black flex flex-col items-center justify-center">
          <div className="text-center mb-8 sm:mb-12 md:mb-16 px-4">
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 tracking-tighter">
                  Core <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">System Modules</span>
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base md:text-lg">
                  Explore the advanced components powering your cognitive upgrade.
              </p>
        </div>

          <div className="w-full h-[800px] sm:h-[700px] md:h-[800px] relative">
              <ChromaGrid 
                  columns={isMobile ? 2 : 3}
                  rows={isMobile ? 3 : 2}
                  items={[
                    {
                        title: "Constellation Maps",
                        subtitle: "Visual Knowledge Graph",
                        description: "Navigate knowledge like a universe. Nodes represent concepts; connections represent relationships. Master nodes to unlock new frontiers.",
                        icon: <Network size={40} className="text-cyan-400" />,
                        borderColor: "#22d3ee",
                        gradient: "linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(0,0,0,0.8))"
                    },
                    {
                        title: "Generative Engine",
                        subtitle: "Instant Curriculum",
                        description: "Type any topic. The AI architect constructs a complete learning path with lessons, quizzes, and projects in seconds.",
                        icon: <Zap size={40} className="text-purple-400" />,
                        borderColor: "#a78bfa",
                        gradient: "linear-gradient(135deg, rgba(167, 139, 250, 0.1), rgba(0,0,0,0.8))"
                    },
                    {
                        title: "Co-op Raids",
                        subtitle: "Multiplayer Learning",
                        description: "Form a squad. Sync your neural links. Answer questions together in real-time to defeat high-level Chaos Bosses.",
                        icon: <Users size={40} className="text-emerald-400" />,
                        borderColor: "#34d399",
                        gradient: "linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(0,0,0,0.8))"
                    },
                    {
                        title: "Mentor Personas",
                        subtitle: "Adaptive Guidance",
                        description: "Choose your guide. From a strict Drill Sergeant to a cryptic Zen Master. The AI adapts its teaching style to your personality.",
                        icon: <Bot size={40} className="text-pink-400" />,
                        borderColor: "#f472b6",
                        gradient: "linear-gradient(135deg, rgba(244, 114, 182, 0.1), rgba(0,0,0,0.8))"
                    },
                    {
                        title: "Chaos Mode",
                        subtitle: "High-Stakes Testing",
                        description: "Test your mastery. 3 lives. Increasing difficulty. One wrong move and the node destabilizes. Only the worthy survive.",
                        icon: <Shield size={40} className="text-red-400" />,
                        borderColor: "#f87171",
                        gradient: "linear-gradient(135deg, rgba(248, 113, 113, 0.1), rgba(0,0,0,0.8))"
                    },
                    {
                        title: "Live Widgets",
                        subtitle: "Interactive Simulations",
                        description: "Don't just read. Code, manipulate 3D models, and run physics simulations directly within the learning interface.",
                        icon: <Layers size={40} className="text-yellow-400" />,
                        borderColor: "#facc15",
                        gradient: "linear-gradient(135deg, rgba(250, 204, 21, 0.1), rgba(0,0,0,0.8))"
                    }
                  ]}
                  radius={300}
                  damping={0.45}
                  fadeOut={0.6}
                  ease="power3.out"
            />
        </div>
      </section>

      {/* IMMERSIVE DEMO SECTION - Interactive Terminal */}
      <section className="relative min-h-screen py-16 sm:py-24 md:h-screen bg-white text-black z-20 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>
          
          <div className="w-full max-w-6xl px-4 sm:px-6 grid lg:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-center">
              <div>
                  <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 sm:mb-4 border-b border-black/10 pb-3 sm:pb-4">System Preview</h3>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 md:mb-8 tracking-tighter">
                      Experience <br/> The Flow
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg text-zinc-600 mb-6 sm:mb-8 max-w-md font-light">
                      See exactly how EduOS deconstructs complex topics into a personalized learning path. No sign-up required for this demo.
                  </p>
                  
                  <div className="space-y-6">
                      <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold shrink-0">1</div>
                          <div>
                              <h4 className="font-bold">Input Target</h4>
                              <p className="text-sm text-zinc-500">Define your learning objective.</p>
                          </div>
                      </div>
                       <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0">2</div>
                          <div>
                              <h4 className="font-bold">Neural Synthesis</h4>
                              <p className="text-sm text-zinc-500">AI scans millions of data points to structure knowledge.</p>
                          </div>
                      </div>
                       <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0">3</div>
                          <div>
                              <h4 className="font-bold">Execution</h4>
                              <p className="text-sm text-zinc-500">Receive your tailored curriculum and begin.</p>
                          </div>
                      </div>
                  </div>
                </div>

              <div className="relative">
                  {/* Decorative Elements */}
                  <div className="absolute -top-10 -right-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
                  
                  <InteractiveDemo onStart={onStart} />
              </div>
          </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-white py-20 px-6 border-t border-white/10 z-20 relative">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end">
              <div>
                  <h2 className="text-[15vw] md:text-[10vw] font-bold leading-none tracking-tighter opacity-20 hover:opacity-100 transition-opacity duration-700 cursor-default">
                      eduOS
                  </h2>
              </div>
              <div className="flex flex-col items-end gap-4 mt-10 md:mt-0">
                  <div className="text-right">
                      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">System Status</p>
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          OPERATIONAL
                      </div>
                  </div>
                  <AnimatedList delay={0.1} className="flex gap-6 mt-4 text-xs font-mono tracking-widest uppercase">
                      <a href="#" className="text-zinc-500 hover:text-white transition-colors">Twitter</a>
                      <a href="#" className="text-zinc-500 hover:text-white transition-colors">GitHub</a>
                      <a href="#" className="text-zinc-500 hover:text-white transition-colors">Discord</a>
                  </AnimatedList>
                  <div className="text-zinc-700 text-[10px] mt-8 font-mono">
                      © 2024 EDUOS INC. // OPEN SOURCE
                  </div>
              </div>
          </div>
      </footer>
    </div>
  );
};

const InteractiveDemo = ({ onStart }: { onStart: () => void }) => {
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'generating' | 'complete'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>([]);

  const handleSimulate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    setPhase('analyzing');
    setLogs([]);

    const steps = [
        { msg: "Establishing secure handshake...", delay: 400 },
        { msg: `Analyzing semantic density: "${input}"`, delay: 1200 },
        { msg: "Querying global knowledge graph...", delay: 2000 },
        { msg: "Identifying core concepts...", delay: 2800 },
        { msg: "Structuring curriculum modules...", delay: 3500 },
    ];

    steps.forEach(({ msg, delay }) => {
        setTimeout(() => setLogs(prev => [...prev, msg]), delay);
    });

    setTimeout(() => {
        setPhase('generating');
        // Generate mock modules based on input or generic fallback
        setModules([
            `Fundamentals of ${input}`,
            `Core Principles & Theory`,
            `Advanced Applications`,
            `Project: ${input} in Practice`,
            `Mastery Assessment`
        ]);
    }, 4500);

    setTimeout(() => {
        setPhase('complete');
    }, 6000);
  };

    return (
    <div className="w-full h-[400px] sm:h-[450px] md:h-[500px] bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 relative group font-mono text-xs sm:text-sm">
        {/* Terminal Header */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 justify-between z-20">
            <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                EDU_OS_TERMINAL_V2.0
                 </div>
             </div>

             {/* Content Area */}
        <div className="absolute inset-0 pt-10 p-6 flex flex-col">
                 <AnimatePresence mode="wait">
                {phase === 'idle' && (
                        <motion.div 
                        key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center gap-6"
                    >
                        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 mb-2">
                            <Sparkles size={32} className="text-cyan-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Initialize Learning Protocol</h3>
                        
                        <form onSubmit={handleSimulate} className="w-full max-w-sm relative">
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="What do you want to master?"
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-zinc-900 transition-all text-center"
                                autoFocus
                            />
                            <button 
                                type="submit"
                                disabled={!input.trim()}
                                className="absolute right-2 top-2 p-1.5 bg-white text-black rounded-lg hover:scale-105 disabled:opacity-0 transition-all"
                            >
                                <ArrowRight size={16} />
                            </button>
                        </form>
                        <div className="flex gap-2 text-[10px] text-zinc-600">
                            <span>Try:</span>
                            {['Astrophysics', 'React Native', 'Stoicism'].map(tag => (
                                <button key={tag} onClick={() => { setInput(tag); }} className="hover:text-cyan-400 cursor-pointer transition-colors border-b border-zinc-800 hover:border-cyan-400 border-dashed">
                                    {tag}
                                </button>
                            ))}
                            </div>
                        </motion.div>
                    )}

                {(phase === 'analyzing' || phase === 'generating') && (
                        <motion.div 
                        key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col p-4 font-mono"
                    >
                         <div className="space-y-2">
                            {logs.map((log, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 text-xs text-zinc-400"
                                >
                                    <span className="text-emerald-500">➜</span> {log}
                                </motion.div>
                            ))}
                            {phase === 'generating' && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-4 pt-4 border-t border-zinc-800/50"
                                >
                                    <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
                                        <Loader2 size={14} className="animate-spin" /> 
                                        <span>SYNTHESIZING_GRAPH_NODES...</span>
                                    </div>
                        </motion.div>
                    )}
                        </div>
                        
                        {/* Matrix Rain Effect Background */}
                        <div className="absolute inset-0 pointer-events-none opacity-5 z-0">
                            <div className="w-full h-full bg-[url('https://media.giphy.com/media/U3qYN8S0j3bpK/giphy.gif')] bg-cover mix-blend-screen" />
                        </div>
                        </motion.div>
                    )}

                {phase === 'complete' && (
                        <motion.div 
                        key="complete"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col"
                    >
                        <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-4">
                            <div>
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Target Identified</h4>
                                <h2 className="text-2xl font-bold text-white tracking-tight">{input}</h2>
                            </div>
                            <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20 flex items-center gap-1">
                                <Check size={12} /> READY
                            </div>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
                            {modules.map((mod, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors group cursor-default"
                                >
                                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold group-hover:text-white group-hover:bg-zinc-700 transition-colors">
                                        0{i+1}
                                    </div>
                                    <span className="text-zinc-300 text-xs font-medium group-hover:text-white transition-colors">{mod}</span>
                                </motion.div>
                            ))}
                        </div>

                        <button 
                            onClick={onStart}
                            className="mt-6 w-full py-3 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                        >
                            <Play size={14} fill="currentColor" /> Begin Journey
                            </button>
                        </motion.div>
                    )}
                 </AnimatePresence>
             </div>
        </div>
    );
};


const ParallaxCard = ({ title, subtitle, description, icon }: any) => {
    return (
        <div className="group relative w-full h-full bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center justify-center text-center">
             <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mb-4 text-white border border-zinc-800 group-hover:border-cyan-500/30 transition-colors">
            {icon}
        </div>
            <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2">{subtitle}</div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{title}</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-light">
            {description}
        </p>
        </div>
);
};

export default React.memo(LandingPage);
