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
  password_hash TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cost_centers (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  budget_center TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE corporate_accounts (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) NOT NULL,
  client_company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  payment_terms TEXT,
  credit_limit NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  brand TEXT,
  model TEXT,
  year INT,
  vehicle_type TEXT,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'libre',
  gps_device_id TEXT,
  current_location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) NOT NULL,
  vehicle_id INT REFERENCES vehicles(id),
  license_number TEXT,
  license_expiry DATE,
  status TEXT NOT NULL DEFAULT 'available',
  experience_years INT,
  current_location GEOGRAPHY(POINT, 4326)
);

CREATE TABLE driver_documents (
  id SERIAL PRIMARY KEY,
  driver_id INT REFERENCES drivers(id) NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  issued_at DATE,
  expires_at DATE,
  file_url TEXT,
  verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE compliance_records (
  id SERIAL PRIMARY KEY,
  driver_id INT REFERENCES drivers(id) NOT NULL,
  company_id INT REFERENCES companies(id) NOT NULL,
  tic_number TEXT,
  cudap_number TEXT,
  nit TEXT,
  commerce_registry TEXT,
  valid_until DATE,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE trip_requests (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES users(id) NOT NULL,
  company_id INT REFERENCES companies(id),
  origin_address TEXT NOT NULL,
  origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendiente',
  requested_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  trip_request_id INT REFERENCES trip_requests(id) NOT NULL,
  driver_id INT REFERENCES drivers(id),
  vehicle_id INT REFERENCES vehicles(id),
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  distance_meters INT,
  duration_seconds INT,
  fare_total NUMERIC(12,2),
  fare_base NUMERIC(12,2),
  fare_distance NUMERIC(12,2),
  fare_time NUMERIC(12,2),
  fare_surcharges NUMERIC(12,2),
  discount NUMERIC(12,2),
  payment_method TEXT,
  corporate_cost_center_id INT REFERENCES cost_centers(id),
  billing_code TEXT
);

CREATE TABLE trip_segments (
  id SERIAL PRIMARY KEY,
  trip_id INT REFERENCES trips(id) NOT NULL,
  sequence INT NOT NULL,
  leg_origin_address TEXT NOT NULL,
  leg_origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
  leg_destination_address TEXT NOT NULL,
  leg_destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  leg_distance_meters INT,
  leg_duration_seconds INT
);

CREATE TABLE pricing_rules (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  base_fare NUMERIC(12,2) NOT NULL,
  km_rate NUMERIC(12,4) NOT NULL,
  minute_rate NUMERIC(12,4) NOT NULL,
  geofence_surcharge NUMERIC(12,2) DEFAULT 0,
  peak_multiplier NUMERIC(6,3) DEFAULT 1,
  toll_surcharge NUMERIC(12,2) DEFAULT 0,
  min_fare NUMERIC(12,2) DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE geofences (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  area GEOGRAPHY(POLYGON, 4326) NOT NULL,
  surcharge NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE trip_fares (
  id SERIAL PRIMARY KEY,
  trip_id INT REFERENCES trips(id) NOT NULL,
  rule_id INT REFERENCES pricing_rules(id),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  distance_meters INT,
  duration_seconds INT,
  fare_amount NUMERIC(12,2),
  notes TEXT
);

CREATE TABLE corporate_reservations (
  id SERIAL PRIMARY KEY,
  corporate_account_id INT REFERENCES corporate_accounts(id) NOT NULL,
  trip_request_id INT REFERENCES trip_requests(id) NOT NULL,
  reservation_status TEXT NOT NULL DEFAULT 'pending',
  trip_reason TEXT,
  cost_center_id INT REFERENCES cost_centers(id),
  estimated_cost NUMERIC(12,2)
);

CREATE TABLE corporate_reports (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) NOT NULL,
  report_type TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  generated_at TIMESTAMPTZ DEFAULT now(),
  file_url TEXT
);

CREATE TABLE call_records (
  id SERIAL PRIMARY KEY,
  call_uuid TEXT NOT NULL UNIQUE,
  company_id INT REFERENCES companies(id),
  from_number TEXT,
  to_number TEXT,
  caller_id TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  recording_url TEXT,
  trip_id INT REFERENCES trips(id),
  customer_id INT REFERENCES users(id)
);

CREATE TABLE caller_profiles (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) NOT NULL,
  phone_number TEXT NOT NULL,
  customer_id INT REFERENCES users(id),
  history_notes TEXT,
  frequent_customer BOOLEAN DEFAULT FALSE
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INT,
  action TEXT NOT NULL,
  performed_by INT REFERENCES users(id),
  data JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);
