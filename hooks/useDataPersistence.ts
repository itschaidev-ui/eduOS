import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from 'firebase/auth';
import { UserState, KnowledgeNode, CoopTeam, ContentReport, OnboardingData, CurriculumOption, Quest } from '../types';

const INITIAL_USER_STATE: UserState = {
  uid: '',
  displayName: 'Traveler',
  momentum: 0,
  streak: 0,
  xp: 0,
  completedNodes: [],
  currentFocus: null,
  quests: [],
  lastQuestDate: ''
};

const generateDailyQuests = (): Quest[] => [
    { id: 'q1', title: 'Knowledge Seeker', description: 'Complete 1 Module', xpReward: 100, completed: false, type: 'complete_lesson', target: 1, progress: 0 },
    { id: 'q2', title: 'XP Hunter', description: 'Earn 500 XP', xpReward: 200, completed: false, type: 'earn_xp', target: 500, progress: 0 },
    { id: 'q3', title: 'Map Explorer', description: 'Check the Map', xpReward: 50, completed: false, type: 'visit_map', target: 1, progress: 0 }
];

export const useDataPersistence = (user: User | null) => {
  const [loadingData, setLoadingData] = useState(false);
  // Be explicit about when we have *finished at least one* attempt to load user data.
  // This prevents route guards from deciding "no data" during the first render frame after auth.
  const [hasLoadedUserData, setHasLoadedUserData] = useState(false);
  const [userState, setUserState] = useState<UserState>(INITIAL_USER_STATE);
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [curriculumTitle, setCurriculumTitle] = useState<string>('');
  const [teams, setTeams] = useState<CoopTeam[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  
  // Helper to check for offline guest mode
  const isLocalGuest = useCallback((u: User | null) => u?.uid.startsWith('guest-local-'), []);
  const isAdmin = useCallback((u: User | null) => u?.email === 'itschaidev@gmail.com', []);

  // Load Data
  useEffect(() => {
    let unsubscribeTeams: (() => void) | undefined;
    let isMounted = true;

    if (!user) {
        setLoadingData(false);
        setHasLoadedUserData(false);
        return;
    }

    const loadUserData = async () => {
        setLoadingData(true);
        setHasLoadedUserData(false);

        // --- OFFLINE GUEST MODE ---
        if (isLocalGuest(user)) {
            const localKey = `eduos_user_${user.uid}`;
            const localData = localStorage.getItem(localKey);
            
            if (localData) {
                const parsed = JSON.parse(localData);
                let loadedState = parsed.userState;
                
                // Quest Reset Logic (Local)
                const today = new Date().toDateString();
                if (loadedState.lastQuestDate !== today) {
                    loadedState = {
                        ...loadedState,
                        quests: generateDailyQuests(),
                        lastQuestDate: today
                    };
                }

                setUserState(loadedState);
                setNodes(parsed.nodes || []);
                setCurriculumTitle(parsed.curriculumTitle || '');
            }

            // Load Local Teams for Guest
            try {
                const localTeamsKey = `eduos_teams_${user.uid}`;
                const storedTeams = localStorage.getItem(localTeamsKey);
                const localTeams = storedTeams ? JSON.parse(storedTeams) : [];
                setTeams(localTeams);
            } catch (e) {
                console.error("Failed to load local teams", e);
                setTeams([]);
            }

            if (isMounted) setLoadingData(false);
            if (isMounted) setHasLoadedUserData(true);
            return;
        }

        // --- ONLINE FIREBASE MODE ---
        try {
            const userRef = doc(db, 'users', user.uid);
            
            // Race against a timeout to prevent infinite hanging
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), 20000));
            
            let userSnap: any;
            try {
                userSnap = await Promise.race([getDoc(userRef), timeout]);
            } catch (e) {
                // Avoid spamming the console; this can happen if Firestore config/rules block reads or network is flaky.
                // We still fall back to "offline mode" behavior.
                if (!(window as any).__eduosWarnedOfflineMode) {
                    (window as any).__eduosWarnedOfflineMode = true;
                    console.warn(
                        "User fetch timed out or failed, treating as potential connection issue (Offline Mode Active).",
                        e
                    );
                }
            }

            if (!isMounted) return;

            if (userSnap && userSnap.exists()) {
                const data = userSnap.data();
                let loadedState = data.userState;
                
                // Quest Reset Logic
                const today = new Date().toDateString();
                if (loadedState.lastQuestDate !== today) {
                    loadedState = {
                        ...loadedState,
                        quests: generateDailyQuests(),
                        lastQuestDate: today
                    };
                    // Ideally trigger a save here, but we'll let the auto-save handle it or next interaction
                }

                setUserState(loadedState);
                setNodes(data.nodes || []);
                setCurriculumTitle(data.curriculumTitle || '');
            } else if (!userSnap) {
                // Firestore fetch failed; try local cache fallback.
                try {
                    const cached = localStorage.getItem(`eduos_user_${user.uid}`);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed.userState) setUserState(parsed.userState);
                        if (parsed.nodes) setNodes(parsed.nodes);
                        if (parsed.curriculumTitle) setCurriculumTitle(parsed.curriculumTitle);
                    }
                } catch (e) {
                    console.warn("Failed to load local cache fallback", e);
                }
            }

            // Subscribe to Teams
            const q = query(collection(db, 'teams'), where('memberIds', 'array-contains', user.uid));
            unsubscribeTeams = onSnapshot(q, (snapshot) => {
                if (!isMounted) return;
                const loadedTeams = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CoopTeam));
                setTeams(loadedTeams);
            }, (error) => {
                console.error("Team subscription error:", error);
            });

            // If Admin, fetch reports
            if (isAdmin(user)) {
                fetchReports();
            }
            
        } catch (error) {
            console.error("Error loading user data:", error);
        } finally {
            if (isMounted) {
              setLoadingData(false);
              setHasLoadedUserData(true);
            }
        }
    };

    loadUserData();

    return () => {
        isMounted = false;
        if (unsubscribeTeams) unsubscribeTeams();
    };
  }, [user, isLocalGuest, isAdmin]);

  const fetchReports = async () => {
      if (!user || !isAdmin(user)) return;
      try {
          const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
          const snap = await getDocs(q);
          const reportData = snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentReport));
          setReports(reportData);
      } catch (e) {
          console.error("Fetch reports failed", e);
      }
  };

  // Save Function (Manual or Auto)
  const saveUserData = useCallback(async (newNodes?: KnowledgeNode[], newUserState?: UserState) => {
      if (!user) return;
      
      const nodesToSave = newNodes || nodes;
      const stateToSave = newUserState || userState;

      if (isLocalGuest(user)) {
           const localKey = `eduos_user_${user.uid}`;
           const existing = JSON.parse(localStorage.getItem(localKey) || '{}');
           localStorage.setItem(localKey, JSON.stringify({ 
               ...existing, 
               nodes: nodesToSave,
               userState: stateToSave
           }));
      } else {
           try {
               await updateDoc(doc(db, 'users', user.uid), { 
                   nodes: nodesToSave,
                   userState: stateToSave
               });
           } catch (e) {
               console.error("Auto-save failed", e);
               // Try setDoc if update fails (doc might not exist)
                try {
                    await setDoc(doc(db, 'users', user.uid), { 
                        nodes: nodesToSave,
                        userState: stateToSave
                    }, { merge: true });
                } catch (e2) {
                    console.error("Save backup failed", e2);
                }
           }
      }
  }, [user, nodes, userState, isLocalGuest]);

  // Auto-save nodes when they change
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
      if (!user || nodes.length === 0) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(() => {
          saveUserData(nodes, userState);
      }, 2000);

      return () => {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      };
  }, [nodes, user, saveUserData, userState]); // Added userState to dependency to ensure it saves correct state

  return {
      loadingData,
      hasLoadedUserData,
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
  };
};
