import { Species } from '@/data/species';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';

interface SpeciesCardProps {
  species: Species;
  onClick: () => void;
}

const SpeciesCard = ({ species, onClick }: SpeciesCardProps) => {
  const rarityColors = {
    common: 'bg-primary/10 text-primary',
    uncommon: 'bg-secondary/10 text-secondary',
    rare: 'bg-accent/10 text-accent'
  };

  return (
    <Card 
      className="overflow-hidden cursor-pointer transition-all hover:shadow-medium hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        <img 
          src={species.imageUrl} 
          alt={species.name}
          className="w-full h-full object-cover transition-transform hover:scale-105"
        />
        <Badge 
          className={cn(
            "absolute top-3 right-3 capitalize",
            rarityColors[species.rarity]
          )}
        >
          {species.rarity}
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg text-foreground mb-1">
          {species.name}
        </h3>
        <p className="text-sm text-muted-foreground italic mb-2">
          {species.scientificName}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="capitalize">
            {species.category}
          </Badge>
          <span>•</span>
          <span>{species.region}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpeciesCard;
