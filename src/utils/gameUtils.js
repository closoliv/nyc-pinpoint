export function getDailyClues(clues) {
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  
  const landmarks = clues.filter(c => c.category === 'landmark');
  const crossStreets = clues.filter(c => c.category === 'cross_street');
  const popCulture = clues.filter(c => c.category === 'pop_culture');
  
  const pick = (arr, seed) => arr[seed % arr.length];
  
  return [
    pick(landmarks, seed),
    pick(crossStreets, seed + 1),
    pick(popCulture, seed + 2),
  ];
}

export function calculateScore(distanceMeters) {
  const maxScore = 1000;
  const maxDistance = 5000; // 5km = 0 points
  if (distanceMeters <= 100) return maxScore;
  if (distanceMeters >= maxDistance) return 0;
  const ratio = 1 - (distanceMeters - 100) / (maxDistance - 100);
  return Math.round(ratio * maxScore);
}

export function getScoreEmoji(score) {
  if (score >= 750) return '🟢';
  if (score >= 400) return '🟡';
  return '🔴';
}

export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}