'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { ITEMS, type Inventory } from './world';
import { WEAPONS, type WeaponKind, type freshArsenal } from './survival';
import { inventoryItemColor, inventoryItemCount, inventoryItemName, isWeaponItem, type InventoryItem, type InventoryLayout, type InventorySlot } from './inventory';

const ICONS: Record<InventoryItem, string> = {
  medkit: 'M7 4h10v16H7z M12 8v8 M9 12h6',
  ration: 'M5 6h14l-1 14H6z M8 6V3h8v3 M9 11h6 M9 15h6',
  battery: 'M9 3h6v3 M7 6h10v15H7z M12 9v8 M10 11h4',
  flare: 'm6 21 7-12 4 2-7 12 M15 7l-1-4 M18 8l3-2 M19 12h3',
  scrap: 'm14 5-3 3 5 5 3-3a6 6 0 0 1-7 8L6 23l-4-4 5-6a6 6 0 0 1 7-8Z',
  water: 'M10 2h4v4l3 4v11H7V10l3-4z M7 13h10 M10 2v4h4',
  antibiotic: 'm8 4 12 12a4 4 0 0 1-6 6L2 10a4 4 0 0 1 6-6Z M8 16l6-6',
  armor: 'm8 3 4 2 4-2 4 5-3 3v10H7V11L4 8z M12 5v16 M8 14h8',
  planks: 'm3 7 16-4 2 5-16 4z M4 15l16-4 2 5-16 4z',
  pistol: 'M3 5h18v6H10l-1 9H4l2-9H3z M14 11v4h-4',
  shotgun: 'm2 6 20 4v3L9 11l-4 7H1l4-8 M12 9v5',
  rifle: 'M2 8h20v4H12l-2 7H6l1-7H2z M15 6v2 M18 12v4 M3 8V6',
  axe: 'm5 22 10-17 M12 4l5-2 5 5-6 4z',
};

export function ItemIcon({ item }: { item: InventoryItem }) {
  return <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[item]} /></svg>;
}

type Props = {
  layout: InventoryLayout; inventory: Inventory; arsenal: ReturnType<typeof freshArsenal>; weapon: WeaponKind;
  onMove: (from: InventorySlot, to: InventorySlot) => void; onUse: (item: InventoryItem) => void;
};

