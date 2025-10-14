-- Create lifelist entries table
CREATE TABLE public.lifelist_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_name TEXT NOT NULL,
  species_id TEXT NOT NULL,
  date_spotted TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lifelist_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own lifelist entries" 
ON public.lifelist_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lifelist entries" 
ON public.lifelist_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lifelist entries" 
ON public.lifelist_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lifelist entries" 
ON public.lifelist_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_lifelist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lifelist_entries_updated_at
BEFORE UPDATE ON public.lifelist_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_lifelist_updated_at();