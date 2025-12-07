import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon } from './IconComponents';
import { ADMIN_PASSWORD_HASH } from '../constants';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

// Helper function to hash a message using SHA-256
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const enteredPasswordHash = await sha256(password);
      
      if (enteredPasswordHash === ADMIN_PASSWORD_HASH) {
        onLoginSuccess();
      } else {
        setError('Kata sandi yang dimasukkan salah.');
        setIsLoading(false);
        setPassword('');
      }
    } catch (err) {
      console.error('Hashing error:', err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-sky-500/10 border border-sky-200 dark:border-gray-700 overflow-hidden flex flex-col p-8"
    >
      <div className="text-center">
        <ShieldCheckIcon className="w-16 h-16 text-sky-400 mx-auto" />
        <h1 className="text-2xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-500">
          Akses Admin
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Silakan masukkan kata sandi untuk melanjutkan.</p>
      </div>

      <form onSubmit={handleLogin} className="w-full mt-8">
        <div className="relative mb-4">
          <label htmlFor="password" className="sr-only">Kata Sandi</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kata Sandi"
            className="w-full px-4 py-3 bg-sky-100 border-2 border-sky-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 dark:focus:border-sky-500"
            aria-label="Admin Password"
            disabled={isLoading}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={isLoading || !password}
          className="w-full mt-2 px-4 py-3 bg-sky-500 text-white font-bold rounded-lg shadow-lg shadow-sky-500/30 hover:bg-sky-600 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            'Masuk'
          )}
        </motion.button>
      </form>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 w-full bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm dark:bg-red-900/50 dark:text-red-300 dark:border-red-500/50"
          role="alert"
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
};

export default LoginScreen;