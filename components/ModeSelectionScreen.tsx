
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GamepadIcon, UploadCloudIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon, DownloadIcon, CloudIcon, DatabaseIcon, InfoIcon } from './IconComponents';
import { DEFAULT_MAX_WINNERS_PER_ROUND, TOTAL_ROUNDS, ADMIN_PASSWORD_HASH } from '../constants';
import { GameMode, GameStyle, KnockoutCategory } from '../types';
import { useSound } from '../hooks/useSound';
import CloudSyncModal from './CloudSyncModal';
import AdminQuestionDashboard from './AdminQuestionDashboard';

interface ModeSelectionScreenProps {
  onStartClassic: (maxWinners: number, categories: GameMode[], useImportedOnly: boolean, totalRounds: number, isHardMode: boolean) => void;
  onStartKnockout: (category: KnockoutCategory, useImportedOnly: boolean) => void;
  onShowLeaderboard: () => void;
  onResetGlobalLeaderboard: () => void;
}

const classicCategories: { id: GameMode, name: string }[] = [
    { id: GameMode.GuessTheFlag, name: 'Tebak Bendera' },
    { id: GameMode.ABC5Dasar, name: 'ABC 5 Dasar' },
    { id: GameMode.Trivia, name: 'Trivia Umum' },
    { id: GameMode.BikinEmosi, name: 'Bikin Emosi (Jebakan)' },
    { id: GameMode.GuessTheCity, name: 'Tebak Kota' },
    { id: GameMode.ZonaBola, name: 'Zona Bola' },
    { id: GameMode.GuessTheFruit, name: 'Tebak Buah' },
    { id: GameMode.GuessTheAnimal, name: 'Tebak Hewan' },
    { id: GameMode.KpopTrivia, name: 'Zona KPOP' },
    { id: GameMode.ZonaFilm, name: 'Zona Film' },
];

const validImportKeys = ['countries', 'trivia', 'cities', 'footballPlayers', 'footballClubs', 'footballStadiums', 'fruits', 'animals', 'kpopTrivia', 'movies', 'objects', 'professions', 'plants', 'indonesianCities', 'bikinEmosi'];

const jsonExampleFormat = `{
  "countries": [
    { "name": "Wakanda", "code": "wk" }
  ],
  "trivia": [
    { "question": "Siapa Iron Man?", "answer": "Tony Stark" }
  ],
  "bikinEmosi": [
    { "question": "Bangun tidur ku terus...", "answer": "Melek", "explanation": "Ya melek dulu baru mandi dong." }
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
  ],
  "movies": [
    "Avengers Endgame"
  ],
  "objects": [
    "Mesin Waktu"
  ],
  "professions": [
    "Pahlawan"
  ],
  "plants": [
    "Bunga Matahari"
  ],
  "indonesianCities": [
    "Konoha"
  ]
}`;


