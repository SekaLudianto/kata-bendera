
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon } from './IconComponents';
import { ADMIN_PASSWORD_HASH } from '../constants';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-[360px] mx-auto bg-[#1a2332] rounded-[2rem] shadow-2xl border border-white/5 flex flex-col p-10"
    >
      <div className="text-center">
        <div className="relative inline-block">
          <ShieldCheckIcon className="w-20 h-20 text-sky-400 mx-auto" />
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-sky-400/20 rounded-full blur-2xl -z-10"
          />
        </div>
        <h1 className="text-3xl font-black mt-6 text-[#14b8a6] tracking-tight">
          Akses Admin
        </h1>
        <p className="text-gray-400 mt-2 text-sm leading-relaxed px-4">
          Silakan masukkan kata sandi untuk melanjutkan.
        </p>
      </div>

      <form onSubmit={handleLogin} className="w-full mt-10">
        <div className="relative mb-4">
          <label htmlFor="password" className="sr-only">Kata Sandi</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kata Sandi"
            className="w-full px-5 py-4 bg-[#2d3a4f]/50 border-2 border-transparent text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:bg-[#2d3a4f] rounded-xl transition-all font-medium"
            aria-label="Admin Password"
            disabled={isLoading}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading || !password}
          className="w-full mt-2 px-4 py-4 bg-[#414d61] text-white font-bold rounded-xl shadow-lg hover:bg-[#4b586e] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-base"
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
          className="mt-6 p-3 w-full bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs text-center font-medium"
          role="alert"
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
};

export default LoginScreen;
