-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS robots (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    secret_key VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) NOT NULL,
    robot JSONB,
    boss_user JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure serial_number is unique for foreign key reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'robots' AND constraint_type = 'UNIQUE' AND constraint_name = 'robots_serial_number_unique'
    ) THEN
        ALTER TABLE robots ADD CONSTRAINT robots_serial_number_unique UNIQUE (serial_number);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS maps (
    id SERIAL PRIMARY KEY,
    robot_serial_number VARCHAR(255) NOT NULL REFERENCES robots(serial_number),
    map_name VARCHAR(255) NOT NULL,
    features JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(robot_serial_number, map_name)
);

-- Insert admin user
INSERT INTO users (username, password, role)
VALUES ('admin', '$2b$10$8K1p/a0dR1U5bWYx5Y5Y5O5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y', 'admin')
ON CONFLICT (username) DO NOTHING; 