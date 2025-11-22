-- Fix foreign key relationships to reference profiles instead of auth.users
ALTER TABLE public.news_articles 
DROP CONSTRAINT news_articles_author_id_fkey,
ADD CONSTRAINT news_articles_author_id_fkey 
  FOREIGN KEY (author_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.events 
DROP CONSTRAINT events_organizer_id_fkey,
ADD CONSTRAINT events_organizer_id_fkey 
  FOREIGN KEY (organizer_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.event_participants 
DROP CONSTRAINT event_participants_user_id_fkey,
ADD CONSTRAINT event_participants_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;