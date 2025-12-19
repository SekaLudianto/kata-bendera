
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EditIcon, TrashIcon, PlusIcon, SaveIcon, CloudIcon, DownloadIcon, UploadCloudIcon, DatabaseIcon, XIcon, SearchIcon, InfoIcon } from './IconComponents';
import { DEFAULT_JSONBIN_API_KEY } from '../constants';

interface AdminQuestionDashboardProps {
  onClose: () => void;
}

const JSONBIN_URL = 'https://api.jsonbin.io/v3/b';

const CATEGORIES = [
  { id: 'bikinEmosi', name: 'Bikin Emosi (Jebakan)', type: 'object', fields: ['question', 'answer', 'explanation'] },
  { id: 'countries', name: 'Negara (Bendera & ABC)', type: 'object', fields: ['name', 'code'] },
  { id: 'indonesianCities', name: 'ABC: Kota Indonesia', type: 'string' },
  { id: 'fruits', name: 'ABC: Buah', type: 'string' },
  { id: 'animals', name: 'ABC: Hewan', type: 'string' },
  { id: 'objects', name: 'ABC: Benda', type: 'string' },
  { id: 'professions', name: 'ABC: Profesi', type: 'string' },
  { id: 'plants', name: 'ABC: Tumbuhan', type: 'string' },
  { id: 'trivia', name: 'Trivia Umum', type: 'object', fields: ['question', 'answer'] },
  { id: 'footballTrivia', name: 'Trivia Bola', type: 'object', fields: ['question', 'answer'] },
  { id: 'kpopTrivia', name: 'Trivia K-Pop', type: 'object', fields: ['question', 'answer'] },
  { id: 'cities', name: 'Tebak Kota (Dunia)', type: 'object', fields: ['name', 'region'] },
  { id: 'footballStadiums', name: 'Stadion Bola', type: 'object', fields: ['name', 'location'] },
  { id: 'footballPlayers', name: 'Pemain Bola', type: 'string' },
  { id: 'footballClubs', name: 'Klub Bola', type: 'string' },
  { id: 'movies', name: 'Film', type: 'string' },
];

