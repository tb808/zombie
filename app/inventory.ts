import { ITEMS, type Inventory, type ItemKind } from './world.ts';
import { WEAPONS, type WeaponKind, type freshArsenal } from './survival.ts';

export const HOTBAR_SIZE = 5;
export const BACKPACK_SIZE = 20;
export type InventoryItem = ItemKind | WeaponKind;
export type InventoryLayout = { backpack: (InventoryItem | null)[]; hotbar: (InventoryItem | null)[] };
export type InventorySlot = { area: keyof InventoryLayout; index: number };
type Arsenal = ReturnType<typeof freshArsenal>;

export const isWeaponItem = (item: InventoryItem): item is WeaponKind => Object.hasOwn(WEAPONS, item);
export const inventoryItemName = (item: InventoryItem) => isWeaponItem(item) ? WEAPONS[item].name : ITEMS[item].name;
// Quiet inks for the interface; world pickups retain their own material colours.
const ITEM_INKS: Record<ItemKind, string> = {
  medkit: '#a66f61', ration: '#a18a60', battery: '#718b86', flare: '#aa805d',
  scrap: '#8a8b7e', water: '#708c9a', antibiotic: '#8b8097', armor: '#7c8d71', planks: '#9b8464',
};
export const inventoryItemColor = (item: InventoryItem) => isWeaponItem(item) ? '#a7aa97' : ITEM_INKS[item];
export const inventoryItemCount = (item: InventoryItem, inventory: Inventory, arsenal: Arsenal) => isWeaponItem(item) ? Number(arsenal[item].owned) : inventory[item];
const availableItems = (inventory: Inventory, arsenal: Arsenal): InventoryItem[] => [
  ...(Object.keys(WEAPONS) as WeaponKind[]).filter(item => arsenal[item].owned),
  ...(Object.keys(ITEMS) as ItemKind[]).filter(item => inventory[item] > 0),
];

// Counts remain in the existing gameplay inventory; each stack/weapon has one
// movable position. New pickups enter the backpack, never overwrite the hotbar.
export function syncInventoryLayout(layout: InventoryLayout, inventory: Inventory, arsenal: Arsenal): InventoryLayout {
  const available = new Set(availableItems(inventory, arsenal)), seen = new Set<InventoryItem>();
  const keep = (item: InventoryItem | null) => {
    if (item === null || !available.has(item) || seen.has(item)) return null;
    seen.add(item); return item;
  };
  const hotbar = layout.hotbar.map(keep), backpack = layout.backpack.map(keep);
  for (const item of available) if (!seen.has(item)) {
    const free = backpack.indexOf(null);
    if (free >= 0) backpack[free] = item;
  }
  return { backpack, hotbar };
}

export function newInventoryLayout(inventory: Inventory, arsenal: Arsenal): InventoryLayout {
  return syncInventoryLayout({ backpack: Array(BACKPACK_SIZE).fill(null), hotbar: ['pistol', 'axe', 'medkit', 'water', 'flare'] }, inventory, arsenal);
}

export function validInventorySlot(slot: InventorySlot): boolean {
  return !!slot && (slot.area === 'backpack' || slot.area === 'hotbar') && Number.isInteger(slot.index) && slot.index >= 0 && slot.index < (slot.area === 'hotbar' ? HOTBAR_SIZE : BACKPACK_SIZE);
}

export function moveInventoryItem(layout: InventoryLayout, from: InventorySlot, to: InventorySlot): InventoryLayout {
  if (!validInventorySlot(from) || !validInventorySlot(to) || layout[from.area][from.index] === null) return layout;
  const next = { backpack: [...layout.backpack], hotbar: [...layout.hotbar] };
  [next[from.area][from.index], next[to.area][to.index]] = [next[to.area][to.index], next[from.area][from.index]];
  return next;
}

export function validInventoryLayout(value: unknown, inventory: Inventory, arsenal: Arsenal): value is InventoryLayout {
  if (!value || typeof value !== 'object') return false;
  const layout = value as InventoryLayout;
  if (!Array.isArray(layout.backpack) || layout.backpack.length !== BACKPACK_SIZE || !Array.isArray(layout.hotbar) || layout.hotbar.length !== HOTBAR_SIZE) return false;
  const available = new Set(availableItems(inventory, arsenal));
  const placed = [...layout.backpack, ...layout.hotbar].filter(item => item !== null);
  return placed.length === available.size && new Set(placed).size === placed.length && placed.every(item => available.has(item));
}
