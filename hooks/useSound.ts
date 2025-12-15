
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
  | 'bracketShuffle';

// SFX Context
let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
    if (typeof window !== 'undefined' && !audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
};

// BGM Global Instance (Singleton)
// Updated URL to ensure accessibility
const BGM_URL = "https://raw.githubusercontent.com/SekaLudianto/kata-bendera/main/bgm-geo.mp3"; 
let bgmAudio: HTMLAudioElement | null = null;
let shouldBgmPlay = false; // Global flag to track if game logic wants BGM to play

if (typeof window !== 'undefined') {
    bgmAudio = new Audio(BGM_URL);
    bgmAudio.loop = true;
    bgmAudio.volume = 0.3; // Default BGM volume
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
    if (typeof window === 'undefined') return true; // Default mute to avoid autoplay issues
    const saved = localStorage.getItem(STORAGE_KEY_BGM);
    return saved ? JSON.parse(saved) : true;
  });

  // Sync state with other instances via window event
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

  // Handle BGM Mute Toggle Logic
  useEffect(() => {
      if (!bgmAudio) return;

      if (isBgmMuted) {
          bgmAudio.pause();
      } else {
          // Only play if the game logic (shouldBgmPlay) says it should be playing
          if (shouldBgmPlay) {
              const playPromise = bgmAudio.play();
              if (playPromise !== undefined) {
                  playPromise.catch(error => {
                      console.log("BGM Autoplay prevented. Waiting for user interaction.", error);
                  });
              }
          }
      }
  }, [isBgmMuted]);

  // Function to start thinking music (called when round starts)
  const playBgm = useCallback(() => {
      shouldBgmPlay = true;
      if (!isBgmMuted && bgmAudio) {
          bgmAudio.play().catch(e => console.log("Play failed", e));
      }
  }, [isBgmMuted]);

  // Function to stop thinking music (called when round ends)
  const stopBgm = useCallback(() => {
      shouldBgmPlay = false;
      if (bgmAudio) {
          bgmAudio.pause();
          bgmAudio.currentTime = 0; // Reset to beginning for next round
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

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
        ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
        case 'roundStart':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, now); // A4
            oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.2);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;

        case 'correctAnswer':
            const oscCorrect1 = ctx.createOscillator();
            const oscCorrect2 = ctx.createOscillator();
            const gainCorrect = ctx.createGain();
            
            oscCorrect1.connect(gainCorrect);
            oscCorrect2.connect(gainCorrect);
            gainCorrect.connect(ctx.destination);

            oscCorrect1.type = 'sine';
            oscCorrect2.type = 'triangle';

            oscCorrect1.frequency.setValueAtTime(880, now); // A5
            oscCorrect2.frequency.setValueAtTime(1108, now); // C#6

            gainCorrect.gain.setValueAtTime(0, now);
            gainCorrect.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gainCorrect.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

            oscCorrect1.start(now);
            oscCorrect2.start(now);
            oscCorrect1.stop(now + 0.6);
            oscCorrect2.stop(now + 0.6);
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
            oscillator.frequency.setValueAtTime(523.25, now); // C5
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
            
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.linearRampToValueAtTime(0.3, now + 0.1);
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
            
            oscillator.start(now);
            oscillator.stop(now + 0.8);
            osc2.start(now);
            osc2.stop(now + 0.9);
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
            oscillator.frequency.setValueAtTime(659.25, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;

        case 'quotePop':
            const quoteNotes = [523.25, 659.25, 783.99, 1046.50]; // C Major
            quoteNotes.forEach((freq, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g);
                g.connect(ctx.destination);
                o.type = 'sine';
                o.frequency.value = freq;
                g.gain.setValueAtTime(0, now + i * 0.05);
                g.gain.linearRampToValueAtTime(0.1, now + i * 0.05 + 0.05);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.5);
                o.start(now + i * 0.05);
                o.stop(now + i * 0.05 + 0.6);
            });
            return;

        case 'bracketShuffle':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, now);
            const lfo = ctx.createOscillator();
            lfo.type = 'square';
            lfo.frequency.value = 15;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 500;
            lfo.connect(lfoGain);
            lfoGain.connect(gainNode.gain);
            
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
            
            oscillator.start(now);
            oscillator.stop(now + 0.5);
            lfo.start(now);
            lfo.stop(now + 0.5);
            break;
    }

  }, [isSfxMuted]);

  // Backward compatibility alias for existing components using `isMuted` and `toggleMute`
  const toggleMute = toggleSfx;
  const isMuted = isSfxMuted;

  return { isSfxMuted, isBgmMuted, toggleSfx, toggleBgm, playSound, isMuted, toggleMute, playBgm, stopBgm };
};
