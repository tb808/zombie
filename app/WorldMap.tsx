'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CITY_PLACES } from './city';
import { REFUGES } from './environment';
import { WORLD, type Point } from './survival';
import { REGIONS } from './world';
import { SAFEHOUSES, houseProtected, houseSecured, type HouseState } from './safehouses';
import { WATER_LINES, LAKES, FIELDS, BRIDGES, WORLD_ZONES, REGION_POIS, STRUCTURES } from './regionPlan';
import { STREET_LINES } from './streetPlan';
import { mapPath, mapSurvey, SETTLEMENT_AREAS } from './mapCartography';

type Footprint = { x: number; z: number; hx: number; hz: number };
type View = { x: number; z: number; zoom: number };
export type MapNpc = Point & { id: string; name: string };
const width = WORLD.maxX - WORLD.minX, height = WORLD.maxZ - WORLD.minZ;
const overview: View = { x: (WORLD.minX + WORLD.maxX) / 2, z: (WORLD.minZ + WORLD.maxZ) / 2, zoom: 1 };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
function bounded(view: View): View {
  const zoom = clamp(view.zoom, 1, 24), hx = width / zoom / 2, hz = height / zoom / 2;
  return { zoom, x: clamp(view.x, WORLD.minX + hx, WORLD.maxX - hx), z: clamp(view.z, WORLD.minZ + hz, WORLD.maxZ - hz) };
}
const placeName = (text: string) => text.split(' · ')[0].toLocaleLowerCase('de').replace(/(^|[\s-])\p{L}/gu, c => c.toLocaleUpperCase('de'));

