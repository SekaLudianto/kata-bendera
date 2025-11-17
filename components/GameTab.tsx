
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOTAL_ROUNDS, MAX_WINNERS_PER_ROUND, ROUND_TIMER_SECONDS } from '../constants';
import GiftNotification from './GiftNotification';
import { GiftNotification as GiftNotificationType, GameMode } from '../types';

interface LetterObject {
  id: string;
  letter: string;
}

interface GameTabProps {
  gameState: any; // Simplified
  currentGift: GiftNotificationType | null;
}

const letterVariants = {
  scrambled: { scale: 1 },
  revealed: (index: number) => ({
    scale: [1, 1.2, 1],
    transition: {
      delay: index * 0.05,
      duration: 0.4,
    },
  }),
};

const GuessTheFlagContent: React.FC<{ gameState: any }> = ({ gameState }) => {
  const { currentCountry, scrambledCountryName, isRoundActive } = gameState;
  return (
    <>
      {currentCountry && (
        <motion.img
          key={currentCountry.code}
          src={`https://flagcdn.com/w320/${currentCountry.code}.png`}
          alt={`Bendera ${currentCountry.name}`}
          className="w-40 border-2 border-gray-600 rounded-md shadow-lg shadow-black/30"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
        />
      )}
      <div className="mt-4 flex flex-col items-center gap-2 px-2">
        {(scrambledCountryName as LetterObject[][]).map((word, wordIndex) => (
          <div key={wordIndex} className="flex flex-wrap justify-center gap-1.5">
            {word.map((item: LetterObject, letterIndex: number) => (
              <motion.div
                  key={item.id}
                  layout
                  variants={letterVariants}
                  animate={isRoundActive ? "scrambled" : "revealed"}
                  custom={letterIndex}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`w-9 h-11 bg-gray-800 border-2 rounded-md flex items-center justify-center text-2xl font-bold transition-colors duration-500 ${
                    isRoundActive 
                    ? 'border-gray-600 text-amber-400' 
                    : 'border-green-500 text-green-300'
                  }`}
              >
                  {item.letter}
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

const ABC5DasarContent: React.FC<{ gameState: any }> = ({ gameState }) => {
  const { currentLetter, isRoundActive } = gameState;
  const [spinningLetter, setSpinningLetter] = useState('A');
  const [isSpinning, setIsSpinning] = useState(true);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  useEffect(() => {
    setIsSpinning(true);
    let spinInterval: number;
    if (isRoundActive) {
      spinInterval = window.setInterval(() => {
        setSpinningLetter(alphabet[Math.floor(Math.random() * alphabet.length)]);
      }, 80);

      const spinTimeout = setTimeout(() => {
        clearInterval(spinInterval);
        setIsSpinning(false);
      }, 2500); // Spin for 2.5 seconds

      return () => {
        clearInterval(spinInterval);
        clearTimeout(spinTimeout);
      };
    }
  }, [currentLetter, isRoundActive]);

  return (
    <div className="w-40 h-40 bg-gray-800 border-4 border-gray-600 rounded-2xl flex items-center justify-center shadow-lg shadow-black/30">
        <AnimatePresence mode="wait">
      {isSpinning ? (
        <motion.div
            key="spinning"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5}}
            className="text-7xl font-bold text-sky-400"
        >
          {spinningLetter}
        </motion.div>
      ) : (
        <motion.div
            key="final"
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="text-8xl font-bold text-amber-400"
        >
          {currentLetter}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

const GameTab: React.FC<GameTabProps> = ({ gameState, currentGift }) => {
  const { round, roundWinners, roundTimer, gameMode, currentCategory } = gameState;
  const progressPercentage = (round / TOTAL_ROUNDS) * 100;
  const firstWinner = roundWinners.length > 0 ? roundWinners[0] : null;
  const timerProgress = (roundTimer / ROUND_TIMER_SECONDS) * 100;

  const getInstructionText = () => {
    if (gameMode === GameMode.GuessTheFlag) {
      return "Tebak nama negara dari bendera & huruf acak!";
    }
    if (gameMode === GameMode.ABC5Dasar) {
        return `Sebutkan nama ${currentCategory || ''} dari huruf '${gameState.currentLetter}'!`;
    }
    return '';
  }

  const getRoundTitle = () => {
    if (gameMode === GameMode.GuessTheFlag) {
        return 'Tebak Bendera';
    }
    if (gameMode === GameMode.ABC5Dasar) {
        return `ABC 5 Dasar: ${currentCategory || ''}`;
    }
    return '';
  }


  return (
    <motion.div 
      key={`${round}-${gameMode}-${currentCategory}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="p-3 flex flex-col h-full relative"
    >
      <div className="absolute top-2 left-0 right-0 px-3 z-50 pointer-events-none">
        <AnimatePresence>
          {currentGift && <GiftNotification key={currentGift.id} {...currentGift} />}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-between items-center mb-2 text-xs text-gray-400">
        <span>Ronde {round} / {TOTAL_ROUNDS}</span>
        <span className='font-semibold'>{getRoundTitle()}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
        <motion.div
          className="bg-gradient-to-r from-sky-500 to-teal-400 h-2 rounded-full"
          initial={{ width: `${((round - 1) / TOTAL_ROUNDS) * 100}%` }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      <div className="flex-grow flex flex-col items-center justify-center">
        {/* Instruction for ABC 5 Dasar goes on top */}
        {gameMode === GameMode.ABC5Dasar && (
          <div className="mb-4 text-center min-h-[20px]">
            <AnimatePresence>
              {!firstWinner && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-gray-400 text-xs"
                >
                  {getInstructionText()}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Main game content */}
        {gameMode === GameMode.GuessTheFlag ? (
          <GuessTheFlagContent gameState={gameState} />
        ) : (
          <ABC5DasarContent gameState={gameState} />
        )}

        {/* Bottom area for winner/points/timer */}
        <div className="mt-4 w-full text-center min-h-[60px]">
          <AnimatePresence mode="wait">
            {firstWinner ? (
              <motion.div
                key="winner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="flex items-center gap-1.5 bg-amber-500/10 p-1.5 rounded-lg">
                  <img src={firstWinner.profilePictureUrl} alt={firstWinner.nickname} className="w-6 h-6 rounded-full"/>
                  <p className="text-amber-300 font-semibold text-sm">{firstWinner.nickname} menemukan jawaban!</p>
                </div>
                <p className="text-amber-400 text-xs mt-1 font-semibold">Pemenang: {roundWinners.length} / {MAX_WINNERS_PER_ROUND}</p>
              </motion.div>
            ) : (
              <motion.div
                key="no-winner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                {/* Instruction for GuessTheFlag remains here */}
                {gameMode === GameMode.GuessTheFlag && (
                   <p className="text-gray-400 text-xs">{getInstructionText()}</p>
                )}
                <p className="text-amber-400 text-xs mt-1 font-semibold">Hanya 5 penebak tercepat yang mendapat poin!</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="w-full max-w-[150px] bg-gray-700 rounded-full h-1.5 mx-auto mt-2">
            <motion.div
              className="bg-gradient-to-r from-sky-500 to-teal-400 h-1.5 rounded-full"
              animate={{ width: `${timerProgress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GameTab;