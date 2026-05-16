import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Plus, Trash2, MapPin, Calendar, X, Download, Share2 } from 'lucide-react';

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

export default function App() {
  const [stamps, setStamps] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newStamp, setNewStamp] = useState({ image: null, location: '', date: new Date().toISOString().split('T')[0] });
  const [viewingStamp, setViewingStamp] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    refreshStamps();
  }, []);

  const refreshStamps = async () => {
    const data = await getStamps();
    setStamps(data.reverse());
  };

  const handleFileChange = (e) => {
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
    await saveStamp({
      ...newStamp,
      location: newStamp.location || 'Unknown Location'
    });
    setIsAdding(false);
    setNewStamp({ image: null, location: '', date: new Date().toISOString().split('T')[0] });
    refreshStamps();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this memory?')) {
      await deleteStamp(id);
      refreshStamps();
      setViewingStamp(null);
    }
  };

  return (
    <div className="min-h-screen bg-g-bg text-g-text font-sans selection:bg-g-primary-container">
      <div className="max-w-md mx-auto flex flex-col p-6 min-h-screen">
        
        {/* Header */}
        <header className="flex justify-between items-center py-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-g-primary rounded-full" />
            <h1 className="text-xl font-bold uppercase tracking-tight">Onyx Stamp</h1>
          </div>
          <div className="text-[10px] font-bold text-g-text-variant uppercase tracking-widest bg-g-surface border border-g-outline/20 px-3 py-1.5 rounded-md shadow-elevation-1">Collector_v2</div>
        </header>

        {/* Hero / Stats */}
        <section className="mt-4 mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-g-primary block mb-1">Goshuin-cho</span>
          <h2 className="text-5xl font-bold tracking-tighter uppercase overflow-hidden text-g-text">
            Stamp<br/>Collection
          </h2>
          <div className="flex items-center gap-5 mt-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-wider mb-1">Collected</span>
              <span className="text-2xl font-bold tabular-nums text-g-text">{stamps.length}</span>
            </div>
            <div className="w-[2px] h-10 bg-g-outline/30" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-wider mb-1">Storage</span>
              <span className="text-lg font-bold text-g-primary">Offline</span>
            </div>
          </div>
        </section>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 pb-32">
          {stamps.length === 0 ? (
            <div className="col-span-2 py-32 text-center border-2 border-dashed border-g-outline/30 rounded-3xl text-g-text-variant text-xs font-bold uppercase tracking-widest">No Data Collected</div>
          ) : (
            stamps.map((stamp, idx) => (
              <motion.button
                key={stamp.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setViewingStamp(stamp)}
                className="material-card aspect-square relative overflow-hidden group shadow-elevation-1 ripple"
              >
                <img src={stamp.image} className="w-full h-full object-cover grayscale-0 opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="Stamp" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 text-left">
                  <div className="flex flex-col justify-end">
                    <p className="text-[9px] font-bold text-white/80 uppercase tracking-widest mb-0.5">{stamp.date.replace(/-/g, '.')}</p>
                    <p className="text-[11px] font-bold text-white uppercase tracking-tight truncate w-full">{stamp.location}</p>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>

        {/* FAB */}
        <div className="fixed bottom-0 left-0 right-0 p-10 flex justify-center z-40 pointer-events-none">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsAdding(true)}
            className="pointer-events-auto h-16 w-16 bg-g-primary flex items-center justify-center shadow-elevation-3 rounded-2xl ripple active:bg-blue-700 transition-colors"
          >
            <Plus size={32} className="text-white" strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Add Modal */}
        <AnimatePresence>
          {isAdding && (
            <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "tween", duration: 0.3 }} className="fixed inset-0 z-50 flex flex-col bg-g-surface shadow-elevation-3">
              <div className="flex justify-between items-center p-8 pb-4">
                <h3 className="text-2xl font-bold uppercase tracking-tight text-g-text">New Entry</h3>
                <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-g-aluminium rounded-full flex items-center justify-center text-g-text ripple"><X size={20} /></button>
              </div>

              <div className="space-y-8 flex-1 p-8 overflow-y-auto no-scrollbar">
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="w-full aspect-square material-card bg-g-bg flex flex-col items-center justify-center border-2 border-dashed border-g-outline/30 cursor-pointer relative overflow-hidden group ripple hover:border-g-primary transition-colors"
                >
                  {newStamp.image ? (
                    <img src={newStamp.image} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <Camera size={48} className="text-g-primary/40 mb-4 group-hover:text-g-primary transition-colors" />
                      <span className="text-[11px] font-bold text-g-text-variant uppercase tracking-wider">Tap to capture stamp</span>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-g-text-variant uppercase tracking-wider ml-1">Location / Station</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Shinjuku Station" 
                      value={newStamp.location}
                      onChange={(e) => setNewStamp({...newStamp, location: e.target.value})}
                      className="w-full py-4 px-5 bg-g-bg border border-g-outline/20 rounded-xl text-g-text font-bold focus:outline-none focus:border-g-primary transition-colors" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-g-text-variant uppercase tracking-wider ml-1">Date</label>
                    <input 
                      type="date" 
                      value={newStamp.date}
                      onChange={(e) => setNewStamp({...newStamp, date: e.target.value})}
                      className="w-full py-4 px-5 bg-g-bg border border-g-outline/20 rounded-xl text-g-text font-bold focus:outline-none focus:border-g-primary transition-colors" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 pt-0">
                <button 
                  onClick={handleAddStamp}
                  disabled={!newStamp.image}
                  className="w-full h-16 bg-g-primary text-white font-bold uppercase tracking-wider rounded-2xl shadow-elevation-2 active:scale-95 transition-all ripple disabled:opacity-50 disabled:bg-g-outline"
                >
                  Seal Entry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewer Modal */}
        <AnimatePresence>
          {viewingStamp && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-g-bg/90 backdrop-blur-md">
              <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 pt-[env(safe-area-inset-top)]">
                <button onClick={() => setViewingStamp(null)} className="text-g-text bg-white shadow-elevation-1 p-3 rounded-full ripple"><X size={20} /></button>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(viewingStamp.id)} className="text-red-600 bg-white shadow-elevation-1 p-3 rounded-full ripple"><Trash2 size={20} /></button>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 pt-24">
                <div className="w-full material-card p-6 bg-g-surface relative shadow-elevation-3">
                  <img src={viewingStamp.image} className="w-full aspect-square object-contain" alt="Stamp Detail" />
                  
                  <div className="mt-8 space-y-3">
                    <div className="flex items-center gap-3 text-g-primary">
                      <MapPin size={18} />
                      <span className="text-lg font-bold uppercase tracking-tight">{viewingStamp.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-g-text-variant">
                      <Calendar size={18} />
                      <span className="text-xs font-bold uppercase tracking-widest">{viewingStamp.date.replace(/-/g, '/')}</span>
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-g-outline/20 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-g-text-variant uppercase tracking-wider mb-1">Authentication</span>
                      <span className="text-[11px] font-bold uppercase text-g-primary">Verified Stamp</span>
                    </div>
                    <div className="flex gap-4">
                      <button className="text-g-text-variant hover:text-g-primary transition-colors"><Share2 size={20} /></button>
                      <button className="text-g-text-variant hover:text-g-primary transition-colors"><Download size={20} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