export default function WorldMap({ player, target, visited, buildings, houses, respawn, npcs }: { player: Point; target: Point; visited: string[]; buildings: Footprint[]; houses: Record<string, HouseState>; respawn: string | null; npcs: MapNpc[] }) {
  const [view, setView] = useState(overview);
  const [pixels, setPixels] = useState({ width: 900, height: 650 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; view: View; scaleX: number; scaleY: number } | null>(null);
  const survey = useMemo(() => mapSurvey(), []);
  const regionalPositions = useMemo(() => new Set(STRUCTURES.map(s => `${s.x},${s.z}`)), []);
  const zoom = useCallback((factor: number, anchor?: Point) => setView(old => {
    const nextZoom = clamp(old.zoom * factor, 1, 24), ratio = old.zoom / nextZoom;
    return bounded({ zoom: nextZoom, x: anchor ? anchor.x + (old.x - anchor.x) * ratio : old.x, z: anchor ? anchor.z + (old.z - anchor.z) * ratio : old.z });
  }), []);
  useEffect(() => {
    const svg = svgRef.current; if (!svg) return;
    const observer = new ResizeObserver(entries => { const { width, height } = entries[0].contentRect; if (width && height) setPixels({ width, height }); });
    observer.observe(svg);
    const onWheel = (event: WheelEvent) => {
      event.preventDefault(); const matrix = svg.getScreenCTM(); if (!matrix) return;
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      zoom(event.deltaY < 0 ? 1.2 : 1 / 1.2, { x: p.x, z: p.y });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => { observer.disconnect(); svg.removeEventListener('wheel', onWheel); };
  }, [zoom]);
  // Keep symbols, type and the scale bar at a consistent printed size.
  const unit = Math.max(width / pixels.width, height / pixels.height) / view.zoom;
  const focusPlace = (point: Point) => { setView(bounded({ ...point, zoom: Math.max(14, view.zoom) })); svgRef.current?.scrollIntoView({ block: 'nearest' }); };
  const securedHouses = SAFEHOUSES.filter(h => houseSecured(houses[h.id]));
  const houseStatus = (h: typeof SAFEHOUSES[number]) => !houseSecured(houses[h.id]) ? 'Noch nicht gesichert' : houseProtected(houses[h.id]) ? 'Gesichert' : 'Gesichert · Eingang offen';
  const rawScale = unit * 100, scalePower = 10 ** Math.floor(Math.log10(rawScale));
  const scaleLength = ([5, 2, 1].find(n => n * scalePower <= rawScale) ?? 1) * scalePower;
  const scaleLabel = scaleLength >= 1000 ? `${scaleLength / 1000} km` : `${+scaleLength.toFixed(1)} m`;
  const labels: { id: string; text: string; x: number; z: number; kind: string }[] = [];
  const occupied: { x: number; z: number; w: number; h: number }[] = [];
  const candidates = [
    { id: 'tannwald-town', text: 'Tannwald', x: -15, z: -55, kind: 'town', offset: -16 },
    ...WORLD_ZONES.filter(z => ['village', 'city'].includes(z.biome) || z.id === 'MILITARY_BASE').map(z => ({ ...z, text: placeName(z.name), kind: 'town', offset: -16 })),
    ...(view.zoom >= 1.8 ? REGION_POIS.map(p => ({ ...p, text: placeName(p.name), kind: 'place', offset: 14 })) : []),
    ...(view.zoom >= 4 ? CITY_PLACES.map(p => ({ ...p, text: WORLD_ZONES.some(z => placeName(z.name) === placeName(p.name)) && p.name.includes(' · ') ? placeName(p.name.split(' · ')[1]) : placeName(p.name), kind: 'place', offset: 14 })) : []),
    ...(view.zoom >= 6 ? REGIONS.map((r, i) => ({ ...r, id: `region-${i}`, text: r.name, kind: 'place', offset: 14 })) : []),
  ];
  for (const p of candidates) {
    const z = p.z + p.offset * unit, w = (p.text.length * (p.kind === 'town' ? 7 : 5.8) + 16) * unit, h = 24 * unit;
    if (Math.abs(p.x - view.x) > width / view.zoom / 2 || Math.abs(z - view.z) > height / view.zoom / 2) continue;
    if (occupied.some(b => Math.abs(b.x - p.x) < (b.w + w) / 2 && Math.abs(b.z - z) < (b.h + h) / 2)) continue;
    occupied.push({ x: p.x, z, w, h }); labels.push({ id: p.id, text: p.text, x: p.x, z, kind: p.kind });
  }

  return <section className="world-map" aria-label="Maras Karte von ganz Tannwald">
    <header className="map-toolbar"><div><span className="eyebrow">REGIONALKARTE · BLATT 07</span><h3>Tannwald & Umgebung</h3></div><div className="map-buttons">
      <button type="button" aria-label="Karte verkleinern" disabled={view.zoom <= 1} onClick={() => zoom(1 / 1.3)}>−</button><output aria-label="Kartenzoom">{Math.round(view.zoom * 100)} %</output><button type="button" aria-label="Karte vergrößern" disabled={view.zoom >= 24} onClick={() => zoom(1.3)}>+</button>
      <button type="button" onClick={() => setView(overview)}>Ganze Karte</button><button type="button" onClick={() => setView(bounded({ ...player, zoom: Math.max(10, view.zoom) }))}>Mein Standort</button>
    </div></header>
    <div className="map-viewport"><svg ref={svgRef} viewBox={`${view.x - width / view.zoom / 2} ${view.z - height / view.zoom / 2} ${width / view.zoom} ${height / view.zoom}`} role="img" aria-label="Tannwald mit Höhenlinien, Wäldern, Gewässern, Straßen, Gebäuden, Unterschlüpfen, bekannten Gesprächspartnern, Standort und Missionsziel" tabIndex={0}
      onKeyDown={event => {
        if (['+', '=', '-', 'Home', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); }
        if (event.key === '+' || event.key === '=') zoom(1.3); else if (event.key === '-') zoom(1 / 1.3); else if (event.key === 'Home') setView(overview);
        else if (event.key.startsWith('Arrow')) setView(old => bounded({ ...old, x: old.x + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0) * 60 / old.zoom, z: old.z + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0) * 60 / old.zoom }));
      }}
      onPointerDown={event => { if (event.button !== 0) return; const matrix = event.currentTarget.getScreenCTM(); if (!matrix) return; event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, view, scaleX: matrix.a, scaleY: matrix.d }; }}
      onPointerMove={event => { const start = drag.current; if (start?.pointer === event.pointerId) setView(bounded({ ...start.view, x: start.view.x - (event.clientX - start.x) / start.scaleX, z: start.view.z - (event.clientY - start.y) / start.scaleY })); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      <defs>
        <pattern id="map-grid" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M200 0H0V200" fill="none" stroke="#7e8171" strokeWidth=".6" opacity=".25" /></pattern>
        <pattern id="map-woods" width="18" height="19" patternUnits="userSpaceOnUse"><circle cx="4" cy="5" r="1" fill="#788468" opacity=".24" /><circle cx="13" cy="14" r=".8" fill="#788468" opacity=".2" /></pattern>
        <pattern id="map-crops" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(25)"><path d="M0 0V9" stroke="#a19d7d" strokeWidth=".5" opacity=".35" /></pattern>
        <clipPath id="map-bounds"><rect x={WORLD.minX} y={WORLD.minZ} width={width} height={height} /></clipPath>
      </defs>
      <g clipPath="url(#map-bounds)">
        <rect x={WORLD.minX} y={WORLD.minZ} width={width} height={height} fill="#e8e3d3" />
        <path data-map-forest d={survey.forest} fill="#c2ccb0" fillRule="evenodd" /><path d={survey.forest} fill="url(#map-woods)" fillRule="evenodd" />
        {FIELDS.map(f => <g key={f.id}><rect x={f.x - f.hx} y={f.z - f.hz} width={f.hx * 2} height={f.hz * 2} fill={['#ded7b7', '#d8d4b5', '#e0d9bf'][f.crop]} stroke="#b8b295" strokeWidth=".8" /><rect x={f.x - f.hx} y={f.z - f.hz} width={f.hx * 2} height={f.hz * 2} fill="url(#map-crops)" /></g>)}
        {SETTLEMENT_AREAS.map(a => <path key={a.zone} d={a.path} fill="#d6d1c4" opacity=".65" />)}
        <g fill="none" stroke="#a69b7c">{survey.contours.map(c => <path key={c.height} data-map-contour={c.height} d={c.path} strokeWidth={c.height % 10 === 0 ? .65 : .4} opacity={c.height % 10 === 0 ? .48 : .3} />)}</g>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">{WATER_LINES.map(w => <path key={w.id} data-map-water={w.id} d={mapPath(w.samples)} stroke="#91afb2" strokeWidth={w.width} />)}</g>
        {LAKES.map(l => <ellipse key={l.id} cx={l.x} cy={l.z} rx={l.rx} ry={l.rz} fill="#a5bec0" stroke="#819fa2" strokeWidth="1" />)}
        <rect x={WORLD.minX} y={WORLD.minZ} width={width} height={height} fill="url(#map-grid)" />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {STREET_LINES.filter(r => r.kind !== 'forest' && r.kind !== 'field').map(r => <path key={r.id} d={mapPath(r.samples)} stroke="#a49b89" strokeWidth={r.width + 2} />)}
          {STREET_LINES.map(r => <path key={r.id} data-map-road={r.id} d={mapPath(r.samples)} stroke={r.kind === 'forest' || r.kind === 'field' ? '#9e8c6c' : '#faf7ea'} strokeWidth={r.kind === 'forest' || r.kind === 'field' ? Math.max(r.width, 1.1 * unit) : r.width} strokeDasharray={r.kind === 'forest' || r.kind === 'field' ? '7 5' : undefined} />)}
        </g>
        {BRIDGES.map(b => <rect key={b.id} x={b.x - b.width / 2} y={b.z - b.length / 2} width={b.width} height={b.length} fill="#f4ecda" stroke="#817967" strokeWidth="1" transform={`rotate(${-b.rotation * 180 / Math.PI} ${b.x} ${b.z})`}><title>Brücke</title></rect>)}
        <g fill="#999387" stroke="#736f65" strokeWidth=".5">
          {STRUCTURES.map(b => <rect key={b.id} x={b.x - b.width / 2} y={b.z - b.depth / 2} width={b.width} height={b.depth} transform={`rotate(${-b.rotation * 180 / Math.PI} ${b.x} ${b.z})`} />)}
          {buildings.filter(b => !regionalPositions.has(`${b.x},${b.z}`)).map((b, i) => <rect key={i} x={b.x - b.hx} y={b.z - b.hz} width={b.hx * 2} height={b.hz * 2} />)}
          {CITY_PLACES.map(p => <rect key={p.id} x={p.x - (p.hx ?? 7.5)} y={p.z - (p.hz ?? 7)} width={(p.hx ?? 7.5) * 2} height={(p.hz ?? 7) * 2} fill={visited.includes(p.id) ? '#808977' : undefined}><title>{placeName(p.name)}{visited.includes(p.id) ? ' · erkundet' : ''}</title></rect>)}
        </g>
        {view.zoom < 4 && <g className="map-land-label" fontSize={11 * unit}><text x="-480" y="-945" textAnchor="middle">H O C H F O R S T</text><text x="-500" y="875" textAnchor="middle">S Ü D L I C H E R   T A N N W A L D</text><text x="-970" y="110" textAnchor="middle">Westliche Weiden</text><text x="900" y="-290" transform="rotate(78 900 -290)" className="map-water-label">Aue</text></g>}
        {labels.map(l => <text key={l.id} data-map-label={l.id} x={l.x} y={l.z} textAnchor="middle" fontSize={(l.kind === 'town' ? 12 : 10) * unit} strokeWidth={2.5 * unit} className={`map-place-label ${l.kind}`}>{l.text}</text>)}
        {REFUGES.map(r => <g key={r.id} data-map-refuge={r.id} role="img" aria-label={`${r.name} · Gesicherter Unterschlupf`} transform={`translate(${r.x + r.hx} ${r.z - r.hz}) scale(${unit})`}><title>{r.name} · Gesicherter Unterschlupf</title><path d="M-7 0L0-6 7 0V8H-7Z" fill="#64775a" stroke="#faf6e8" strokeWidth="1.5" /><path d="M-3 3L-1 5 3 1" fill="none" stroke="#fffdf4" strokeWidth="1.3" /></g>)}
        {SAFEHOUSES.map(h => <g key={h.id} data-map-house={h.id} data-secured={houseSecured(houses[h.id])} role="img" aria-label={`${h.name} · ${houseStatus(h)}${respawn === h.id ? ' · Respawnpunkt' : ''}`} transform={`translate(${h.x + 9} ${h.z - 9}) scale(${unit})`}><title>{h.name} · {houseStatus(h)}{respawn === h.id ? ' · Respawnpunkt' : ''}</title><path d="M-7 0L0-6 7 0V8H-7Z" fill={houseSecured(houses[h.id]) ? '#64775a' : '#a39579'} stroke={houseSecured(houses[h.id]) && !houseProtected(houses[h.id]) ? '#b58b4c' : '#faf6e8'} strokeWidth="1.5" />{respawn === h.id ? <text y="6" textAnchor="middle" fontSize="8" fill="#fffdf4">R</text> : houseSecured(houses[h.id]) && <path d="M-3 3L-1 5 3 1" fill="none" stroke="#fffdf4" strokeWidth="1.3" />}</g>)}
        {npcs.map(npc => <g key={npc.id} data-map-npc={npc.id} role="img" aria-label={`${npc.name} · Bereits gesprochen`} transform={`translate(${npc.x} ${npc.z}) scale(${unit})`}><title>{npc.name} · Bereits gesprochen</title><path d="M-6-8H6V2H1L-3 6V2H-6Z" fill="#737265" stroke="#faf6e8" strokeWidth="1.3" /><circle cy="-3" r="1.5" fill="#faf6e8" /></g>)}
        <g data-map-target transform={`translate(${target.x} ${target.z}) scale(${unit})`}><title>Aktuelles Missionsziel</title><path d="M0-8L7 0 0 8-7 0Z" fill="#a16e45" stroke="#fffdf4" strokeWidth="2" /></g>
        <g data-map-player transform={`translate(${player.x} ${player.z}) scale(${unit})`}><title>Dein Standort</title><circle r="7" fill="#faf7eb" stroke="#496773" strokeWidth="1.5" /><circle r="3.5" fill="#496773" /></g>
        <rect x={WORLD.minX + 1} y={WORLD.minZ + 1} width={width - 2} height={height - 2} fill="none" stroke="#9d9a87" strokeWidth="1" />
      </g>
    </svg><div className="map-compass" aria-label="Norden liegt oben">N<span>↑</span></div><div className="map-scale" aria-label={`Maßstabsleiste ${scaleLabel}`}><span style={{ width: scaleLength / unit }} /><small>0</small><small>{scaleLabel}</small></div><span className="map-sheet">TANNWALD / 07</span></div>
    <footer className="map-caption"><span><i className="map-dot player" />Du</span><span><i className="map-dot target" />Ziel</span><span><i className="map-dot refuge" />Unterschlupf</span><span><i className="map-dot npc" />Kontakt</span><span className="map-help">Mausrad: Zoom · Ziehen: Verschieben</span></footer>
    <details className="map-directory-details"><summary>Unterschlüpfe & Kontakte <span>{REFUGES.length + securedHouses.length + npcs.length}</span></summary><div className="map-directory">
      <section aria-label="Gesicherte Unterschlüpfe"><h4>Gesicherte Unterschlüpfe <span>{REFUGES.length + securedHouses.length}</span></h4><div>{REFUGES.map(r => <button key={r.id} type="button" onClick={() => focusPlace(r)}><i className="map-dot refuge" /><span>{r.name}<small>Bewachter Unterschlupf</small></span></button>)}{securedHouses.map(h => <button key={h.id} type="button" onClick={() => focusPlace(h)}><i className="map-dot refuge" /><span>{h.name}<small>{houseStatus(h)}{respawn === h.id ? ' · Respawnpunkt' : ''}</small></span></button>)}</div></section>
      <section aria-label="Bekannte Gesprächspartner"><h4>Gesprächspartner <span>{npcs.length}</span></h4><div>{npcs.map(npc => <button key={npc.id} type="button" onClick={() => focusPlace(npc)}><i className="map-dot npc" /><span>{npc.name}<small>Auf Karte zeigen</small></span></button>)}{!npcs.length && <p>Noch keine Gespräche geführt.</p>}</div></section>
    </div></details>
  </section>;
}