const AdminQuestionDashboard: React.FC<AdminQuestionDashboardProps> = ({ onClose }) => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [data, setData] = useState<Record<string, any[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState<number | null>(null); // Index of item being edited
  const [editForm, setEditForm] = useState<any>({});
  
  // Cloud Sync State
  const [apiKey] = useState(() => localStorage.getItem('jsonbin_api_key') || DEFAULT_JSONBIN_API_KEY);
  const [questionBinId, setQuestionBinId] = useState(() => localStorage.getItem('jsonbin_questions_bin_id') || '');
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cloudMessage, setCloudMessage] = useState('');

  useEffect(() => {
    // Load local custom questions on mount
    try {
        const stored = localStorage.getItem('custom-questions');
        if (stored) {
            setData(JSON.parse(stored));
        } else {
            // Initialize empty structure
            const initial: Record<string, any[]> = {};
            CATEGORIES.forEach(cat => initial[cat.id] = []);
            setData(initial);
        }
    } catch (e) {
        console.error("Failed to load data", e);
    }
  }, []);

  useEffect(() => {
      localStorage.setItem('jsonbin_questions_bin_id', questionBinId);
  }, [questionBinId]);

  const saveToLocal = (newData: Record<string, any[]>) => {
      setData(newData);
      localStorage.setItem('custom-questions', JSON.stringify(newData));
  };

  const handleAddItem = () => {
      const categoryDef = CATEGORIES.find(c => c.id === activeCategory);
      if (!categoryDef) return;

      const newItem = categoryDef.type === 'string' ? '' : categoryDef.fields!.reduce((acc, field) => ({ ...acc, [field]: '' }), {});
      
      const newData = { ...data };
      if (!newData[activeCategory]) newData[activeCategory] = [];
      
      // Add to beginning
      newData[activeCategory] = [newItem, ...newData[activeCategory]];
      saveToLocal(newData);
      setIsEditing(0); // Immediately edit the new item
      setEditForm(newItem);
  };

  const handleDeleteItem = (index: number) => {
      if (!window.confirm("Hapus item ini?")) return;
      const newData = { ...data };
      newData[activeCategory].splice(index, 1);
      saveToLocal(newData);
      if (isEditing === index) setIsEditing(null);
  };

  const handleSaveItem = () => {
      if (isEditing === null) return;
      const newData = { ...data };
      newData[activeCategory][isEditing] = editForm;
      saveToLocal(newData);
      setIsEditing(null);
      setEditForm({});
  };

  const handleEditClick = (index: number, item: any) => {
      setIsEditing(index);
      setEditForm(item);
  };

  const filteredList = (data[activeCategory] || []).filter((item: any) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      if (typeof item === 'string') return item.toLowerCase().includes(term);
      return Object.values(item).some((val: any) => String(val).toLowerCase().includes(term));
  });

  // Cloud Logic
  const handleCloudSave = async () => {
      if (!apiKey) {
          setCloudStatus('error');
          setCloudMessage('API Key JSONBin belum diatur.');
          return;
      }
      setCloudStatus('loading');
      setCloudMessage('Menyimpan ke Cloud...');

      try {
          let url = JSONBIN_URL;
          let method = 'POST';
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Master-Key': apiKey,
          };

          if (questionBinId) {
            url = `${JSONBIN_URL}/${questionBinId}`;
            method = 'PUT';
          } else {
            headers['X-Bin-Name'] = 'TikTokTriviaQuestions';
          }

          const res = await fetch(url, {
              method,
              headers,
              body: JSON.stringify(data)
          });
          const json = await res.json();
          
          if (!res.ok) throw new Error(json.message || 'Gagal menyimpan.');

          const newId = json.metadata?.id || questionBinId;
          setQuestionBinId(newId);
          setCloudStatus('success');
          setCloudMessage(method === 'POST' ? 'Bank Data Baru dibuat!' : 'Bank Data diperbarui!');
          setTimeout(() => setCloudMessage(''), 3000);

      } catch (e: any) {
          setCloudStatus('error');
          setCloudMessage(e.message);
      }
  };

  const handleCloudLoad = async () => {
      if (!apiKey || !questionBinId) {
          setCloudStatus('error');
          setCloudMessage('Butuh API Key & Bin ID.');
          return;
      }
      setCloudStatus('loading');
      setCloudMessage('Mengunduh dari Cloud...');

      try {
          const res = await fetch(`${JSONBIN_URL}/${questionBinId}`, {
              headers: { 'X-Master-Key': apiKey }
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.message || 'Gagal mengambil data.');

          // JSONBin v3 wraps data in 'record'
          const record = json.record;
          if (typeof record !== 'object') throw new Error('Format data salah.');

          saveToLocal(record);
          setCloudStatus('success');
          setCloudMessage('Bank Data berhasil dimuat!');
          setTimeout(() => setCloudMessage(''), 3000);
      } catch (e: any) {
          setCloudStatus('error');
          setCloudMessage(e.message);
      }
  };

  const renderEditor = () => {
      const categoryDef = CATEGORIES.find(c => c.id === activeCategory);
      if (!categoryDef) return null;

      if (categoryDef.type === 'string') {
          return (
              <input 
                type="text" 
                value={editForm} 
                onChange={e => setEditForm(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoFocus
              />
          );
      }

      return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categoryDef.fields!.map(field => (
                  <div key={field} className={field === 'explanation' ? 'col-span-full' : ''}>
                      <label className="text-xs text-gray-500 uppercase font-bold">{field === 'explanation' ? 'Penjelasan (Opsional)' : field}</label>
                      <input 
                        type="text"
                        value={editForm[field] || ''}
                        onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder={field === 'explanation' ? 'Muncul setelah jawaban terungkap...' : ''}
                      />
                  </div>
              ))}
          </div>
      );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col md:flex-row overflow-hidden"
    >
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-gray-100 dark:bg-gray-800 border-b md:border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-sky-50 dark:bg-gray-800">
                <h2 className="font-bold text-lg text-sky-600 dark:text-sky-400 flex items-center gap-2">
                    <DatabaseIcon className="w-5 h-5"/>
                    Bank Data
                </h2>
                <button onClick={onClose} className="md:hidden p-1 bg-red-100 text-red-600 rounded">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 border-b border-blue-100 dark:border-blue-800/30 flex items-start gap-2">
                <InfoIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                    Data yang Anda tambahkan di sini bersifat <b>TAMBAHAN</b>. Saat bermain, data ini akan dicampur dengan database bawaan game.
                </span>
            </div>

            <div className="flex-1 overflow-x-auto md:overflow-y-auto flex md:flex-col p-2 gap-1 no-scrollbar">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id); setIsEditing(null); setSearchTerm(''); }}
                        className={`px-3 py-2 text-left rounded-lg text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal flex justify-between items-center ${
                            activeCategory === cat.id 
                            ? 'bg-sky-500 text-white shadow' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        <span>{cat.name}</span>
                        <span className={`text-xs ml-2 px-1.5 py-0.5 rounded-full ${activeCategory === cat.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'}`}>
                            {data[cat.id]?.length || 0}
                        </span>
                    </button>
                ))}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Cloud Sync (JSONBin)</div>
                <div className="space-y-2">
                    <input 
                        type="text" 
                        placeholder="Bin ID (Data)" 
                        value={questionBinId}
                        onChange={e => setQuestionBinId(e.target.value)}
                        className="w-full p-1.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleCloudSave} disabled={cloudStatus === 'loading'} className="flex-1 bg-sky-100 text-sky-700 hover:bg-sky-200 p-1.5 rounded text-xs font-bold flex justify-center items-center gap-1">
                            <UploadCloudIcon className="w-3 h-3"/> Simpan
                        </button>
                        <button onClick={handleCloudLoad} disabled={cloudStatus === 'loading'} className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 p-1.5 rounded text-xs font-bold flex justify-center items-center gap-1">
                            <DownloadIcon className="w-3 h-3"/> Muat
                        </button>
                    </div>
                    {cloudMessage && <p className={`text-[10px] text-center ${cloudStatus === 'error' ? 'text-red-500' : 'text-green-500'}`}>{cloudMessage}</p>}
                </div>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center gap-3">
                <div className="flex-1 relative">
                    <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder={`Cari di ${CATEGORIES.find(c => c.id === activeCategory)?.name}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-sky-500 dark:text-white"
                    />
                </div>
                <button 
                    onClick={handleAddItem}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-500/20 transition-all"
                >
                    <PlusIcon className="w-4 h-4" /> <span className="hidden sm:inline">Tambah</span>
                </button>
                <button onClick={onClose} className="hidden md:block p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-300 hover:text-red-500 rounded-lg transition-colors">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredList.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <DatabaseIcon className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                        <p>Belum ada data di kategori ini.</p>
                        <p className="text-sm">Klik "Tambah" atau muat dari Cloud.</p>
                    </div>
                ) : (
                    filteredList.map((item: any, index: number) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                            {isEditing === index ? (
                                <div className="space-y-3">
                                    {renderEditor()}
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsEditing(null)} className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300">Batal</button>
                                        <button onClick={handleSaveItem} className="px-3 py-1.5 text-xs font-bold text-white bg-sky-500 rounded hover:bg-sky-600 flex items-center gap-1"><SaveIcon className="w-3 h-3"/> Simpan</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div className="flex-1 text-sm text-slate-700 dark:text-slate-200 font-medium break-all">
                                        {typeof item === 'string' ? item : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                                                {Object.entries(item).map(([k, v]) => (
                                                    <span key={k} className="mr-2">
                                                        <span className="text-xs text-gray-400 uppercase mr-1">{k}:</span>
                                                        {String(v)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                        <button onClick={() => handleEditClick(index, item)} className="p-1.5 text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded"><EditIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteItem(index)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    </motion.div>
  );
};

export default AdminQuestionDashboard;
