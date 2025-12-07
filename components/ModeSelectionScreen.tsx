

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GamepadIcon, UploadCloudIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon } from './IconComponents';
import { DEFAULT_MAX_WINNERS_PER_ROUND } from '../constants';
import { GameMode, GameStyle, KnockoutCategory } from '../types';

interface ModeSelectionScreenProps {
  onStartClassic: (maxWinners: number, categories: GameMode[], useImportedOnly: boolean) => void;
  onStartKnockout: (category: KnockoutCategory, useImportedOnly: boolean) => void;
  onShowLeaderboard: () => void;
  onResetGlobalLeaderboard: () => void;
}

const classicCategories: { id: GameMode, name: string }[] = [
    { id: GameMode.GuessTheFlag, name: 'Tebak Bendera' },
    { id: GameMode.ABC5Dasar, name: 'ABC 5 Dasar' },
    { id: GameMode.Trivia, name: 'Trivia Umum' },
    { id: GameMode.GuessTheCity, name: 'Tebak Kota' },
    { id: GameMode.ZonaBola, name: 'Zona Bola' },
    { id: GameMode.GuessTheFruit, name: 'Tebak Buah' },
    { id: GameMode.GuessTheAnimal, name: 'Tebak Hewan' },
    { id: GameMode.KpopTrivia, name: 'Zona KPOP' },
];

const validImportKeys = ['countries', 'trivia', 'cities', 'footballPlayers', 'footballClubs', 'footballStadiums', 'fruits', 'animals', 'kpopTrivia'];

const jsonExampleFormat = `{
  "countries": [
    { "name": "Wakanda", "code": "wk" }
  ],
  "trivia": [
    { "question": "Siapa Iron Man?", "answer": "Tony Stark" }
  ],
  "cities": [
    { "name": "Gotham", "region": "DC Universe" }
  ],
  "footballPlayers": [
    "Tsubasa Ozora"
  ],
  "footballClubs": [
    "Nankatsu SC"
  ],
  "footballStadiums": [
    { "name": "Nankatsu Stadium", "location": "Nankatsu City" }
  ],
  "fruits": [
    "Buah Iblis"
  ],
  "animals": [
    "Pikachu"
  ],
  "kpopTrivia": [
    { "question": "Lagu debut Aespa?", "answer": "Black Mamba" }
  ]
}`;


