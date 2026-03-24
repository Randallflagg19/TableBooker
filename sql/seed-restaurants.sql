

-- RESTAURANTS

INSERT INTO restaurants (name, slug)
VALUES
  ('Pizza House', 'pizza-house'),
  ('Steak Bar', 'steak-bar');



-- TABLES FOR PIZZA HOUSE

INSERT INTO restaurant_tables (restaurant_id, code, capacity, kind)
VALUES
  (
    (SELECT id FROM restaurants WHERE slug = 'pizza-house'),
    'T1',
    2,
    'REGULAR'
  ),
  (
    (SELECT id FROM restaurants WHERE slug = 'pizza-house'),
    'T2',
    4,
    'REGULAR'
  ),
  (
    (SELECT id FROM restaurants WHERE slug = 'pizza-house'),
    'T3',
    8,
    'SHARED'
  );



-- TABLES FOR STEAK BAR

INSERT INTO restaurant_tables (restaurant_id, code, capacity, kind)
VALUES
  (
    (SELECT id FROM restaurants WHERE slug = 'steak-bar'),
    'S1',
    2,
    'REGULAR'
  ),
  (
    (SELECT id FROM restaurants WHERE slug = 'steak-bar'),
    'S2',
    6,
    'REGULAR'
  ),
  (
    (SELECT id FROM restaurants WHERE slug = 'steak-bar'),
    'S3',
    10,
    'SHARED'
  );
