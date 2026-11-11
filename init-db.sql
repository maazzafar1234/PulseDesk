-- PulseDesk Database Initialization Script
-- This script runs automatically when PostgreSQL container starts

-- Create database if not exists
-- CREATE DATABASE pulsedesk;

-- Connect to pulsedesk database
\c pulsedesk

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- TICKETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in progress', 'resolved', 'closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

-- ============================================================================
-- ACTIVITY LOG TABLE (Optional, for audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_ticket_id ON activity_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================================================
-- AUDIT TRIGGER (Optional, for automatic timestamps)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for tickets table
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (Optional, for testing)
-- ============================================================================
-- Uncomment to add sample data on startup
-- INSERT INTO users (email, password_hash) VALUES
--   ('admin@pulsedesk.local', '$2a$10$abcdefg'),
--   ('user@pulsedesk.local', '$2a$10$hijklmn')
-- ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- GRANTS (Security)
-- ============================================================================
-- Create application user (not required for docker-compose dev, but good practice)
-- CREATE USER pulsedesk WITH PASSWORD 'pulsedesk123';
-- GRANT CONNECT ON DATABASE pulsedesk TO pulsedesk;
-- GRANT USAGE ON SCHEMA public TO pulsedesk;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pulsedesk;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pulsedesk;

-- ============================================================================
-- DONE
-- ============================================================================
SELECT 'Database initialization complete!' as status;
