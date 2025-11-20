-- Fix the friends table UPDATE policy to allow accepting requests
DROP POLICY IF EXISTS "Users can update friend requests" ON public.friends;

CREATE POLICY "Users can update friend requests" 
ON public.friends 
FOR UPDATE 
USING (
  -- Allow the recipient (friend_id) to update pending requests
  auth.uid() = friend_id
);

-- Also ensure users can update their own sent requests (to cancel them)
CREATE POLICY "Users can update their sent requests"
ON public.friends
FOR UPDATE
USING (
  -- Allow the sender (user_id) to update their own requests
  auth.uid() = user_id
);