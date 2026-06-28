
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

ALTER VIEW public.game_history SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.get_game_category(p_time_control integer, p_time_increment integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  IF p_time_control < 3 THEN
    RETURN 'bullet';
  ELSIF p_time_control < 10 THEN
    RETURN 'blitz';
  ELSE
    RETURN 'rapid';
  END IF;
END;
$function$;
