-- Create default admin user
-- Password: Admin123!
INSERT INTO users (
    email,
    username,
    password_hash,
    full_name,
    is_admin,
    is_active
) VALUES (
    'admin@example.com',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewXxSzDgx4Q4GDhG',
    'System Administrator',
    true,
    true
) ON CONFLICT (email) DO NOTHING;
