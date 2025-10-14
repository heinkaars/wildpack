import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const CATEGORIES = [
  { id: 'bird', label: 'Birds' },
  { id: 'mammal', label: 'Mammals' },
  { id: 'reptile', label: 'Reptiles' },
  { id: 'amphibian', label: 'Amphibians' },
  { id: 'insect', label: 'Insects' },
  { id: 'fish', label: 'Fish' },
  { id: 'arachnid', label: 'Arachnids' },
  { id: 'plant', label: 'Plants' },
  { id: 'fungus', label: 'Fungi' },
];

const REGIONS = [
  'All Regions',
  'North America',
  'Europe',
  'Asia',
  'Africa',
  'South America',
  'Australia',
  'Antarctica',
];

interface FilterMenuProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  maxDistance: number;
  onDistanceChange: (distance: number) => void;
  useLocation: boolean;
}

export const FilterMenu = ({
  selectedCategories,
  onCategoriesChange,
  selectedRegion,
  onRegionChange,
  maxDistance,
  onDistanceChange,
  useLocation,
}: FilterMenuProps) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoriesChange(selectedCategories.filter(c => c !== categoryId));
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const resetFilters = () => {
    onCategoriesChange([]);
    onRegionChange('All Regions');
    onDistanceChange(5);
  };

  const activeFilterCount = 
    selectedCategories.length + 
    (selectedRegion !== 'All Regions' ? 1 : 0);

  const FilterContent = () => (
    <div className="space-y-6 py-4">
      <div className="space-y-3">
        <Label className="text-base font-semibold">Wildlife Type</Label>
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={category.id}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <Label
                htmlFor={category.id}
                className="text-sm font-normal cursor-pointer"
              >
                {category.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {!useLocation && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">Region</Label>
          <Select value={selectedRegion} onValueChange={onRegionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {useLocation && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Distance: {maxDistance} km
          </Label>
          <Slider
            value={[maxDistance]}
            onValueChange={(value) => onDistanceChange(value[0])}
            min={5}
            max={1000}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Search radius for nearby species
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={resetFilters}
        >
          Reset All
        </Button>
        <Button
          className="flex-1"
          onClick={() => setIsOpen(false)}
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );

  const TriggerButton = () => (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => setIsOpen(true)}
    >
      <SlidersHorizontal className="h-5 w-5" />
      {activeFilterCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
          {activeFilterCount}
        </span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <TriggerButton />
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <FilterContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <TriggerButton />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>
        <FilterContent />
      </DialogContent>
    </Dialog>
  );
};
