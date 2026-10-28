ALTER TABLE users ADD active_email VARCHAR(255) AS
    CASE WHEN deleted_at IS NULL THEN email END;

DROP INDEX IF EXISTS uk_users_email;

CREATE UNIQUE INDEX uk_users_email ON users (active_email);
