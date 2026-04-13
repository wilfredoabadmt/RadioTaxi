-- RadioTaxi relational schema for PostgreSQL + PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  company_type TEXT NOT NULL,
  nit TEXT,
  commerce_registry TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  role_id INT REFERENCES roles(id) NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  brand TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'libre',
  current_location GEOGRAPHY(POINT, 4326)
);

CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) NOT NULL,
  vehicle_id INT REFERENCES vehicles(id),
  license_number TEXT,
  status TEXT NOT NULL DEFAULT 'available'
);
