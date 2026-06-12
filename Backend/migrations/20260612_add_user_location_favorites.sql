CREATE TABLE IF NOT EXISTS user_location_favorites (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_user_location_favorites_location
    ON user_location_favorites(location_id);
