
import { useState, useEffect, useCallback, useRef } from 'react';

type SoundType = 
  | 'roundStart' 
  | 'correctAnswer' 
  | 'roundEnd' 
  | 'roundEndMuted' 
  | 'champion' 
  | 'gameOver'
  | 'uiClick'       
  | 'tabSwitch'     
  | 'timerTick'     
  | 'playerJoin'    
  | 'quotePop'      
  | 'bracketShuffle'
  | 'birthday'; // New Type

// SFX Context
let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
    if (typeof window !== 'undefined' && !audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
};

// BGM Global Instance (Singleton)
const BGM_URL = "https://raw.githubusercontent.com/SekaLudianto/kata-bendera/main/bgm.mp3"; 
let bgmAudio: HTMLAudioElement | null = null;
let shouldBgmPlay = false; 

if (typeof window !== 'undefined') {
    bgmAudio = new Audio(BGM_URL);
    bgmAudio.loop = true;
    bgmAudio.volume = 0.3;
}

const STORAGE_KEY_SFX = 'soundMuted';
const STORAGE_KEY_BGM = 'bgmMuted';
const EVENT_AUDIO_CHANGE = 'audio-settings-change';

export const useSound = () => {
  const [isSfxMuted, setIsSfxMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(STORAGE_KEY_SFX);
    return saved ? JSON.parse(saved) : false;
  });

  const [isBgmMuted, setIsBgmMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true; 
    const saved = localStorage.getItem(STORAGE_KEY_BGM);
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
      const handleStorageChange = () => {
          const sfx = localStorage.getItem(STORAGE_KEY_SFX);
          const bgm = localStorage.getItem(STORAGE_KEY_BGM);
          if (sfx) setIsSfxMuted(JSON.parse(sfx));
          if (bgm) setIsBgmMuted(JSON.parse(bgm));
      };
      window.addEventListener(EVENT_AUDIO_CHANGE, handleStorageChange);
      return () => window.removeEventListener(EVENT_AUDIO_CHANGE, handleStorageChange);
  }, []);

  useEffect(() => {
      if (!bgmAudio) return;
      if (isBgmMuted) {
          bgmAudio.pause();
      } else {
          if (shouldBgmPlay) {
              bgmAudio.play().catch(() => {});
          }
      }
  }, [isBgmMuted]);

  const playBgm = useCallback(() => {
      shouldBgmPlay = true;
      if (!isBgmMuted && bgmAudio) {
          bgmAudio.play().catch(() => {});
      }
  }, [isBgmMuted]);

  const stopBgm = useCallback(() => {
      shouldBgmPlay = false;
      if (bgmAudio) {
          bgmAudio.pause();
          bgmAudio.currentTime = 0;
      }
  }, []);

  const toggleSfx = useCallback(() => {
    const newState = !isSfxMuted;
    setIsSfxMuted(newState);
    localStorage.setItem(STORAGE_KEY_SFX, JSON.stringify(newState));
    window.dispatchEvent(new Event(EVENT_AUDIO_CHANGE));
  }, [isSfxMuted]);

  const toggleBgm = useCallback(() => {
    const newState = !isBgmMuted;
    setIsBgmMuted(newState);
    localStorage.setItem(STORAGE_KEY_BGM, JSON.stringify(newState));
    window.dispatchEvent(new Event(EVENT_AUDIO_CHANGE));
  }, [isBgmMuted]);

  const playSound = useCallback((type: SoundType) => {
    if (isSfxMuted) return;

    // Handle External Audio Files
    if (type === 'birthday') {
        const bdayAudio = new Audio('/birthday.mp3');
        bdayAudio.volume = 0.6;
        bdayAudio.play().catch(e => console.warn("Audio birthday.mp3 tidak ditemukan di root", e));
        return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (type) {
        case 'roundStart':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, now);
            oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.2);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;
        case 'correctAnswer':
            const oscCorrect1 = ctx.createOscillator();
            const gainCorrect = ctx.createGain();
            oscCorrect1.connect(gainCorrect);
            gainCorrect.connect(ctx.destination);
            oscCorrect1.type = 'sine';
            oscCorrect1.frequency.setValueAtTime(880, now);
            gainCorrect.gain.setValueAtTime(0, now);
            gainCorrect.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gainCorrect.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
            oscCorrect1.start(now);
            oscCorrect1.stop(now + 0.6);
            return;
        case 'roundEnd':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(880, now);
            oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.4);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
            oscillator.start(now);
            oscillator.stop(now + 0.4);
            break;
        case 'roundEndMuted':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(220, now);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
        case 'champion':
        case 'gameOver':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(523.25, now);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
            oscillator.start(now);
            oscillator.stop(now + 0.8);
            return;
        case 'uiClick':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.15);
            break;
        case 'tabSwitch':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(300, now);
            oscillator.frequency.linearRampToValueAtTime(600, now + 0.1);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
        case 'timerTick':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(1200, now);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            oscillator.start(now);
            oscillator.stop(now + 0.06);
            break;
        case 'playerJoin':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(523.25, now);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
        case 'quotePop':
            oscillator.type = 'sine';
            oscillator.frequency.value = 523.25;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            oscillator.start(now);
            oscillator.stop(now + 0.6);
            return;
        case 'bracketShuffle':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, now);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
            break;
    }

  }, [isSfxMuted]);

  const toggleMute = toggleSfx;
  const isMuted = isSfxMuted;

  return { isSfxMuted, isBgmMuted, toggleSfx, toggleBgm, playSound, isMuted, toggleMute, playBgm, stopBgm };
};
