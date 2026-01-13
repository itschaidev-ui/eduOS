import React, { useState, useEffect, useRef, ReactNode, Component, Suspense, lazy, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot, deleteDoc, addDoc, getDocs, orderBy } from 'firebase/firestore';
import { auth, db, signInWithGoogle, signInAsGuest, checkRedirectResult } from './services/firebase';
import { useDataPersistence } from './hooks/useDataPersistence';
import { ContentMode, KnowledgeNode, LessonContent, UserState, OnboardingData, CurriculumOption, CoopTeam, ContentReport, ChaosBattle, InteractiveWidget } from './types';
import { generateLesson, generateRabbitHole, generateKnowledgeGraph, generateExpansionGraph, generateChaosBattle, generateLessonChallenge } from './services/gemini';
import { Brain, Star, Clock, Trophy, RefreshCw, Play, Rabbit, Settings, Layers, Menu, X, Share2, Users, LogIn, LogOut, AlertCircle, Info, CheckCircle2, Loader2, Flag, ShieldAlert, LayoutDashboard, Globe, ExternalLink, Youtube, FileText, Gift, Skull, PlusCircle, Heart, ChevronRight, ChevronLeft, MessageSquare, Zap } from 'lucide-react';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';

// Lazy Load Components
const ConstellationMap = lazy(() => import('./components/ConstellationMap'));
const GenerativeWidget = lazy(() => import('./components/GenerativeWidgets'));
const MentorChat = lazy(() => import('./components/MentorChat'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const Onboarding = lazy(() => import('./components/Onboarding'));
const CoopDashboard = lazy(() => import('./components/CoopDashboard'));
const DashboardHub = lazy(() => import('./components/DashboardHub'));
const RaidSession = lazy(() => import('./components/RaidSession'));

// --- Inline Interactive Challenge Trigger Component ---
const InteractiveTrigger = ({ 
    context, 
    archetype, 
    onActivate, 
    isLoading 
}: { 
    context: string, 
    archetype: string, 
    onActivate: () => void,
    isLoading: boolean 
}) => {
    return (
        <div className="my-16 relative group">
             <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 blur-xl rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
             <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
                 
                 <div className="flex-1">
                     <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-2">
                         <Zap size={14} className="fill-current" />
                         <span>Practical Challenge Available</span>
                     </div>
                     <h3 className="text-2xl font-bold text-white mb-2">
                        {archetype === 'Debugger' && "System Malfunction Detected"}
                        {archetype === 'Architect' && "Blueprint Required"}
                        {archetype === 'Skeptic' && "Defend Your Thesis"}
                        {archetype === 'SpeedRun' && "Neural Reflex Test"}
                        {archetype === 'Analyst' && "Pattern Recognition"}
                        {!['Debugger', 'Architect', 'Skeptic', 'SpeedRun', 'Analyst'].includes(archetype) && "Interactive Module"}
                     </h3>
                     <p className="text-zinc-400 text-sm">
                        {archetype === 'Debugger' && "A code segment is failing. Use your new knowledge to patch the logic."}
                        {archetype === 'Architect' && "Design a system component based on the constraints provided."}
                        {archetype === 'Skeptic' && "A rival AI is challenging your understanding. Win the debate."}
                        {archetype === 'SpeedRun' && "Sort and categorize concepts before the timer runs out."}
                        {archetype === 'Analyst' && "Interpret the incoming data stream to find the anomaly."}
                        {!['Debugger', 'Architect', 'Skeptic', 'SpeedRun', 'Analyst'].includes(archetype) && "Apply what you just learned in a hands-on simulation."}
                     </p>
                 </div>

                 <button 
                    onClick={onActivate}
                    disabled={isLoading}
                    className="flex-none px-8 py-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2"
                 >
                     {isLoading ? (
                         <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            Initializing...
                         </>
                     ) : (
                         <>
                            Initialize <Play size={12} fill="currentColor" />
                         </>
                     )}
                 </button>
             </div>
        </div>
    );
};


// Error Boundary Component
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-black text-white flex-col gap-4">
              <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center border border-red-500/50 mb-4 animate-pulse">
                  <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Neural Link Destabilized</h2>
              <p className="text-zinc-500 text-sm max-w-md text-center font-mono">
                  RENDER_MATRIX_ANOMALY_DETECTED.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-2 bg-white text-black hover:bg-zinc-200 rounded-full font-bold transition-all mt-4 text-xs tracking-widest uppercase"
              >
                  Reboot System
              </button>
          </div>
      );
    }

    return this.props.children;
  }
}

type AppView = 'landing' | 'onboarding' | 'dashboard' | 'map' | 'lesson' | 'coop' | 'raid' | 'admin';

