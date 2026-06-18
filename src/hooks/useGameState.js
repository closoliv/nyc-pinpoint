import { useState, useEffect } from 'react';
import { getDailyClues, calculateScore, getDistanceMeters, getTodayKey } from '../utils/gameUtils';
import clues from '../data/clues.json';

export function useGameState() {
  const todayKey = getTodayKey();
  const savedState = JSON.parse(localStorage.getItem(`nyc-pinpoint-${todayKey}`) || 'null');

  const [dailyClues] = useState(() => getDailyClues(clues));
  const [currentRound, setCurrentRound] = useState(savedState?.currentRound ?? 0);
  const [scores, setScores] = useState(savedState?.scores ?? []);
  const [guesses, setGuesses] = useState(savedState?.guesses ?? []);
  const [gameComplete, setGameComplete] = useState(savedState?.gameComplete ?? false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    localStorage.setItem(`nyc-pinpoint-${todayKey}`, JSON.stringify({
      currentRound,
      scores,
      guesses,
      gameComplete,
    }));
  }, [currentRound, scores, guesses, gameComplete]);

  function submitGuess(lat, lng) {
    const clue = dailyClues[currentRound];
    const distance = getDistanceMeters(lat, lng, clue.lat, clue.lng);
    const score = calculateScore(distance);

    const newGuess = { lat, lng, distance, score };
    setGuesses(prev => [...prev, newGuess]);
    setScores(prev => [...prev, score]);
    setShowResult(true);
  }

  function advanceRound() {
    setShowResult(false);
    if (currentRound + 1 >= dailyClues.length) {
      setGameComplete(true);
    } else {
      setCurrentRound(prev => prev + 1);
    }
  }

  const totalScore = scores.reduce((a, b) => a + b, 0);

  return {
    dailyClues,
    currentRound,
    scores,
    guesses,
    gameComplete,
    showResult,
    totalScore,
    submitGuess,
    advanceRound,
    currentClue: dailyClues[currentRound],
    currentGuess: guesses[currentRound],
  };
}