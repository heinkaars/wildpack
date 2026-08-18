import { Milestone } from './types';

export const MILESTONES: Milestone[] = [
  { threshold: 1, label: 'First Sighting' },
  { threshold: 5, label: 'Budding Naturalist' },
  { threshold: 10, label: 'Field Tracker' },
  { threshold: 25, label: 'Wildlife Scout' },
  { threshold: 50, label: 'Pack Leader' },
  { threshold: 100, label: 'Apex Explorer' },
];

export function milestoneForCount(count: number): Milestone | null {
  return MILESTONES.find((m) => m.threshold === count) ?? null;
}

export function nextMilestone(count: number): Milestone | null {
  return MILESTONES.find((m) => m.threshold > count) ?? null;
}
