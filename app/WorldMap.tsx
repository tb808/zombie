'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CITY_PLACES, CITY_ROADS } from './city';
import { REFUGES } from './environment';
import { WORLD, type Point } from './survival';
import { REGIONS } from './world';
import { SAFEHOUSES, houseProtected, type HouseState } from './safehouses';

type Footprint = { x: number; z: number; hx: number; hz: number };
type View = { x: number; z: number; zoom: number };
const width = WORLD.maxX - WORLD.minX, height = WORLD.maxZ - WORLD.minZ;
const overview: View = { x: (WORLD.minX + WORLD.maxX) / 2, z: (WORLD.minZ + WORLD.maxZ) / 2, zoom: 1 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function bounded(view: View): View {
  const zoom = clamp(view.zoom, 1, 6), hx = width / zoom / 2, hz = height / zoom / 2;
  return { zoom, x: clamp(view.x, WORLD.minX + hx, WORLD.maxX - hx), z: clamp(view.z, WORLD.minZ + hz, WORLD.maxZ - hz) };
}

export default function WorldMap({ player, target, visited, buildings, houses, respawn }: { player: Point; target: Point; visited: string[]; buildings: Footprint[]; houses: Record<string,HouseState>; respawn: string | null }) {
  const [view, setView] = useState(overview);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; view: View; scaleX: number; scaleY: number } | null>(null);
  const zoom = useCallback((factor: number, anchor?: Point) => setView(old => {
    const nextZoom = clamp(old.zoom * factor, 1, 6), ratio = old.zoom / nextZoom;
    return bounded({ zoom: nextZoom, x: anchor ? anchor.x + (old.x - anchor.x) * ratio : old.x, z: anchor ? anchor.z + (old.z - anchor.z) * ratio : old.z });
  }), []);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      zoom(event.deltaY < 0 ? 1.2 : 1 / 1.2, { x: point.x, z: point.y });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoom]);
  const markerScale = 1 / Math.sqrt(view.zoom);
  const cityBlocks = [
    ...[105, 136, 167, 198].flatMap(x => [-161, 138].map(z => ({ x, z, hx: 5.5, hz: 6 }))),
  ];
  const label = (text: string, x: number, z: number) => <text x={x} y={z} textAnchor="middle" fontSize={4.3 * markerScale} className="map-place-label">{text}</text>;

  return <section className="world-map" aria-label="Maras Karte von ganz Tannwald">
    <header className="map-toolbar"><div><span className="eyebrow">MARAS FELDKARTE</span><h3>Tannwald & Umgebung</h3></div><div className="map-buttons">
      <button type="button" aria-label="Karte verkleinern" disabled={view.zoom <= 1} onClick={() => zoom(1 / 1.3)}>−</button>
      <output aria-label="Kartenzoom">{Math.round(view.zoom * 100)} %</output>
      <button type="button" aria-label="Karte vergrößern" disabled={view.zoom >= 6} onClick={() => zoom(1.3)}>+</button>
      <button type="button" onClick={() => setView(overview)}>Ganze Karte</button>
      <button type="button" onClick={() => setView(bounded({ ...player, zoom: Math.max(3, view.zoom) }))}>Mein Standort</button>
    </div></header>
    <div className="map-viewport"><svg ref={svgRef} viewBox={`${view.x - width / view.zoom / 2} ${view.z - height / view.zoom / 2} ${width / view.zoom} ${height / view.zoom}`} role="img" aria-label="Gesamte Spielwelt mit Straßen, Gebäuden, Unterschlüpfen, Standort und Missionsziel" tabIndex={0}
      onKeyDown={event => {
        if (['+', '=', '-', 'Home', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); }
        if (event.key === '+' || event.key === '=') zoom(1.3);
        else if (event.key === '-') zoom(1 / 1.3);
        else if (event.key === 'Home') setView(overview);
        else if (event.key.startsWith('Arrow')) setView(old => bounded({ ...old, x: old.x + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0) * 20 / old.zoom, z: old.z + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0) * 20 / old.zoom }));
      }}
      onPointerDown={event => {
        if (event.button !== 0) return;
        const matrix = event.currentTarget.getScreenCTM();
        if (!matrix) return;
        event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, view, scaleX: matrix.a, scaleY: matrix.d };
      }}
      onPointerMove={event => { const start = drag.current; if (start?.pointer === event.pointerId) setView(bounded({ ...start.view, x: start.view.x - (event.clientX - start.x) / start.scaleX, z: start.view.z - (event.clientY - start.y) / start.scaleY })); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      <defs>
        <pattern id="field-map-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#777d5f" strokeWidth=".2" opacity=".35" /></pattern>
        <pattern id="field-map-forest" width="13" height="15" patternUnits="userSpaceOnUse"><path d="M6 3l-2 4h4ZM6 6l-3 4h6Z" fill="#748363" opacity=".3" /></pattern>
      </defs>
      <rect x={WORLD.minX} y={WORLD.minZ} width={width} height={height} fill="#d8d2b5" />
      <path d="M-180-185H83V-60L-82-62L-93 45L-160 160H-180ZM-180-185V160H240V152L81 60L38 55L-43 45L-86-8L-82-62L83-60V-185Z" fill="#a6af87" />
      <rect x={WORLD.minX} y={WORLD.minZ} width={width} height={height} fill="url(#field-map-forest)" />
      <rect x="83" y="-173" width="139" height="324" rx="8" fill="#c8c4ac" />
      <rect x={WORLD.minX} y={WORLD.minZ} width={width} height={height} fill="url(#field-map-grid)" />
      <g fill="#ece8d5" stroke="#8c8b77" strokeWidth=".5">
        {CITY_ROADS.map((road, i) => <rect key={i} x={road.x - road.w / 2} y={road.z - road.h / 2} width={road.w} height={road.h} />)}
        {[{ x: 0, z: -7, w: 145, h: 9, rotation: .05 }, { x: 18, z: 10, w: 8, h: 48, rotation: -.55 }, { x: 53, z: 0, w: 8, h: 58, rotation: .42 }].map((road, i) => <rect key={`old-${i}`} x={road.x - road.w / 2} y={road.z - road.h / 2} width={road.w} height={road.h} transform={`rotate(${-road.rotation * 180 / Math.PI} ${road.x} ${road.z})`} />)}
      </g>
      <g fill="#8a8978" stroke="#686c5c" strokeWidth=".4">{[...buildings, ...cityBlocks].map((b, i) => <rect key={i} x={b.x - b.hx} y={b.z - b.hz} width={b.hx * 2} height={b.hz * 2} />)}</g>
      {REFUGES.map(r => <rect key={r.id} x={r.x - r.hx} y={r.z - r.hz} width={r.hx * 2} height={r.hz * 2} fill="#539b6733" stroke="#376b4d" strokeWidth=".8" strokeDasharray="2 1" />)}
      <text x="151" y="-176" fontSize="7" textAnchor="middle" fill="#626c58" letterSpacing="2">OSTSTADT</text>
      <text x="-132" y="42" fontSize="6" textAnchor="middle" fill="#536b50" letterSpacing="1">BIRKENRAIN</text>
      <text x="-53" y="-116" fontSize="8" fill="#748263" letterSpacing="3">TANNWALD</text>
      {CITY_PLACES.map(place => <g key={place.id}><title>{place.name} · begehbar{visited.includes(place.id) ? ' · erkundet' : ''}</title><rect x={place.x - (place.hx??7.5)} y={place.z - (place.hz??7)} width={(place.hx??7.5)*2} height={(place.hz??7)*2} fill={visited.includes(place.id) ? '#637b62' : '#a1987d'} stroke="#5f6854" strokeWidth=".5" />{label(place.name.split(' · ')[0], place.x, place.z + 14 * markerScale)}</g>)}
      {REGIONS.map((region, i) => <g key={region.name}><circle cx={region.x} cy={region.z} r={3 * markerScale} fill="#435c4b" />{label(`${i + 1} · ${region.name}`, region.x, region.z + 10 * markerScale)}</g>)}
      {SAFEHOUSES.map(h=><g key={h.id} transform={`translate(${h.x+9} ${h.z-9}) scale(${markerScale})`}><title>{h.name} · {houseProtected(houses[h.id])?'gesichert':'sicherbares Haus'}{respawn===h.id?' · Respawnpunkt':''}</title><path d="M-5 0L0-5 5 0V6H-5Z" fill={houseProtected(houses[h.id])?'#397d54':'#b28851'} stroke="#f4e8c6" strokeWidth=".7"/>{respawn===h.id&&<text x="0" y="4" textAnchor="middle" fontSize="6" fill="#fff">R</text>}</g>)}
      <g transform={`translate(${target.x} ${target.z}) scale(${markerScale})`}><title>Aktuelles Missionsziel</title><path d="M0-5L5 0 0 5-5 0Z" fill="#b97529" stroke="#fff5cf" strokeWidth="1" /><circle r="8" fill="none" stroke="#b97529" strokeWidth=".7" /></g>
      <g transform={`translate(${player.x} ${player.z}) scale(${markerScale})`}><title>Dein Standort</title><circle r="5" fill="#f9fbf0" stroke="#244f66" strokeWidth="1" /><circle r="2.5" fill="#246b88" /></g>
      <rect x={WORLD.minX + .5} y={WORLD.minZ + .5} width={width - 1} height={height - 1} fill="none" stroke="#7b8065" strokeWidth="1" />
    </svg><div className="map-compass" aria-label="Norden liegt oben">N<span>↑</span></div></div>
    <footer className="map-caption"><span><i className="map-dot player" />Dein Standort</span><span><i className="map-dot target" />Missionsziel</span><span><i className="map-dot refuge" />Unterschlupf</span><span>⌂ Sicherbares Haus · Grün: gesichert · R: Respawn</span><span>Mausrad / + −: Zoom · Ziehen: Verschieben · Pos1: Ganze Karte</span></footer>
  </section>;
}
