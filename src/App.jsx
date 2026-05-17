import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Plus, Trash2, MapPin, Calendar, X, Download, Share2, ArrowRight, Grid, Moon, Sun } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Database Helper (Kept perfectly to protect existing traveler data!) ---
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

// --- Dynamic Theme Palettes (Matching core Onyx Protocol dashboard!) ---
const THEME_PALETTES = {
  cobalt: {
    light: { primary: '#0B57D0', primaryContainer: '#D3E3FD', bg: '#F0F4F8' },
    dark: { primary: '#8AB4F8', primaryContainer: '#3C4043', bg: '#202124' }
  },
  vermilion: {
    light: { primary: '#C04836', primaryContainer: '#FCDCD6', bg: '#FAF4F2' },
    dark: { primary: '#FF8A75', primaryContainer: '#4A2B25', bg: '#241E1D' }
  },
  matcha: {
    light: { primary: '#386B40', primaryContainer: '#D2E7C4', bg: '#F3F7F2' },
    dark: { primary: '#81C784', primaryContainer: '#223825', bg: '#1E231F' }
  },
  sakura: {
    light: { primary: '#C64E74', primaryContainer: '#FFD9E2', bg: '#FAF5F6' },
    dark: { primary: '#FCAEC5', primaryContainer: '#4C232F', bg: '#231F20' }
  },
  yuzu: {
    light: { primary: '#7E5700', primaryContainer: '#FFF1C5', bg: '#FCFAF5' },
    dark: { primary: '#F5BE48', primaryContainer: '#4D3100', bg: '#1A1916' }
  }
};

// --- Standardized Travel Companion Launchers ---
const APPS = [
  { id: 'protocol', name: 'Onyx Protocol', url: 'https://axsamp.github.io/onyx-protocol/', version: 'V1.3.0', node: '00' },
  { id: 'itinerary', name: 'Itinerary Command', url: 'https://axsamp.github.io/onyx-itinerary/', version: 'V4.1.5', node: '01' },
  { id: 'converter', name: 'Unit Converter', url: 'https://axsamp.github.io/onyx-converter/', version: 'V2.5.6', node: '02' },
  { id: 'stamps', name: 'Stamp Collector', url: 'https://axsamp.github.io/onyx-stamps/', version: 'V1.9.11', node: '03' },
  { id: 'signal', name: 'Onyx Signal', url: 'https://axsamp.github.io/onyx-recorder/', version: 'V1.0.2', node: '04' },
];

const triggerHaptic = (type = 'light') => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(type === 'light' ? 10 : 20);
    }
  } catch (e) { }
};

