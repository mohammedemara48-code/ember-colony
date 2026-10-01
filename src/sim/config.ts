import type { SimConfig } from './types';

export const DEFAULT_CONFIG: SimConfig = {
  gridW: 28,
  gridH: 28,
  tileSize: 28,
  citizenCount: 20,
  scenarioSeconds: 120,
  dayNightCycle: 40,
  generatorHeatRadius: 6,
  startingCoal: 80,
  startingWood: 40,
  startingFood: 35,
  ambientDay: -15,
  ambientNight: -35,
  coldSnapTemp: -55,
};

export function sid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
