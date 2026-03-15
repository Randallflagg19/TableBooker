CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUMS

CREATE TYPE table_kind AS ENUM (
  'REGULAR',
  'SHARED'
);

CREATE TYPE user_role AS ENUM (
  'GUEST',
  'ADMIN'
);

CREATE TYPE booking_status AS ENUM (
  'HOLD',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED'
);



-- RESTAURANTS

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



-- RESTAURANT TABLES

CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  kind table_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, code)
);



-- USERS

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT,
  role user_role NOT NULL DEFAULT 'GUEST',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (email IS NOT NULL AND btrim(email) <> '')
    OR
    (phone IS NOT NULL AND btrim(phone) <> '')
  )
);



-- BOOKINGS

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  guests INTEGER NOT NULL CHECK (guests > 0),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'HOLD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);