export default function GameHeader({ currentRound, totalScore, currentClue, gameComplete }) {
  const categories = ['Landmark', 'Cross Street', 'Pop Culture'];

  return (
    <div className="game-header">
      <div className="header-top">
        <span className="header-title">NYC Pinpoint</span>
        <span className="header-score">{totalScore} pts</span>
      </div>

      {!gameComplete && (
        <>
          <div className="round-indicators">
            {categories.map((cat, i) => (
              <div
                key={cat}
                className={`round-pip ${i < currentRound ? 'complete' : ''} ${i === currentRound ? 'active' : ''}`}
              />
            ))}
          </div>
          <div className="header-clue">
            <span className="clue-category">{categories[currentRound]}</span>
            <span className="clue-text">{currentClue?.clue}</span>
          </div>
        </>
      )}
    </div>
  );
}