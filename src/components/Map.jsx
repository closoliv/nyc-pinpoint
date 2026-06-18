import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ResultTooltip from './ResultTooltip';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const NYC_BOUNDS = [
  [-74.2591, 40.4774], // SW corner
  [-73.7004, 40.9176], // NE corner
];

const NYC_CENTER = [-73.9857, 40.7484];

// Assumed tooltip footprint, used to keep it fully on-screen
const TOOLTIP_WIDTH = 240;
const TOOLTIP_MAX_HEIGHT = 220;
const MARGIN = 12;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function Map({ onGuess, showResult, guess, answer, disabled, onNext, isLastRound }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markerRef = useRef(null);
  const answerMarkerRef = useRef(null);
  const lineRef = useRef(null);
  const [pendingGuess, setPendingGuess] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: NYC_CENTER,
      zoom: 10,
      minZoom: 9,
      maxZoom: 15,
      maxBounds: NYC_BOUNDS,
    });

    map.current.on('load', () => {
      // Strip all labels from the map
      const layers = map.current.getStyle().layers;
      layers.forEach(layer => {
        if (layer.type === 'symbol') {
          map.current.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      });
    });

    map.current.on('click', (e) => {
      if (disabled) return;
      const { lng, lat } = e.lngLat;

      if (markerRef.current) markerRef.current.remove();

      const el = document.createElement('div');
      el.className = 'user-marker';

      markerRef.current = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current);

      setPendingGuess({ lat, lng });
    });
  }, []);

  // Show result: answer pin + line
  useEffect(() => {
    if (!showResult || !guess || !answer || !map.current) return;

    // Answer marker
    const el = document.createElement('div');
    el.className = 'answer-marker';

    answerMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([answer.lng, answer.lat])
      .addTo(map.current);

    // Line between guess and answer
    if (map.current.getSource('guess-line')) {
      map.current.removeLayer('guess-line-layer');
      map.current.removeSource('guess-line');
    }

    map.current.addSource('guess-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [guess.lng, guess.lat],
            [answer.lng, answer.lat],
          ],
        },
      },
    });

    map.current.addLayer({
      id: 'guess-line-layer',
      type: 'line',
      source: 'guess-line',
      paint: {
        'line-color': '#FF4444',
        'line-width': 2,
        'line-dasharray': [2, 2],
      },
    });

    // Fly to fit both points
    const bounds = new mapboxgl.LngLatBounds()
      .extend([guess.lng, guess.lat])
      .extend([answer.lng, answer.lat]);

    map.current.fitBounds(bounds, { padding: 80, maxZoom: 14 });

    // Keep the result tooltip anchored to the answer pin as the map flies/pans,
    // clamped so it always stays fully within the map container.
    const updateTooltipPosition = () => {
      const point = map.current.project([answer.lng, answer.lat]);
      const containerHeight = mapContainer.current.clientHeight;
      const containerWidth = mapContainer.current.clientWidth;

      const placeAbove = point.y > containerHeight * 0.45;
      const left = clamp(point.x - TOOLTIP_WIDTH / 2, MARGIN, containerWidth - TOOLTIP_WIDTH - MARGIN);
      const top = clamp(
        placeAbove ? point.y - TOOLTIP_MAX_HEIGHT - 16 : point.y + 16,
        MARGIN,
        containerHeight - TOOLTIP_MAX_HEIGHT - MARGIN
      );
      setTooltipPos({ left, top });
    };

    map.current.on('move', updateTooltipPosition);
    updateTooltipPosition();

    return () => {
      map.current?.off('move', updateTooltipPosition);
    };
  }, [showResult]);

  // Cleanup between rounds
  useEffect(() => {
    if (!showResult) {
      if (answerMarkerRef.current) { answerMarkerRef.current.remove(); answerMarkerRef.current = null; }
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      if (map.current?.getSource('guess-line')) {
        map.current.removeLayer('guess-line-layer');
        map.current.removeSource('guess-line');
      }
      setPendingGuess(null);
      setTooltipPos(null);
      map.current?.flyTo({ center: NYC_CENTER, zoom: 10 });
    }
  }, [showResult]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {pendingGuess && !showResult && !disabled && (
        <button
          className="submit-btn"
          onClick={() => onGuess(pendingGuess.lat, pendingGuess.lng)}
        >
          Submit Guess
        </button>
      )}
      {showResult && guess && answer && tooltipPos && (
        <ResultTooltip
          clue={answer}
          guess={guess}
          onNext={onNext}
          isLastRound={isLastRound}
          position={tooltipPos}
        />
      )}
    </div>
  );
}