const LoadingScreen = ({ message = "Establishing Neural Link...", longLoad = false, onReset }: { message?: string, longLoad?: boolean, onReset?: () => void }) => (
    <div className="flex h-screen bg-black items-center justify-center flex-col gap-6">
        <div className="relative">
            <div className="w-16 h-16 border-t-2 border-white rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
        </div>
        <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase animate-pulse">{message}</p>
        {longLoad && onReset && (
            <button 
                onClick={onReset}
                className="mt-4 text-xs text-red-400 hover:text-red-300 underline animate-in fade-in font-mono"
            >
                FORCE_RESET_CONNECTION
            </button>
        )}
    </div>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppView>('landing');
  const [notification, setNotification] = useState<{message: string, type: 'info' | 'error' | 'success'} | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [loadingLong, setLoadingLong] = useState(false); 
  
  // Custom Hook for Data Persistence
  const {
      loadingData,
      userState,
      setUserState,
      nodes,
      setNodes,
      curriculumTitle,
      setCurriculumTitle,
      teams,
      setTeams,
      reports,
      setReports,
      saveUserData,
      isLocalGuest,
      isAdmin,
      INITIAL_USER_STATE
  } = useDataPersistence(user);
  
  // Lesson State
  const [lessonLoading, setLessonLoading] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [contentMode, setContentMode] = useState<ContentMode>(ContentMode.ACADEMIC); // Default to Academic
  const [rabbitHoleContent, setRabbitHoleContent] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default open on desktop
  
  // Dynamic Widget State
  const [activeWidgets, setActiveWidgets] = useState<{[key: string]: InteractiveWidget}>({});
  const [loadingWidgets, setLoadingWidgets] = useState<{[key: string]: boolean}>({});

  // Chaos Battle State
  const [chaosBattle, setChaosBattle] = useState<ChaosBattle | null>(null);
  const [chaosLives, setChaosLives] = useState(3);
  const [chaosIndex, setChaosIndex] = useState(0);

  // Coop State
  const [currentRaidTeamId, setCurrentRaidTeamId] = useState<string | null>(null);

  // Admin State
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // Graph Loading State
  const [graphLoading, setGraphLoading] = useState(false);
  const [useCustomCursor, setUseCustomCursor] = useState(true);

  const allNodesCompleted = nodes.length > 0 && nodes.every(n => n.status === 'mastered');

  // Custom Cursor Logic (Global)
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const [cursorVariant, setCursorVariant] = useState('default');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/touch devices
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!useCustomCursor || isMobile) return;

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 8);
      cursorY.set(e.clientY - 8);
    };

    const handleMouseDown = () => setCursorVariant('click');
    const handleMouseUp = () => setCursorVariant('default');
    
    // Add listeners for clickable elements
    const handleLinkHover = () => setCursorVariant('hover');
    const handleLinkLeave = () => setCursorVariant('default');

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("dragover", moveCursor); // Handle drag events
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    // Attach to all buttons and links dynamically
    const clickables = document.querySelectorAll('button, a, .cursor-pointer');
    clickables.forEach(el => {
        el.addEventListener('mouseenter', handleLinkHover);
        el.addEventListener('mouseleave', handleLinkLeave);
    });

    // MutationObserver to handle dynamically added elements
    const observer = new MutationObserver(() => {
        const newClickables = document.querySelectorAll('button, a, .cursor-pointer');
        newClickables.forEach(el => {
            el.removeEventListener('mouseenter', handleLinkHover);
            el.removeEventListener('mouseleave', handleLinkLeave);
            el.addEventListener('mouseenter', handleLinkHover);
            el.addEventListener('mouseleave', handleLinkLeave);
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("dragover", moveCursor);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      clickables.forEach(el => {
          el.removeEventListener('mouseenter', handleLinkHover);
          el.removeEventListener('mouseleave', handleLinkLeave);
      });
      observer.disconnect();
    };
  }, [useCustomCursor, isMobile]);

  const cursorSpringConfig = { damping: 50, stiffness: 1000 };
  const cursorXSpring = useSpring(cursorX, cursorSpringConfig);
  const cursorYSpring = useSpring(cursorY, cursorSpringConfig);

  // Set up Firebase Auth state listener and check for redirect results
  useEffect(() => {
    // Check for redirect result first (must be called before onAuthStateChanged)
    const handleRedirect = async () => {
      try {
        const redirectUser = await checkRedirectResult();
        if (redirectUser) {
          setNotification({ type: 'success', message: "Authentication successful!" });
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
      }
    };
    handleRedirect();

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && appState === 'landing') {
        // User just signed in, navigate appropriately
        if (nodes.length > 0) {
          setAppState('dashboard');
        } else {
          setAppState('onboarding');
        }
      }
    });

    return () => unsubscribe();
  }, [appState, nodes.length]);

  // Parse URL for invite code on mount (Hash and Path support)
  useEffect(() => {
    const handleInvite = () => {
        let code: string | null = null;
        const path = window.location.pathname;
        const pathMatch = path.match(/^\/join\/([a-zA-Z0-9-]+)$/);
        if (pathMatch) code = pathMatch[1];

        const hash = window.location.hash;
        const hashMatch = hash.match(/^#\/join\/([a-zA-Z0-9-]+)$/);
        if (hashMatch) code = hashMatch[1];

        if (code) {
            setPendingInviteCode(code);
            const cleanUrl = window.location.origin + window.location.pathname.replace(/\/join\/[a-zA-Z0-9-]+/, '');
            window.history.replaceState({}, '', cleanUrl); 
            
            setNotification({
                type: 'info',
                message: `Invite detected: ${code}. Sign in to join squad.`
            });
        }
    };

    handleInvite();
    window.addEventListener('hashchange', handleInvite);
    return () => window.removeEventListener('hashchange', handleInvite);
  }, []);

  const spawnEventNode = useCallback((currentNodes: KnowledgeNode[], variant: 'chaos' | 'treasure' | 'mystery'): KnowledgeNode[] => {
      const maxX = Math.max(...currentNodes.map(n => n.x)) + 100;
      const avgY = currentNodes.reduce((acc, n) => acc + n.y, 0) / currentNodes.length;
      
      const eventNode: KnowledgeNode = {
          id: `${variant}-${Date.now()}`,
          label: variant === 'chaos' ? 'CHAOS TEST' : variant === 'treasure' ? 'SECRET CACHE' : 'MYSTERY SIGNAL',
          x: maxX + 100,
          y: avgY + (Math.random() * 200 - 100),
          status: 'available',
          connections: [],
          category: 'side-quest',
          type: variant
      };
      return [...currentNodes, eventNode];
  }, []);

  const handleExpandGraph = async () => {
      setGraphLoading(true);
      try {
          const newNodes = await generateExpansionGraph(curriculumTitle, nodes);
          if (newNodes.length > 0) {
              const lastMastered = nodes.filter(n => n.status === 'mastered').pop();
              if (lastMastered) {
                  lastMastered.connections.push(newNodes[0].id);
              }
              
              setNodes(prev => [...prev, ...newNodes]);
              setNotification({ type: 'success', message: "Frontier Expanded. New modules available." });
          } else {
              setNotification({ type: 'error', message: "Expansion failed. Try again later." });
          }
      } catch (e) {
          console.error(e);
      } finally {
          setGraphLoading(false);
      }
  };
  
  const loadLesson = useCallback(async (nodeId: string, mode: ContentMode) => {
    setLessonLoading(true);
    setCurrentLesson(null);
    setActiveWidgets({});
    setLoadingWidgets({});
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
        setLessonLoading(false);
        return;
    }

    // Optimization: Check for cached content first
    if (node.cachedContent) {
        setCurrentLesson(node.cachedContent);
        setLessonLoading(false);
        return;
    }

    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    const isFirstLesson = nodeIndex === 0;

    const content = await generateLesson(node.label, curriculumTitle, mode, isFirstLesson);
    
    if (content) {
        setCurrentLesson(content);
        
        // Save content to cache
        setNodes(prev => prev.map(n => 
            n.id === nodeId ? { ...n, cachedContent: content } : n
        ));
    }
    
    setLessonLoading(false);
  }, [nodes, curriculumTitle]);

  const handleStartJourney = async () => {
    if (!user) {
      try {
        await signInWithGoogle();
      } catch (error: any) {
        console.error("Auth error", error);
        setNotification({ type: 'error', message: "Authentication failed. Try again." });
      }
    } else {
        if (nodes.length > 0) {
            setAppState('dashboard');
        } else {
            setAppState('onboarding');
        }
    }
  };

  const handleGuestLogin = async () => {
    if (!user) {
        try {
            await signInAsGuest();
        } catch (error: any) {
             console.warn("Guest login failed (likely disabled in console). Using Offline Fallback.");
             
             // Check for existing offline session first
             let mockUid = localStorage.getItem('offline_guest_uid');
             if (!mockUid) {
                 mockUid = `guest-local-${Date.now()}`;
                 localStorage.setItem('offline_guest_uid', mockUid);
             }

             const mockUser = { 
                 uid: mockUid, 
                 displayName: 'Guest', 
                 email: null, 
                 isAnonymous: true,
                 emailVerified: false,
                 metadata: {},
                 phoneNumber: null,
                 photoURL: null,
                 providerData: [],
                 providerId: 'firebase',
                 refreshToken: '',
                 tenantId: null,
                 delete: async () => {},
                 getIdToken: async () => '',
                 getIdTokenResult: async () => ({} as any),
                 reload: async () => {},
                 toJSON: () => ({}),
             } as unknown as User;

             setNotification({ type: 'info', message: "Guest Mode (Offline) Activated." });
             setUser(mockUser);
        }
    } else {
        if (nodes.length > 0) setAppState('dashboard');
        else setAppState('onboarding');
    }
  };

  const handleSignOut = useCallback(() => {
      auth.signOut().catch(console.error);
      localStorage.removeItem('offline_guest_uid');
      setUser(null);
      setAppState('landing');
      setNodes([]);
      setNotification({ type: 'info', message: "Session Terminated." });
  }, []);

  const handleOnboardingComplete = async (data: OnboardingData, selectedCurriculum: CurriculumOption) => {
      if (!user) return;

      const newUserState = {
          ...INITIAL_USER_STATE,
          uid: user.uid,
          displayName: data.name || user.displayName || 'Traveler'
      };
      
      setUserState(newUserState);
      setCurriculumTitle(selectedCurriculum.title);
      setGraphLoading(true);
      
      try {
        let newNodes: KnowledgeNode[] = [];
        try {
            newNodes = await generateKnowledgeGraph(selectedCurriculum.title, data.goal);
        } catch (genError) {
            console.error("Graph Generation Failed completely:", genError);
        }
        
        if (!newNodes || newNodes.length === 0) {
            setNotification({ type: 'error', message: "Neural generation failed. Please try again." });
            setGraphLoading(false);
            return;
        }

        setNodes(newNodes);
        setAppState('dashboard');
        
            if (isLocalGuest(user)) {
                const localData = {
                    userState: newUserState,
                    onboardingData: data,
                    curriculumTitle: selectedCurriculum.title,
                    nodes: newNodes,
                    createdAt: new Date().toISOString()
                };
                localStorage.setItem(`eduos_user_${user.uid}`, JSON.stringify(localData));
            } else {
                    await setDoc(doc(db, 'users', user.uid), {
                        userState: newUserState,
                        onboardingData: data,
                        curriculumTitle: selectedCurriculum.title,
                        nodes: newNodes,
                        createdAt: new Date().toISOString()
                    });
        }

        if (pendingInviteCode) {
            handleJoinTeam(pendingInviteCode, data.name).then(success => {
                if (success) setAppState('coop');
            });
            setPendingInviteCode(null);
        }

      } catch (e) {
          console.error("Critical Onboarding Error:", e);
          setNotification({ type: 'error', message: "Critical error during initialization." });
      } finally {
          setGraphLoading(false);
      }
  };

  const handleWidgetComplete = (xp: number, sectionIndex: number) => {
      if (!currentLesson || !activeNode) return;

      // Check if already completed
      if (currentLesson.completedWidgetIndices?.includes(sectionIndex)) {
          setNotification({ type: 'info', message: "Simulation previously mastered. No new XP awarded." });
          return;
      }

      const newXp = userState.xp + xp;
      setUserState(prev => ({ ...prev, xp: newXp }));
      setNotification({ type: 'success', message: `Challenge Complete! +${xp} XP` });
      
      // Mark as completed
      const updatedLesson = {
          ...currentLesson,
          completedWidgetIndices: [...(currentLesson.completedWidgetIndices || []), sectionIndex]
      };
      
      setCurrentLesson(updatedLesson);
      const updatedNodes = nodes.map(n => 
          n.id === activeNode ? { ...n, cachedContent: updatedLesson } : n
      );
      setNodes(updatedNodes);

      saveUserData(updatedNodes, { ...userState, xp: newXp });
  };

  const handleTriggerWidget = async (sectionIndex: number, context: string, archetype: string) => {
      if (activeWidgets[sectionIndex] || loadingWidgets[sectionIndex]) return;

      setLoadingWidgets(prev => ({...prev, [sectionIndex]: true}));
      
      // Check persistent cache
      if (currentLesson?.cachedWidgets && currentLesson.cachedWidgets[sectionIndex]) {
          setActiveWidgets(prev => ({...prev, [sectionIndex]: currentLesson.cachedWidgets![sectionIndex]}));
          setLoadingWidgets(prev => ({...prev, [sectionIndex]: false}));
          return;
      }

      const nodeLabel = nodes.find(n => n.id === activeNode)?.label || "Current Topic";
      const widget = await generateLessonChallenge(nodeLabel, context, archetype);
      
      if (widget) {
          setActiveWidgets(prev => ({...prev, [sectionIndex]: widget}));
          
          // Save to persistent cache
           if (currentLesson && activeNode) {
               const updatedLesson = {
                   ...currentLesson,
                   cachedWidgets: {
                       ...currentLesson.cachedWidgets,
                       [sectionIndex]: widget
                   }
               };
               setCurrentLesson(updatedLesson);
               setNodes(prev => prev.map(n => 
                   n.id === activeNode ? { ...n, cachedContent: updatedLesson } : n
               ));
           }

      } else {
          setNotification({ type: 'error', message: "Failed to initialize simulation." });
      }
      
      setLoadingWidgets(prev => ({...prev, [sectionIndex]: false}));
  };
  
  const handleNodeSelect = async (nodeId: string) => {
    setActiveNode(nodeId);
    setAppState('lesson');
    setRabbitHoleContent(null);
    setChaosBattle(null);
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'chaos') {
        setLessonLoading(true);
        const battle = await generateChaosBattle(curriculumTitle);
        setChaosBattle(battle);
        setChaosLives(3);
        setChaosIndex(0);
        setLessonLoading(false);
    } else if (node.type === 'mystery') {
        setActiveNode(nodeId);
        triggerRabbitHole();
        // Clear the node after visiting? Or keep it? keeping it for now.
    } else if (node.type === 'treasure') {
         const reward = 500;
         const newUserState = {
             ...userState,
             xp: userState.xp + reward
         };
         setUserState(newUserState);
         
         setNotification({ type: 'success', message: `Treasure Found! +${reward} XP` });
         const newNodes = nodes.filter(n => n.id !== nodeId);
         setNodes(newNodes);
         saveUserData(newNodes, newUserState);
         
         setAppState('map');
    } else {
        await loadLesson(nodeId, contentMode);
    }
  };
  
  const handleNodeMove = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, [setNodes]);

  const handleModeChange = (newMode: ContentMode) => {
    setContentMode(newMode);
    if (activeNode) {
      const node = nodes.find(n => n.id === activeNode);
      if (node && node.type !== 'chaos') {
          loadLesson(activeNode, newMode);
      }
    }
  };

  const triggerRabbitHole = async () => {
      if(!activeNode) return;
      
      const node = nodes.find(n => n.id === activeNode);
      if (!node) return;

      if (node.cachedRabbitHole) {
          setRabbitHoleContent(node.cachedRabbitHole);
          return;
      }

      setRabbitHoleContent("Falling down the rabbit hole...");
      const content = await generateRabbitHole(node.label);
      setRabbitHoleContent(content);

      // Cache it
      setNodes(prev => prev.map(n => 
          n.id === activeNode ? { ...n, cachedRabbitHole: content } : n
      ));
  };

  const handleCompleteLesson = async () => {
    if (!activeNode || !user) return;

    let updatedNodes = [...nodes];
    const currentNode = updatedNodes.find(n => n.id === activeNode);
    if (!currentNode) return;

    if (currentNode.status === 'mastered') {
        setNotification({ type: 'info', message: "Module already assimilated. No additional XP awarded." });
        setAppState('map');
        setActiveNode(null);
        return;
    }

    updatedNodes = updatedNodes.map(n => n.id === activeNode ? { ...n, status: 'mastered' } : n);
    
    let nodesUnlockedCount = 0;
    currentNode.connections.forEach(connId => {
        updatedNodes = updatedNodes.map(n => {
            if (n.id === connId && n.status === 'locked') {
                nodesUnlockedCount++;
                return { ...n, status: 'available' };
            }
            return n;
        });
    });

    if (nodesUnlockedCount === 0) {
        const currentIndex = updatedNodes.findIndex(n => n.id === activeNode);
        const nextLockedNode = updatedNodes.find((n, idx) => idx > currentIndex && n.status === 'locked');
        if (nextLockedNode) {
            updatedNodes = updatedNodes.map(n => n.id === nextLockedNode.id ? { ...n, status: 'available' } : n);
        }
    }

    let newMomentum = userState.momentum + 15;
    let newStreak = userState.streak;
    let newXp = userState.xp + 250;
    let notificationMsg = "Module Assimilated. +250 XP.";

    if (Math.random() < 0.1) {
        const treasureNode: KnowledgeNode = {
             id: `loot-${Date.now()}`,
             label: 'SECRET CACHE',
             x: currentNode.x + (Math.random() * 100 - 50),
             y: currentNode.y + 100,
             status: 'available',
             connections: [],
             category: 'side-quest',
             type: 'treasure'
        };
        updatedNodes.push(treasureNode);
        notificationMsg += " Secret Cache Detected!";
    }

    if (newMomentum >= 100) {
        newMomentum = 0;
        newStreak += 1;
        
        // Random Event
        const roll = Math.random();
        if (roll < 0.4) {
             notificationMsg = "MOMENTUM CRITICAL! Chaos Node Manifesting...";
             updatedNodes = spawnEventNode(updatedNodes, 'chaos');
        } else if (roll < 0.7) {
             notificationMsg = "Mystery Signal Detected...";
             updatedNodes = spawnEventNode(updatedNodes, 'mystery');
        } else {
             notificationMsg = "Hidden Cache Revealed!";
             updatedNodes = spawnEventNode(updatedNodes, 'treasure');
        }
    }

    const newUserState: UserState = {
        ...userState,
        xp: newXp,
        momentum: newMomentum,
        completedNodes: [...userState.completedNodes, activeNode],
        streak: newStreak
    };

    setNodes(updatedNodes);
    setUserState(newUserState);
    setNotification({
        type: 'success',
        message: notificationMsg
    });
    setAppState('map');
    setActiveNode(null);

    saveUserData(updatedNodes, newUserState);
  };

  const handleChaosAnswer = (isCorrect: boolean) => {
      if (!chaosBattle) return;

      if (isCorrect) {
          if (chaosIndex < chaosBattle.questions.length - 1) {
              setChaosIndex(prev => prev + 1);
          } else {
              setNotification({ type: 'success', message: "CHAOS DEFEATED! +10,000 XP" });
              setUserState(prev => ({ ...prev, xp: prev.xp + 10000 }));
              setNodes(prev => prev.filter(n => n.id !== activeNode));
              setAppState('map');
          }
      } else {
          const newLives = chaosLives - 1;
          setChaosLives(newLives);
          if (newLives <= 0) {
               setNotification({ type: 'error', message: "CRITICAL FAILURE. Node Destabilizing..." });
               setNodes(prev => prev.filter(n => n.id !== activeNode));
               setAppState('map');
          }
      }
  }

  const handleCreateTeam = async (name: string): Promise<boolean> => {
      if (!user) return false;

      const isAlreadyCaptain = teams.some(t => t.members.find(m => m.uid === user.uid && m.role === 'Captain'));
      if (isAlreadyCaptain) {
           setNotification({
              type: 'error',
              message: `Command Protocol Violation: You can only maintain Captain rank for one squad.`
          });
          return false;
      }

      const teamId = `team-${Date.now()}`;
      const newTeam: CoopTeam = {
          id: teamId,
          name: name,
          inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          raidReady: false, 
          weeklyGoal: "Complete 10 Core Modules",
          memberIds: [user.uid],
          members: [
              {
                  uid: user.uid,
                  name: userState.displayName || "Captain",
                  role: 'Captain',
                  status: 'online',
                  xpContribution: userState.xp
              }
          ]
      };

      if (isLocalGuest(user)) {
          const updatedTeams = [...teams, newTeam];
          setTeams(updatedTeams);
          localStorage.setItem(`eduos_teams_${user.uid}`, JSON.stringify(updatedTeams));
          setNotification({ type: 'success', message: "Squad Initialized (Offline Simulation)." });
          return true;
      }

      try {
          await setDoc(doc(db, 'teams', teamId), newTeam);
          setNotification({ type: 'success', message: "Squad Initialized." });
          return true;
      } catch (e) {
          console.error("Create team failed:", e);
          setNotification({ type: 'error', message: "Failed to create squad." });
          return false;
      }
  };

  const handleDeleteTeam = async (teamId: string) => {
      if (!user) return;

      if (isLocalGuest(user)) {
           setTeams(prevTeams => {
                const updatedTeams = prevTeams.filter(t => t.id !== teamId);
                try {
                     localStorage.setItem(`eduos_teams_${user.uid}`, JSON.stringify(updatedTeams));
                } catch(e) { console.error(e); }
                return updatedTeams;
           });
           setNotification({ type: 'success', message: "Squad deleted." });
           return;
      }

      try {
          await deleteDoc(doc(db, 'teams', teamId));
          setNotification({ type: 'success', message: "Squad deleted." });
      } catch (e) {
          console.error(e);
          setNotification({ type: 'error', message: "Failed to delete squad." });
      }
  };

  const handleJoinTeam = async (code: string, explicitName?: string): Promise<boolean> => {
      if (!user) return false;
      
      if (isLocalGuest(user)) {
          setNotification({ type: 'info', message: "Join Co-op features require a verified Google account to sync." });
          return false;
      }

      try {
          const q = query(collection(db, 'teams'), where('inviteCode', '==', code));
          const { getDocs } = await import('firebase/firestore');
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
              setNotification({ type: 'error', message: "Invalid Invite Code." });
              return false;
          }

          const teamDoc = querySnapshot.docs[0];
          const teamData = teamDoc.data() as CoopTeam;

          if (teamData.memberIds.includes(user.uid)) {
              setNotification({ type: 'info', message: "You are already in this squad." });
              return false;
          }

          const nameToUse = explicitName || userState.displayName || "Traveler";
          const newMember = { 
              uid: user.uid, 
              name: nameToUse, 
              role: 'Member', 
              status: 'online', 
              xpContribution: userState.xp 
          };

          await updateDoc(doc(db, 'teams', teamDoc.id), {
              members: [...teamData.members, newMember],
              memberIds: [...teamData.memberIds, user.uid]
          });

          setNotification({ type: 'success', message: `Joined ${teamData.name}.` });
          return true;

      } catch (e) {
          console.error("Join failed:", e);
          return false;
      }
  };

  const handleEnterRaid = (team: CoopTeam) => {
      setCurrentRaidTeamId(team.id);
      setAppState('raid');
  };

  const handleReport = async () => {
      if (!user || !activeNode || !reportReason.trim()) return;

      const activeNodeLabel = nodes.find(n => n.id === activeNode)?.label || "Unknown";

      if (isLocalGuest(user)) {
          setNotification({ type: 'info', message: "Reports sent from Guest mode are not saved to the server." });
          setShowReportModal(false);
          setReportReason('');
          return;
      }

      try {
          await addDoc(collection(db, 'reports'), {
              userId: user.uid,
              userEmail: user.email,
              nodeLabel: activeNodeLabel,
              reason: reportReason,
              timestamp: Date.now(),
              status: 'open'
          });
          setNotification({ type: 'success', message: "Report submitted. Thank you for improving eduOS." });
          setShowReportModal(false);
          setReportReason('');
      } catch (e) {
          console.error("Report failed:", e);
          setNotification({ type: 'error', message: "Failed to submit report." });
      }
  };

  const fetchReports = async () => {
      // reports handled by hook
  };

  const handleResolveReport = async (reportId: string) => {
      try {
          await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
          setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
          setNotification({ type: 'success', message: "Report marked as resolved." });
      } catch (e) {
          console.error("Resolve failed", e);
      }
  };

  if (loadingData) {
      return (
          <LoadingScreen 
            longLoad={loadingLong} 
            onReset={() => { auth.signOut(); window.location.reload(); }} 
          />
      );
  }

  const currentRaidTeam = teams.find(t => t.id === currentRaidTeamId);

  return (
    <ErrorBoundary>
    <div className={`flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-white/20 ${useCustomCursor && !isMobile ? 'cursor-none' : ''}`}>
      
      {/* GLOBAL CUSTOM CURSOR */}
      {useCustomCursor && !isMobile && (
        <>
            <style>{`
                * { cursor: none !important; }
            `}</style>
            <motion.div 
                className="fixed top-0 left-0 w-4 h-4 bg-white rounded-full mix-blend-difference pointer-events-none z-[9999]"
                style={{ x: cursorXSpring, y: cursorYSpring }}
                animate={cursorVariant === 'click' ? { scale: 0.8 } : cursorVariant === 'hover' ? { scale: 1.5 } : { scale: 1 }}
            />
            <motion.div 
                className="fixed top-0 left-0 w-8 h-8 border border-white rounded-full mix-blend-difference pointer-events-none z-[9998]"
                style={{ x: cursorXSpring, y: cursorYSpring, translateX: -8, translateY: -8 }}
                animate={cursorVariant === 'click' ? { scale: 1.5, opacity: 0.5 } : cursorVariant === 'hover' ? { scale: 0.8, opacity: 1, borderColor: '#22d3ee' } : { scale: 1, opacity: 0.3 }}
                transition={{ duration: 0.15 }}
            />
        </>
      )}

      {/* GLOBAL NOTIFICATION */}
      <AnimatePresence>
      {notification && (
            <motion.div 
                initial={{ opacity: 0, y: -20, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: -20, x: "-50%" }}
                className={`fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-md border ${
                    notification.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 
                    notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200' :
                    'bg-white/10 border-white/20 text-white'
                }`}
            >
                {notification.type === 'error' ? <AlertCircle size={16} /> : 
                 notification.type === 'success' ? <CheckCircle2 size={16} /> : 
                 <Info size={16} />}
                <span className="text-xs font-medium tracking-wide">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={14}/></button>
            </motion.div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
                  <button 
                      onClick={() => setShowSettings(false)} 
                      className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                  >
                      <X size={20}/>
                  </button>
                  
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Settings size={20} className="text-zinc-400" />
                      System Configuration
                  </h3>
                  
                  <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-zinc-800">
                          <div>
                              <div className="text-sm font-bold text-white">Custom Cursor</div>
                              <div className="text-xs text-zinc-500">Enable advanced pointer visuals</div>
                          </div>
                          <button 
                              onClick={() => setUseCustomCursor(!useCustomCursor)}
                              className={`w-10 h-5 rounded-full relative transition-colors ${useCustomCursor ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                          >
                              <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${useCustomCursor ? 'left-6' : 'left-1'}`}></div>
                          </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-zinc-800">
                          <div>
                              <div className="text-sm font-bold text-white">Audio Feedback</div>
                              <div className="text-xs text-zinc-500">Interface sounds and ambient hum</div>
                          </div>
                          <div className="w-10 h-5 bg-zinc-800 rounded-full relative cursor-not-allowed opacity-50">
                              <div className="w-3 h-3 bg-zinc-500 rounded-full absolute top-1 left-1"></div>
                          </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-zinc-800">
                           <div>
                              <div className="text-sm font-bold text-white">High Contrast Mode</div>
                              <div className="text-xs text-zinc-500">Increase visual legibility</div>
                          </div>
                          <div className="w-10 h-5 bg-zinc-800 rounded-full relative cursor-not-allowed opacity-50">
                              <div className="w-3 h-3 bg-zinc-500 rounded-full absolute top-1 left-1"></div>
                          </div>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                          <div className="text-xs font-mono text-zinc-600 mb-2">USER_ID: {user?.uid || 'GUEST_MODE'}</div>
                          <div className="text-xs font-mono text-zinc-600">VERSION: 2.5.0-BETA</div>
                      </div>
                      
                      <div className="pt-4 border-t border-white/5">
                           <div className="text-sm font-bold text-white mb-3">Content Mode</div>
                           <div className="grid grid-cols-2 gap-2">
                               {Object.values(ContentMode).map(mode => (
                                   <button
                                       key={mode}
                                       onClick={() => {
                                           handleModeChange(mode);
                                           // Optional: Close settings if you want, or let them switch freely
                                       }}
                                       className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                                           contentMode === mode 
                                           ? 'bg-white text-black border-white shadow-lg' 
                                           : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700'
                                       }`}
                                   >
                                       {mode}
                                   </button>
                               ))}
                           </div>
                      </div>

                      <button 
                          onClick={handleSignOut}
                          className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-4"
                      >
                          <LogOut size={16} /> Disconnect Neural Link
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                          <Flag size={16} className="text-red-500" />
                          Report Content
                      </h3>
                      <button onClick={() => setShowReportModal(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                  </div>
                  <textarea 
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Describe the issue..."
                      className="w-full bg-black border border-zinc-800 rounded-lg p-4 text-white focus:border-white focus:outline-none min-h-[120px] mb-6 text-sm resize-none"
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowReportModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wide">Cancel</button>
                      <button 
                          onClick={handleReport}
                          disabled={!reportReason.trim()}
                          className="px-6 py-2 bg-white text-black hover:bg-zinc-200 rounded-full text-xs font-bold uppercase tracking-wide disabled:opacity-50"
                      >
                          Submit
                      </button>
                  </div>
              </div>
          </div>
      )}

      <Suspense fallback={<LoadingScreen />}>
      {appState === 'landing' ? (
        <LandingPage onStart={handleStartJourney} onGuest={handleGuestLogin} />
      ) : appState === 'onboarding' ? (
        <Onboarding onComplete={handleOnboardingComplete} onExit={handleSignOut} initialName={user?.displayName} />
      ) : appState === 'raid' && currentRaidTeam ? (
          <RaidSession team={currentRaidTeam} currentUser={userState} onExit={() => setAppState('coop')} />
      ) : appState === 'admin' && isAdmin(user) ? (
          <div className="w-full h-full flex flex-col bg-black">
               {/* Admin UI would go here with same style updates */}
               <div className="p-8 text-white">Admin Dashboard Placeholder</div>
          </div>
      ) : (
        <>
            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-black">
                
                {/* HUD Header */}
                <header className="h-14 sm:h-16 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 md:px-8 z-40 bg-black/80 backdrop-blur-md">
                    <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-1">
                        <div className="font-mono font-bold text-base sm:text-lg tracking-tighter text-white flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                            <span className="hidden sm:inline">eduOS</span>
                            <span className="sm:hidden">edu</span>
                    </div>
                    
                        {/* Breadcrumbs */}
                    {(appState === 'lesson' || appState === 'coop' || appState === 'map') && (
                            <div className="hidden sm:flex items-center gap-2 text-[10px] sm:text-xs font-mono text-zinc-500 uppercase tracking-wide min-w-0">
                                <span className="hover:text-white cursor-pointer transition-colors touch-manipulation" onClick={() => setAppState('dashboard')}>Hub</span>
                                <span className="text-zinc-700">/</span>
                                {appState === 'lesson' && (
                                    <>
                                        <span className="hover:text-white cursor-pointer transition-colors touch-manipulation" onClick={() => setAppState('map')}>Map</span>
                                        <span className="text-zinc-700">/</span>
                                    </>
                                )}
                                <span className="text-white truncate max-w-[120px] sm:max-w-[200px]">
                                    {appState === 'coop' ? 'SQUAD' : appState === 'map' ? 'MAP' : nodes.find(n => n.id === activeNode)?.label?.substring(0, 15)}
                            </span>
                        </div>
                    )}
                </div>

                    <div className="flex items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 shrink-0">
                        {/* XP Stats - Mobile Compact */}
                        <div className="flex sm:hidden items-center gap-1 text-[10px] font-mono">
                            <Star size={10} className="text-white" fill="currentColor" />
                            <span className="text-zinc-400">{userState.xp > 999 ? `${(userState.xp/1000).toFixed(1)}k` : userState.xp}</span>
                        </div>
                        
                        {/* XP Stats - Desktop */}
                        <div className="hidden sm:flex lg:flex items-center gap-4 md:gap-6 text-xs font-mono tracking-wider">
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Star size={12} className="text-white" fill="currentColor" />
                                <span className="hidden md:inline">{userState.xp.toLocaleString()} XP</span>
                                <span className="md:hidden">{userState.xp > 999 ? `${(userState.xp/1000).toFixed(1)}k` : userState.xp}</span>
                        </div>
                            <div className="hidden md:flex items-center gap-2 text-zinc-400">
                                <Clock size={12} />
                                <span>DAY {userState.streak}</span>
                        </div>
                    </div>

                        {/* Momentum */}
                        <div className="hidden xl:flex items-center gap-3">
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Momentum</span>
                            <div className="w-24 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-white transition-all duration-500 ease-out" 
                                    style={{ width: `${userState.momentum}%` }}
                                ></div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 md:gap-4 border-l border-white/10 pl-2 sm:pl-4 md:pl-6 ml-1 sm:ml-2">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-1.5 sm:p-2 text-zinc-400 hover:text-white transition-colors hover:bg-zinc-800 rounded-lg touch-manipulation"
                            title="System Configuration"
                        >
                            <Settings size={18} className="sm:w-5 sm:h-5" />
                        </button>
                        <button
                            onClick={handleSignOut}
                            className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-400 transition-colors hover:bg-red-950/30 rounded-lg touch-manipulation"
                            title="Disconnect"
                        >
                            <LogOut size={18} className="sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)} 
                        className={`text-white p-1.5 sm:p-2 hover:bg-zinc-800 rounded-lg transition-colors touch-manipulation ${sidebarOpen ? 'bg-zinc-800' : ''}`}
                        title="Toggle Mentor Core"
                    >
                        <MessageSquare size={18} className={`sm:w-5 sm:h-5 ${sidebarOpen ? 'text-cyan-400' : 'text-zinc-400'}`} />
                    </button>
                </div>
                </header>

                {/* Content Body */}
                <main className="flex-1 overflow-y-auto relative custom-scrollbar">

                    {/* VIEW: DASHBOARD HUB */}
                    {appState === 'dashboard' && (
                        <DashboardHub
                            userState={userState}
                            teams={teams}
                            curriculumTitle={curriculumTitle}
                            onSelectSubject={() => setAppState('map')}
                            onSelectTeam={(teamId) => {
                                // Logic to select team if needed, for now just go to coop
                                setAppState('coop');
                            }}
                            onCreateTeam={() => setAppState('coop')}
                        />
                    )}
                    
                    {/* VIEW: CONSTELLATION MAP */}
                    {appState === 'map' && (
                        <div className="w-full h-full relative">
                            {graphLoading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/90 backdrop-blur-sm">
                                    <div className="w-px h-16 bg-gradient-to-b from-transparent via-white to-transparent animate-pulse mb-4"></div>
                                    <h3 className="text-sm font-bold tracking-widest uppercase text-white">Generating Neural Graph</h3>
                                    <p className="text-zinc-600 text-xs font-mono mt-2">EXPANDING_FRONTIER...</p>
                                </div>
                            ) : nodes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                                    <p className="font-mono text-xs">NO_DATA_FOUND</p>
                                    <button onClick={() => setAppState('onboarding')} className="text-white border-b border-white/20 hover:border-white pb-0.5 text-sm transition-all">Restart Initialization</button>
                                </div>
                            ) : (
                                <ConstellationMap 
                                    nodes={nodes} 
                                    activeNodeId={activeNode}
                                    onNodeSelect={handleNodeSelect}
                                    onNodeMove={handleNodeMove}
                                />
                            )}
                            
                            {!graphLoading && nodes.length > 0 && (
                                <div className="absolute bottom-12 left-12 pointer-events-none z-10">
                                    <motion.h1 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tighter mix-blend-difference opacity-50"
                                    >
                                        {curriculumTitle}
                                    </motion.h1>
                                    
                                    {allNodesCompleted && (
                                        <button 
                                            onClick={handleExpandGraph}
                                            className="mt-6 px-8 py-3 bg-white text-black hover:bg-zinc-200 font-bold rounded-full flex items-center gap-3 pointer-events-auto transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105"
                                        >
                                            <PlusCircle size={18} />
                                            <span className="text-xs uppercase tracking-widest">Expand Frontier</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIEW: COOP DASHBOARD */}
                    {appState === 'coop' && (
                        <CoopDashboard 
                            teams={teams} 
                            currentUser={userState.displayName || 'Traveler'}
                            currentUserId={user?.uid || ''}
                            onCreateTeam={(name) => handleCreateTeam(name)}
                            onDeleteTeam={handleDeleteTeam}
                            onJoinTeam={(code) => handleJoinTeam(code)}
                            onNavigateToMap={() => setAppState('map')}
                            onEnterRaid={handleEnterRaid}
                        />
                    )}

                    {/* VIEW: LESSON */}
                    {appState === 'lesson' && (
                        <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 lg:p-16 pb-20 sm:pb-32 md:pb-40">
                            
                            {/* Chaos Battle View */}
                            {chaosBattle ? (
                                <div className="border border-red-500/20 bg-red-950/10 rounded-3xl p-12 max-w-3xl mx-auto mt-10 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                                     
                                     <div className="flex justify-between items-center mb-12 border-b border-red-500/20 pb-6 relative z-10">
                                         <h2 className="text-3xl font-bold text-red-500 flex items-center gap-3 tracking-tighter">
                                             <Skull size={32} /> CHAOS PROTOCOL
                                         </h2>
                                         <div className="flex gap-2">
                                             {Array.from({length: 3}).map((_, i) => (
                                                 <Heart 
                                                    key={i} 
                                                    size={24} 
                                                    className={i < chaosLives ? "text-red-500 fill-red-500" : "text-zinc-800 fill-zinc-800"} 
                                                 />
                                             ))}
                                         </div>
                                     </div>
                                     
                                     <div className="mb-12 relative z-10">
                                         <span className="text-xs font-mono text-red-400/70 mb-4 block tracking-widest">QUERY_SEQUENCE_{chaosIndex + 1}</span>
                                         <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight">{chaosBattle.questions[chaosIndex].text}</h3>
                                     </div>

                                     <div className="grid gap-4 relative z-10">
                                         {chaosBattle.questions[chaosIndex].options.map(opt => (
                                             <button
                                                key={opt.id}
                                                onClick={() => handleChaosAnswer(opt.isCorrect)}
                                                className="w-full text-left p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-red-500 hover:bg-red-500/10 transition-all font-medium text-zinc-300 group"
                                             >
                                                 <span className="group-hover:text-white transition-colors">{opt.text}</span>
                                             </button>
                                         ))}
                                     </div>
                                </div>
                            ) : (
                                <>
                {/* Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-8 sm:mb-12 sticky top-0 bg-black/90 py-4 sm:py-6 z-20 backdrop-blur border-b border-white/5 -mx-4 sm:mx-0 px-4 sm:px-0">
                   <div className="flex items-center gap-2">
                       <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded">
                           MODE: {contentMode}
                       </span>
                   </div>
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
                        <button 
                            onClick={() => setShowReportModal(true)}
                            className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-zinc-500 hover:text-white transition-colors uppercase tracking-wider font-bold touch-manipulation px-2 py-1 sm:px-0 sm:py-0"
                        >
                            <Flag size={12} className="sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Report</span>
                        </button>
                        <button 
                            onClick={() => {
                                saveUserData(nodes, userState);
                                setNotification({ type: 'success', message: "System State Preserved." });
                            }}
                            className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white hover:text-zinc-300 transition-colors border border-white/20 hover:border-white bg-white/5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full uppercase tracking-wider font-bold touch-manipulation"
                        >
                            <Share2 size={12} className="sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Save Point</span><span className="sm:hidden">Save</span>
                        </button>
                    </div>
                </div>

                                {lessonLoading ? (
                                    <div className="flex flex-col items-center justify-center h-64 sm:h-96 space-y-4 sm:space-y-6">
                                        <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                                            <div className="absolute inset-0 border-2 border-zinc-800 rounded-full"></div>
                                            <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
                                        </div>
                                        <p className="text-zinc-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest animate-pulse px-4 text-center">Retrieving Knowledge Data...</p>
                                    </div>
                                ) : currentLesson ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                        {/* Header */}
                                        <div className="mb-8 sm:mb-12 md:mb-16">
                                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 md:mb-8 leading-[0.9] tracking-tighter">{currentLesson.title}</h1>
                                            
                                            {currentLesson.summary && currentLesson.summary.trim() !== "" && (
                                                <div className="bg-zinc-900/50 border-l-2 border-white pl-6 py-2">
                                                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Context</h4>
                                                    <p className="text-zinc-400 text-sm leading-relaxed">{currentLesson.summary}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Main Content */}
                                        <div className="space-y-12 sm:space-y-16 md:space-y-20">
                                            {currentLesson.sections.map((section, idx) => (
                                                <section key={idx} className="group">
                                                    <div className="flex items-baseline gap-2 sm:gap-4 mb-4 sm:mb-6">
                                                        <span className="text-[10px] sm:text-xs font-mono text-zinc-600">0{idx + 1}</span>
                                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                                                        {section.heading}
                                                    </h2>
                                                    </div>
                                                    
                                                    {section.type === 'code' ? (
                                                        <div className="relative group/code my-8">
                                                            <div className="absolute -inset-px bg-gradient-to-r from-white/10 to-zinc-500/10 rounded-xl opacity-0 group-hover/code:opacity-100 transition-opacity"></div>
                                                            <pre className="relative bg-zinc-950 p-8 rounded-xl border border-zinc-800 overflow-x-auto text-sm font-mono text-zinc-300 leading-relaxed">
                                                                <code>{section.body}</code>
                                                            </pre>
                                                        </div>
                                                    ) : section.type === 'interactive_trigger' ? null : (
                                                        <div className="prose prose-invert prose-lg text-zinc-400 leading-loose max-w-none prose-headings:text-white prose-strong:text-white">
                                                            <p>{section.body}</p>
                                                        </div>
                                                    )}

                                                    {/* Interactive Trigger Point */}
                                                    {section.type === 'interactive_trigger' && section.triggerContext && section.triggerArchetype && (
                                                        <div className="mt-8">
                                                            {activeWidgets[idx] ? (
                                                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                                                    <GenerativeWidget 
                                                                        type={activeWidgets[idx].type} 
                                                                        config={activeWidgets[idx].config} 
                                                                        onComplete={(xp) => handleWidgetComplete(xp, idx)}
                                                                    />
                                                                </motion.div>
                                                            ) : (
                                                                <InteractiveTrigger 
                                                                    context={section.triggerContext}
                                                                    archetype={section.triggerArchetype}
                                                                    onActivate={() => handleTriggerWidget(idx, section.triggerContext!, section.triggerArchetype!)}
                                                                    isLoading={loadingWidgets[idx]}
                                                                />
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Rabbit Hole Injection */}
                                                    <div className="mt-8 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                                        <button 
                                                            onClick={triggerRabbitHole}
                                                            className="flex items-center gap-2 text-[10px] font-bold text-pink-400 hover:text-pink-300 transition-colors uppercase tracking-widest bg-pink-500/5 px-4 py-2 rounded-full border border-pink-500/20 hover:border-pink-500/50"
                                                        >
                                                            <Rabbit size={14} /> Dig Deeper
                                                        </button>
                                                    </div>
                                                </section>
                                            ))}
                                        </div>

                                        {/* Widget Layer */}
                                        {currentLesson.interactiveWidget && (
                                            <div className="mt-24 border-t border-white/10 pt-12">
                                                <div className="bg-zinc-900/30 rounded-2xl p-1 border border-zinc-800">
                                                    <div className="bg-black rounded-xl p-8">
                                                        <div className="flex items-center gap-2 mb-8 text-white font-bold uppercase tracking-widest text-xs border-b border-white/5 pb-4">
                                                        <Layers size={14} /> Interactive Module
                                                    </div>
                                                    <GenerativeWidget 
                                                        type={currentLesson.interactiveWidget.type} 
                                                        config={currentLesson.interactiveWidget.config} 
                                                        onComplete={(xp) => handleWidgetComplete(xp, 9999)}
                                                    />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* External Resources Layer */}
                                        {currentLesson.externalResources && currentLesson.externalResources.length > 0 && (
                                            <div className="mt-24 mb-12">
                                                <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3 tracking-tight">
                                                    <Globe size={20} className="text-zinc-500"/> 
                                                    External Signals
                                                </h3>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    {currentLesson.externalResources.map((res, i) => (
                                                        <a 
                                                            key={i} 
                                                            href={res.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="flex items-start gap-6 p-6 rounded-xl bg-zinc-900/30 border border-zinc-800 hover:bg-zinc-900 hover:border-white/30 transition-all group"
                                                        >
                                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                                res.type === 'video' ? 'bg-red-500/10 text-red-500' :
                                                                res.type === 'article' ? 'bg-blue-500/10 text-blue-500' :
                                                                'bg-emerald-500/10 text-emerald-500'
                                                            }`}>
                                                                {res.type === 'video' ? <Youtube size={20} /> : 
                                                                 res.type === 'article' ? <FileText size={20} /> : 
                                                                 <Globe size={20} />}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-white group-hover:underline decoration-1 underline-offset-4 decoration-zinc-600 transition-all">{res.title}</h4>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-black px-2 py-1 rounded border border-zinc-800">{res.type}</span>
                                                                    <ExternalLink size={12} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </div>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Rabbit Hole Modal Overlay */}
                                        {rabbitHoleContent && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setRabbitHoleContent(null)}>
                                                <div className="bg-zinc-950 border border-pink-500/30 p-8 rounded-3xl max-w-2xl w-full shadow-[0_0_100px_rgba(236,72,153,0.1)] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-4 mb-8 text-pink-400 border-b border-pink-500/10 pb-6">
                                                        <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                                                        <Rabbit size={24} />
                                                    </div>
                                                        <h3 className="text-2xl font-bold tracking-tight text-white">Down the Rabbit Hole</h3>
                                                    </div>
                                                    <div className="prose prose-invert prose-sm text-zinc-300 mb-8 max-w-none leading-relaxed">
                                                        {rabbitHoleContent}
                                                    </div>
                                                    <button onClick={() => setRabbitHoleContent(null)} className="w-full py-4 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">
                                                        Return to Surface
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Complete Button */}
                                        <div className="mt-16 sm:mt-24 md:mt-32 flex justify-center pb-12 sm:pb-16 md:pb-20">
                                            <button 
                                                onClick={handleCompleteLesson}
                                                className="px-6 sm:px-10 md:px-12 py-3 sm:py-4 md:py-5 bg-white text-black hover:bg-zinc-200 font-bold rounded-full text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all flex items-center gap-2 sm:gap-4 hover:scale-105 touch-manipulation"
                                            >
                                                <Trophy size={16} className="sm:w-[18px] sm:h-[18px]" />
                                                <span className="hidden sm:inline">Complete Module</span>
                                                <span className="sm:hidden">Complete</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-red-400 mt-20">
                                        <p className="mb-4 font-mono text-sm">ERROR: DATA_CORRUPTION</p>
                                        <button 
                                            onClick={() => loadLesson(activeNode!, contentMode)}
                                            className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-xs text-white border border-zinc-700 transition-colors uppercase tracking-wider"
                                        >
                                            Retry Sequence
                                        </button>
                                    </div>
                                )}
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* --- SIDEBAR (Mentor/Social) --- */}
            <div className={`fixed inset-y-0 right-0 w-full sm:w-80 lg:w-96 bg-zinc-950/95 sm:bg-zinc-950/90 backdrop-blur-xl border-l border-white/5 transform transition-all duration-300 ease-in-out z-50 flex flex-col ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                    <h2 className="font-bold flex items-center gap-2 text-white text-sm tracking-widest uppercase">
                        <Brain size={16} className="text-zinc-500" /> Mentor Core
                </h2>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden relative">
                    <Suspense fallback={<div className="p-6 text-xs font-mono text-zinc-600">LOADING_MENTOR_...</div>}>
                    <MentorChat className="h-full" mode={contentMode} />
                    </Suspense>
                </div>
                
                {/* Social Section - Minimalist */}
                <div className="h-48 border-t border-white/5 bg-black/20 p-6 flex flex-col">
                    {teams.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Squads</span>
                                <span className="text-[10px] font-mono text-zinc-600">{teams.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4">
                                {teams.slice(0, 5).map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 cursor-pointer" onClick={() => setAppState('coop')}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded bg-gradient-to-tr from-zinc-800 to-zinc-700 text-[10px] flex items-center justify-center font-bold text-white">
                                                {t.name.substring(0, 1)}
                                            </div>
                                            <span className="text-xs text-zinc-300 font-medium truncate max-w-[120px]">{t.name}</span>
                                        </div>
                                        {t.raidReady && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={() => setAppState('coop')}
                                className="w-full py-2.5 border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-400 hover:text-white rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wide font-bold"
                            >
                                Manage Squads
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                             <p className="text-xs text-zinc-500 font-mono">NO_SQUAD_LINKED</p>
                             <button 
                                onClick={() => setAppState('coop')}
                                className="px-6 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-full transition-colors tracking-wide uppercase"
                            >
                                Initialize Co-op
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
      )}
      </Suspense>
    </div>
    </ErrorBoundary>
  );
}

export default App;