export default function App() {
  const [stamps, setStamps] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newStamp, setNewStamp] = useState({ image: null, location: '', date: new Date().toISOString().split('T')[0] });
  const [viewingStamp, setViewingStamp] = useState(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Synchronize core status hooks from parent Onyx Protocol origin
  const [theme, setTheme] = useState(() => localStorage.getItem('onyx_theme') || 'cobalt');
  const [isStealthMode, setIsStealthMode] = useState(() => localStorage.getItem('onyx_stealth') === 'true');
  const [callsign, setCallsign] = useState(() => localStorage.getItem('onyx_callsign') || 'Traveler');

  // Tokyo JST Clock Ticker
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    refreshStamps();
  }, []);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setTime(new Date());
    }, 30000); // Optimized 30s interval
    return () => clearInterval(clockInterval);
  }, []);

  // Shared localStorage Sync Event Listeners
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'onyx_theme' && e.newValue) setTheme(e.newValue);
      if (e.key === 'onyx_stealth' && e.newValue) setIsStealthMode(e.newValue === 'true');
      if (e.key === 'onyx_callsign' && e.newValue) setCallsign(e.newValue);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Apply Theme variables
  useEffect(() => {
    const colors = THEME_PALETTES[theme]?.[isStealthMode ? 'dark' : 'light'] || THEME_PALETTES.cobalt.light;
    const root = document.documentElement;
    root.style.setProperty('--theme-g-primary', colors.primary);
    root.style.setProperty('--theme-g-primary-container', colors.primaryContainer);
    root.style.setProperty('--theme-g-bg', colors.bg);

    if (isStealthMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('onyx_theme', theme);
    localStorage.setItem('onyx_stealth', isStealthMode.toString());
  }, [theme, isStealthMode]);

  const refreshStamps = async () => {
    const data = await getStamps();
    setStamps(data.reverse());
  };

  const handleFileChange = (e) => {
    triggerHaptic('medium');
    const file = e.target.files[0];
    if (file) {
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

  const handleDelete = async (id) => {
    triggerHaptic('heavy');
    if (window.confirm('Delete this stamp memory?')) {
      await deleteStamp(id);
      refreshStamps();
      setViewingStamp(null);
    }
  };

  return (
    <div className="h-screen w-screen max-w-md mx-auto overflow-hidden relative selection:bg-g-primary-container flex flex-col transition-colors duration-700 bg-g-bg">
      {/* Dynamic Island Safety Spacer */}
      <div className="h-14 w-full shrink-0"></div>

      {/* Header Section (Material 3 Expressive) */}
      <header className="px-6 pt-3 pb-4 flex justify-between items-end z-20 shrink-0 bg-g-bg/80 backdrop-blur-2xl">
        <div className="flex-1">
          {/* Animated Header Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.4 }}
            className="text-[44px] leading-[1.05] font-black font-display tracking-tight text-g-text mb-2"
          >
            Stamps.
          </motion.h1>

          {/* Subtitle & JST Time */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-3 py-1 bg-g-primary-container text-g-primary rounded-full tracking-wide">
              {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })} JST
            </span>
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-g-text-variant">
              Collector • {callsign}
            </span>
          </div>
        </div>

        {/* Asymmetrical Companion App Menu Trigger */}
        <button
          onClick={() => { triggerHaptic('medium'); setIsLauncherOpen(true); }}
          className="w-14 h-14 rounded-[20px] rounded-bl-[8px] bg-g-aluminium/50 dark:bg-g-aluminium/10 text-g-primary flex items-center justify-center hover:bg-g-primary-container transition-all duration-300 active:scale-90 ripple shrink-0 mb-1 border border-g-outline/10 shadow-sm"
        >
          <Grid size={22} />
        </button>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-4 relative z-10">
        {/* Stats Shelf */}
        <section className="mb-8 pl-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-g-primary block mb-1">Goshuin-cho System</span>
          <div className="flex items-center gap-5 mt-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-wider mb-1">Collected Seals</span>
              <span className="text-2xl font-display font-black text-g-text">{stamps.length}</span>
            </div>
            <div className="w-[1.5px] h-9 bg-g-outline/30" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-wider mb-1">Security Mode</span>
              <span className="text-sm font-bold uppercase tracking-wider text-g-primary">Offline Storage</span>
            </div>
          </div>
        </section>

        {/* Stamps Grid */}
        <div className="grid grid-cols-2 gap-4">
          {stamps.length === 0 ? (
            <div className="col-span-2 py-32 text-center border border-dashed border-g-outline/30 rounded-[32px] text-g-text-variant text-[11px] font-bold uppercase tracking-widest bg-g-surface/50">
              No Seals Collected Yet
            </div>
          ) : (
            stamps.map((stamp, idx) => (
              <motion.button
                key={stamp.id}
                initial={{ opacity: 0, scale: 0.93, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04, ease: "easeOut" }}
                onClick={() => { triggerHaptic('medium'); setViewingStamp(stamp); }}
                className="material-card aspect-square relative overflow-hidden group shadow-elevation-1 ripple cursor-pointer"
              >
                <img src={stamp.image} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="Stamp Memory" />
                {/* Visual dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-4.5 left-4 text-left pointer-events-none">
                  <span className="text-[8px] font-mono font-bold text-white/70 uppercase tracking-widest mb-0.5 block leading-none">
                    {stamp.date.replace(/-/g, '.')}
                  </span>
                  <span className="text-xs font-display font-black text-white tracking-tight truncate w-32 block leading-none">
                    {stamp.location}
                  </span>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </main>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => { triggerHaptic('heavy'); setIsAdding(true); }}
          className="pointer-events-auto h-16 w-16 bg-g-primary text-white flex items-center justify-center shadow-elevation-3 rounded-2xl ripple active:scale-95 transition-transform"
        >
          <Plus size={32} className="stroke-[2.5]" />
        </motion.button>
      </div>

      {/* Launcher Menu Drawer */}
      <AnimatePresence>
        {isLauncherOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={() => setIsLauncherOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100vh" }}
              animate={{ y: 0 }}
              exit={{ y: "100vh" }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-0 left-0 w-full h-[85vh] bg-g-bg z-50 flex flex-col shadow-elevation-3 rounded-t-[40px] overflow-hidden transform-gpu [will-change:transform]"
            >
              {/* Drag Indicator */}
              <div className="w-full flex justify-center pt-4 pb-2 bg-g-bg">
                <div className="w-12 h-1.5 rounded-full bg-g-outline/30"></div>
              </div>

              <div className="px-6 py-4 flex justify-between items-center bg-g-bg mb-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-g-text tracking-tight">Mission Apps</h2>
                  <p className="text-xs font-semibold text-g-text-variant mt-0.5">Tactical companion links</p>
                </div>
                <button
                  onClick={() => setIsLauncherOpen(false)}
                  className="w-10 h-10 rounded-full bg-g-aluminium dark:bg-g-aluminium/10 flex items-center justify-center text-g-text hover:bg-g-outline/30 transition-colors ripple"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Launcher Items Shelf */}
              <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4 no-scrollbar">
                {APPS.map((app, idx) => (
                  <motion.a
                    key={app.id}
                    href={app.url}
                    onPointerDown={() => triggerHaptic('medium')}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, ease: "easeOut" }}
                    className={cn(
                      "group flex items-center justify-between py-4.5 px-5 transition-all duration-200 relative rounded-2xl mx-1 bg-g-surface border border-g-outline/10 shadow-sm will-change-[transform,opacity] transform-gpu hover:scale-[0.99]",
                      app.id === 'stamps' && "border-g-primary/30 bg-g-primary-container/10"
                    )}
                  >
                    <div className="flex flex-col gap-1 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-g-primary uppercase tracking-widest bg-g-primary-container px-2 py-0.5 rounded-md">
                          ID: {app.node}
                        </span>
                        <span className="text-[10px] font-medium text-g-text-variant">{app.version}</span>
                        {app.id === 'stamps' && (
                          <span className="text-[8px] font-black uppercase text-white bg-g-primary px-1.5 py-0.5 rounded tracking-widest leading-none">ACTIVE</span>
                        )}
                      </div>
                      <span className="text-xl font-bold font-display text-g-text tracking-tight mt-0.5">{app.name}</span>
                    </div>
                    <div className="pr-2">
                      <div className="w-10 h-10 rounded-full bg-g-primary-container flex items-center justify-center group-hover:bg-g-primary group-hover:text-white transition-colors text-g-primary">
                        <ArrowRight size={18} />
                      </div>
                    </div>
                  </motion.a>
                ))}

                {/* Local Theme Swapper Console inside launcher */}
                <div className="mx-1 pt-6 border-t border-g-outline/10">
                  <div className="flex justify-between items-center px-2 mb-3">
                    <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-widest">Theme Palette</span>
                    <button
                      onClick={() => { triggerHaptic('medium'); setIsStealthMode(!isStealthMode); }}
                      className="w-8 h-8 rounded-full bg-g-aluminium dark:bg-g-aluminium/10 text-g-primary flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                    >
                      {isStealthMode ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.keys(THEME_PALETTES).map((pal) => (
                      <button
                        key={pal}
                        onClick={() => { triggerHaptic('medium'); setTheme(pal); }}
                        className={cn(
                          "py-3 rounded-xl border flex flex-col items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest transition-all ripple",
                          theme === pal
                            ? "bg-g-primary-container border-g-primary text-g-primary shadow-sm"
                            : "bg-g-aluminium/30 dark:bg-g-aluminium/5 border-g-outline/10 text-g-text-variant hover:bg-g-aluminium/40"
                        )}
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{
                            background: THEME_PALETTES[pal][isStealthMode ? 'dark' : 'light'].primary
                          }}
                        />
                        {pal.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Seal Entry Modal Drawer (GPU Spring Accelerated) */}
      <AnimatePresence>
        {isAdding && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={() => setIsAdding(false)}
              className="fixed inset-0 bg-black/55 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100vh" }}
              animate={{ y: 0 }}
              exit={{ y: "100vh" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed bottom-0 left-0 w-full h-[92vh] bg-g-bg rounded-t-[40px] shadow-2xl z-50 flex flex-col transform-gpu [will-change:transform]"
            >
              {/* Drag handle */}
              <div className="w-full flex justify-center pt-4 pb-2 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-g-outline/30"></div>
              </div>

              <div className="flex justify-between items-center px-8 py-3 shrink-0">
                <div>
                  <h3 className="text-2xl font-bold font-display text-g-text tracking-tight uppercase">New Stamp Memory</h3>
                  <p className="text-[10px] font-bold text-g-text-variant uppercase tracking-widest mt-0.5">Commit travel seal</p>
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="w-10 h-10 bg-g-aluminium dark:bg-g-aluminium/10 rounded-full flex items-center justify-center text-g-text hover:bg-g-outline/30 transition-colors ripple"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-7 flex-1 p-8 overflow-y-auto no-scrollbar">
                {/* Camera Click Canvas */}
                <div
                  onClick={() => fileInputRef.current.click()}
                  className="w-full aspect-square material-card bg-g-surface/50 flex flex-col items-center justify-center border-2 border-dashed border-g-outline/25 cursor-pointer relative overflow-hidden group ripple hover:border-g-primary transition-all duration-300"
                >
                  {newStamp.image ? (
                    <img src={newStamp.image} className="w-full h-full object-cover" alt="Stamp Captured" />
                  ) : (
                    <>
                      <Camera size={44} className="text-g-primary/40 mb-3 group-hover:text-g-primary group-hover:scale-105 transition-all" />
                      <span className="text-[11px] font-bold text-g-text-variant uppercase tracking-wider">Tap to capture stamp</span>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                </div>

                {/* Form Controls */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-g-text-variant uppercase tracking-wider ml-1">Location / Station</label>
                    <input
                      type="text"
                      placeholder="e.g. Shinjuku Station"
                      value={newStamp.location}
                      onChange={(e) => setNewStamp({ ...newStamp, location: e.target.value })}
                      className="w-full py-4 px-5 bg-g-surface border border-g-outline/10 rounded-xl text-g-text font-bold focus:outline-none focus:border-g-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-g-text-variant uppercase tracking-wider ml-1">Date</label>
                    <input
                      type="date"
                      value={newStamp.date}
                      onChange={(e) => setNewStamp({ ...newStamp, date: e.target.value })}
                      className="w-full py-4 px-5 bg-g-surface border border-g-outline/10 rounded-xl text-g-text font-bold focus:outline-none focus:border-g-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 pt-0 shrink-0">
                <button
                  onClick={handleAddStamp}
                  disabled={!newStamp.image}
                  className="w-full h-16 bg-g-primary text-white dark:text-[#202124] font-bold uppercase tracking-wider rounded-2xl shadow-elevation-2 active:scale-98 transition-all duration-200 ripple disabled:opacity-50 disabled:bg-g-outline cursor-pointer"
                >
                  Seal Entry
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Viewer Modal Overlay (Frosted Apple Card Style) */}
      <AnimatePresence>
        {viewingStamp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingStamp(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md bg-g-surface border border-g-outline/20 rounded-[40px] rounded-tl-[12px] p-6.5 shadow-2xl flex flex-col z-10 overflow-hidden transform-gpu [will-change:transform,opacity,scale]"
            >
              {/* Header actions toolbar */}
              <div className="flex justify-between items-center mb-5 border-b border-g-outline/10 pb-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-g-primary animate-pulse" />
                  <span className="text-[10px] font-bold tracking-widest text-g-text-variant uppercase leading-none">Authentication Badge</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(viewingStamp.id)}
                    className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center transition-colors ripple shrink-0 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => { triggerHaptic('light'); setViewingStamp(null); }}
                    className="w-9 h-9 rounded-full bg-g-aluminium dark:bg-g-aluminium/10 text-g-text flex items-center justify-center hover:bg-g-outline/30 transition-colors ripple shrink-0 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Main image body */}
              <div className="w-full material-card p-4.5 bg-g-surface/50 flex flex-col justify-center items-center relative overflow-hidden shrink-0">
                <img src={viewingStamp.image} className="w-full max-h-[300px] object-contain rounded-2xl select-all" alt="Stamp detail View" />
              </div>

              {/* Data parameters list */}
              <div className="mt-5 space-y-3 flex-1 select-all shrink-0">
                <div className="flex items-center gap-3 text-g-primary">
                  <MapPin size={18} className="stroke-[2.5]" />
                  <span className="text-xl font-black font-display uppercase tracking-tight leading-none pt-0.5">{viewingStamp.location}</span>
                </div>
                <div className="flex items-center gap-3 text-g-text-variant">
                  <Calendar size={18} className="stroke-[2]" />
                  <span className="text-[11px] font-bold font-mono uppercase tracking-widest leading-none pt-0.5">{viewingStamp.date.replace(/-/g, '.')}</span>
                </div>
              </div>

              {/* Footer certification details */}
              <div className="mt-7 pt-4 border-t border-g-outline/10 flex justify-between items-center shrink-0">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-g-text-variant uppercase tracking-widest mb-1 leading-none">TELEMETRY ENCRYPT</span>
                  <span className="text-[10px] font-bold uppercase text-g-primary leading-none tracking-widest">VERIFIED TRAVEL SEAL</span>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => triggerHaptic('medium')} className="text-g-text-variant hover:text-g-primary transition-colors cursor-pointer"><Share2 size={18} /></button>
                  <button onClick={() => triggerHaptic('medium')} className="text-g-text-variant hover:text-g-primary transition-colors cursor-pointer"><Download size={18} /></button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
