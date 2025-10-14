import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { speciesData } from '@/data/species';
import SpeciesCard from '@/components/SpeciesCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSpecies = speciesData.filter(species =>
    species.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    species.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground">
        <h1 className="text-3xl font-bold mb-2">Explore Wildlife</h1>
        <p className="text-primary-foreground/90">Discover species in your area</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search species..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpecies.map((species) => (
            <SpeciesCard
              key={species.id}
              species={species}
              onClick={() => navigate(`/species/${species.id}`)}
            />
          ))}
        </div>

        {filteredSpecies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No species found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
