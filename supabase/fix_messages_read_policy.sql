-- Политика для обновления статуса прочитанности сообщений
-- Пользователи могут обновлять поле read для сообщений в своих чатах
CREATE POLICY "Users can mark messages as read in own chats" ON public.messages
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

