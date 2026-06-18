import { getScoreEmoji } from '../utils/gameUtils';

export default function ScoreCard({ scores, clues, totalScore }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const shareText = `NYC Pinpoint — ${today}
${scores.map(getScoreEmoji).join(' ')}
${totalScore} / 3000`;

  function handleShare() {
    if (navigator.share) {
      navigator.share({ text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Copied to clipboard!');
    }
  }

  return (
    <div className="scorecard">
      <h1 className="scorecard-title">NYC Pinpoint</h1>
      <p className="scorecard-date">{today}</p>

      <div className="scorecard-emojis">
        {scores.map((s, i) => (
          <span key={i}>{getScoreEmoji(s)}</span>
        ))}
      </div>

      <div className="scorecard-total">{totalScore} / 3000</div>

      <div className="scorecard-breakdown">
        {clues.map((clue, i) => (
          <div key={clue.id} className="scorecard-row">
            <span className="scorecard-row-label">{clue.answer_label}</span>
            <span className="scorecard-row-score">{getScoreEmoji(scores[i])} {scores[i]}</span>
          </div>
        ))}
      </div>

      <button className="share-btn" onClick={handleShare}>
        Share Score
      </button>

      <p className="scorecard-return">Come back tomorrow for a new puzzle</p>
    </div>
  );
}