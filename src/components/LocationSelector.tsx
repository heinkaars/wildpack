import { MapPin } from 'lucide-react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface LocationSelectorProps {
  currentRegion: string;
  onRegionChange: (region: string) => void;
  useLocation: boolean;
  onToggleLocation: () => void;
}

const regions = [
  'All Regions',
  'North America',
  'Europe',
  'Asia',
  'South America',
  'Africa',
  'Australia'
];

const LocationSelector = ({
  currentRegion,
  onRegionChange,
  useLocation,
  onToggleLocation
}: LocationSelectorProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <Button
        variant={useLocation ? 'default' : 'outline'}
        onClick={onToggleLocation}
        className="flex items-center gap-2"
      >
        <MapPin className="w-4 h-4" />
        {useLocation ? 'Near Me' : 'Use My Location'}
      </Button>
      
      <Select value={currentRegion} onValueChange={onRegionChange}>
        <SelectTrigger className="sm:w-[200px]">
          <SelectValue placeholder="Select region" />
        </SelectTrigger>
        <SelectContent>
          {regions.map((region) => (
            <SelectItem key={region} value={region}>
              {region}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LocationSelector;
