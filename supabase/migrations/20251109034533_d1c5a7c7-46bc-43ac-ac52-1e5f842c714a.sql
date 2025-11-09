-- Add subcategory column to r90_ratings table
ALTER TABLE r90_ratings ADD COLUMN subcategory TEXT;

-- Update On-Ball Decision-Making ratings with subcategories
UPDATE r90_ratings 
SET subcategory = 'Under Pressure' 
WHERE category = 'On-Ball Decision-Making' 
AND title LIKE 'Under Pressure%';

UPDATE r90_ratings 
SET subcategory = 'In Space' 
WHERE category = 'On-Ball Decision-Making' 
AND title LIKE 'In Space%';

-- Update Attacking Crosses ratings with subcategories
UPDATE r90_ratings 
SET subcategory = 'Ground Delivery' 
WHERE category = 'Attacking Crosses' 
AND title LIKE 'Ground Delivery%';

UPDATE r90_ratings 
SET subcategory = 'Aerial Delivery' 
WHERE category = 'Attacking Crosses' 
AND title LIKE 'Aerial Delivery%';

UPDATE r90_ratings 
SET subcategory = 'Second Balls' 
WHERE category = 'Attacking Crosses' 
AND title LIKE 'Second Balls%';

-- Update Defensive ratings with subcategories based on context
UPDATE r90_ratings 
SET subcategory = 'Delay and Contain' 
WHERE category = 'Defensive' 
AND title LIKE 'Delay and Contain%';

UPDATE r90_ratings 
SET subcategory = 'Force Lateral Pass' 
WHERE category = 'Defensive' 
AND title LIKE 'Force Lateral Pass%';

UPDATE r90_ratings 
SET subcategory = 'Tackle and Win Ball' 
WHERE category = 'Defensive' 
AND title LIKE 'Win Tackle%';

UPDATE r90_ratings 
SET subcategory = 'Intercept and Block' 
WHERE category = 'Defensive' 
AND (title LIKE 'Intercept%' OR title LIKE 'Block Shot%');

UPDATE r90_ratings 
SET subcategory = 'Clear and Recover' 
WHERE category = 'Defensive' 
AND (title LIKE 'Clear Under%' OR title LIKE 'Recover Possession%');

UPDATE r90_ratings 
SET subcategory = 'Fouls' 
WHERE category = 'Defensive' 
AND title LIKE 'Commit Foul%';

UPDATE r90_ratings 
SET subcategory = 'Positioning' 
WHERE category = 'Defensive' 
AND title LIKE 'Fill Into Line%';

-- Update Pressing ratings with subcategories
UPDATE r90_ratings 
SET subcategory = 'Counterattacks' 
WHERE category = 'Pressing' 
AND title LIKE 'Counterattacks%';

UPDATE r90_ratings 
SET subcategory = 'Regain Possession' 
WHERE category = 'Pressing' 
AND title LIKE 'Regain Controlled%';

UPDATE r90_ratings 
SET subcategory = 'Force Backwards' 
WHERE category = 'Pressing' 
AND title LIKE 'Forced Backwards%';

-- Update Aerial Duels ratings with subcategories
UPDATE r90_ratings 
SET subcategory = 'Counterattack Start' 
WHERE category = 'Aerial Duels' 
AND title LIKE '%Counterattack Start%';

UPDATE r90_ratings 
SET subcategory = 'Regain Possession' 
WHERE category = 'Aerial Duels' 
AND title LIKE '%Regain Controlled%';

UPDATE r90_ratings 
SET subcategory = 'Force Backwards' 
WHERE category = 'Aerial Duels' 
AND title LIKE '%Forced Backwards%';

-- Update Off-Ball Movement ratings with subcategories based on vertical zones
UPDATE r90_ratings 
SET subcategory = 'In Front of Midfield' 
WHERE category = 'Off-Ball Movement' 
AND title LIKE 'In Front of Midfield%';

UPDATE r90_ratings 
SET subcategory = 'Between Lines' 
WHERE category = 'Off-Ball Movement' 
AND title LIKE 'Between Lines%';

UPDATE r90_ratings 
SET subcategory = 'On Last Line' 
WHERE category = 'Off-Ball Movement' 
AND title LIKE 'On Last Line%';

UPDATE r90_ratings 
SET subcategory = 'In Behind' 
WHERE category = 'Off-Ball Movement' 
AND title LIKE 'In Behind%';