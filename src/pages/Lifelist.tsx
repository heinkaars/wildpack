import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface LifelistEntry {
  id: string;
  species_name: string;
  species_id: string;
  date_spotted: string;
  location: string | null;
  notes: string | null;
}

const Lifelist = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<LifelistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLifelist();
  }, []);

  const fetchLifelist = async () => {
    try {
      const { data, error } = await supabase
        .from('lifelist_entries')
        .select('*')
        .order('date_spotted', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching lifelist:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your lifelist',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lifelist_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(entries.filter(entry => entry.id !== id));
      toast({
        title: 'Removed',
        description: 'Entry removed from your lifelist'
      });
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove entry',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-24 bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading your lifelist...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground">
        <h1 className="text-3xl font-bold mb-2">My Lifelist</h1>
        <p className="text-primary-foreground/90">
          {entries.length} {entries.length === 1 ? 'species' : 'species'} spotted
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Your lifelist is empty. Start exploring to add species!
            </p>
            <Button onClick={() => navigate('/explore')}>
              Explore Wildlife
            </Button>
          </div>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 
                      className="font-semibold text-lg text-foreground mb-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => navigate(`/species/${entry.species_id}`)}
                    >
                      {entry.species_name}
                    </h3>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(entry.date_spotted), 'MMM d, yyyy')}</span>
                      </div>
                      
                      {entry.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{entry.location}</span>
                        </div>
                      )}
                      
                      {entry.notes && (
                        <p className="mt-2 text-foreground">{entry.notes}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteEntry(entry.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Lifelist;
