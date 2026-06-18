import { useGameState } from './hooks/useGameState';
import Map from './components/Map';
import ResultPanel from './components/ResultPanel';
import ScoreCard from './components/ScoreCard';
import GameHeader from './components/GameHeader';

export default function App() {
  const {
    dailyClues,
    currentRound,
    scores,
    guesses,
    gameComplete,
    showResult,
    totalScore,
    submitGuess,
    advanceRound,
    currentClue,
    currentGuess,
  } = useGameState();

  return (
    <div className="app">
      <GameHeader
        currentRound={currentRound}
        totalScore={totalScore}
        currentClue={currentClue}
        gameComplete={gameComplete}
      />

      <div className="map-container">
        <Map
          onGuess={submitGuess}
          showResult={showResult}
          guess={currentGuess}
          answer={currentClue}
          disabled={showResult || gameComplete}
        />

        {showResult && !gameComplete && (
          <ResultPanel
            clue={currentClue}
            guess={currentGuess}
            onNext={advanceRound}
            isLastRound={currentRound === dailyClues.length - 1}
          />
        )}

        {gameComplete && (
          <ScoreCard
            scores={scores}
            clues={dailyClues}
            totalScore={totalScore}
          />
        )}
      </div>
    </div>
  );
}