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

// Game-complete summary view: fitBounds()'s padding option becomes unreliable
// once it's large relative to the container (pins can render fully outside
// the visible area), so the camera is fit manually instead — see drawSummary.
const SUMMARY_TOP_MARGIN = 60;
const SUMMARY_SIDE_MARGIN = 40;
const SUMMARY_BOTTOM_MARGIN = 24;
// Low enough that the bounding box always fits the safe window, however far
// apart a guess and its answer happen to be — the search converges to
// whatever zoom is actually needed, this is just a safety-net floor.
const SUMMARY_MIN_ZOOM = 1;
const SUMMARY_MAX_ZOOM = 14;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function Map({ onGuess, showResult, guess, answer, disabled, onNext, isLastRound, gameComplete, allGuesses, allClues }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markerRef = useRef(null);
  const answerMarkerRef = useRef(null);
  const lineRef = useRef(null);
  const summaryMarkersRef = useRef([]);
  const disabledRef = useRef(disabled);
  const [pendingGuess, setPendingGuess] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

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
      if (disabledRef.current) return;
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
      if (!gameComplete) {
        map.current?.flyTo({ center: NYC_CENTER, zoom: 10 });
      }
    }
  }, [showResult, gameComplete]);

  // Game over: zoom out and show every guess against its answer
  useEffect(() => {
    if (!gameComplete || !map.current || !allGuesses?.length || !allClues?.length) return;

    const drawSummary = () => {
      summaryMarkersRef.current.forEach((m) => m.remove());
      summaryMarkersRef.current = [];

      const bounds = new mapboxgl.LngLatBounds();
      const lineFeatures = [];

      allClues.forEach((clue, i) => {
        const roundGuess = allGuesses[i];
        if (!roundGuess) return;

        const guessEl = document.createElement('div');
        guessEl.className = 'user-marker';
        summaryMarkersRef.current.push(
          new mapboxgl.Marker(guessEl).setLngLat([roundGuess.lng, roundGuess.lat]).addTo(map.current)
        );

        const answerEl = document.createElement('div');
        answerEl.className = 'answer-marker';
        summaryMarkersRef.current.push(
          new mapboxgl.Marker(answerEl).setLngLat([clue.lng, clue.lat]).addTo(map.current)
        );

        bounds.extend([roundGuess.lng, roundGuess.lat]);
        bounds.extend([clue.lng, clue.lat]);

        lineFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[roundGuess.lng, roundGuess.lat], [clue.lng, clue.lat]],
          },
        });
      });

      if (map.current.getSource('summary-lines')) {
        map.current.removeLayer('summary-lines-layer');
        map.current.removeSource('summary-lines');
      }

      map.current.addSource('summary-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: lineFeatures },
      });

      map.current.addLayer({
        id: 'summary-lines-layer',
        type: 'line',
        source: 'summary-lines',
        paint: {
          'line-color': '#FF4444',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      // The in-game minZoom and maxBounds exist to limit panning during play;
      // relax both so the final overview has room to zoom out and recenter
      // as far as it needs to fit every pin. maxBounds in particular also
      // clamps how far jumpTo() can zoom out at a given center, which would
      // otherwise silently break the fitting search below.
      map.current.setMinZoom(SUMMARY_MIN_ZOOM);
      map.current.setMaxBounds(null);

      // The safe window pins must stay within: clear of the header at the
      // top, clear of the scorecard sheet at the bottom.
      const scorecardEl = mapContainer.current.closest('.map-container')?.querySelector('.scorecard');
      const containerRect = mapContainer.current.getBoundingClientRect();
      const sheetTop = scorecardEl
        ? scorecardEl.getBoundingClientRect().top - containerRect.top
        : containerRect.height;

      const safeLeft = SUMMARY_SIDE_MARGIN;
      const safeRight = containerRect.width - SUMMARY_SIDE_MARGIN;
      const safeTop = SUMMARY_TOP_MARGIN;
      const safeBottom = sheetTop - SUMMARY_BOTTOM_MARGIN;

      const center = bounds.getCenter();
      const nw = bounds.getNorthWest();
      const se = bounds.getSouthEast();

      const fitsAt = (zoom) => {
        map.current.jumpTo({ center, zoom });
        const a = map.current.project(nw);
        const b = map.current.project(se);
        return Math.abs(b.x - a.x) <= safeRight - safeLeft && Math.abs(b.y - a.y) <= safeBottom - safeTop;
      };

      // Binary-search the most zoomed-in view that still fits every pin in
      // the safe window, since fitBounds()'s own padding option is unreliable
      // once the padding is large relative to the container.
      let lo = SUMMARY_MIN_ZOOM;
      let hi = SUMMARY_MAX_ZOOM;
      if (fitsAt(lo)) {
        for (let i = 0; i < 14; i++) {
          const mid = (lo + hi) / 2;
          if (fitsAt(mid)) lo = mid; else hi = mid;
        }
      }
      map.current.jumpTo({ center, zoom: lo });

      // Center the bounds within the safe window rather than the full
      // container, so pins land clear of both the header and the sheet.
      const nwPx = map.current.project(nw);
      const sePx = map.current.project(se);
      map.current.panBy(
        [
          (nwPx.x + sePx.x) / 2 - (safeLeft + safeRight) / 2,
          (nwPx.y + sePx.y) / 2 - (safeTop + safeBottom) / 2,
        ],
        { animate: false }
      );
    };

    if (map.current.isStyleLoaded()) {
      drawSummary();
    } else {
      map.current.once('load', drawSummary);
    }
  }, [gameComplete, allGuesses, allClues]);

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