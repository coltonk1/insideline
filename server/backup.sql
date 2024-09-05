CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    user_uuid uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    username character varying(50) NOT NULL UNIQUE,
    description text,
    email character varying(100) NOT NULL UNIQUE,
    display_name character varying(100) NOT NULL,
    hashed_password character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    bookmark_uuids uuid[] DEFAULT '{}',
    liked_uuids uuid[] DEFAULT '{}',
    following uuid[] DEFAULT '{}',
    followers uuid[] DEFAULT '{}',
    user_type integer DEFAULT 0,
    realtor boolean DEFAULT false,
    realty_group character varying(50),
    realty_group_uuid uuid REFERENCES realty_groups(group_uuid) ON DELETE NULL,
    profile_picture_url character varying(100),
    subscription_id character varying(100) DEFAULT '',
    removed boolean DEFAULT false
);

CREATE INDEX idx_users_uuid ON users(user_uuid);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_display_name ON users(display_name);
CREATE INDEX idx_users_description ON users(description);
CREATE INDEX idx_users_removed ON users(removed);

CREATE TABLE realty_groups (
    group_uuid uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    username character varying(50) NOT NULL UNIQUE,
    description text,
    email character varying(100) NOT NULL UNIQUE,
    display_name character varying(100) NOT NULL,
    hashed_password character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    realtors uuid[] DEFAULT '{}',
    followers uuid[] DEFAULT '{}',
    type integer DEFAULT 0,
    profile_picture_url character varying(100),
    removed boolean DEFAULT false
);

CREATE INDEX idx_realty_uuid ON realty_groups(group_uuid);
CREATE INDEX idx_realty_username ON realty_groups(username);
CREATE INDEX idx_realty_description ON realty_groups(description);
CREATE INDEX idx_realty_display_name ON realty_groups(display_name);
CREATE INDEX idx_realty_removed ON realty_groups(removed);

CREATE TABLE posts (
    post_uuid uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    author_username character varying(50) NOT NULL,
    author_uuid uuid NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    image_urls text[],
    views integer DEFAULT 0,
    likes integer DEFAULT 0,
    bookmarks integer DEFAULT 0,
    comments integer DEFAULT 0,
    type integer,
    private boolean DEFAULT true,
    removed boolean DEFAULT false,
    -- Only for realty posts vvvvvvvvvvvvvvvvv
    realty_group_uuid uuid REFERENCES realty_groups(group_uuid) ON DELETE CASCADE,
    realty_group_name character varying(50),
    latitude double precision,
    longitude double precision,
    payload jsonb
);

ALTER TABLE posts ADD COLUMN likes_for_week INTEGER[] DEFAULT ARRAY[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]::INTEGER[];

CREATE INDEX idx_posts_realty_group_uuid ON posts(realty_group_uuid);
CREATE INDEX idx_posts_author_uuid ON posts(author_uuid);
CREATE INDEX idx_posts_post_uuid ON posts(post_uuid);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_posts_private ON posts(private);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_title ON posts(title);
CREATE INDEX idx_posts_description ON posts(description);
CREATE INDEX idx_posts_location ON posts(latitude, longitude);
CREATE INDEX idx_posts_removed ON posts(removed);

CREATE TABLE comments (
    comment_uuid uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    post_uuid uuid NOT NULL REFERENCES posts(post_uuid) ON DELETE CASCADE,
    author_uuid uuid NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
    parent_comment_uuid uuid REFERENCES comments(comment_uuid) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    removed boolean DEFAULT false
);

CREATE INDEX idx_comments_comment_uuid on comments(comment_uuid);
CREATE INDEX idx_comments_author_uuid on comments(author_uuid);
CREATE INDEX idx_comments_parent_comment_uuid on comments(parent_comment_uuid);
CREATE INDEX idx_comments_post_uuid on comments(post_uuid);
CREATE INDEX idx_comments_removed on comments(removed);

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_comments
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_realty_groups
BEFORE UPDATE ON realty_groups
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_posts
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();