export default function InventoryPanel({ layout, inventory, arsenal, weapon, onMove, onUse }: Props) {
  const [selected, setSelected] = useState<InventorySlot | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const dragged = useRef<InventorySlot | null>(null);
  const selectedItem = selected ? layout[selected.area][selected.index] : null;
  const transfer = (from: InventorySlot, to: InventorySlot) => {
    const item = layout[from.area][from.index];
    if (!item) return;
    onMove(from, to); setSelected(null); setOver(null);
    setMessage(`${inventoryItemName(item)} → ${to.area === 'hotbar' ? 'Hotbar' : 'Rucksack'} ${to.index + 1}`);
  };
  const clickSlot = (slot: InventorySlot) => {
    if (selected && selectedItem) {
      if (selected.area === slot.area && selected.index === slot.index) setSelected(null);
      else transfer(selected, slot);
    } else if (layout[slot.area][slot.index]) setSelected(slot);
  };
  const renderSlot = (area: InventorySlot['area'], item: InventoryItem | null, index: number) => {
    const slot = { area, index }, id = `${area}-${index}`;
    const active = selected?.area === area && selected.index === index;
    return <button type="button" key={id} data-slot={id} data-item={item ?? ''}
      className={`inventory-slot ${item ? '' : 'vacant'} ${active ? 'selected' : ''} ${over === id ? 'drop-target' : ''} ${item === weapon ? 'equipped' : ''}`}
      style={{ '--item-color': item ? inventoryItemColor(item) : '#53645a' } as CSSProperties}
      aria-label={`${area === 'hotbar' ? 'Hotbar' : 'Rucksack'} ${index + 1}: ${item ? `${inventoryItemName(item)} ×${inventoryItemCount(item, inventory, arsenal)}` : 'Leer'}`}
      aria-pressed={active} draggable={!!item} onClick={() => clickSlot(slot)}
      onDragStart={event => { dragged.current = slot; setSelected(slot); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); }}
      onDragOver={event => { if (dragged.current) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(id); } }}
      onDragLeave={() => setOver(null)} onDrop={event => { event.preventDefault(); if (dragged.current) transfer(dragged.current, slot); dragged.current = null; }}
      onDragEnd={() => { dragged.current = null; setOver(null); }}>
      <span className="slot-number">{area === 'hotbar' ? <kbd>{index + 1}</kbd> : String(index + 1).padStart(2, '0')}</span>
      {item ? <><ItemIcon item={item} /><strong>{inventoryItemName(item)}</strong><span className="slot-count">{isWeaponItem(item) ? (item === weapon ? 'AUSGERÜSTET' : 'WAFFE') : `×${inventory[item]}`}</span></> : <><span className="slot-placeholder">+</span><strong>Leer</strong></>}
    </button>;
  };

  return <div className="inventory-manager" onKeyDown={event => {
    if (selected && selectedItem && /^[1-5]$/.test(event.key) && !event.repeat) { event.preventDefault(); transfer(selected, { area: 'hotbar', index: Number(event.key) - 1 }); }
  }}>
    <div className="inventory-workspace">
      <section className="inventory-hotbar" aria-label="Hotbar verwalten"><header><div><p className="eyebrow">SCHNELLZUGRIFF</p><h3>Deine Hotbar</h3></div><span>5 Plätze · Tasten 1–5</span></header><div className="inventory-grid hotbar-grid">{layout.hotbar.map((item, i) => renderSlot('hotbar', item, i))}</div></section>
      <section className="inventory-backpack" aria-label="Rucksack verwalten"><header><div><p className="eyebrow">ALLES DABEI</p><h3>Rucksack</h3></div><span>{layout.backpack.filter(Boolean).length} / {layout.backpack.length} Plätze</span></header><div className="inventory-grid backpack-grid">{layout.backpack.map((item, i) => renderSlot('backpack', item, i))}</div></section>
      <p className="inventory-help">Ziehen & ablegen oder Gegenstand und Zielplatz anklicken. Belegte Plätze werden getauscht. Nach der Auswahl legt 1–5 den Gegenstand in die Hotbar.</p>
      <p className="inventory-feedback" role="status">{message || 'Neue Funde landen im Rucksack. Deine Hotbar belegst du selbst.'}</p>
    </div>
    <aside className="inventory-inspector" aria-label="Gegenstandsdetails">
      {selectedItem ? <><div className="inspector-icon" style={{ color: inventoryItemColor(selectedItem) }}><ItemIcon item={selectedItem} /></div><p className="eyebrow">{isWeaponItem(selectedItem) ? 'WAFFE' : 'VORRAT'}</p><h3>{inventoryItemName(selectedItem)}</h3><p>{isWeaponItem(selectedItem) ? selectedItem === 'axe' ? 'Nahkampf · 20 Ausdauer · 2,6 m Reichweite' : `${WEAPONS[selectedItem].ammo} · ${arsenal[selectedItem].ammo} im Magazin · ${arsenal[selectedItem].reserve} in Reserve` : ITEMS[selectedItem].purpose}</p>
        <button type="button" className="inventory-use" onClick={() => onUse(selectedItem)}>{isWeaponItem(selectedItem) ? 'Ausrüsten' : 'Benutzen'}</button>
        <p>In die Hotbar legen / Platz tauschen:</p><div className="inventory-assign">{layout.hotbar.map((_, index) => <button type="button" key={index} aria-label={`Auf Hotbar-Platz ${index + 1} legen`} onClick={() => selected && transfer(selected, { area: 'hotbar', index })}>{index + 1}</button>)}</div>
        {selected?.area === 'hotbar' && <button type="button" className="inventory-stow" onClick={() => { const index = layout.backpack.indexOf(null); if (index >= 0) transfer(selected, { area: 'backpack', index }); }}>In den Rucksack</button>}
        <button type="button" className="inventory-deselect" onClick={() => setSelected(null)}>Auswahl aufheben</button>
      </> : <><div className="inspector-empty">↖</div><h3>Deine Ausrüstung.<br />Deine Reihenfolge.</h3><p>Wähle eine Waffe oder einen Vorrat aus, um Details zu sehen, ihn zu benutzen oder frei zu verschieben.</p><p>Ziehe einen Gegenstand aus der Hotbar zurück in den Rucksack, um den Platz freizumachen.</p></>}
      <div className="inventory-ammunition"><p className="eyebrow">MUNITIONSRESERVE</p><p>9 mm <b>{arsenal.pistol.reserve}</b></p><p>12/70 <b>{arsenal.shotgun.reserve}</b></p><p>5.56 mm <b>{arsenal.rifle.reserve}</b></p></div>
      <p className="inventory-help">E sammelt Vorräte und verwendet Baumaterial am Bauort. Q wechselt Waffen · R lädt nach.</p>
    </aside>
  </div>;
}
