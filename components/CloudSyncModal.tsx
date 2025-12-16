
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudIcon, KeyIcon, DownloadIcon, UploadCloudIcon, CheckIcon, CopyIcon, LinkIcon } from './IconComponents';
import { DEFAULT_JSONBIN_API_KEY } from '../constants';

interface CloudSyncModalProps {
  onClose: () => void;
}

const JSONBIN_URL = 'https://api.jsonbin.io/v3/b';

const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('jsonbin_api_key') || DEFAULT_JSONBIN_API_KEY);
  const [binId, setBinId] = useState(() => localStorage.getItem('jsonbin_bin_id') || '');
  const [activeTab, setActiveTab] = useState<'upload' | 'download' | 'settings'>('upload');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('jsonbin_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('jsonbin_bin_id', binId);
  }, [binId]);

  const handleUpload = async () => {
    if (!apiKey) {
      setActiveTab('settings');
      setMessage('Masukkan API Key terlebih dahulu.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('Mengunggah data ke Cloud...');

    try {
      const leaderboardData = localStorage.getItem('leaderboard') || '[]';
      const payload = JSON.parse(leaderboardData);

      let url = JSONBIN_URL;
      let method = 'POST';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey,
      };

      // If we have a binId, we update it (PUT). If not, we create new (POST).
      if (binId) {
        url = `${JSONBIN_URL}/${binId}`;
        method = 'PUT';
      } else {
        headers['X-Bin-Name'] = 'TikTokQuizLeaderboard';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengunggah data.');
      }

      const newBinId = data.metadata?.id || binId;
      setBinId(newBinId);
      setStatus('success');
      setMessage(method === 'POST' ? 'Data baru berhasil dibuat di Cloud!' : 'Data Cloud berhasil diperbarui!');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Terjadi kesalahan jaringan.');
    }
  };

  const handleDownload = async () => {
    if (!apiKey) {
      setActiveTab('settings');
      setMessage('Masukkan API Key terlebih dahulu.');
      setStatus('error');
      return;
    }
    if (!binId) {
      setMessage('Masukkan ID Sinkronisasi untuk mengambil data.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('Mengambil data dari Cloud...');

    try {
      const response = await fetch(`${JSONBIN_URL}/${binId}`, {
        method: 'GET',
        headers: {
          'X-Master-Key': apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil data.');
      }

      // JSONBin v3 returns data inside 'record' property
      const record = data.record;
      
      if (!Array.isArray(record)) {
          throw new Error('Format data di Cloud tidak valid (bukan array).');
      }

      localStorage.setItem('leaderboard', JSON.stringify(record));
      setStatus('success');
      setMessage('Data berhasil dimuat! Halaman akan dimuat ulang...');
      
      setTimeout(() => {
          window.location.reload();
      }, 1500);

    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Gagal. Pastikan ID Sinkronisasi dan API Key benar.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage('Disalin ke clipboard!');
    setTimeout(() => setMessage(status === 'success' ? (activeTab === 'upload' ? 'Data berhasil diperbarui!' : 'Data berhasil dimuat!') : ''), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-[100]"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-sky-50 dark:bg-gray-700/50 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700 dark:text-white">
            <CloudIcon className="w-6 h-6 text-sky-500" />
            Cloud Sync
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'upload' ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50/50 dark:bg-gray-700 dark:text-sky-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
          >
            Simpan (Upload)
          </button>
          <button
            onClick={() => setActiveTab('download')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'download' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50 dark:bg-gray-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
          >
            Muat (Download)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'settings' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50 dark:bg-gray-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
          >
            Pengaturan
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-grow">
          <AnimatePresence mode="wait">
            {activeTab === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Simpan data peringkat saat ini ke Cloud. Kamu akan mendapatkan <b>ID Sinkronisasi</b> untuk mengakses data ini di perangkat lain.
                </p>
                
                {binId && (
                    <div className="bg-sky-50 dark:bg-gray-700/50 p-3 rounded-lg border border-sky-100 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Sinkronisasi Anda:</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 font-mono text-sm font-bold text-slate-800 dark:text-white bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 truncate">
                                {binId}
                            </code>
                            <button onClick={() => copyToClipboard(binId)} className="p-1.5 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500" title="Salin ID">
                                <CopyIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-500/30 hover:bg-sky-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? 'Mengunggah...' : (
                      <>
                        <UploadCloudIcon className="w-5 h-5" />
                        {binId ? 'Perbarui Data di Cloud' : 'Buat Cloud Save Baru'}
                      </>
                  )}
                </button>
              </motion.div>
            )}

            {activeTab === 'download' && (
              <motion.div key="download" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Masukkan <b>ID Sinkronisasi</b> dari perangkat lama untuk memuat data peringkat ke perangkat ini.
                </p>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">ID Sinkronisasi (Bin ID)</label>
                  <input
                    type="text"
                    value={binId}
                    onChange={(e) => setBinId(e.target.value)}
                    placeholder="Contoh: 65a1b2c3..."
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleDownload}
                  disabled={status === 'loading' || !binId}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? 'Mengunduh...' : (
                      <>
                        <DownloadIcon className="w-5 h-5" />
                        Muat Data dari Cloud
                      </>
                  )}
                </button>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800/30">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                        Fitur ini menggunakan layanan gratis <b>JSONBin.io</b>. API Key default telah diatur.
                    </p>
                    <a 
                        href="https://jsonbin.io/login" 
                        target="_blank" 
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        <LinkIcon className="w-3 h-3" />
                        Website JSONBin
                    </a>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">API Master Key</label>
                  <div className="relative">
                    <KeyIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="$2a$10$..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Key ini akan disimpan di browser Anda.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 p-3 rounded-lg text-sm text-center font-medium ${
                  status === 'error' 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                    : status === 'success'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                }`}
              >
                {status === 'loading' && <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>}
                {message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CloudSyncModal;
