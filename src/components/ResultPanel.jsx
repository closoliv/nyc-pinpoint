import { formatDistance, getScoreEmoji } from '../utils/gameUtils';

export default function ResultPanel({ clue, guess, onNext, isLastRound }) {
  return (
    <div className="result-panel">
      <div className="result-header">
        <span className="result-emoji">{getScoreEmoji(guess.score)}</span>
        <span className="result-score">+{guess.score}</span>
      </div>

      <div className="result-label">{clue.answer_label}</div>

      <div className="result-distance">
        {guess.distance < 100
          ? 'Spot on!'
          : `${formatDistance(guess.distance)} away`}
      </div>

      {clue.fun_fact && (
        <div className="result-funfact">
          {clue.fun_fact}
        </div>
      )}

      <button className="next-btn" onClick={onNext}>
        {isLastRound ? 'See Final Score' : 'Next Round →'}
      </button>
    </div>
  );
}