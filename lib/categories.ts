export type Category = {
  id: string;
  label: string;
};

export const CATEGORIES: Category[] = [
  { id: 'songbirds', label: 'Songbirds' },
  { id: 'raptors', label: 'Raptors' },
  { id: 'insects', label: 'Insects' },
  { id: 'trees', label: 'Trees' },
  { id: 'mammals', label: 'Mammals' },
];

export function categoryById(id: string): Category | null {
  return CATEGORIES.find((category) => category.id === id) ?? null;
}
