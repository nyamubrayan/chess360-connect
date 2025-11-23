-- Add input validation constraints to prevent abuse and storage exhaustion

-- Game chat messages: limit to 500 characters
ALTER TABLE game_chat_messages 
ADD CONSTRAINT message_length_check 
CHECK (char_length(message) > 0 AND char_length(message) <= 500);

-- Events table: add reasonable length limits
ALTER TABLE events 
ADD CONSTRAINT title_length_check 
CHECK (char_length(title) > 0 AND char_length(title) <= 200);

ALTER TABLE events 
ADD CONSTRAINT description_length_check 
CHECK (char_length(description) <= 5000);

ALTER TABLE events 
ADD CONSTRAINT location_length_check 
CHECK (location IS NULL OR char_length(location) <= 300);

-- News articles: add reasonable length limits
ALTER TABLE news_articles 
ADD CONSTRAINT title_length_check 
CHECK (char_length(title) > 0 AND char_length(title) <= 300);

ALTER TABLE news_articles 
ADD CONSTRAINT content_length_check 
CHECK (char_length(content) > 0 AND char_length(content) <= 50000);