const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({ onStartClassic, onStartKnockout, onShowLeaderboard, onResetGlobalLeaderboard }) => {
  const [maxWinners, setMaxWinners] = useState(() => {
    const saved = localStorage.getItem('tiktok-quiz-maxwinners');
    return saved ? parseInt(saved, 10) : DEFAULT_MAX_WINNERS_PER_ROUND;
  });
  const [totalRounds, setTotalRounds] = useState(() => {
    const saved = localStorage.getItem('tiktok-quiz-totalrounds');
    return saved ? parseInt(saved, 10) : TOTAL_ROUNDS;
  });
  const [gameStyle, setGameStyle] = useState<GameStyle>(GameStyle.Classic);
  const [knockoutCategory, setKnockoutCategory] = useState<KnockoutCategory>('GuessTheCountry');
  const [selectedClassicCategories, setSelectedClassicCategories] = useState<GameMode[]>(() => {
    const saved = localStorage.getItem('tiktok-quiz-classic-categories');
    return saved ? JSON.parse(saved) : classicCategories.map(c => c.id);
  });
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [useImportedOnly, setUseImportedOnly] = useState(false);
  const [isHardMode, setIsHardMode] = useState(false);
  const [hasImportedQuestions, setHasImportedQuestions] = useState(false);
  const [isCategoryListOpen, setIsCategoryListOpen] = useState(true);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const leaderboardInputRef = useRef<HTMLInputElement>(null);
  const { playSound } = useSound();

  // Check if admin is authenticated
  const isAuthenticated = localStorage.getItem('tiktok-quiz-auth') === ADMIN_PASSWORD_HASH;

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
  }, [isAdminDashboardOpen]); // Re-check when closing dashboard

  useEffect(() => {
    localStorage.setItem('tiktok-quiz-maxwinners', String(maxWinners));
  }, [maxWinners]);

  useEffect(() => {
    localStorage.setItem('tiktok-quiz-totalrounds', String(totalRounds));
  }, [totalRounds]);
  
  useEffect(() => {
    localStorage.setItem('tiktok-quiz-classic-categories', JSON.stringify(selectedClassicCategories));
  }, [selectedClassicCategories]);

  const handleCategoryToggle = (categoryId: GameMode) => {
    playSound('uiClick');
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

  const handleTotalRoundsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1) {
      setTotalRounds(value);
    } else if (e.target.value === '') {
      setTotalRounds(1);
    }
  };

  const handleStartGame = () => {
    playSound('roundStart');
    if (gameStyle === GameStyle.Classic) {
      if (selectedClassicCategories.length > 0) {
        onStartClassic(maxWinners, selectedClassicCategories, useImportedOnly, totalRounds, isHardMode);
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
    playSound('uiClick');
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
      playSound('uiClick');
      localStorage.removeItem('custom-questions');
      setImportFeedback('Semua soal yang diimpor telah dihapus.');
      setHasImportedQuestions(false);
  };

  // --- Leaderboard Export/Import Logic ---
  
  const handleExportLeaderboard = () => {
    playSound('uiClick');
    try {
        const data = localStorage.getItem('leaderboard');
        if (!data || data === '[]') {
            setImportFeedback('Data peringkat masih kosong, tidak ada yang diekspor.');
            return;
        }
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `leaderboard-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setImportFeedback('Data peringkat berhasil diunduh.');
    } catch (e) {
        console.error('Export failed:', e);
        setImportFeedback('Gagal mengekspor data peringkat.');
    }
  };

  const handleImportLeaderboardClick = () => {
      playSound('uiClick');
      leaderboardInputRef.current?.click();
  };

  const handleLeaderboardFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result as string;
              const data = JSON.parse(text);

              if (!Array.isArray(data)) {
                  throw new Error('Format file salah (harus berupa array).');
              }
              
              // Simple validation: check if first item has score or userId if array not empty
              if (data.length > 0 && (!data[0].hasOwnProperty('score') || !data[0].hasOwnProperty('userId'))) {
                   throw new Error('Struktur data peringkat tidak valid.');
              }

              localStorage.setItem('leaderboard', JSON.stringify(data));
              setImportFeedback(`Berhasil mengimpor ${data.length} data peringkat! Halaman akan dimuat ulang...`);
              
              // Reload to reflect changes in app state
              setTimeout(() => {
                  window.location.reload();
              }, 1500);

          } catch (error: any) {
              setImportFeedback(`Error Impor: ${error.message}`);
          }
      };
      reader.readAsText(file);
      event.target.value = '';
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
    { id: 'ZonaFilm', name: 'Zona Film' },
  ];

  const toggleStyle = (style: GameStyle) => {
      playSound('tabSwitch');
      setGameStyle(style);
  }

  return (
    <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl transition-colors duration-300 relative">
        {/* Admin Dashboard Button */}
        {isAuthenticated && (
            <div className="absolute top-4 left-4 z-10">
                <button
                    onClick={() => setIsAdminDashboardOpen(true)}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-sky-100 dark:hover:bg-sky-900 hover:text-sky-600 dark:hover:text-sky-400 transition-colors shadow-sm"
                    title="Dashboard Kelola Soal"
                >
                    <DatabaseIcon className="w-5 h-5" />
                </button>
            </div>
        )}

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
              <button type="button" onClick={() => toggleStyle(GameStyle.Classic)} className={`px-4 py-2.5 font-bold rounded-lg transition-all text-sm ${gameStyle === GameStyle.Classic ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-sky-100 text-sky-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Klasik
              </button>
               <button type="button" onClick={() => toggleStyle(GameStyle.Knockout)} className={`px-4 py-2.5 font-bold rounded-lg transition-all text-sm ${gameStyle === GameStyle.Knockout ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-sky-100 text-sky-700 dark:bg-gray-700 dark:text-gray-300'}`}>
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
              <div className="p-3 bg-sky-50 dark:bg-gray-700/50 rounded-xl border border-sky-100 dark:border-gray-600">
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="max-winners" className="block text-xs text-left text-gray-500 dark:text-gray-400 mb-1 font-semibold">Jumlah Pemenang</label>
                        <input
                        type="number"
                        id="max-winners"
                        value={maxWinners}
                        onChange={handleMaxWinnersChange}
                        min="1"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-sky-200 dark:border-gray-600 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="total-rounds" className="block text-xs text-left text-gray-500 dark:text-gray-400 mb-1 font-semibold">Jumlah Ronde</label>
                        <input
                        type="number"
                        id="total-rounds"
                        value={totalRounds}
                        onChange={handleTotalRoundsChange}
                        min="1"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-sky-200 dark:border-gray-600 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:text-white"
                        />
                      </div>
                  </div>
                  
                  <div className="mt-3">
                    <label htmlFor="hard-mode" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                id="hard-mode" 
                                className="sr-only" 
                                checked={isHardMode} 
                                onChange={() => setIsHardMode(!isHardMode)} 
                            />
                            <div className="block bg-gray-200 dark:bg-gray-600 w-10 h-6 rounded-full"></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isHardMode ? 'translate-x-full' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-xs font-semibold text-slate-700 dark:text-gray-300">
                            Mode Sulit (Butuh Koin untuk Clue)
                        </div>
                    </label>
                  </div>
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
                            onClick={() => { setKnockoutCategory(cat.id); playSound('uiClick'); }} 
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
            onClick={() => { onShowLeaderboard(); playSound('uiClick'); }}
            className="mt-2 text-sm text-sky-500 dark:text-sky-400 font-semibold hover:underline"
          >
            Lihat Peringkat Global
          </button>
      </div>

      <div className="shrink-0 mt-4 pt-4 border-t border-sky-100 dark:border-gray-700">
        <div className="space-y-2">
          {/* Questions Import Section */}
          <div className="flex gap-2">
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
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-500 text-white font-bold rounded-lg shadow-md hover:bg-indigo-600 transition-all text-xs"
              >
                <UploadCloudIcon className="w-4 h-4" />
                Impor Soal
              </button>
              <button
                type="button"
                onClick={handleClearImported}
                className="flex-1 px-3 py-2 bg-gray-500 text-white font-bold rounded-lg shadow-md hover:bg-gray-600 transition-all text-xs"
              >
                Hapus Soal
              </button>
          </div>

          {/* Leaderboard Management Section */}
          <div className="flex gap-2">
              <input
                type="file"
                ref={leaderboardInputRef}
                onChange={handleLeaderboardFileChange}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => setIsCloudModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-sky-600 text-white font-bold rounded-lg shadow-md hover:from-blue-600 hover:to-sky-700 transition-all text-xs"
                title="Sinkronisasi Data ke Cloud"
              >
                <CloudIcon className="w-4 h-4" />
                Cloud Sync (Best)
              </button>
              <button
                type="button"
                onClick={handleExportLeaderboard}
                className="px-3 py-2 bg-cyan-600 text-white font-bold rounded-lg shadow-md hover:bg-cyan-700 transition-all text-xs flex items-center justify-center"
                title="Ekspor Data Peringkat ke File JSON"
              >
                <DownloadIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleImportLeaderboardClick}
                className="px-3 py-2 bg-amber-600 text-white font-bold rounded-lg shadow-md hover:bg-amber-700 transition-all text-xs flex items-center justify-center"
                title="Impor Data Peringkat dari File JSON"
              >
                <UploadCloudIcon className="w-4 h-4" />
              </button>
          </div>

          <button
            type="button"
            onClick={() => { onResetGlobalLeaderboard(); playSound('uiClick'); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow-md hover:bg-red-600 transition-all text-xs"
          >
            <TrashIcon className="w-4 h-4" />
            Reset Peringkat Global
          </button>
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
              <div className="ml-3 text-gray-700 dark:text-gray-300 font-medium text-xs text-left max-w-[200px]">
                  {useImportedOnly 
                    ? "Hanya Gunakan Soal Kustom (Nonaktifkan Bawaan)" 
                    : "Campur Soal Kustom & Bawaan (Default)"}
              </div>
          </label>
          <div className="flex items-start gap-1.5 mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-[10px] text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
             <InfoIcon className="w-3 h-3 shrink-0 mt-0.5" />
             <p>
               Secara default, soal yang Anda tambahkan di Bank Soal akan <b>dicampur/digabungkan</b> dengan database bawaan game. Centang opsi di atas jika hanya ingin memakai soal buatan sendiri.
             </p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleDownloadExample}
          className="w-full mt-2 text-sm text-sky-500 dark:text-sky-400 font-semibold hover:underline"
        >
          Unduh Contoh Format Soal
        </button>

        <AnimatePresence>
        {importFeedback && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-green-600 dark:text-green-400 mt-2 text-center bg-green-50 dark:bg-green-900/30 p-1 rounded"
          >
            {importFeedback}
          </motion.p>
        )}
        </AnimatePresence>
      </div>
      
      <AnimatePresence>
        {isCloudModalOpen && <CloudSyncModal onClose={() => setIsCloudModalOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {isAdminDashboardOpen && <AdminQuestionDashboard onClose={() => setIsAdminDashboardOpen(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default ModeSelectionScreen;
