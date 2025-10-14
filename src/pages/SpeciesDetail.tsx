import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSpeciesById } from '@/data/species';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Plus, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SpeciesDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const species = id ? getSpeciesById(id) : undefined;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (species) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm here to answer any questions about the ${species.name}. What would you like to know?`
      }]);
    }
  }, [species]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!species) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Species not found</p>
          <Button onClick={() => navigate('/explore')}>Back to Explore</Button>
        </div>
      </div>
    );
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('species-chat', {
        body: {
          messages: [
            ...messages,
            { role: 'user', content: userMessage }
          ],
          speciesName: species.name,
          scientificName: species.scientificName
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addToLifelist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('lifelist_entries')
        .insert({
          species_name: species.name,
          species_id: species.id,
          location: location || null,
          notes: notes || null,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: 'Added!',
        description: `${species.name} added to your lifelist`
      });
      setAddDialogOpen(false);
      setLocation('');
      setNotes('');
    } catch (error) {
      console.error('Error adding to lifelist:', error);
      toast({
        title: 'Error',
        description: 'Failed to add to lifelist',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="relative h-64 overflow-hidden">
        <img 
          src={species.imageUrl} 
          alt={species.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/50 backdrop-blur-sm"
          onClick={() => navigate('/explore')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-10">
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {species.name}
              </h1>
              <p className="text-muted-foreground italic mb-3">
                {species.scientificName}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">
                  {species.category}
                </Badge>
                <Badge variant="outline">{species.region}</Badge>
                <Badge className="capitalize">{species.rarity}</Badge>
              </div>
            </div>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Lifelist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Lifelist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Location (optional)
                    </label>
                    <Input
                      placeholder="Where did you spot it?"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Notes (optional)
                    </label>
                    <Textarea
                      placeholder="Add any observations..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={addToLifelist} className="w-full">
                    Add to Lifelist
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Ask Me Anything</h2>
          
          <ScrollArea className="h-96 mb-4 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground rounded-lg p-3">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              placeholder="Ask about this species..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={loading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SpeciesDetail;
