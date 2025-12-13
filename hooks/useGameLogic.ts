
import React, { useReducer, useCallback, useEffect, useRef } from 'react';
// FIX: The type `LetterObject` is now correctly exported from `types.ts`.
import { Country, ChatMessage, LeaderboardEntry, RoundWinner, GameMode, AbcCategory, WordCategory, GameState, GameStyle, KnockoutPlayer, KnockoutBracket, KnockoutMatch, GameActionPayloads, KnockoutCategory, TriviaQuestion, GameAction, City, FootballStadium, LetterObject } from '../types';
import { countries } from '../data/countries';
import { fruits } from '../data/fruits';
import { animals } from '../data/animals';
import { objects } from '../data/objects';
import { professions } from '../data/professions';
import { indonesianCities } from '../data/indonesian_cities';
import { plants } from '../data/plants';
import { footballPlayers } from '../data/football_players';
import { footballClubs } from '../data/football_clubs';
import { footballStadiums } from '../data/football_stadiums';
import { triviaQuestions } from '../data/trivia';
import { kpopTrivia } from '../data/kpop_trivia';
import { cities } from '../data/cities';
import { movies } from '../data/movies';
import { TOTAL_ROUNDS, ROUND_TIMER_SECONDS, BASE_POINTS, SPEED_BONUS_MULTIPLIER, WINNER_MODAL_TIMEOUT_MS, UNIQUENESS_BONUS_POINTS, KNOCKOUT_TARGET_SCORE, KNOCKOUT_PREPARE_SECONDS, KNOCKOUT_WINNER_VIEW_SECONDS, KNOCKOUT_ROUND_TIMER_SECONDS, ANSWER_REVEAL_DELAY_SECONDS, CHAMPION_SCREEN_TIMEOUT_MS } from '../constants';

export interface InternalGameState {
  gameState: GameState;
  gameStyle: GameStyle;
  hostUsername: string | null;
  round: number;
  totalRounds: number;
  isHardMode: boolean; // New State
  revealLevel: number; // New State
  gameMode: GameMode | null;
  currentCountry: Country | null;
  currentLetter: string | null;
  currentCategory: AbcCategory | null;
  currentWord: string | null;
  currentWordCategory: WordCategory | null;
  currentTriviaQuestion: TriviaQuestion | null;
  currentCity: City | null;
  currentStadium: FootballStadium | null;
  usedAnswers: string[];
  scrambledWord: LetterObject[][];
  leaderboard: LeaderboardEntry[];
  sessionLeaderboard: LeaderboardEntry[];
  roundWinners: RoundWinner[];
  isRoundActive: boolean;
  roundTimer: number;
  showWinnerModal: boolean;
  availableAnswersCount: number | null;
  allAnswersFoundInRound: boolean;
  maxWinners: number;
  isPausedByAdmin: boolean;
  countdownValue: number | null;
  chatMessages: ChatMessage[];
  classicRoundDeck: GameMode[];

  // Knockout state
  knockoutCategory: KnockoutCategory | null;
  knockoutPlayers: KnockoutPlayer[];
  knockoutBracket: KnockoutBracket | null;
  currentBracketRoundIndex: number | null;
  currentMatchIndex: number | null;
  knockoutMatchPoints: { player1: number; player2: number };
}


const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const scrambleWord = (name:string, isHardMode: boolean): LetterObject[][] => {
    const words = name.toUpperCase().split(' ');
    const VOWELS = ['A', 'I', 'U', 'E', 'O'];

    // Find the index of the longest word to add decoys to
    let longestWordIndex = 0;
    let maxLength = 0;
    words.forEach((word, index) => {
        if (word.length > maxLength) {
            maxLength = word.length;
            longestWordIndex = index;
        }
    });

    return words.map((word, wordIndex) => {
        // Create an array of LetterObjects with stable IDs based on original index
        const lettersWithDecoys: LetterObject[] = word.split('').map((char, index) => ({
            id: `w${wordIndex}-i${index}`,
            letter: char,
            isDecoy: false,
        }));

        // Add 3 decoy vowels only to the longest word AND ONLY IF NOT HARD MODE
        // In Hard Mode, we remove decoys to make the reveal mechanic cleaner/harder in a different way (hidden letters)
        if (!isHardMode && wordIndex === longestWordIndex) {
            for (let i = 0; i < 3; i++) {
                lettersWithDecoys.push({
                    id: `decoy-${wordIndex}-${i}`,
                    letter: VOWELS[Math.floor(Math.random() * VOWELS.length)],
                    isDecoy: true,
                });
            }
        }
        
        // Shuffle the combined array
        return shuffleArray(lettersWithDecoys);
    }).map(wordArray => [...wordArray]); // Return a new array of new arrays
};


const createInitialState = (): InternalGameState => ({
  gameState: GameState.Setup,
  gameStyle: GameStyle.Classic,
  hostUsername: null,
  round: 0,
  totalRounds: TOTAL_ROUNDS,
  isHardMode: false,
  revealLevel: 0,
  gameMode: null,
  currentCountry: null,
  currentLetter: null,
  currentCategory: null,
  currentWord: null,
  currentWordCategory: null,
  currentTriviaQuestion: null,
  currentCity: null,
  currentStadium: null,
  usedAnswers: [],
  scrambledWord: [],
  leaderboard: JSON.parse(localStorage.getItem('leaderboard') || '[]'),
  sessionLeaderboard: [],
  roundWinners: [],
  isRoundActive: false,
  roundTimer: ROUND_TIMER_SECONDS,
  showWinnerModal: false,
  availableAnswersCount: null,
  allAnswersFoundInRound: false,
  maxWinners: 5,
  isPausedByAdmin: false,
  countdownValue: null,
  chatMessages: [],
  classicRoundDeck: [],
  knockoutCategory: null,
  knockoutPlayers: [],
  knockoutBracket: null,
  currentBracketRoundIndex: null,
  currentMatchIndex: null,
  knockoutMatchPoints: { player1: 0, player2: 0 },
});

// --- KNOCKOUT HELPERS ---
const generateBracket = (players: KnockoutPlayer[]): KnockoutBracket => {
    const shuffledPlayers = shuffleArray(players);
    const numPlayers = shuffledPlayers.length;
    if (numPlayers < 2) return [];

    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
    const numByes = nextPowerOfTwo - numPlayers;
    const numFirstRoundMatches = (numPlayers - numByes) / 2;

    const bracket: KnockoutBracket = [];
    const firstRound: KnockoutMatch[] = [];
    
    let playerIndex = 0;

    for (let i = 0; i < numFirstRoundMatches; i++) {
        firstRound.push({
            id: `r0-m${i}`,
            player1: shuffledPlayers[playerIndex++],
            player2: shuffledPlayers[playerIndex++],
            winner: null,
            roundIndex: 0,
            matchIndex: i,
        });
    }

    for (let i = 0; i < numByes; i++) {
        const playerWithBye = shuffledPlayers[playerIndex++];
        firstRound.push({
            id: `r0-m${numFirstRoundMatches + i}`,
            player1: playerWithBye,
            player2: null,
            winner: playerWithBye, 
            roundIndex: 0,
            matchIndex: numFirstRoundMatches + i,
        });
    }

    bracket.push(firstRound);

    let currentRoundWinners = numFirstRoundMatches + numByes;
    let roundIndex = 1;
    while (currentRoundWinners > 1) {
        const numMatchesInNextRound = currentRoundWinners / 2;
        const nextRound: KnockoutMatch[] = [];
        for (let i = 0; i < numMatchesInNextRound; i++) {
            nextRound.push({
                id: `r${roundIndex}-m${i}`,
                player1: null,
                player2: null,
                winner: null,
                roundIndex,
                matchIndex: i,
            });
        }
        if(nextRound.length > 0) bracket.push(nextRound);
        currentRoundWinners /= 2;
        roundIndex++;
    }
    
    // Auto-populate winners from BYE matches to the next round
    if (bracket.length > 1) {
        for(let i=0; i < bracket[0].length; i++) {
            const match = bracket[0][i];
            if (match.winner) {
                const nextRoundMatchIndex = Math.floor(i / 2);
                const nextMatch = bracket[1][nextRoundMatchIndex];
                if (nextMatch) {
                    if (!nextMatch.player1) nextMatch.player1 = match.winner;
                    else if (!nextMatch.player2) nextMatch.player2 = match.winner;
                }
            }
        }
    }

    return bracket;
};

