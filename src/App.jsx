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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#C084FC]/30">
      <div className="max-w-md mx-auto flex flex-col p-6 min-h-screen">
        
        {/* Header */}
        <header className="flex justify-between items-center py-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[#C084FC]" />
            <h1 className="text-xl font-black uppercase tracking-tighter">Onyx Stamp</h1>
          </div>
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest border border-zinc-900 px-3 py-1">Collector_v1</div>
        </header>

        {/* Hero / Stats */}
        <section className="mt-4 mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C084FC] block mb-1">Goshuin-cho</span>
          <h2 className="text-5xl font-black tracking-tighter uppercase overflow-hidden">
            Stamp<br/>Collection
          </h2>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-600 uppercase">Collected</span>
              <span className="text-2xl font-bold">{stamps.length}</span>
            </div>
            <div className="w-px h-8 bg-zinc-900" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-600 uppercase">Storage</span>
              <span className="text-lg font-bold text-zinc-400">Offline</span>
            </div>
          </div>
        </section>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 pb-32">
          {stamps.length === 0 ? (
            <div className="col-span-2 py-32 text-center border border-dashed border-zinc-900 text-zinc-800 text-[10px] font-bold uppercase tracking-widest">No_Data_Collected</div>
          ) : (
            stamps.map((stamp, idx) => (
              <motion.button
                key={stamp.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setViewingStamp(stamp)}
                className="onyx-card aspect-square relative overflow-hidden group border-zinc-900"
              >
                <img src={stamp.image} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" alt="Stamp" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-3 left-3 text-left">
                  <div className="onyx-card-inner flex flex-col justify-end p-3">
                    <p className="text-[8px] font-bold text-[#C084FC] uppercase transform -rotate-90 origin-left absolute top-10 right-[-20px] tracking-widest">{stamp.date.replace(/-/g, '.')}</p>
                    <p className="text-[10px] font-black uppercase tracking-tight truncate w-full">{stamp.location}</p>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>

        {/* FAB */}
        <div className="fixed bottom-0 left-0 right-0 p-10 flex justify-center z-40">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsAdding(true)}
            className="h-16 w-16 bg-[#C084FC] flex items-center justify-center shadow-lg shadow-[#C084FC]/20 rounded-none"
          >
            <Plus size={32} className="text-black" strokeWidth={3} />
          </motion.button>
        </div>

        {/* Add Modal */}
        <AnimatePresence>
          {isAdding && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-black p-6">
              <div className="flex justify-between items-center py-6 mb-8">
                <h3 className="text-2xl font-black uppercase tracking-tighter">New Entry</h3>
                <button onClick={() => setIsAdding(false)} className="text-zinc-600"><X size={32} /></button>
              </div>

              <div className="space-y-8 flex-1">
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="w-full aspect-square onyx-card flex flex-col items-center justify-center border-dashed relative overflow-hidden group"
                >
                  {newStamp.image ? (
                    <img src={newStamp.image} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <Camera size={48} className="text-zinc-800 mb-4 group-hover:text-[#C084FC] transition-colors" />
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Tap to capture stamp</span>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1">Location / Station</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Shinjuku Station" 
                      value={newStamp.location}
                      onChange={(e) => setNewStamp({...newStamp, location: e.target.value})}
                      className="onyx-input" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1">Date</label>
                    <input 
                      type="date" 
                      value={newStamp.date}
                      onChange={(e) => setNewStamp({...newStamp, date: e.target.value})}
                      className="onyx-input font-bold" 
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleAddStamp}
                disabled={!newStamp.image}
                className="onyx-button-primary w-full py-5 disabled:opacity-30 disabled:grayscale"
              >
                Seal Entry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewer Modal */}
        <AnimatePresence>
          {viewingStamp && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-black">
              <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black to-transparent">
                <button onClick={() => setViewingStamp(null)} className="text-white bg-black/40 backdrop-blur-md p-2 rounded-full"><X size={24} /></button>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(viewingStamp.id)} className="text-red-500 bg-black/40 backdrop-blur-md p-2 rounded-full"><Trash2 size={24} /></button>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 pt-20">
                <div className="w-full onyx-card p-4 bg-white/5 backdrop-blur-sm relative">
                  <img src={viewingStamp.image} className="w-full aspect-square object-contain shadow-2xl" alt="Stamp Detail" />
                  
                  <div className="mt-8 space-y-2">
                    <div className="flex items-center gap-2 text-[#C084FC]">
                      <MapPin size={14} />
                      <span className="text-sm font-black uppercase tracking-tight">{viewingStamp.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{viewingStamp.date.replace(/-/g, '/')}</span>
                    </div>
                  </div>

                  <div className="mt-12 pt-6 border-t border-zinc-900/50 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-zinc-700 uppercase">Authentication</span>
                      <span className="text-[10px] font-black uppercase text-[#C084FC]">Verified_Stamp</span>
                    </div>
                    <div className="flex gap-3">
                      <button className="text-zinc-600 hover:text-white"><Share2 size={20} /></button>
                      <button className="text-zinc-600 hover:text-white"><Download size={20} /></button>
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
