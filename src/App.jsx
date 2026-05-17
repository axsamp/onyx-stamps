import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Plus, Trash2, MapPin, Calendar, X, Download, Share2, Award, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Database Helper ---
const DB_NAME = 'OnyxStampDB';
const STORE_NAME = 'stamps';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveStamp = async (stamp) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(stamp);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getStamps = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteStamp = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const triggerHaptic = (type = 'light') => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(type === 'light' ? 10 : 20);
    }
  } catch (e) {}
};

export default function App() {
  const [stamps, setStamps] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newStamp, setNewStamp] = useState({ image: null, location: '', date: new Date().toISOString().split('T')[0] });
  const [viewingStamp, setViewingStamp] = useState(null);
  const fileInputRef = useRef(null);
  const [isStealthMode, setIsStealthMode] = useState(() => localStorage.getItem('onyx_stealth_mode') === 'true');
  const [time, setTime] = useState(new Date());

  // Dynamic Stealth / Dark Theme sync with Parent App
  useEffect(() => {
    const applyTheme = () => {
      const isDark = localStorage.getItem('onyx_stealth_mode') === 'true';
      setIsStealthMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    const handleStorage = (e) => {
      if (e.key === 'onyx_stealth_mode') {
        applyTheme();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    refreshStamps();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshStamps = async () => {
    const data = await getStamps();
    setStamps(data.reverse());
    localStorage.setItem('onyx_stamp_count', data.length.toString());
  };

  const tokyoTime = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(time);
  }, [time]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      triggerHaptic('medium');
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStamp({ ...newStamp, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStamp = async () => {
    if (!newStamp.image) return;
    triggerHaptic('heavy');
    await saveStamp({
      ...newStamp,
      location: newStamp.location || 'Unknown Location'
    });
    setIsAdding(false);
    setNewStamp({ image: null, location: '', date: new Date().toISOString().split('T')[0] });
    refreshStamps();
  };

  const handleDeleteStamp = async (id) => {
    if (window.confirm('Delete this stamp memory?')) {
      triggerHaptic('heavy');
      await deleteStamp(id);
      refreshStamps();
      setViewingStamp(null);
    }
  };

  return (
    <div className="min-h-screen bg-g-bg text-g-text font-sans selection:bg-g-primary-container pb-28 transition-colors duration-700">
      <div className="max-w-md mx-auto flex flex-col p-6 min-h-screen">
        
        {/* Dynamic Island Safety Spacer */}
        <div className="h-10 w-full shrink-0"></div>

        {/* High-Fidelity Outfit Header */}
        <header className="flex justify-between items-end py-6">
          <div>
            <h1 className="text-[44px] leading-[1.05] font-black font-display tracking-tight text-g-text">
              Stamps.
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-bold px-3 py-1 bg-g-primary-container text-g-primary rounded-full tracking-wide">
                {tokyoTime.split(':').slice(0, 2).join(':')} JST
              </span>
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-g-text-variant">
                Active • Stamp Ledger
              </span>
            </div>
          </div>
          <div className="text-[10px] font-bold text-g-text-variant uppercase tracking-widest bg-g-surface border border-g-outline/10 px-4 py-2 rounded-xl shadow-sm font-mono transition-colors duration-500">
            Collector_v2
          </div>
        </header>

        {/* Hero / M3 Statistics Display */}
        <section className="mt-4 mb-8 material-card p-6 border-g-outline/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-g-primary/5 blur-2xl rounded-full -mr-10 -mt-10" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-g-primary block mb-2">Goshuin-cho Vault</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-g-text font-display">
            Japan Memories
          </h2>
          <div className="flex items-center gap-6 mt-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-wider mb-1">Total Sealed</span>
              <span className="text-3xl font-black tabular-nums text-g-text font-display">{stamps.length}</span>
            </div>
            <div className="w-[1px] h-10 bg-g-outline/20" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-wider mb-1">Integrity</span>
              <span className="text-base font-black text-g-primary uppercase flex items-center gap-1 mt-0.5">
                <Award size={15} /> Local Secure
              </span>
            </div>
          </div>
        </section>

        {/* Grid display */}
        <div className="grid grid-cols-2 gap-4 pb-16">
          {stamps.length === 0 ? (
            <div className="col-span-2 py-24 text-center border-2 border-dashed border-g-outline/15 rounded-3xl text-g-text-variant text-[10px] font-bold uppercase tracking-[0.2em]">
              No memories collected yet
            </div>
          ) : (
            stamps.map((stamp, idx) => (
              <motion.button
                key={stamp.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", damping: 18, stiffness: 220, delay: idx * 0.03 }}
                onClick={() => { triggerHaptic('medium'); setViewingStamp(stamp); }}
                className="material-card aspect-square relative overflow-hidden group shadow-sm border-g-outline/10 cursor-pointer ripple"
              >
                <img src={stamp.image} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" alt="Sealed Stamp" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-left pointer-events-none z-10">
                  <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-1 font-mono">{stamp.date.replace(/-/g, '.')}</p>
                  <p className="text-xs font-black text-white uppercase tracking-tight truncate w-full font-display">{stamp.location}</p>
                </div>
              </motion.button>
            ))
          )}
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-0 left-0 right-0 p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] flex justify-center pointer-events-none z-[100] bg-gradient-to-t from-g-bg via-g-bg/80 to-transparent">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => { triggerHaptic(); setIsAdding(true); }}
            className="pointer-events-auto h-16 w-16 bg-g-primary text-white dark:text-[#202124] flex items-center justify-center shadow-elevation-3 rounded-[20px] rounded-br-[8px] hover:brightness-110 transition-all duration-300 ripple cursor-pointer"
          >
            <Plus size={30} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Add Modal bottom sheet with exact 70% glassmorphism */}
        <AnimatePresence>
          {isAdding && (
            <div className="fixed inset-0 z-[300] flex items-end justify-center px-0">
              {/* Dimmed backdrop */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setIsAdding(false)} 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
              />
              
              {/* Frosted Glass Bottom Sheet */}
              <motion.div 
                initial={{ opacity: 0, y: "100%" }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: "100%" }} 
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="relative w-full max-w-lg bg-white/70 dark:bg-g-surface/70 backdrop-blur-xl border border-g-outline/15 rounded-t-[40px] rounded-b-[24px] p-6 md:p-8 shadow-2xl flex flex-col space-y-6 z-10 max-h-[85vh] overflow-y-auto no-scrollbar transition-colors duration-700"
              >
                {/* Header status bar */}
                <div className="w-full flex justify-between items-center border-b border-g-outline/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-g-primary animate-pulse" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-g-text-variant uppercase">Seal Stamp Memory</span>
                  </div>
                  <button 
                    onClick={() => { triggerHaptic('light'); setIsAdding(false); }} 
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-g-aluminium dark:bg-g-aluminium/10 text-g-text hover:bg-g-primary-container hover:text-g-primary transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body form */}
                <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar max-h-[60vh]">
                  
                  {/* Photo Input Area */}
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="w-full aspect-[4/3] material-card bg-g-aluminium/20 dark:bg-g-aluminium/5 flex flex-col items-center justify-center border-2 border-dashed border-g-outline/15 cursor-pointer relative overflow-hidden group ripple hover:border-g-primary transition-colors"
                  >
                    {newStamp.image ? (
                      <img src={newStamp.image} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <>
                        <Camera size={44} className="text-g-primary/50 mb-3 group-hover:text-g-primary transition-colors duration-300" />
                        <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-widest">Tap to capture or upload stamp</span>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                  </div>

                  {/* Form fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-g-text-variant uppercase tracking-[0.2em] ml-1">Location / Shrine Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Kamakura Hase-dera" 
                        value={newStamp.location}
                        onChange={(e) => setNewStamp({...newStamp, location: e.target.value})}
                        className="w-full py-4 px-5 bg-g-aluminium/20 dark:bg-g-aluminium/5 border border-g-outline/15 rounded-xl text-g-text font-bold focus:outline-none focus:border-g-primary transition-colors" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-g-text-variant uppercase tracking-[0.2em] ml-1">Seal Date</label>
                      <input 
                        type="date" 
                        value={newStamp.date}
                        onChange={(e) => setNewStamp({...newStamp, date: e.target.value})}
                        className="w-full py-4 px-5 bg-g-aluminium/20 dark:bg-g-aluminium/5 border border-g-outline/15 rounded-xl text-g-text font-bold focus:outline-none focus:border-g-primary transition-colors" 
                      />
                    </div>
                  </div>
                </div>

                {/* Commit button */}
                <div className="pt-2">
                  <button 
                    onClick={handleAddStamp}
                    disabled={!newStamp.image}
                    className="w-full h-16 bg-g-primary text-white dark:text-[#202124] font-display font-black text-sm tracking-widest uppercase rounded-2xl shadow-elevation-2 hover:brightness-110 active:scale-95 transition-all duration-200 ripple disabled:opacity-50 disabled:bg-g-outline disabled:text-g-text-variant"
                  >
                    Commit Seal
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Viewer Modal with premium details */}
        <AnimatePresence>
          {viewingStamp && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
              {/* Dimmed backdrop */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setViewingStamp(null)} 
                className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              />
              
              {/* Detailed Stamp Glass Card */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }} 
                transition={{ type: "spring", damping: 22, stiffness: 200 }}
                className="relative w-full max-w-sm bg-white/80 dark:bg-g-surface/80 backdrop-blur-xl border border-g-outline/15 rounded-[36px] p-6 shadow-2xl flex flex-col space-y-6 z-10 transition-colors duration-700"
              >
                {/* Header operations */}
                <div className="flex justify-between items-center w-full">
                  <button 
                    onClick={() => { triggerHaptic(); setViewingStamp(null); }} 
                    className="w-10 h-10 rounded-full bg-g-aluminium/40 dark:bg-g-aluminium/10 flex items-center justify-center text-g-text hover:bg-g-primary-container hover:text-g-primary transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                  <button 
                    onClick={() => handleDeleteStamp(viewingStamp.id)} 
                    className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Stamp Image Box */}
                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-inner border border-g-outline/10 bg-black/5 dark:bg-white/5 flex items-center justify-center">
                  <img src={viewingStamp.image} className="w-full h-full object-contain" alt="Sealed Stamp Detail" />
                </div>

                {/* Details layout */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-g-primary-container/40 flex items-center justify-center text-g-primary shrink-0 mt-0.5">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-widest block mb-0.5">Location</span>
                      <span className="text-base font-black text-g-text font-display leading-tight">{viewingStamp.location}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-g-aluminium/40 dark:bg-g-aluminium/10 flex items-center justify-center text-g-text-variant shrink-0 mt-0.5">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-widest block mb-0.5">Sealed Date</span>
                      <span className="text-xs font-mono font-bold text-g-text uppercase tracking-widest leading-none pt-1 block">{viewingStamp.date.replace(/-/g, ' • ')}</span>
                    </div>
                  </div>
                </div>

                {/* Footer utilities */}
                <div className="pt-4 border-t border-g-outline/10 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-g-text-variant uppercase tracking-wider mb-0.5">Certificate</span>
                    <span className="text-[10px] font-black uppercase text-g-primary tracking-wide flex items-center gap-1">
                      <Award size={13} /> Verified Registry
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full bg-g-aluminium/30 dark:bg-g-aluminium/5 flex items-center justify-center text-g-text hover:text-g-primary transition-colors cursor-pointer">
                      <Share2 size={16} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-g-aluminium/30 dark:bg-g-aluminium/5 flex items-center justify-center text-g-text hover:text-g-primary transition-colors cursor-pointer">
                      <Download size={16} />
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
