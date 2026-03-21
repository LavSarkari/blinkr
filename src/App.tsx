import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send,
  UserPlus,
  LogOut,
  Loader2,
  Plus,
  RefreshCw,
  Video,
  X,
  Hash,
  Info,
  ShieldCheck,
  User,
  Settings,
  Share2,
  Volume2,
  VolumeX,
  Monitor,
  Smartphone,
  Globe,
  Activity
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import socket from './services/socket';
import { getSession } from './services/session';
import Peer from 'simple-peer';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RANDOM_QUESTIONS = [
  "What is your most unpopular opinion?",
  "If you could travel anywhere in time, where would you go?",
  "Is cereal a soup? Why or why not?",
  "What is the most beautiful place you've ever seen?",
  "Cats or Dogs? Defend your choice.",
  "What hobby have you always wanted to start?",
  "What's the best piece of advice you've ever received?",
];

export default function App() {
  const [session] = useState(() => getSession());
  const [inputText, setInputText] = useState("");
  
  // Random Chat State
  const [isSearching, setIsSearching] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [isQuestionMatch, setIsQuestionMatch] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<{ roomId: string; partner: any; commonInterests?: string[] } | null>(null);
  const [matchMessages, setMatchMessages] = useState<any[]>([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [chatMode, setChatMode] = useState<'text' | 'video'>('text');
  const [stopState, setStopState] = useState<'stop' | 'really' | 'new'>('stop');
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [activePage, setActivePage] = useState<'security' | 'privacy' | 'terms' | null>(null);
  const [settings, setSettings] = useState({
    soundEnabled: true,
    enterToSend: true,
  });

  // Video Chat State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const peerRef = useRef<Peer.Instance | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const matchSoundRef = useRef<HTMLAudioElement | null>(null);
  const messageSoundRef = useRef<HTMLAudioElement | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  const showNotification = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    // Initialize sounds
    matchSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    messageSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');

    socket.on("online_count", (count: number) => {
      setOnlineCount(count);
    });

    socket.on("match_found", (data: { roomId: string; users: any[]; commonInterests?: string[]; question?: string }) => {
      const partner = data.users.find(u => u.id !== socket.id);
      setCurrentMatch({ 
        roomId: data.roomId, 
        partner: partner.session,
        commonInterests: data.commonInterests 
      });
      setIsSearching(false);
      setIsDisconnected(false);
      setMatchMessages([]);
      setStopState('stop');
      
      if (data.question) {
        setIsQuestionMatch(true);
        setCurrentQuestion(data.question);
      } else {
        setIsQuestionMatch(false);
        setCurrentQuestion(null);
      }
      
      if (settings.soundEnabled) {
        matchSoundRef.current?.play().catch(() => {});
      }

      // If video mode, initiate WebRTC
      if (chatMode === 'video') {
        const isInitiator = data.users[0].id === socket.id;
        initiatePeer(data.roomId, isInitiator);
      }
    });

    socket.on("webrtc_signal", (data: { signal: any }) => {
      if (peerRef.current) {
        peerRef.current.signal(data.signal);
      }
    });

    socket.on("match_msg", (msg: any) => {
      setMatchMessages(prev => [...prev, msg]);
      if (settings.soundEnabled && msg.senderId !== session.id) {
        messageSoundRef.current?.play().catch(() => {});
      }
    });

    socket.on("partner_left", () => {
      setCurrentMatch(null);
      setMatchMessages([]);
      setIsPartnerTyping(false);
      setIsDisconnected(true);
      setStopState('new');
      destroyPeer();
    });

    socket.on("partner_typing", (data: { isTyping: boolean }) => {
      setIsPartnerTyping(data.isTyping);
    });

    return () => {
      socket.off("online_count");
      socket.off("match_found");
      socket.off("match_msg");
      socket.off("partner_left");
      socket.off("partner_typing");
      socket.off("webrtc_signal");
      destroyPeer();
    };
  }, [chatMode, settings.soundEnabled]);

  const initiatePeer = async (roomId: string, initiator: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const peer = new Peer({
        initiator,
        trickle: false,
        stream,
      });

      peer.on('signal', (signal) => {
        socket.emit('webrtc_signal', { roomId, signal });
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });

      peer.on('error', (err) => console.error('Peer error:', err));
      peer.on('close', () => destroyPeer());

      peerRef.current = peer;
    } catch (err) {
      console.error('Failed to get local stream', err);
      showNotification('Could not access camera/microphone. Please check permissions.', 'error');
    }
  };

  const destroyPeer = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
  };

  useEffect(() => {
    if (currentMatch) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [matchMessages, isPartnerTyping]);

  const startRandomSearch = (spyQuestion?: string) => {
    setIsSearching(true);
    setIsDisconnected(false);
    setIsQuestionMatch(!!spyQuestion);
    setCurrentQuestion(spyQuestion || null);
    socket.emit("find_match", { 
      session, 
      interests, 
      chatMode,
      question: spyQuestion 
    });
    setStopState('stop');
  };

  const cancelSearch = () => {
    setIsSearching(false);
    socket.emit("cancel_search");
  };

  const leaveMatch = () => {
    if (currentMatch) {
      socket.emit("leave_match", currentMatch.roomId);
      setCurrentMatch(null);
      setMatchMessages([]);
      destroyPeer();
    }
  };

  const handleStop = () => {
    if (stopState === 'stop') {
      setStopState('really');
    } else if (stopState === 'really') {
      leaveMatch();
      setStopState('new');
    } else if (stopState === 'new') {
      startRandomSearch();
    }
  };

  const addInterest = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && interestInput.trim()) {
      const newInterest = interestInput.trim().toLowerCase();
      if (!interests.includes(newInterest)) {
        setInterests([...interests, newInterest]);
      }
      setInterestInput("");
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMatch || !inputText.trim()) return;
    
    socket.emit("send_match_msg", {
      roomId: currentMatch.roomId,
      content: inputText.trim(),
      senderId: session.id
    });
    setInputText("");
    
    // Stop typing indicator immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("typing", { roomId: currentMatch.roomId, isTyping: false });
    lastTypingEmitRef.current = 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    if (!currentMatch) return;

    // Throttle emits to every 2 seconds
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2000) {
      socket.emit("typing", { roomId: currentMatch.roomId, isTyping: true });
      lastTypingEmitRef.current = now;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set new timeout to hide typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { roomId: currentMatch.roomId, isTyping: false });
      lastTypingEmitRef.current = 0;
    }, 3000);
  };

  const saveChat = () => {
    if (matchMessages.length === 0) return;
    const chatText = matchMessages.map(m => 
      `${m.senderId === session.id ? 'You' : 'Stranger'}: ${m.content}`
    ).join('\n');
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stranger-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReport = () => {
    if (currentMatch) {
      socket.emit("report_user", { roomId: currentMatch.roomId });
    }
    showNotification("Stranger has been reported. Thank you for keeping Stranger.io safe.", 'success');
    handleStop();
    if (stopState === 'stop') handleStop(); // Trigger 'really' then 'new'
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Stranger.io',
          text: 'Talk to strangers anonymously on Stranger.io!',
          url: window.location.origin,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
      showNotification('Link copied to clipboard!', 'success');
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (currentMatch || isSearching) {
          handleStop();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentMatch, isSearching, stopState]);

  const addHearts = (e: React.MouseEvent | React.TouchEvent) => {
    const x = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const y = 'clientY' in e ? e.clientY : e.touches[0].clientY;
    const newHearts = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
    }));
    setHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => !newHearts.find(nh => nh.id === h.id)));
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#000000] text-white font-sans selection:bg-blue-500/30 overflow-hidden relative">
      {/* Premium Mesh Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-full w-full">
        <motion.div 
          animate={{ 
            x: [0, 50, -50, 0],
            y: [0, -50, 50, 0],
            scale: [1, 1.15, 0.95, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] bg-blue-600/8 blur-[150px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            x: [0, -40, 30, 0],
            y: [0, 40, -30, 0],
            scale: [1, 1.1, 1.15, 1]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-15%] right-[-15%] w-[45%] h-[45%] bg-indigo-600/6 blur-[140px] rounded-full" 
        />
      </div>

      {/* Particle Effects Layer */}
      <AnimatePresence>
        {hearts.map(heart => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 1, scale: 0, y: heart.y, x: heart.x }}
            animate={{ 
              opacity: 0, 
              scale: [0, 1.5, 1], 
              y: heart.y - 150 - Math.random() * 100,
              x: heart.x + (Math.random() - 0.5) * 150
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="fixed z-[250] pointer-events-none text-red-500 text-2xl drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]"
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={cn(
              "fixed bottom-[100px] lg:bottom-12 left-1/2 z-[200] px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3 min-w-[300px]",
              notification.type === 'error' && "bg-red-900/90 border-red-500/50 text-red-200",
              notification.type === 'success' && "bg-green-900/90 border-green-500/50 text-green-200",
              notification.type === 'info' && "bg-[#111111]/90 border-[#1f1f1f] text-blue-200"
            )}
          >
            <Info size={18} />
            <span className="text-sm font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Island Header */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 w-full pointer-events-none">
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative w-full max-w-[1100px] flex items-center justify-between gap-4 sm:gap-6 p-1.5 bg-[#050505]/60 backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-[0_10px_40px_-10px_rgba(59,130,246,0.15)] pointer-events-auto group"
        >
          {/* Subtle Ambient Inner Glow that reacts to hover */}
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-md pointer-events-none" />
          
          {/* Left: Branding */}
          <div className="flex items-center gap-3 pl-3 relative z-10">
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="w-9 h-9 flex items-center justify-center bg-gradient-to-tr from-blue-600 to-blue-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)] cursor-pointer"
              onClick={() => window.location.reload()}
            >
              <MessageSquare size={16} className="text-white fill-white relative z-10" />
            </motion.div>
            <h1 className="text-lg font-black tracking-tighter text-white pr-2">
              Blink<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">r</span>
            </h1>
          </div>
          


          {/* Right: Actions */}
          <div className="flex items-center gap-1 pr-1.5 relative z-10">
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center text-[#9ca3af] hover:text-white rounded-full transition-colors"
              title="Share"
            >
              <Share2 size={16} />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 flex items-center justify-center text-[#9ca3af] hover:text-white rounded-full transition-colors"
              title="Settings"
            >
              <Settings size={16} />
            </motion.button>
            
            {/* The bold call to action */}
            {!isSearching && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (currentMatch) leaveMatch();
                  startRandomSearch();
                }}
                className="hidden lg:flex px-6 h-10 ml-2 items-center justify-center bg-white text-black rounded-full text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 hover:text-white hover:shadow-blue-500/30 ring-1 ring-white/10"
              >
                Start Chat
              </motion.button>
            )}
          </div>
        </motion.header>
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Settings</h3>
                  <button onClick={() => setShowSettings(false)} className="text-[#9ca3af] hover:text-white p-2">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">Sound Effects</div>
                      <div className="text-xs text-[#9ca3af] mt-0.5">Play sounds for matches and messages</div>
                    </div>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        settings.soundEnabled ? "bg-blue-600" : "bg-[#1f1f1f]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        settings.soundEnabled ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">Enter to Send</div>
                      <div className="text-xs text-[#9ca3af] mt-0.5">Press Enter key to send messages</div>
                    </div>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, enterToSend: !s.enterToSend }))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        settings.enterToSend ? "bg-blue-600" : "bg-[#1f1f1f]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        settings.enterToSend ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  {deferredPrompt && (
                    <div className="flex items-center justify-between p-4 bg-blue-600/10 rounded-xl border border-blue-600/20">
                      <div>
                        <div className="font-bold text-blue-400 text-sm">Install App</div>
                        <div className="text-[10px] text-[#9ca3af] uppercase tracking-widest font-bold mt-1">Get the full experience</div>
                      </div>
                      <button 
                        onClick={handleInstall}
                        className="px-4 min-h-[40px] bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-500 transition-colors"
                      >
                        Install
                      </button>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full min-h-[48px] bg-[#111111] hover:bg-[#1f1f1f] border border-[#1f1f1f] rounded-xl font-bold transition-colors"
                >
                  Done
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!currentMatch && !isSearching && isDisconnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-[#000000]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md w-full space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white">Stranger disconnected.</h2>
                <div className="h-px bg-[#1f1f1f] w-full" />
              </div>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={startRandomSearch}
                  className="w-full min-h-[48px] bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-base transition-all active:scale-[0.97]"
                >
                  New Chat
                </button>
                <button 
                  onClick={() => setIsDisconnected(false)}
                  className="w-full min-h-[48px] bg-[#0a0a0a] hover:bg-[#111111] text-[#9ca3af] rounded-xl font-semibold transition-all border border-[#1f1f1f] active:scale-[0.97]"
                >
                  Return Home
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {!currentMatch && !isSearching && !isDisconnected && (
          <div className="absolute inset-0 flex flex-col items-center px-4 sm:px-6 text-center z-10 overflow-y-auto scroll-smooth w-full pb-20 lg:pb-0 hide-scrollbar">
            {/* Spacer for header */}
            <div className="h-20 shrink-0 w-full" />
            
            <div className="flex-1 flex flex-col justify-center w-full max-w-[1100px] mx-auto min-h-min">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-8 sm:space-y-12 py-10"
              >
              {/* Hero Section */}
              <div className="space-y-4 max-w-2xl mx-auto flex flex-col items-center w-full px-2 relative">
                
                <motion.div 
                  initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center gap-3 mb-6"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Network Active</span>
                  </div>
                </motion.div>
                
                <motion.h2 
                  initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
                  className="text-[44px] sm:text-6xl lg:text-[80px] font-black tracking-tighter leading-[1.05] text-white relative z-10"
                >
                  Talk to someone.<br/>
                  <motion.span 
                    initial={{ backgroundPosition: "0% 50%" }}
                    animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-500 bg-[length:200%_auto]"
                  >
                    Instantly.
                  </motion.span>
                </motion.h2>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.45, duration: 0.6, ease: "easeOut" }}
                  className="flex flex-col items-center gap-4 pt-4"
                >
                  <p className="text-[#a1a1aa] text-base sm:text-lg font-semibold max-w-md mx-auto leading-relaxed">
                    No profiles. No history. Just pure conversation with people around the world.
                  </p>
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-[0.2em] bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
                    Swipe. Connect. Repeat.
                  </div>
                </motion.div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
                
                {/* Main Action Card */}
                <div className="lg:col-span-8 bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-8 text-left border border-[#1f1f1f] flex flex-col gap-8 w-full shadow-2xl hover:border-blue-500/30 transition-colors duration-500 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  {/* Interests Input */}
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest text-[10px]">
                        <Hash size={14} className="text-blue-500" />
                        Topics of Interest <span className="text-[#9ca3af] font-medium normal-case tracking-normal">(Optional)</span>
                      </label>
                      <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">{interests.length} / 5</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 p-4 bg-[#000000] rounded-2xl border border-[#1f1f1f] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all min-h-[120px] items-start content-start shadow-inner">
                      <AnimatePresence>
                        {interests.map(interest => (
                          <motion.span 
                            key={interest}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] text-blue-400 rounded-xl text-sm font-bold border border-[#1f1f1f] shadow-sm"
                          >
                            {interest}
                            <button onClick={() => removeInterest(interest)} className="hover:text-blue-300 ml-1 rounded-full bg-transparent">
                              <X size={14} />
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                      <input 
                        type="text"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyDown={addInterest}
                        disabled={interests.length >= 5}
                        placeholder={interests.length === 0 ? "Add tags like tech, music, gaming..." : "Press Enter to add..."}
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-[#3f3f46] min-w-[200px] text-base font-bold py-1.5 px-1 min-h-[40px]"
                      />
                    </div>
                  </div>

                  {/* Mode Selection Tabs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                    {[
                      { mode: 'text' as const, label: 'Text Chat', sub: 'Instant', icon: <MessageSquare size={28} className="text-blue-500 shrink-0 relative z-10" />, color: 'blue', onClick: () => { setChatMode('text'); startRandomSearch(); } },
                      { mode: 'spy' as const, label: 'Spy Mode', sub: 'Discuss', icon: <Hash size={28} className="group-hover/btn:text-purple-400 transition-colors shrink-0 relative z-10" />, color: 'purple', onClick: () => setShowQuestionModal(true) },
                      { mode: 'video' as const, label: 'Video Chat', sub: 'Face-to-face', icon: <Video size={28} className="group-hover/btn:text-emerald-400 transition-colors shrink-0 relative z-10" />, color: 'emerald', onClick: () => { setChatMode('video'); startRandomSearch(); } },
                    ].map((item, i) => (
                      <motion.button
                        key={item.mode}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                        whileHover={{ scale: 1.03, y: -3 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={item.onClick}
                        className={`group/btn flex sm:flex-col items-center sm:justify-center p-5 sm:p-6 gap-3 sm:gap-4 bg-[#0a0a0a] text-${item.mode === 'text' ? 'white' : '[#9ca3af]'} rounded-[1.5rem] transition-all border border-[#1a1a1a] hover:border-${item.color}-500/40 hover:bg-[#0f0f0f] w-full text-left sm:text-center relative overflow-hidden cursor-pointer`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-b from-${item.color}-500/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300`} />
                        {item.icon}
                        <div className="relative z-10">
                          <div className="font-black text-base group-hover/btn:text-white transition-colors tracking-tight">{item.label}</div>
                          <div className="text-[#666] text-[11px] font-bold uppercase tracking-widest hidden sm:block mt-1">{item.sub}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8 w-full text-left py-2">
                  
                  <div className="bg-[#060606] rounded-[2rem] p-7 shadow-2xl border border-[#1a1a1a] flex flex-col gap-6 relative overflow-hidden min-h-[260px] hover:border-emerald-500/20 transition-all duration-500">
                    
                    {/* Radar Sweep - Fixed positioning */}
                    <div className="absolute top-6 right-6 w-28 h-28 rounded-full border border-[#1a1a1a] pointer-events-none">
                      <div className="absolute inset-0 rounded-full overflow-hidden">
                        <div className="absolute inset-0 animate-radar origin-center" 
                             style={{ background: 'conic-gradient(from 0deg, rgba(16,185,129,0.15) 0deg, transparent 80deg, transparent 360deg)' }} />
                      </div>
                      <div className="absolute inset-3 rounded-full border border-[#1a1a1a]" />
                      <div className="absolute inset-7 rounded-full border border-[#1a1a1a]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                      </div>
                    </div>

                    <h3 className="text-[10px] font-black text-[#666] uppercase tracking-widest flex items-center gap-2 relative z-10">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      Connection Hub
                    </h3>
                    
                    <div className="flex flex-col gap-2 relative z-10 mt-auto">
                      <div className="flex items-end gap-3">
                        <span className="text-[72px] leading-[0.75] font-black text-white tracking-tighter">{onlineCount.toLocaleString()}</span>
                        <div className="flex gap-[3px] pb-2">
                          <span className="w-[3px] h-5 bg-emerald-500/60 rounded-full siri-bar [animation-delay:-0.4s]" />
                          <span className="w-[3px] h-7 bg-emerald-500/80 rounded-full siri-bar [animation-delay:-0.2s]" />
                          <span className="w-[3px] h-4 bg-emerald-500/60 rounded-full siri-bar" />
                          <span className="w-[3px] h-6 bg-emerald-500/70 rounded-full siri-bar [animation-delay:-0.6s]" />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#555] mt-1">
                        People pulsing now
                      </span>
                    </div>
                    
                    <div className="h-1 bg-[#111111] rounded-full overflow-hidden w-full relative z-10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((onlineCount / 1000) * 100, 100)}%` }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                      />
                    </div>
                  </div>

                  {/* Privacy Module */}
                  <div className="flex items-center gap-4 px-4 bg-[#050505] p-5 rounded-[2rem] border border-[#1f1f1f]">
                    <div className="p-3 border border-[#1f1f1f] bg-[#0a0a0a] rounded-2xl shrink-0 shadow-inner">
                      <ShieldCheck size={24} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white block tracking-tight">Pure Privacy</span>
                      <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-widest mt-1">
                        End-to-end encrypted. No logs.
                      </p>
                    </div>
                  </div>
                </div>
                
              </div>
            </motion.div>
            </div>

            {/* Redesigned Floating Footer */}
            <footer className="w-full text-center py-8 sm:py-12 shrink-0 mt-auto hidden lg:flex justify-center">
              <div className="flex flex-col items-center gap-4 px-10 py-5">
                <div className="flex flex-wrap justify-center items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">
                  <span onClick={() => setActivePage('security')} className="hover:text-white transition-colors cursor-pointer drop-shadow-md">Security</span>
                  <div className="w-1 h-1 bg-[#1f1f1f] rounded-full" />
                  <span onClick={() => setActivePage('privacy')} className="hover:text-white transition-colors cursor-pointer drop-shadow-md">Privacy</span>
                  <div className="w-1 h-1 bg-[#1f1f1f] rounded-full" />
                  <span onClick={() => setActivePage('terms')} className="hover:text-white transition-colors cursor-pointer drop-shadow-md">Terms</span>
                </div>
                <p className="text-[9px] font-bold text-[#4a4a4a] uppercase tracking-[0.2em] drop-shadow-sm">© {new Date().getFullYear()} BLINKR. NO LOGS.</p>
                <a href="https://lavbytes.in" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-[#333] uppercase tracking-[0.2em] hover:text-blue-500 transition-colors">
                  Built by LavBytes
                </a>
              </div>
            </footer>
          </div>
        )}

        {/* ===== LEGAL PAGES OVERLAY ===== */}
        <AnimatePresence>
          {activePage && (
            <motion.div
              key="legal-page"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 z-[80] bg-[#000000] overflow-y-auto hide-scrollbar"
            >
              {/* Page Header */}
              <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-2xl border-b border-[#1a1a1a]">
                <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActivePage(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <X size={18} className="text-white" />
                  </motion.button>
                  <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                    {activePage === 'security' && 'Security'}
                    {activePage === 'privacy' && 'Privacy Policy'}
                    {activePage === 'terms' && 'Terms of Service'}
                  </h1>
                </div>
              </div>

              {/* Page Content */}
              <div className="max-w-3xl mx-auto px-6 py-12 text-left">
                {activePage === 'security' && (
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <ShieldCheck size={24} className="text-blue-500" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight">Security at Blinkr</h2>
                          <p className="text-[11px] font-bold text-[#666] uppercase tracking-[0.2em] mt-1">How we protect you</p>
                        </div>
                      </div>
                    </div>

                    {[
                      { title: 'End-to-End Encryption', desc: 'All messages exchanged on Blinkr are encrypted in transit. We use industry-standard TLS protocols to ensure your conversations remain private between you and your chat partner. No one — not even Blinkr — can read your messages.' },
                      { title: 'Zero Data Retention', desc: 'We do not store any chat messages, video streams, or conversation metadata on our servers. Once a chat session ends, all data is permanently deleted. There are no chat logs, no message archives, and no way to recover past conversations.' },
                      { title: 'Anonymous Sessions', desc: 'Blinkr does not require registration, email addresses, phone numbers, or any personally identifiable information. Each session is assigned a random, temporary identifier that is discarded when you leave.' },
                      { title: 'No Tracking or Analytics', desc: 'We do not use third-party analytics, advertising trackers, or fingerprinting technologies. Your browsing behavior on Blinkr is not monitored, profiled, or shared with any external parties.' },
                      { title: 'Secure Infrastructure', desc: 'Our servers run on hardened infrastructure with regular security audits. WebSocket connections are secured with WSS (WebSocket Secure), and all API endpoints are protected against common attack vectors including XSS, CSRF, and injection attacks.' },
                      { title: 'Open Reporting', desc: 'If you discover a security vulnerability, please report it responsibly. We take all reports seriously and will work to address any confirmed issues promptly.' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="p-6 bg-[#060606] rounded-2xl border border-[#1a1a1a] space-y-3"
                      >
                        <h3 className="text-base font-black text-white tracking-tight">{item.title}</h3>
                        <p className="text-sm text-[#888] leading-relaxed font-medium">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activePage === 'privacy' && (
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <ShieldCheck size={24} className="text-emerald-500" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight">Privacy Policy</h2>
                          <p className="text-[11px] font-bold text-[#666] uppercase tracking-[0.2em] mt-1">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>

                    {[
                      { title: 'Information We Collect', desc: 'Blinkr collects the absolute minimum data required to operate. This includes your temporary session token (randomly generated), your chosen display preferences, and optional interest tags you provide for matchmaking. We do not collect names, emails, locations, or device identifiers.' },
                      { title: 'How We Use Information', desc: 'Your session data is used exclusively to facilitate real-time chat matching. Interest tags are used to pair you with compatible conversation partners. All data exists only in memory and is never written to persistent storage.' },
                      { title: 'Data Sharing', desc: 'We do not sell, rent, trade, or share any user data with third parties. Period. There are no advertising partners, data brokers, or analytics providers receiving information from Blinkr.' },
                      { title: 'Cookies', desc: 'Blinkr uses only essential functional cookies required for the application to work (session management). We do not use tracking cookies, marketing cookies, or any form of cross-site tracking.' },
                      { title: 'Data Retention', desc: 'Chat messages are never stored. Session data is held in temporary memory only for the duration of your visit and is automatically purged when you close the browser or end your session. We maintain no historical records of user activity.' },
                      { title: 'Your Rights', desc: 'Since we collect virtually no personal data, there is nothing to request access to, correct, or delete. You are always anonymous on Blinkr. If you have any privacy concerns, you may contact us and we will respond promptly.' },
                      { title: 'Children', desc: 'Blinkr is not intended for use by individuals under the age of 18. We do not knowingly facilitate connections with minors. If you believe a minor is using this service, please report it immediately.' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="p-6 bg-[#060606] rounded-2xl border border-[#1a1a1a] space-y-3"
                      >
                        <h3 className="text-base font-black text-white tracking-tight">{item.title}</h3>
                        <p className="text-sm text-[#888] leading-relaxed font-medium">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activePage === 'terms' && (
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <Info size={24} className="text-purple-500" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight">Terms of Service</h2>
                          <p className="text-[11px] font-bold text-[#666] uppercase tracking-[0.2em] mt-1">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>

                    {[
                      { title: 'Acceptance of Terms', desc: 'By accessing or using Blinkr, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service. Blinkr reserves the right to update these terms at any time without prior notice.' },
                      { title: 'Service Description', desc: 'Blinkr is an anonymous, real-time chat platform that connects random users for text and video conversations. The service is provided "as is" without warranties of any kind, either express or implied.' },
                      { title: 'User Conduct', desc: 'You agree not to use Blinkr to: transmit illegal, harmful, threatening, abusive, or otherwise objectionable content; harass, stalk, or intimidate other users; impersonate any person or entity; distribute spam, malware, or other harmful code; attempt to gain unauthorized access to the service or its systems.' },
                      { title: 'Age Requirement', desc: 'You must be at least 18 years of age to use Blinkr. By using the service, you represent and warrant that you meet this age requirement. Blinkr is not responsible for verifying user ages and relies on users\' honest self-representation.' },
                      { title: 'Content Responsibility', desc: 'You are solely responsible for any content you share during conversations. Blinkr does not monitor, moderate, or store chat content and therefore cannot be held liable for any content exchanged between users.' },
                      { title: 'Disclaimer of Warranties', desc: 'Blinkr is provided on an "as is" and "as available" basis. We make no representations or warranties regarding the reliability, availability, or security of the service. We do not guarantee uninterrupted access or that the service will be free from errors or vulnerabilities.' },
                      { title: 'Limitation of Liability', desc: 'To the fullest extent permitted by law, Blinkr and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, even if advised of the possibility of such damages.' },
                      { title: 'Termination', desc: 'We reserve the right to deny access to Blinkr to anyone, at any time, for any reason, without notice. Since no accounts exist, "termination" simply means blocking access to the service.' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="p-6 bg-[#060606] rounded-2xl border border-[#1a1a1a] space-y-3"
                      >
                        <h3 className="text-base font-black text-white tracking-tight">{item.title}</h3>
                        <p className="text-sm text-[#888] leading-relaxed font-medium">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Bottom back button */}
                <div className="pt-12 pb-8 flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActivePage(null)}
                    className="px-8 min-h-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 text-[#9ca3af] hover:text-white backdrop-blur-md gap-2"
                  >
                    ← Back to Blinkr
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticky Mobile Start Button — Shimmer Effect */}
        {!currentMatch && !isSearching && !isDisconnected && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-2xl z-50 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <motion.button 
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (currentMatch) leaveMatch();
                startRandomSearch();
              }}
              className="w-full flex items-center justify-center min-h-[56px] bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl text-lg font-black uppercase tracking-wider shadow-[0_0_30px_rgba(59,130,246,0.3)] active:scale-[0.97] transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              Start Chat
            </motion.button>
          </div>
        )}

        <AnimatePresence initial={false} custom={swipeDirection}>
          {isSearching && (
            <motion.div 
              key="searching"
              custom={swipeDirection}
              variants={{
                enter: (dir: number) => ({ y: dir > 0 ? 1000 : -1000, opacity: 0 }),
                center: { y: 0, opacity: 1 },
                exit: (dir: number) => ({ y: dir < 0 ? 1000 : -1000, opacity: 0 })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-[60] backdrop-blur-3xl"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.8}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 150 || velocity.y > 500) {
                  setSwipeDirection(-1);
                  cancelSearch();
                }
              }}
            >
              {/* Ambient breathing glow */}
              <motion.div 
                animate={{ scale: [1, 1.4, 1], opacity: [0.03, 0.1, 0.03] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-[500px] h-[500px] bg-blue-500 rounded-full blur-[150px] pointer-events-none" 
              />

              {/* Concentric Pulse Rings */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.8, opacity: 0.4 }}
                    animate={{ scale: [0.8, 1.6], opacity: [0.3, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
                    className="absolute inset-0 border border-blue-500/30 rounded-full"
                  />
                ))}
                
                {/* Spinner ring */}
                <div className="absolute inset-4 border-[2px] border-[#1a1a1a] border-t-blue-500 rounded-full animate-spin" />
                
                {/* Center icon */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 w-16 h-16 bg-[#0a0a0a] rounded-full flex items-center justify-center border border-[#1a1a1a] shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                >
                  <UserPlus size={28} className="text-blue-500" />
                </motion.div>
              </div>

              {/* Status Text */}
              <div className="text-center space-y-4 relative z-10 px-6 mt-8">
                <div className="flex items-center justify-center gap-2">
                  <motion.span 
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                  />
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                    Scanning Network
                  </h2>
                </div>
                
                <p className="text-[#666] font-bold text-xs uppercase tracking-[0.25em] max-w-xs mx-auto">
                  {interests.length > 0 
                    ? `Filtering: ${interests.join(' · ')}`
                    : "Looking for your next conversation"}
                </p>

                {/* Animated dots row */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* Cancel button */}
              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={cancelSearch}
                className="mt-10 px-8 flex min-h-[44px] items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 text-[#9ca3af] hover:text-white backdrop-blur-md"
              >
                Cancel
              </motion.button>

              {/* Bottom hint */}
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute bottom-10 text-[10px] font-bold text-[#333] uppercase tracking-[0.3em]"
              >
                Swipe down to cancel
              </motion.p>
            </motion.div>
          )}

          {currentMatch && (
            <motion.div 
              key={currentMatch.roomId}
              custom={swipeDirection}
              variants={{
                enter: (dir: number) => ({ y: dir > 0 ? 1000 : -1000 }),
                center: { y: 0 },
                exit: (dir: number) => ({ y: dir < 0 ? 1000 : -1000 })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 flex flex-col justify-end bg-[#000000] z-[70] overflow-hidden"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y < -150 || velocity.y < -500) {
                  // Swipe up = next user
                  setSwipeDirection(1);
                  leaveMatch();
                  startRandomSearch();
                } else if (offset.y > 150 || velocity.y > 500) {
                  // Swipe down = leave
                  setSwipeDirection(-1);
                  handleStop(); // triggers "Are you sure?" or just cancels
                  if (stopState === 'stop') {
                    leaveMatch();
                  }
                }
              }}
              onDoubleClick={(e) => {
                 addHearts(e as any);
                 showNotification("You sent a reaction ❤️", "success");
              }}
            >
              {/* Hyper-Transition Blur Overlay */}
              <motion.div 
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={isSearching ? { opacity: 1, backdropFilter: "blur(40px)" } : { opacity: 0, backdropFilter: "blur(0px)" }}
                className="absolute inset-0 z-[100] pointer-events-none bg-blue-500/5 transition-all duration-300"
              />
              <div className="absolute inset-0 z-0 pointer-events-none">
                {chatMode === 'video' ? (
                  <>
                    <video 
                      ref={remoteVideoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-[#000000]/20" />
                    <div className="absolute top-[env(safe-area-inset-top,1rem)] pt-4 left-4 z-10 px-3 py-1.5 bg-[#111111]/80 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-white border border-[#1f1f1f]">
                      Stranger
                    </div>
                    {/* local video pip */}
                    <div className="absolute top-[env(safe-area-inset-top,1rem)] pt-4 right-4 z-10 w-24 sm:w-32 aspect-[3/4] bg-[#0a0a0a] rounded-xl overflow-hidden shadow-2xl border border-white/10">
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {!remoteStream && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
                        <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Establishing Signal...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-t from-[#000000] via-[#000000]/80 to-[#000000]" />
                )}
              </div>

              {/* OVERLAY UI (messages float from bottom) */}
              <div className="relative z-10 flex flex-col justify-end h-full pointer-events-none pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-10">
                {/* Header indicators */}
                <div className="absolute top-[env(safe-area-inset-top,1rem)] pt-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-none">
                   <div className="px-4 py-1.5 bg-[#000000]/80 backdrop-blur-xl rounded-full text-[10px] uppercase tracking-widest font-black text-[#9ca3af] border border-[#1f1f1f] shadow-lg flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     {chatMode === 'video' ? 'Video Session Active' : 'Encrypted Session Active'}
                   </div>
                   {isQuestionMatch && currentQuestion && (
                     <div className="px-6 py-3 max-w-sm mx-4 text-center bg-[#0a0a0a]/90 backdrop-blur-xl rounded-2xl border border-[#1f1f1f] shadow-2xl mt-4 pointer-events-auto">
                       <span className="text-blue-500 text-[9px] uppercase tracking-widest font-black block mb-1 flex items-center justify-center gap-1"><Hash size={10} /> Topic</span>
                       <span className="text-white text-sm font-bold italic block">"{currentQuestion}"</span>
                     </div>
                   )}
                </div>

                <div className="flex-1" />
                
                {/* Scrollable messages container - allow pointer events */}
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-3 max-h-[60vh] overflow-y-auto pointer-events-auto pb-4 hide-scrollbar"
                     onPointerDown={e => e.stopPropagation()} /* Prevents drag gesture stealing focus */
                >
                  {matchMessages.map((msg, idx) => (
                    <motion.div 
                      key={msg.id || idx}
                      initial={{ opacity: 0, scale: 0.5, y: 50, rotate: msg.senderId === session.id ? 5 : -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 15,
                        mass: 0.8
                      }}
                      className={cn(
                        "flex flex-col w-full",
                        msg.senderId === session.id ? "items-end" : "items-start"
                      )}
                    >
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          "max-w-[85%] sm:max-w-[70%] px-4 sm:px-5 py-2.5 sm:py-3 rounded-[1.4rem] shadow-xl backdrop-blur-md text-sm font-bold tracking-tight",
                          msg.senderId === session.id 
                            ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-tr-sm shadow-blue-500/10" 
                            : "bg-[#111111]/95 text-white rounded-tl-sm border border-white/5 shadow-black/50"
                        )}
                      >
                        {msg.content}
                      </motion.div>
                      {msg.createdAt && (
                        <span className={cn(
                          "text-[9px] font-bold text-[#444] mt-1 px-2 uppercase tracking-wider",
                          msg.senderId === session.id ? "text-right" : "text-left"
                        )}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </motion.div>
                  ))}
                  
                  {isPartnerTyping && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      className="flex items-center gap-2 px-4 py-3 bg-[#111111]/90 backdrop-blur-md border border-[#1f1f1f] rounded-2xl rounded-tl-sm w-fit shadow-md"
                    >
                      <span className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce [animation-delay:0.4s]" />
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Fixed bottom input bar */}
                <div className="px-4 sm:px-6 w-full max-w-4xl mx-auto pointer-events-auto z-50">
                  <div className="flex items-center gap-2 sm:gap-3 bg-[#000000]/90 backdrop-blur-3xl p-2 rounded-2xl border border-[#1f1f1f] shadow-2xl" onPointerDown={e => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        handleStop();
                        if (stopState === 'stop') {
                           leaveMatch();
                        }
                      }}
                      className={cn(
                        "p-3 rounded-xl transition-all border duration-300 min-w-[48px] flex justify-center items-center shadow-inner",
                        stopState === 'stop' && "bg-[#111111] hover:bg-[#1a1a1a] text-[#9ca3af] border-[#1f1f1f]",
                        stopState === 'really' && "bg-red-600/20 text-red-500 border-red-500/50 animate-pulse",
                        stopState === 'new' && "bg-blue-600/20 text-blue-500 border-blue-500/50"
                      )}
                    >
                      {stopState === 'stop' ? <X size={20} /> : stopState === 'really' ? <Hash size={20} /> : <RefreshCw size={20} />}
                    </button>
                    <div className="flex-1 relative flex items-center">
                      <input 
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && settings.enterToSend) sendMessage(e as any);
                        }}
                        placeholder="Message..."
                        className="w-full bg-transparent text-white px-2 py-2 min-h-[40px] focus:outline-none placeholder:text-[#9ca3af] text-sm sm:text-base font-medium"
                      />
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => sendMessage(e as any)}
                      disabled={!inputText.trim()}
                      className="p-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:opacity-90 disabled:opacity-20 transition-all flex items-center justify-center min-w-[48px] shadow-lg shadow-blue-500/20"
                    >
                      <Send size={18} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showQuestionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#000000]/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-xl bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 sm:p-8 space-y-6 sm:space-y-8 shadow-2xl relative"
            >
              <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-5">
                <Hash size={80} className="text-white" />
              </div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white">Question Mode</h3>
                  <p className="text-[#9ca3af] text-[10px] font-bold uppercase tracking-widest">Discuss a topic with a stranger</p>
                </div>
                <button 
                  onClick={() => setShowQuestionModal(false)}
                  className="p-2 sm:p-3 bg-[#111111] hover:bg-[#1a1a1a] rounded-xl transition-all border border-[#1f1f1f]"
                >
                  <X size={18} className="text-[#9ca3af]" />
                </button>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Random Inspiration</label>
                  <div className="flex flex-wrap gap-2">
                    {RANDOM_QUESTIONS.slice(0, 3).map(q => (
                      <button 
                        key={q}
                        onClick={() => setQuestionInput(q)}
                        className="text-left px-4 py-2.5 sm:py-3 bg-[#111111] hover:bg-[#1a1a1a] rounded-xl text-xs font-medium text-[#9ca3af] hover:text-white transition-all border border-[#1f1f1f]"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Your own question</label>
                  <textarea 
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Enter a question for two strangers to discuss..."
                    className="w-full h-28 sm:h-32 bg-[#111111] text-white px-4 sm:px-5 py-4 rounded-xl border border-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-[#9ca3af] text-sm sm:text-base font-medium resize-none shadow-inner"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 relative z-10 w-full mt-2">
                <button 
                  onClick={() => setShowQuestionModal(false)}
                  className="w-full sm:flex-1 py-3 sm:py-4 bg-[#111111] hover:bg-[#1a1a1a] rounded-xl font-bold text-xs uppercase tracking-widest text-[#9ca3af] border border-[#1f1f1f] min-h-[48px]"
                >
                  Cancel
                </button>
                <button 
                  disabled={!questionInput.trim()}
                  onClick={() => {
                    setShowQuestionModal(false);
                    startRandomSearch(questionInput.trim());
                    setQuestionInput("");
                  }}
                  className="w-full sm:flex-1 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-20 active:scale-[0.98] min-h-[48px]"
                >
                  Start Discussion
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>



    </div>
  );
}