const advanceWinnerInBracket = (bracket: KnockoutBracket, winner: KnockoutPlayer, roundIndex: number, matchIndex: number): KnockoutBracket => {
    const newBracket = JSON.parse(JSON.stringify(bracket));
    const nextRoundIndex = roundIndex + 1;
    if (newBracket[nextRoundIndex]) {
        const nextMatchIndex = Math.floor(matchIndex / 2);
        if (newBracket[nextRoundIndex][nextMatchIndex]) {
            const nextMatch = newBracket[nextRoundIndex][nextMatchIndex];
            if (!nextMatch.player1) {
                nextMatch.player1 = winner;
            } else if (!nextMatch.player2) {
                nextMatch.player2 = winner;
            }
        }
    }
    return newBracket;
};

const isTournamentOver = (bracket: KnockoutBracket, roundIndex: number): boolean => {
    if (!bracket || bracket.length === 0) return false;
    // The tournament is over if the current round is the last round
    return roundIndex === bracket.length - 1;
};

const gameReducer = (state: InternalGameState, action: GameAction): InternalGameState => {
  switch (action.type) {
    case 'START_GAME': {
      const initialState = createInitialState();
      const { gameStyle, maxWinners, totalRounds, isHardMode, knockoutCategory, classicRoundDeck, firstRoundData } = action.payload;
      const hardModeActive = isHardMode || false;

      if (gameStyle === GameStyle.Classic && firstRoundData) {
        return {
          ...initialState,
          hostUsername: state.hostUsername,
          leaderboard: state.leaderboard, // Preserve global leaderboard across sessions
          gameStyle: gameStyle,
          maxWinners: maxWinners,
          totalRounds: totalRounds || TOTAL_ROUNDS,
          isHardMode: hardModeActive,
          revealLevel: 0,
          classicRoundDeck: classicRoundDeck || [],
          gameState: GameState.Playing,
          round: 1,
          gameMode: firstRoundData.gameMode,
          currentCountry: firstRoundData.country || null,
          currentLetter: firstRoundData.letter || null,
          currentCategory: firstRoundData.category || null,
          currentTriviaQuestion: firstRoundData.triviaQuestion || null,
          currentCity: firstRoundData.city || null,
          currentWord: firstRoundData.word || null,
          currentWordCategory: firstRoundData.wordCategory || null,
          currentStadium: firstRoundData.stadium || null,
          availableAnswersCount: firstRoundData.availableAnswersCount || null,
          scrambledWord: firstRoundData.country ? scrambleWord(firstRoundData.country.name, hardModeActive) : firstRoundData.triviaQuestion ? scrambleWord(firstRoundData.triviaQuestion.answer, hardModeActive) : firstRoundData.city ? scrambleWord(firstRoundData.city.name, hardModeActive) : firstRoundData.word ? scrambleWord(firstRoundData.word, hardModeActive) : firstRoundData.stadium ? scrambleWord(firstRoundData.stadium.name, hardModeActive) : [],
          isRoundActive: true,
          roundTimer: ROUND_TIMER_SECONDS,
        };
      } else { // Knockout
        return {
          ...initialState,
          hostUsername: state.hostUsername,
          leaderboard: state.leaderboard, // Preserve global leaderboard
          gameStyle: gameStyle,
          maxWinners: maxWinners,
          knockoutCategory: knockoutCategory || null,
          gameState: GameState.KnockoutRegistration,
        };
      }
    }
    case 'NEXT_ROUND': {
      if (state.round >= state.totalRounds) {
        return { ...state, gameState: GameState.Champion, isRoundActive: false };
      }
      const newRound = state.round + 1;
      const { gameMode, nextCountry, nextLetter, nextCategory, availableAnswersCount, nextWord, nextWordCategory, nextTriviaQuestion, nextCity, nextStadium } = action.payload;

      return {
        ...state,
        gameState: GameState.Playing,
        round: newRound,
        gameMode: gameMode,
        revealLevel: 0, // Reset reveal level
        currentCountry: nextCountry || null,
        currentLetter: nextLetter || null,
        currentCategory: nextCategory || null,
        currentWord: nextWord || null,
        currentWordCategory: nextWordCategory || null,
        currentTriviaQuestion: nextTriviaQuestion || null,
        currentCity: nextCity || null,
        currentStadium: nextStadium || null,
        availableAnswersCount: availableAnswersCount || null,
        scrambledWord: nextCountry ? scrambleWord(nextCountry.name, state.isHardMode) : nextWord ? scrambleWord(nextWord, state.isHardMode) : nextTriviaQuestion ? scrambleWord(nextTriviaQuestion.answer, state.isHardMode) : nextCity ? scrambleWord(nextCity.name, state.isHardMode) : nextStadium ? scrambleWord(nextStadium.name, state.isHardMode) : [],
        usedAnswers: [],
        isRoundActive: true,
        roundWinners: [],
        roundTimer: ROUND_TIMER_SECONDS,
        showWinnerModal: false,
        allAnswersFoundInRound: false,
        isPausedByAdmin: false,
        countdownValue: null,
      };
    }
    case 'REVEAL_CLUE':
        return { ...state, revealLevel: state.revealLevel + 1 };
    case 'PROCESS_COMMENT': {
        const message = action.payload;
        const newChatMessages = [message, ...state.chatMessages].slice(0, 100);
        if (!state.isRoundActive) return { ...state, chatMessages: newChatMessages };
        
        // FIX: Handle undefined comment
        const comment = (message.comment || '').trim();

        // Helper function to check for a whole word/phrase match, case-insensitively
        const checkAnswer = (commentText: string, answer: string): boolean => {
          if (!answer) return false;
          // Escape special regex characters in the answer
          const escapedAnswer = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Conditionally apply word boundaries. A simple \b...\b fails for answers containing non-word characters.
          // This new logic checks if the answer starts/ends with a word character and applies \b accordingly.
          const startsWithWordChar = /^\w/.test(answer);
          const endsWithWordChar = /\w$/.test(answer);

          const pattern = `${startsWithWordChar ? '\\b' : ''}${escapedAnswer}${endsWithWordChar ? '\\b' : ''}`;
          
          const regex = new RegExp(pattern, 'i');
          return regex.test(commentText);
        };
        
        let isCorrect = false;
        let foundAnswer = '';

        if (state.gameMode === GameMode.ABC5Dasar && state.currentLetter && state.currentCategory) {
            const validationList = getValidationList(state.currentCategory)
                .filter(item => item.toLowerCase().startsWith(state.currentLetter!.toLowerCase()))
                .filter(item => !state.usedAnswers.includes(item.toLowerCase()));
            
            validationList.sort((a, b) => b.length - a.length);

            for (const validItem of validationList) {
                if (checkAnswer(comment, validItem)) {
                    isCorrect = true;
                    foundAnswer = validItem;
                    break;
                }
            }
        } else {
            let expectedAnswer = '';
            switch (state.gameMode) {
                case GameMode.GuessTheFlag: expectedAnswer = state.currentCountry?.name || ''; break;
                case GameMode.GuessTheWord: 
                case GameMode.GuessTheFruit:
                case GameMode.GuessTheAnimal:
                case GameMode.ZonaFilm:
                    expectedAnswer = state.currentWord || ''; break;
                case GameMode.GuessTheCity: expectedAnswer = state.currentCity?.name || ''; break;
                case GameMode.Trivia: 
                case GameMode.KpopTrivia:
                    expectedAnswer = state.currentTriviaQuestion?.answer || ''; break;
                case GameMode.ZonaBola: expectedAnswer = state.currentWord || state.currentStadium?.name || ''; break;
            }
            if (expectedAnswer && checkAnswer(comment, expectedAnswer)) {
                isCorrect = true;
                foundAnswer = expectedAnswer;
            }
        }

        if (isCorrect) {
            // Special handling for host/admin answers. Mark as winner for visual feedback but don't affect game.
            if (state.hostUsername && message.userId.toLowerCase() === state.hostUsername.toLowerCase()) {
                return {
                    ...state,
                    chatMessages: [ { ...message, isWinner: true }, ...state.chatMessages].slice(0,100),
                };
            }

            const winnerPlayer = { userId: message.userId, nickname: message.nickname, profilePictureUrl: message.profilePictureUrl };
            if (state.gameStyle === GameStyle.Classic) {
                if (state.roundWinners.some(w => w.userId === message.userId)) return { ...state, chatMessages: newChatMessages };
                const currentMaxWinners = state.gameMode === GameMode.ABC5Dasar && state.availableAnswersCount != null 
                        ? Math.min(state.maxWinners, state.availableAnswersCount) 
                        : state.maxWinners;
                if (state.roundWinners.length >= currentMaxWinners) return { ...state, chatMessages: newChatMessages };

                const timeTaken = ROUND_TIMER_SECONDS - state.roundTimer;
                const score = BASE_POINTS + Math.max(0, (ROUND_TIMER_SECONDS - timeTaken) * SPEED_BONUS_MULTIPLIER);
                const newWinner: RoundWinner = { ...winnerPlayer, score, time: timeTaken, answer: state.gameMode === GameMode.ABC5Dasar ? foundAnswer : undefined, timestamp: message.timestamp };
                
                const updatedLeaderboard = [...state.leaderboard];
                const playerIndex = updatedLeaderboard.findIndex(p => p.userId === message.userId);
                if (playerIndex > -1) updatedLeaderboard[playerIndex].score += score;
                else updatedLeaderboard.push({ ...winnerPlayer, score });
                updatedLeaderboard.sort((a, b) => b.score - a.score);
                localStorage.setItem('leaderboard', JSON.stringify(updatedLeaderboard));
                
                const updatedSessionLeaderboard = [...state.sessionLeaderboard];
                const sessionPlayerIndex = updatedSessionLeaderboard.findIndex(p => p.userId === message.userId);
                if (sessionPlayerIndex > -1) updatedSessionLeaderboard[sessionPlayerIndex].score += score;
                else updatedSessionLeaderboard.push({ ...winnerPlayer, score });
                updatedSessionLeaderboard.sort((a, b) => b.score - a.score);

                return {
                    ...state,
                    chatMessages: [ { ...message, isWinner: true }, ...state.chatMessages].slice(0,100),
                    roundWinners: [...state.roundWinners, newWinner],
                    leaderboard: updatedLeaderboard,
                    sessionLeaderboard: updatedSessionLeaderboard,
                    usedAnswers: state.gameMode === GameMode.ABC5Dasar ? [...state.usedAnswers, foundAnswer.toLowerCase()] : state.usedAnswers,
                };
            } else { // Knockout mode point scored
                const { knockoutMatchPoints, currentBracketRoundIndex, currentMatchIndex, knockoutBracket } = state;
                if (currentBracketRoundIndex === null || currentMatchIndex === null || !knockoutBracket) return state;
                const match = knockoutBracket![currentBracketRoundIndex!][currentMatchIndex!];
                
                if (winnerPlayer.userId !== match.player1?.userId && winnerPlayer.userId !== match.player2?.userId) {
                    return { ...state, chatMessages: newChatMessages };
                }
                
                const newPoints = {...knockoutMatchPoints};
                if(winnerPlayer.userId === match.player1?.userId) newPoints.player1++;
                else newPoints.player2++;
                
                return { 
                    ...state, 
                    isRoundActive: false,
                    knockoutMatchPoints: newPoints,
                    chatMessages: [ { ...message, isWinner: true }, ...state.chatMessages].slice(0,100),
                };
            }
        }
        return { ...state, chatMessages: newChatMessages };
    }
    case 'TICK_TIMER': {
        if (!state.isRoundActive) return state;
        if (state.roundTimer > 0) {
            return { ...state, roundTimer: state.roundTimer - 1 };
        }
        return state;
    }
    case 'END_ROUND': {
      if (!state.isRoundActive) return state;
    
      const correctlyOrderedWord: LetterObject[][] = state.scrambledWord.map(wordArray => {
        const realLetters = wordArray.filter(letterObj => !letterObj.isDecoy);
        return realLetters.sort((a, b) => {
          const getIndex = (id: string) => parseInt(id.split('-i')[1], 10);
          return getIndex(a.id) - getIndex(b.id);
        });
      });
    
      let updatedWinners = [...state.roundWinners];
      let updatedSessionLeaderboard = [...state.sessionLeaderboard];
      if (state.gameMode === GameMode.ABC5Dasar) {
        const answerCounts = new Map<string, number>();
        updatedWinners.forEach(w => {
          if (w.answer) {
            answerCounts.set(w.answer.toLowerCase(), (answerCounts.get(w.answer.toLowerCase()) || 0) + 1);
          }
        });
        updatedWinners = updatedWinners.map(w => {
          if (w.answer && answerCounts.get(w.answer.toLowerCase()) === 1) {
            const newScore = w.score + UNIQUENESS_BONUS_POINTS;
            const sessionPlayer = updatedSessionLeaderboard.find(p => p.userId === w.userId);
            if (sessionPlayer) sessionPlayer.score += UNIQUENESS_BONUS_POINTS;
            return { ...w, score: newScore, bonus: UNIQUENESS_BONUS_POINTS };
          }
          return w;
        });
        updatedSessionLeaderboard.sort((a, b) => b.score - a.score);
      }
    
      return {
        ...state,
        isRoundActive: false,
        gameState: GameState.ClassicAnswerReveal,
        roundWinners: updatedWinners,
        sessionLeaderboard: updatedSessionLeaderboard,
        scrambledWord: correctlyOrderedWord,
      };
    }
    case 'SHOW_WINNER_MODAL':
        return { ...state, showWinnerModal: true };
    case 'HIDE_WINNER_MODAL':
        return { ...state, showWinnerModal: false };
    case 'PAUSE_GAME':
        return { ...state, isRoundActive: false, isPausedByAdmin: true, gameState: GameState.Paused };
    case 'RESUME_GAME':
        return { ...state, isRoundActive: true, isPausedByAdmin: false, gameState: state.gameStyle === GameStyle.Classic ? GameState.Playing : GameState.KnockoutPlaying };
    case 'RESET_GAME':
      return createInitialState();
    case 'START_COUNTDOWN':
      return { ...state, countdownValue: 3 };
    case 'TICK_COUNTDOWN':
      if (state.countdownValue && state.countdownValue > 0) {
        return { ...state, countdownValue: state.countdownValue - 1 };
      }
      return state;
    case 'SET_HOST_USERNAME':
        return { ...state, hostUsername: action.payload.username };

    // --- KNOCKOUT REDUCERS ---
    case 'REGISTER_PLAYER':
        if (state.knockoutPlayers.some(p => p.userId === action.payload.userId)) return state;
        return { ...state, knockoutPlayers: [...state.knockoutPlayers, action.payload] };
    case 'RESET_KNOCKOUT_REGISTRATION':
        return { ...state, knockoutPlayers: [] };
    case 'END_REGISTRATION_AND_DRAW_BRACKET': {
        if(state.knockoutPlayers.length < 2) return state; // Do nothing if not enough players
        const bracket = generateBracket(state.knockoutPlayers);
        return { ...state, gameState: GameState.KnockoutDrawing, knockoutBracket: bracket };
    }
    case 'PREPARE_NEXT_MATCH': {
        const { roundIndex, matchIndex } = action.payload;
        const bracket = state.knockoutBracket;
        const matchToStart = bracket?.[roundIndex]?.[matchIndex];

        if (!matchToStart || !matchToStart.player1 || !matchToStart.player2) {
            console.error("BUG PREVENTED: Attempted to start an incomplete match.", matchToStart);
            return state; 
        }

        return {
            ...state,
            gameState: GameState.KnockoutPrepareMatch,
            countdownValue: KNOCKOUT_PREPARE_SECONDS,
            currentBracketRoundIndex: roundIndex,
            currentMatchIndex: matchIndex,
        };
    }
    case 'START_MATCH': {
        return {
            ...state,
            gameState: GameState.KnockoutPlaying,
            countdownValue: null, // Ensure countdown doesn't trigger wrong state transitions
            knockoutMatchPoints: { player1: 0, player2: 0 },
            currentCountry: null,
            currentTriviaQuestion: null,
            currentWord: null,
            currentWordCategory: null,
            currentStadium: null,
        };
    }
    case 'FINISH_KNOCKOUT_MATCH': {
        const { winner, score } = action.payload;
        const { currentBracketRoundIndex, currentMatchIndex, knockoutBracket } = state;
        if (currentBracketRoundIndex === null || currentMatchIndex === null || !knockoutBracket) return state;

        let newBracket = JSON.parse(JSON.stringify(knockoutBracket));
        newBracket[currentBracketRoundIndex][currentMatchIndex].winner = winner;
        newBracket[currentBracketRoundIndex][currentMatchIndex].score = score;

        if (isTournamentOver(newBracket, currentBracketRoundIndex)) {
            return {
                ...state,
                isRoundActive: false,
                knockoutBracket: newBracket,
                sessionLeaderboard: [{ ...winner, score: 1 }],
                gameState: GameState.Champion,
            };
        } else {
            const advancedBracket = advanceWinnerInBracket(newBracket, winner, currentBracketRoundIndex, currentMatchIndex);
            return {
                ...state,
                isRoundActive: false,
                knockoutBracket: advancedBracket,
                gameState: GameState.KnockoutShowWinner,
            };
        }
    }
    case 'DECLARE_WALKOVER_WINNER': {
        const { roundIndex, matchIndex, winner } = action.payload;
        if (!state.knockoutBracket) return state;
        
        let newBracket = JSON.parse(JSON.stringify(state.knockoutBracket));
        newBracket[roundIndex][matchIndex].winner = winner;
        newBracket[roundIndex][matchIndex].score = 'WO';

        if (isTournamentOver(newBracket, roundIndex)) {
            return {
                ...state,
                knockoutBracket: newBracket,
                sessionLeaderboard: [{ ...winner, score: 1 }],
                gameState: GameState.Champion,
            };
        } else {
            const advancedBracket = advanceWinnerInBracket(newBracket, winner, roundIndex, matchIndex);
            return {
                ...state,
                knockoutBracket: advancedBracket,
                gameState: GameState.KnockoutReadyToPlay,
            };
        }
    }
    case 'SET_READY_TO_PLAY': {
        return { ...state, gameState: GameState.KnockoutReadyToPlay };
    }
    case 'RETURN_TO_BRACKET': {
        return { ...state, gameState: GameState.KnockoutReadyToPlay };
    }
    case 'REDRAW_BRACKET': {
        if (!state.knockoutPlayers || state.knockoutPlayers.length < 2) {
            return state; // Not enough players to redraw
        }
        const newBracket = generateBracket(state.knockoutPlayers);
        return {
            ...state,
            knockoutBracket: newBracket,
            currentBracketRoundIndex: null,
            currentMatchIndex: null,
            knockoutMatchPoints: { player1: 0, player2: 0 },
            gameState: GameState.KnockoutDrawing,
        };
    }
    case 'RESTART_KNOCKOUT_COMPETITION':
      return {
        ...state,
        gameState: GameState.KnockoutRegistration,
        knockoutPlayers: [],
        knockoutBracket: null,
        currentBracketRoundIndex: null,
        currentMatchIndex: null,
        knockoutMatchPoints: { player1: 0, player2: 0 },
        sessionLeaderboard: [],
      };
    case 'SET_KNOCKOUT_COUNTRY': {
        return {
            ...state,
            gameMode: GameMode.GuessTheFlag,
            currentCountry: action.payload.country,
            scrambledWord: scrambleWord(action.payload.country.name, state.isHardMode),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'SET_KNOCKOUT_TRIVIA': {
        return {
            ...state,
            gameMode: GameMode.Trivia,
            currentTriviaQuestion: action.payload.question,
            scrambledWord: scrambleWord(action.payload.question.answer, state.isHardMode),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'SET_KNOCKOUT_ZONA_BOLA': {
        const { type, data } = action.payload;
        const name = typeof data === 'string' ? data : data.name;
        return {
            ...state,
            gameMode: GameMode.ZonaBola,
            currentWordCategory: type,
            currentWord: type !== 'Stadion Bola' ? name : null,
            currentStadium: type === 'Stadion Bola' ? (data as FootballStadium) : null,
            scrambledWord: scrambleWord(name, state.isHardMode),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
     case 'SET_KNOCKOUT_GUESS_THE_FRUIT': {
        return {
            ...state,
            gameMode: GameMode.GuessTheWord,
            currentWordCategory: 'Buah-buahan',
            currentWord: action.payload.fruit,
            scrambledWord: scrambleWord(action.payload.fruit, state.isHardMode),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'SET_KNOCKOUT_GUESS_THE_ANIMAL': {
        return {
            ...state,
            gameMode: GameMode.GuessTheWord,
            currentWordCategory: 'Hewan',
            currentWord: action.payload.animal,
            scrambledWord: scrambleWord(action.payload.animal, state.isHardMode),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'SET_KNOCKOUT_KPOP_TRIVIA': {
        return {
            ...state,
            gameMode: GameMode.Trivia,
            currentTriviaQuestion: action.payload.question,
            scrambledWord: scrambleWord(action.payload.question.answer, state.isHardMode),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'SET_KNOCKOUT_ZONA_FILM': {
        return {
            ...state,
            gameMode: GameMode.ZonaFilm,
            currentWordCategory: 'Film',
            currentWord: action.payload.movie,
            scrambledWord: scrambleWord(action.payload.movie, state.isHardMode),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'KNOCKOUT_QUESTION_TIMEOUT': {
        return { ...state, isRoundActive: false };
    }
    case 'SKIP_KNOCKOUT_MATCH': {
        return {
            ...state,
            isRoundActive: false,
            gameState: GameState.KnockoutReadyToPlay,
            knockoutMatchPoints: { player1: 0, player2: 0 },
            currentCountry: null,
            currentTriviaQuestion: null,
            scrambledWord: [],
        };
    }
    case 'FINISH_GAME':
        return { ...state, gameState: GameState.Finished };
    case 'RETURN_TO_MODE_SELECTION':
        return {
            ...createInitialState(),
            leaderboard: state.leaderboard, // Keep global leaderboard
            gameState: GameState.ModeSelection,
        };
    case 'RESET_GLOBAL_LEADERBOARD':
        return {
            ...state,
            leaderboard: [],
        };
    default:
      return state;
  }
};

const abcCategories: AbcCategory[] = ['Negara', 'Buah', 'Hewan', 'Benda', 'Profesi', 'Kota di Indonesia', 'Tumbuhan'];
const getValidationList = (category: AbcCategory): string[] => {
    switch(category){
        case 'Negara': return countries.map(c => c.name);
        case 'Buah': return fruits;
        case 'Hewan': return animals;
        case 'Benda': return objects;
        case 'Profesi': return professions;
        case 'Kota di Indonesia': return indonesianCities;
        case 'Tumbuhan': return plants;
        default: return [];
    }
};

export const useGameLogic = () => {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  const countryDeck = useRef<Country[]>([]);
  const triviaDeck = useRef<TriviaQuestion[]>([]);
  const kpopTriviaDeck = useRef<TriviaQuestion[]>([]);
  const footballPlayerDeck = useRef<string[]>([]);
  const footballClubDeck = useRef<string[]>([]);
  const footballStadiumDeck = useRef<FootballStadium[]>([]);
  const cityDeck = useRef<City[]>([]);
  const fruitDeck = useRef<string[]>([]);
  const animalDeck = useRef<string[]>([]);
  const movieDeck = useRef<string[]>([]);
  
  const usedQuestionIdentifiers = useRef<Record<string, Set<string>>>({});
  const useImportedOnlyRef = useRef(false);

  const getNextUniqueItem = useCallback(<T,>(
    deckRef: React.MutableRefObject<T[]>,
    builtInSourceData: T[],
    categoryKey: string,
    identifierFn: (item: T) => string
  ): T => {
    if (!usedQuestionIdentifiers.current[categoryKey]) {
        usedQuestionIdentifiers.current[categoryKey] = new Set();
    }

    const isUsed = (item: T) => usedQuestionIdentifiers.current[categoryKey]!.has(identifierFn(item));

    // 1. Try to pop from current deck until we find an unused item
    while (deckRef.current.length > 0) {
        // Peek at the last item
        const candidate = deckRef.current[deckRef.current.length - 1];
        if (isUsed(candidate)) {
            deckRef.current.pop(); // Discard used item
        } else {
            const item = deckRef.current.pop()!;
            usedQuestionIdentifiers.current[categoryKey]!.add(identifierFn(item));
            return item;
        }
    }

    // 2. Deck is empty or contained only used items. We need to refill.
    let fullSourceData: T[] = [];
    
    // Logic to get custom data based on categoryKey
    try {
        const customQuestionsRaw = localStorage.getItem('custom-questions');
        const customData = customQuestionsRaw ? JSON.parse(customQuestionsRaw) : {};
        const customItems = (customData[categoryKey] && Array.isArray(customData[categoryKey])) ? (customData[categoryKey] as T[]) : [];

        if (useImportedOnlyRef.current && customItems.length > 0) {
             fullSourceData = [...customItems];
        } else {
             // Combine custom and built-in
             fullSourceData = [...customItems, ...builtInSourceData];
        }
    } catch (e) {
        console.error("Error reading custom questions during refill", e);
        fullSourceData = [...builtInSourceData];
    }

    // 3. Filter for truly unused items from the fresh source
    const unusedItems = fullSourceData.filter(item => !isUsed(item));

    if (unusedItems.length > 0) {
        deckRef.current = shuffleArray(unusedItems);
    } else {
        // 4. Exhausted everything. Reset history for this category to allow looping.
        usedQuestionIdentifiers.current[categoryKey]!.clear();
        deckRef.current = shuffleArray([...fullSourceData]);
    }

    // 5. Pop and return
    const nextItem = deckRef.current.pop();
    // Safety check if nextItem exists (it should after refill logic)
    if (nextItem) {
        usedQuestionIdentifiers.current[categoryKey]!.add(identifierFn(nextItem));
        return nextItem;
    }
    
    // Fallback (should theoretically not happen)
    return builtInSourceData[0];
  }, []);

  const prepareNewDecks = useCallback((useImportedOnly: boolean = false) => {
    useImportedOnlyRef.current = useImportedOnly;
    
    const customQuestionsRaw = localStorage.getItem('custom-questions');
    const customQuestions = customQuestionsRaw ? JSON.parse(customQuestionsRaw) : {};
    
    // NOTE: Removed usedQuestionIdentifiers.current = {}; to preserve session history

    const createDeck = <T,>(builtIn: T[], custom: T[] | undefined): T[] => {
        const customDeck = custom || [];
        if (useImportedOnly && customDeck.length > 0) {
            return shuffleArray(customDeck);
        }
        return shuffleArray([...customDeck, ...builtIn]);
    };

    countryDeck.current = createDeck(countries, customQuestions.countries);
    triviaDeck.current = createDeck(triviaQuestions, customQuestions.trivia);
    kpopTriviaDeck.current = createDeck(kpopTrivia, customQuestions.kpopTrivia);
    footballPlayerDeck.current = createDeck(footballPlayers, customQuestions.footballPlayers);
    footballClubDeck.current = createDeck(footballClubs, customQuestions.footballClubs);
    footballStadiumDeck.current = createDeck(footballStadiums, customQuestions.footballStadiums);
    cityDeck.current = createDeck(cities, customQuestions.cities);
    fruitDeck.current = createDeck(fruits, customQuestions.fruits);
    animalDeck.current = createDeck(animals, customQuestions.animals);
    movieDeck.current = createDeck(movies, customQuestions.movies);
  }, []);

  const getNextCountry = useCallback(() => getNextUniqueItem(countryDeck, countries, 'countries', c => c.name), [getNextUniqueItem]);
  const getNextTrivia = useCallback(() => getNextUniqueItem(triviaDeck, triviaQuestions, 'trivia', q => q.question), [getNextUniqueItem]);
  const getNextKpopTrivia = useCallback(() => getNextUniqueItem(kpopTriviaDeck, kpopTrivia, 'kpopTrivia', q => q.question), [getNextUniqueItem]);
  const getNextFootballPlayer = useCallback(() => getNextUniqueItem(footballPlayerDeck, footballPlayers, 'footballPlayers', p => p), [getNextUniqueItem]);
  const getNextFootballClub = useCallback(() => getNextUniqueItem(footballClubDeck, footballClubs, 'footballClubs', c => c), [getNextUniqueItem]);
  const getNextFootballStadium = useCallback(() => getNextUniqueItem(footballStadiumDeck, footballStadiums, 'footballStadiums', s => s.name), [getNextUniqueItem]);
  const getNextCity = useCallback(() => getNextUniqueItem(cityDeck, cities, 'cities', c => c.name), [getNextUniqueItem]);
  const getNextFruit = useCallback(() => getNextUniqueItem(fruitDeck, fruits, 'fruits', f => f), [getNextUniqueItem]);
  const getNextAnimal = useCallback(() => getNextUniqueItem(animalDeck, animals, 'animals', a => a), [getNextUniqueItem]);
  const getNextMovie = useCallback(() => getNextUniqueItem(movieDeck, movies, 'movies', m => m), [getNextUniqueItem]);
  
  const getNextAbcCombo = useCallback(() => {
    const categoryKey = 'abc_5_dasar';
    if (!usedQuestionIdentifiers.current[categoryKey]) {
        usedQuestionIdentifiers.current[categoryKey] = new Set();
    }
    
    let letter: string, category: AbcCategory, combo: string, attempts = 0;
    const maxCombos = abcCategories.length * 26;

    do {
        letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        category = abcCategories[Math.floor(Math.random() * abcCategories.length)];
        combo = `${letter}-${category}`;
        attempts++;
        if (usedQuestionIdentifiers.current[categoryKey]!.size >= maxCombos) {
            // All combinations have been used, reset the set
            usedQuestionIdentifiers.current[categoryKey]!.clear();
        }
    } while (usedQuestionIdentifiers.current[categoryKey]!.has(combo) && attempts < 150); // Increased attempts
    
    usedQuestionIdentifiers.current[categoryKey]!.add(combo);
    const validationList = getValidationList(category);
    const availableAnswers = validationList.filter(item => item.toLowerCase().startsWith(letter.toLowerCase()));
    
    return { letter, category, availableAnswersCount: availableAnswers.length };
  }, []);

  const getNextZonaBola = useCallback(() => {
      const choice = Math.floor(Math.random() * 3);
      if (choice === 0) {
          return { type: 'Pemain Bola' as const, data: getNextFootballPlayer() };
      } else if (choice === 1) {
          return { type: 'Klub Bola' as const, data: getNextFootballClub() };
      } else {
          return { type: 'Stadion Bola' as const, data: getNextFootballStadium() };
      }
  }, [getNextFootballPlayer, getNextFootballClub, getNextFootballStadium]);
  
  const startGame = useCallback((
    gameStyle: GameStyle, 
    maxWinners: number, 
    options?: { 
      knockoutCategory?: KnockoutCategory, 
      classicCategories?: GameMode[],
      useImportedOnly?: boolean,
      totalRounds?: number,
      isHardMode?: boolean
    }) => {
    prepareNewDecks(options?.useImportedOnly ?? false);
    if (gameStyle === GameStyle.Classic) {
        const classicCategories = options?.classicCategories || [];
        const roundsToPlay = options?.totalRounds || TOTAL_ROUNDS;
        let roundDeck: GameMode[] = [];
        if (classicCategories.length > 0) {
          for (let i = 0; i < roundsToPlay; i++) {
            roundDeck.push(classicCategories[i % classicCategories.length]);
          }
        }
        const classicRoundDeck = shuffleArray(roundDeck);

        const firstRoundMode = classicRoundDeck.length > 0 ? classicRoundDeck[0] : GameMode.GuessTheFlag; // Fallback
        const firstRoundData: GameActionPayloads['START_GAME']['firstRoundData'] = { gameMode: firstRoundMode };

        if (firstRoundMode === GameMode.GuessTheFlag) {
            firstRoundData.country = getNextCountry();
        } else if (firstRoundMode === GameMode.ABC5Dasar) {
            const { letter, category, availableAnswersCount } = getNextAbcCombo();
            firstRoundData.letter = letter;
            firstRoundData.category = category;
            firstRoundData.availableAnswersCount = availableAnswersCount;
        } else if (firstRoundMode === GameMode.Trivia) {
            firstRoundData.triviaQuestion = getNextTrivia();
        } else if (firstRoundMode === GameMode.GuessTheCity) {
            firstRoundData.city = getNextCity();
        } else if (firstRoundMode === GameMode.ZonaBola) {
            const { type, data } = getNextZonaBola();
            firstRoundData.wordCategory = type;
            if (type === 'Stadion Bola') {
                firstRoundData.stadium = data as FootballStadium;
            } else {
                firstRoundData.word = data as string;
            }
        } else if (firstRoundMode === GameMode.GuessTheFruit) {
            firstRoundData.word = getNextFruit();
            firstRoundData.wordCategory = 'Buah-buahan';
        } else if (firstRoundMode === GameMode.GuessTheAnimal) {
            firstRoundData.word = getNextAnimal();
            firstRoundData.wordCategory = 'Hewan';
        } else if (firstRoundMode === GameMode.KpopTrivia) {
            firstRoundData.triviaQuestion = getNextKpopTrivia();
        } else if (firstRoundMode === GameMode.ZonaFilm) {
            firstRoundData.word = getNextMovie();
            firstRoundData.wordCategory = 'Film';
        }
        
        dispatch({ type: 'START_GAME', payload: { gameStyle, maxWinners, totalRounds: roundsToPlay, isHardMode: options?.isHardMode, classicRoundDeck, firstRoundData } });

    } else { // Knockout
        dispatch({ type: 'START_GAME', payload: { gameStyle, maxWinners, knockoutCategory: options?.knockoutCategory } });
    }
  }, [prepareNewDecks, getNextCountry, getNextAbcCombo, getNextTrivia, getNextCity, getNextZonaBola, getNextFruit, getNextAnimal, getNextKpopTrivia, getNextMovie]);
  
  const nextRound = useCallback(() => {
    // Check against dynamic totalRounds in state, not constant
    if (state.round >= state.totalRounds) {
        // This case should be handled by the reducer state check, but double check here
        return;
    }
    const nextRoundNumber = state.round + 1;
    
    // Safety check if we ran out of deck
    if (nextRoundNumber > state.classicRoundDeck.length) {
         dispatch({ type: 'FINISH_GAME' });
         return;
    }

    const nextGameMode = state.classicRoundDeck[state.round]; // round is 1-based, deck is 0-based
    const payload: Partial<GameActionPayloads['NEXT_ROUND']> = { gameMode: nextGameMode };
    
    if (nextGameMode === GameMode.GuessTheFlag) {
      payload.nextCountry = getNextCountry();
    } else if (nextGameMode === GameMode.ABC5Dasar) {
        const { letter, category, availableAnswersCount } = getNextAbcCombo();
        payload.nextLetter = letter;
        payload.nextCategory = category;
        payload.availableAnswersCount = availableAnswersCount;
    } else if (nextGameMode === GameMode.Trivia) {
        payload.nextTriviaQuestion = getNextTrivia();
    } else if (nextGameMode === GameMode.GuessTheCity) {
        payload.nextCity = getNextCity();
    } else if (nextGameMode === GameMode.ZonaBola) {
        const { type, data } = getNextZonaBola();
        payload.nextWordCategory = type;
        if (type === 'Stadion Bola') {
            payload.nextStadium = data as FootballStadium;
        } else {
            payload.nextWord = data as string;
        }
    } else if (nextGameMode === GameMode.GuessTheFruit) {
        payload.nextWord = getNextFruit();
        payload.nextWordCategory = 'Buah-buahan';
    } else if (nextGameMode === GameMode.GuessTheAnimal) {
        payload.nextWord = getNextAnimal();
        payload.nextWordCategory = 'Hewan';
    } else if (nextGameMode === GameMode.KpopTrivia) {
        payload.nextTriviaQuestion = getNextKpopTrivia();
    } else if (nextGameMode === GameMode.ZonaFilm) {
        payload.nextWord = getNextMovie();
        payload.nextWordCategory = 'Film';
    }
    dispatch({ type: 'NEXT_ROUND', payload: payload as GameActionPayloads['NEXT_ROUND'] });
  }, [state.round, state.totalRounds, state.gameStyle, state.classicRoundDeck, getNextCountry, getNextAbcCombo, getNextTrivia, getNextCity, getNextZonaBola, getNextFruit, getNextAnimal, getNextKpopTrivia, getNextMovie]);

  const finishWinnerDisplay = useCallback(() => {
      dispatch({ type: 'HIDE_WINNER_MODAL' });
      // Check against dynamic totalRounds
      if (state.round < state.totalRounds) {
          dispatch({ type: 'START_COUNTDOWN' });
      } else {
          dispatch({ type: 'NEXT_ROUND', payload: {} as GameActionPayloads['NEXT_ROUND'] });
      }
  }, [state.round, state.totalRounds]);

  const resetGame = useCallback(() => dispatch({ type: 'RESET_GAME' }), []);
  
  const resetGlobalLeaderboard = useCallback(() => {
    try {
        localStorage.removeItem('leaderboard');
        dispatch({ type: 'RESET_GLOBAL_LEADERBOARD' });
    } catch (e) {
        console.error("Failed to reset global leaderboard", e);
    }
  }, []);

  const processComment = useCallback((message: ChatMessage) => {
    dispatch({ type: 'PROCESS_COMMENT', payload: message });
  }, []);

  const skipRound = useCallback(() => {
    if (state.isRoundActive || state.gameState === GameState.KnockoutPlaying) {
        if (state.gameStyle === GameStyle.Classic) {
            dispatch({ type: 'END_ROUND' });
        } else if (state.gameStyle === GameStyle.Knockout) {
            dispatch({ type: 'SKIP_KNOCKOUT_MATCH' });
        }
    }
  }, [state.isRoundActive, state.gameStyle, state.gameState]);

  const revealClue = useCallback(() => {
      dispatch({ type: 'REVEAL_CLUE' });
  }, []);

  const registerPlayer = useCallback((player: KnockoutPlayer) => {
    if(state.gameState === GameState.KnockoutRegistration) {
      dispatch({ type: 'REGISTER_PLAYER', payload: player });
    }
  }, [state.gameState]);
  
  const resetKnockoutRegistration = useCallback(() => {
    dispatch({ type: 'RESET_KNOCKOUT_REGISTRATION' });
  }, []);

  const endRegistrationAndDrawBracket = useCallback(() => {
    if(state.gameState === GameState.KnockoutRegistration) {
        dispatch({ type: 'END_REGISTRATION_AND_DRAW_BRACKET' });
    }
  }, [state.gameState]);

  const prepareNextMatch = useCallback((payload: { roundIndex: number; matchIndex: number }) => {
      if(state.gameState === GameState.KnockoutReadyToPlay) {
          dispatch({ type: 'PREPARE_NEXT_MATCH', payload });
      }
  }, [state.gameState]);
  
  const declareWalkoverWinner = useCallback((payload: GameActionPayloads['DECLARE_WALKOVER_WINNER']) => {
    dispatch({ type: 'DECLARE_WALKOVER_WINNER', payload });
  }, []);
  
  const returnToBracket = useCallback(() => dispatch({ type: 'RETURN_TO_BRACKET' }), []);
  const redrawBracket = useCallback(() => dispatch({ type: 'REDRAW_BRACKET' }), []);
  const finishGame = useCallback(() => dispatch({ type: 'FINISH_GAME' }), []);
  const restartKnockoutCompetition = useCallback(() => dispatch({ type: 'RESTART_KNOCKOUT_COMPETITION' }), []);
  const returnToModeSelection = useCallback(() => dispatch({ type: 'RETURN_TO_MODE_SELECTION' }), []);

  const pauseGame = useCallback(() => dispatch({ type: 'PAUSE_GAME' }), []);
  const resumeGame = useCallback(() => dispatch({ type: 'RESUME_GAME' }), []);
  
  const setHostUsername = useCallback((username: string) => {
    dispatch({ type: 'SET_HOST_USERNAME', payload: { username } });
  }, []);

  const getCurrentKnockoutMatch = useCallback(() => {
      const { knockoutBracket, currentBracketRoundIndex, currentMatchIndex } = state;
      if (knockoutBracket && currentBracketRoundIndex !== null && currentMatchIndex !== null) {
          return knockoutBracket[currentBracketRoundIndex][currentMatchIndex];
      }
      return null;
  }, [state.knockoutBracket, state.currentBracketRoundIndex, state.currentMatchIndex]);

  useEffect(() => { prepareNewDecks(); }, [prepareNewDecks]);

  // Timers for timed transitions
  useEffect(() => {
    let timerId: number;
    if (state.isRoundActive && state.roundTimer > 0) {
      timerId = window.setInterval(() => dispatch({ type: 'TICK_TIMER' }), 1000);
    } else if (state.roundTimer <= 0) {
      if (state.gameStyle === GameStyle.Classic && state.isRoundActive) {
          dispatch({ type: 'END_ROUND' });
      } else if (state.gameStyle === GameStyle.Knockout && state.isRoundActive) {
          dispatch({ type: 'KNOCKOUT_QUESTION_TIMEOUT' });
      }
    }
    return () => clearInterval(timerId);
  }, [state.isRoundActive, state.roundTimer, state.gameState, state.gameStyle]);

  useEffect(() => {
    let timerId: number;
    if (state.countdownValue && state.countdownValue > 0) {
      timerId = window.setInterval(() => dispatch({ type: 'TICK_COUNTDOWN' }), 1000);
    } else if (state.countdownValue === 0) {
        if(state.gameState === GameState.KnockoutPrepareMatch) {
            dispatch({ type: 'START_MATCH' });
        } else if (state.gameStyle === GameStyle.Classic) {
            nextRound();
        }
    }
    return () => clearInterval(timerId);
  }, [state.countdownValue, state.gameState, nextRound, state.gameStyle]);
  
  useEffect(() => {
    if(state.gameState === GameState.KnockoutDrawing) {
        const timer = setTimeout(() => dispatch({ type: 'SET_READY_TO_PLAY' }), 2000); // 2 seconds to view the bracket
        return () => clearTimeout(timer);
    }
    if(state.gameState === GameState.KnockoutShowWinner) {
        const timer = setTimeout(() => dispatch({ type: 'SET_READY_TO_PLAY' }), KNOCKOUT_WINNER_VIEW_SECONDS * 1000);
        return () => clearTimeout(timer);
    }
    if(state.gameState === GameState.ClassicAnswerReveal) {
        const timer = setTimeout(() => dispatch({ type: 'SHOW_WINNER_MODAL' }), ANSWER_REVEAL_DELAY_SECONDS * 1000);
        return () => clearTimeout(timer);
    }
  }, [state.gameState]);

  // Logic triggers based on state changes
  useEffect(() => {
    if (state.gameState === GameState.KnockoutPlaying && !state.isRoundActive && !state.currentCountry && !state.currentTriviaQuestion && !state.currentWord && !state.currentStadium) {
        if(state.knockoutCategory === 'GuessTheCountry') {
            const country = getNextCountry();
            dispatch({ type: 'SET_KNOCKOUT_COUNTRY', payload: { country } });
        } else if (state.knockoutCategory === 'Trivia') {
            const question = getNextTrivia();
            dispatch({ type: 'SET_KNOCKOUT_TRIVIA', payload: { question } });
        } else if (state.knockoutCategory === 'ZonaBola') {
            const payload = getNextZonaBola();
            dispatch({ type: 'SET_KNOCKOUT_ZONA_BOLA', payload });
        } else if (state.knockoutCategory === 'GuessTheFruit') {
            const fruit = getNextFruit();
            dispatch({ type: 'SET_KNOCKOUT_GUESS_THE_FRUIT', payload: { fruit } });
        } else if (state.knockoutCategory === 'GuessTheAnimal') {
            const animal = getNextAnimal();
            dispatch({ type: 'SET_KNOCKOUT_GUESS_THE_ANIMAL', payload: { animal } });
        } else if (state.knockoutCategory === 'KpopTrivia') {
            const question = getNextKpopTrivia();
            dispatch({ type: 'SET_KNOCKOUT_KPOP_TRIVIA', payload: { question } });
        } else if (state.knockoutCategory === 'ZonaFilm') {
            const movie = getNextMovie();
            dispatch({ type: 'SET_KNOCKOUT_ZONA_FILM', payload: { movie } });
        }
    }
  }, [state.gameState, state.isRoundActive, state.knockoutCategory, getNextCountry, getNextTrivia, getNextZonaBola, getNextFruit, getNextAnimal, getNextKpopTrivia, getNextMovie]);

  // This effect handles advancing the knockout game after a question is finished
  useEffect(() => {
    if (state.gameState === GameState.KnockoutPlaying && !state.isRoundActive && (state.currentCountry || state.currentTriviaQuestion || state.currentCity || state.currentWord || state.currentStadium)) {
      const timeoutId = setTimeout(() => {
        const { player1, player2 } = state.knockoutMatchPoints;
        const match = getCurrentKnockoutMatch();
        if (match && (player1 >= KNOCKOUT_TARGET_SCORE || player2 >= KNOCKOUT_TARGET_SCORE)) {
          const winner = player1 >= KNOCKOUT_TARGET_SCORE ? match.player1! : match.player2!;
          const score = `${player1}-${player2}`;
          dispatch({ type: 'FINISH_KNOCKOUT_MATCH', payload: { winner, score } });
        } else {
          // Start next question
          if(state.knockoutCategory === 'GuessTheCountry') {
              const country = getNextCountry();
              dispatch({ type: 'SET_KNOCKOUT_COUNTRY', payload: { country } });
          } else if (state.knockoutCategory === 'Trivia') {
              const question = getNextTrivia();
              dispatch({ type: 'SET_KNOCKOUT_TRIVIA', payload: { question } });
          } else if (state.knockoutCategory === 'ZonaBola') {
              const payload = getNextZonaBola();
              dispatch({ type: 'SET_KNOCKOUT_ZONA_BOLA', payload });
          } else if (state.knockoutCategory === 'GuessTheFruit') {
              const fruit = getNextFruit();
              dispatch({ type: 'SET_KNOCKOUT_GUESS_THE_FRUIT', payload: { fruit } });
          } else if (state.knockoutCategory === 'GuessTheAnimal') {
              const animal = getNextAnimal();
              dispatch({ type: 'SET_KNOCKOUT_GUESS_THE_ANIMAL', payload: { animal } });
          } else if (state.knockoutCategory === 'KpopTrivia') {
              const question = getNextKpopTrivia();
              dispatch({ type: 'SET_KNOCKOUT_KPOP_TRIVIA', payload: { question } });
          } else if (state.knockoutCategory === 'ZonaFilm') {
            const movie = getNextMovie();
            dispatch({ type: 'SET_KNOCKOUT_ZONA_FILM', payload: { movie } });
          }
        }
      }, 3000); // 3-second delay to show the answer

      return () => clearTimeout(timeoutId);
    }
  }, [state.isRoundActive, state.gameState, state.knockoutMatchPoints, state.knockoutCategory, getCurrentKnockoutMatch, getNextCountry, getNextTrivia, getNextZonaBola, getNextFruit, getNextAnimal, getNextKpopTrivia, getNextMovie]);
  
  useEffect(() => {
    // FIX: This logic incorrectly checked if the gameState was Classic, but the gameState is always 'Playing'
    // in this scenario. The check has been corrected to use `state.gameStyle` instead.
    if (state.gameStyle === GameStyle.Classic && state.isRoundActive) {
        const currentMaxWinners = state.gameMode === GameMode.ABC5Dasar && state.availableAnswersCount != null 
              ? Math.min(state.maxWinners, state.availableAnswersCount) 
              : state.maxWinners;
        if (state.roundWinners.length >= currentMaxWinners) {
            dispatch({ type: 'END_ROUND' });
        }
    }
  }, [state.roundWinners.length, state.isRoundActive, state.gameStyle, state.maxWinners, state.gameMode, state.availableAnswersCount]);

  // This effect handles the automatic transition away from the Champion screen
  useEffect(() => {
    let timeoutId: number;
    if (state.gameState === GameState.Champion) {
      timeoutId = window.setTimeout(() => {
        if (state.gameStyle === GameStyle.Classic) {
          dispatch({ type: 'FINISH_GAME' });
        } else {
          // For knockout, the tournament is over, so we go back to the bracket view
          // which will show the final state and options to restart.
          dispatch({ type: 'RETURN_TO_BRACKET' });
        }
      }, CHAMPION_SCREEN_TIMEOUT_MS);
    }
    return () => window.clearTimeout(timeoutId);
  }, [state.gameState, state.gameStyle]);

  const getCurrentAnswer = () => {
    switch (state.gameMode) {
      case GameMode.GuessTheFlag:
        return state.currentCountry?.name || '';
      case GameMode.GuessTheWord:
      case GameMode.GuessTheFruit:
      case GameMode.GuessTheAnimal:
      case GameMode.ZonaFilm:
        return state.currentWord || '';
      case GameMode.GuessTheCity:
        return state.currentCity?.name || '';
      case GameMode.ABC5Dasar:
        return `(Jawaban Kategori ${state.currentCategory} diawali huruf ${state.currentLetter})`;
      case GameMode.Trivia:
      case GameMode.KpopTrivia:
        return state.currentTriviaQuestion?.answer || '';
      case GameMode.ZonaBola:
        return state.currentWord || state.currentStadium?.name || '';
      default:
        return 'Tidak ada soal aktif';
    }
  };

  return { state, startGame, resetGame, processComment, skipRound, pauseGame, resumeGame, registerPlayer, endRegistrationAndDrawBracket, prepareNextMatch, getCurrentKnockoutMatch, returnToBracket, redrawBracket, declareWalkoverWinner, finishGame, resetKnockoutRegistration, restartKnockoutCompetition, returnToModeSelection, finishWinnerDisplay, setHostUsername, resetGlobalLeaderboard, revealClue, currentAnswer: getCurrentAnswer() };
};