const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({ onStartClassic, onStartKnockout, onShowLeaderboard, onResetGlobalLeaderboard }) => {
  const [maxWinners, setMaxWinners] = useState(() => {
    const saved = localStorage.getItem('tiktok-quiz-maxwinners');
    return saved ? parseInt(saved, 10) : DEFAULT_MAX_WINNERS_PER_ROUND;
  });
  const [gameStyle, setGameStyle] = useState<GameStyle>(GameStyle.Classic);
  const [knockoutCategory, setKnockoutCategory] = useState<KnockoutCategory>('GuessTheCountry');
  const [selectedClassicCategories, setSelectedClassicCategories] = useState<GameMode[]>(() => {
    const saved = localStorage.getItem('tiktok-quiz-classic-categories');
    return saved ? JSON.parse(saved) : classicCategories.map(c => c.id);
  });
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [useImportedOnly, setUseImportedOnly] = useState(false);
  const [hasImportedQuestions, setHasImportedQuestions] = useState(false);
  const [isCategoryListOpen, setIsCategoryListOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkStorage = () => {
        const customData = localStorage.getItem('custom-questions');
        setHasImportedQuestions(!!customData);
        if (!customData) {
            setUseImportedOnly(false); // Reset if questions are cleared
        }
    };
    checkStorage();

    // Listen to storage changes from other tabs/windows
    window.addEventListener('storage', checkStorage);
    return () => window.removeEventListener('storage', checkStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem('tiktok-quiz-maxwinners', String(maxWinners));
  }, [maxWinners]);
  
  useEffect(() => {
    localStorage.setItem('tiktok-quiz-classic-categories', JSON.stringify(selectedClassicCategories));
  }, [selectedClassicCategories]);

  const handleCategoryToggle = (categoryId: GameMode) => {
    setSelectedClassicCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleMaxWinnersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1) {
      setMaxWinners(value);
    } else if (e.target.value === '') {
      setMaxWinners(1);
    }
  };

  const handleStartGame = () => {
    if (gameStyle === GameStyle.Classic) {
      if (selectedClassicCategories.length > 0) {
        onStartClassic(maxWinners, selectedClassicCategories, useImportedOnly);
      }
    } else {
      onStartKnockout(knockoutCategory, useImportedOnly);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleStartGame();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (typeof data !== 'object' || data === null) {
          throw new Error('File JSON harus berupa objek.');
        }

        const importedData: Record<string, any[]> = {};
        let summary = [];

        for (const key of validImportKeys) {
          if (data[key] && Array.isArray(data[key])) {
            importedData[key] = data[key];
            summary.push(`${data[key].length} soal ${key}`);
          }
        }

        if (Object.keys(importedData).length === 0) {
          throw new Error('Tidak ada kategori soal yang valid ditemukan di file JSON.');
        }

        localStorage.setItem('custom-questions', JSON.stringify(importedData));
        setImportFeedback(`Berhasil mengimpor: ${summary.join(', ')}.`);
        setHasImportedQuestions(true);
      } catch (error: any) {
        setImportFeedback(`Error: ${error.message}`);
      }
    };
    reader.readAsText(file);
    // Reset file input value to allow re-uploading the same file
    event.target.value = ''; 
  };
  
  const handleClearImported = () => {
      localStorage.removeItem('custom-questions');
      setImportFeedback('Semua soal yang diimpor telah dihapus.');
      setHasImportedQuestions(false);
  };

  const handleDownloadExample = () => {
    const blob = new Blob([jsonExampleFormat], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contoh-format-soal.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const knockoutCategories: { id: KnockoutCategory, name: string }[] = [
    { id: 'GuessTheCountry', name: 'Tebak Negara' },
    { id: 'Trivia', name: 'Trivia Umum' },
    { id: 'ZonaBola', name: 'Zona Bola' },
    { id: 'GuessTheFruit', name: 'Tebak Buah' },
    { id: 'GuessTheAnimal', name: 'Tebak Hewan' },
    { id: 'KpopTrivia', name: 'Zona KPOP' },
  ];

  return (
    <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl transition-colors duration-300">
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        <motion.div
          animate={{ rotate: [0, 5, -5, 5, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <GamepadIcon className="w-20 h-20 text-sky-400" />
        </motion.div>
        <h1 className="text-3xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-500">
          Pilih Mode Permainan
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Koneksi berhasil! Siap untuk bermain?</p>

        <form onSubmit={handleSubmit} className="w-full max-w-xs mt-6">
          
          <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setGameStyle(GameStyle.Classic)} className={`px-4 py-2.5 font-bold rounded-lg transition-all text-sm ${gameStyle === GameStyle.Classic ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-sky-100 text-sky-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Klasik
              </button>
               <button type="button" onClick={() => setGameStyle(GameStyle.Knockout)} className={`px-4 py-2.5 font-bold rounded-lg transition-all text-sm ${gameStyle === GameStyle.Knockout ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-sky-100 text-sky-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Knockout
              </button>
          </div>

          <AnimatePresence mode="wait">
          {gameStyle === GameStyle.Classic && (
            <motion.div
              key="classic-options"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem', transition: { duration: 0.3 } }}
              exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } }}
              className="overflow-hidden space-y-3"
            >
              <div>
                 <label htmlFor="max-winners" className="block text-xs text-left text-gray-500 dark:text-gray-400 mb-1">Jumlah Pemenang per Ronde</label>
                <input
                  type="number"
                  id="max-winners"
                  value={maxWinners}
                  onChange={handleMaxWinnersChange}
                  min="1"
                  className="w-full px-4 py-2 bg-sky-100 border-2 border-sky-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 dark:focus:border-sky-500"
                  aria-label="Jumlah Pemenang Maksimum"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setIsCategoryListOpen(prev => !prev)}
                  className="w-full flex justify-between items-center text-left text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium"
                >
                  <span>Pilih Kategori Soal Klasik ({selectedClassicCategories.length}/{classicCategories.length})</span>
                  {isCategoryListOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </button>
                <AnimatePresence>
                  {isCategoryListOpen && (
                    <motion.div
                      key="category-list"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {classicCategories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoryToggle(cat.id)}
                            className={`px-2 py-2 font-semibold rounded-lg transition-all text-xs flex items-center justify-center gap-2 ${selectedClassicCategories.includes(cat.id) ? 'bg-teal-500 text-white shadow' : 'bg-teal-100 text-teal-800 dark:bg-gray-700 dark:text-gray-300'}`}
                          >
                            <div className={`w-3 h-3 rounded-sm border-2 ${selectedClassicCategories.includes(cat.id) ? 'bg-white border-white' : 'border-gray-400'}`}></div>
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {gameStyle === GameStyle.Knockout && (
             <motion.div
              key="knockout-category"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem', transition: { duration: 0.3 } }}
              exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } }}
              className="overflow-hidden"
            >
              <div className="relative">
                 <label className="block text-xs text-left text-gray-500 dark:text-gray-400 mb-1">Pilih Kategori Soal Knockout</label>
                 <div className="grid grid-cols-2 gap-2">
                    {knockoutCategories.map(cat => (
                         <button 
                            key={cat.id}
                            type="button" 
                            onClick={() => setKnockoutCategory(cat.id)} 
                            className={`px-2 py-2 font-semibold rounded-lg transition-all text-xs ${knockoutCategory === cat.id ? 'bg-amber-500 text-white shadow' : 'bg-amber-100 text-amber-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {cat.name}
                        </button>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>


          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={gameStyle === GameStyle.Classic && selectedClassicCategories.length === 0}
            className="w-full mt-4 px-4 py-2.5 bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
          >
            Mulai Permainan
          </motion.button>
        </form>
          <button 
            onClick={onShowLeaderboard}
            className="mt-2 text-sm text-sky-500 dark:text-sky-400 font-semibold hover:underline"
          >
            Lihat Peringkat Global
          </button>
      </div>

      <div className="shrink-0 mt-4 pt-4 border-t border-sky-100 dark:border-gray-700">
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 transition-all text-sm"
          >
            <UploadCloudIcon className="w-4 h-4" />
            Impor Soal (JSON)
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleClearImported}
              className="w-full px-4 py-2 bg-gray-500 text-white font-bold rounded-lg shadow-md shadow-gray-500/30 hover:bg-gray-600 transition-all text-sm"
            >
              Hapus Soal Impor
            </button>
            <button
              type="button"
              onClick={onResetGlobalLeaderboard}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all text-sm"
            >
              <TrashIcon className="w-4 h-4" />
              Reset Peringkat
            </button>
          </div>
        </div>

        <div className="mt-3">
          <label htmlFor="use-imported-only" className={`flex items-center justify-center cursor-pointer transition-opacity ${!hasImportedQuestions ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="relative">
                  <input 
                      type="checkbox" 
                      id="use-imported-only" 
                      className="sr-only" 
                      checked={useImportedOnly} 
                      onChange={() => setUseImportedOnly(!useImportedOnly)} 
                      disabled={!hasImportedQuestions}
                  />
                  <div className="block bg-gray-200 dark:bg-gray-700 w-10 h-6 rounded-full"></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useImportedOnly ? 'translate-x-full' : ''}`}></div>
              </div>
              <div className="ml-3 text-gray-700 dark:text-gray-300 font-medium text-sm">
                  Hanya Gunakan Soal Impor
              </div>
          </label>
        </div>
        
        <button
          type="button"
          onClick={handleDownloadExample}
          className="w-full mt-3 text-sm text-sky-500 dark:text-sky-400 font-semibold hover:underline"
        >
          Unduh Contoh Format JSON
        </button>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
          Catatan: Soal yang diimpor akan tersedia di mode Klasik & Knockout.
        </p>

        <AnimatePresence>
        {importFeedback && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-green-600 dark:text-green-400 mt-2 text-center"
          >
            {importFeedback}
          </motion.p>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ModeSelectionScreen;