package main

var statements = []string{
	// publicUserData //
	/*0*/ "SELECT user_uuid, username, description, display_name, COALESCE(array_length(followers, 1), 0) as followers_count, COALESCE(array_length(following, 1), 0) as following_count, user_type, realtor, realty_group FROM users WHERE user_uuid = $1 AND removed = false LIMIT 1",
	// privateUserData //
	/*1*/ "SELECT * FROM users WHERE user_uuid = $1 LIMIT 1",
	// createUser //
	/*2*/ "INSERT INTO users (username, display_name, email, hashed_password, realtor, realty_group) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_uuid",
	// updateUser //
	/*3*/ "UPDATE users SET username = $1, display_name = $2, email = $3, realtor = $4, realty_group = $5, description = $6, hashed_password = $7 WHERE user_uuid = $8",
	// deleteUser
	/*4*/ "DELETE FROM users WHERE user_uuid = $1",
	// followUser //
	/*5*/ "SELECT EXISTS (SELECT 1 FROM users WHERE user_uuid = $1 AND $2 = ANY(following)) AS is_following;",
	/*6*/ "UPDATE users SET following = array_append(following, $1) WHERE user_uuid = $2",
	/*7*/ "UPDATE users SET following = array_remove(following, $1) WHERE user_uuid = $2",
	/*8*/ "UPDATE users SET followers = array_append(followers, $1) WHERE user_uuid = $2",
	/*9*/ "UPDATE users SET followers = array_remove(followers, $1) WHERE user_uuid = $2",
	// reply
	/*10*/ "INSERT INTO comments (post_uuid, author_uuid, parent_comment_uuid, content) VALUES ($1, $2, $3, $4) RETURNING comment_uuid",
	// createPost
	/*11*/ "INSERT INTO posts (title, description, author_username, author_uuid, image_urls, type, private, realty_group_name, latitude, longitude, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING post_uuid",
	// removePost
	/*12*/ "DELETE FROM posts WHERE post_uuid = $1",
	// viewedPost
	/*13*/ "UPDATE posts SET views = views + 1 WHERE post_uuid = $1",
	// likePost
	/*14*/ "UPDATE posts SET likes = likes + 1 WHERE post_uuid = $1",
	/*15*/ "UPDATE posts SET likes = likes - 1 WHERE post_uuid = $1",
	/*16*/ "UPDATE users SET liked_uuids = array_append(liked_uuids, $1) WHERE user_uuid = $2",
	/*17*/ "UPDATE users SET liked_uuids = array_remove(liked_uuids, $1) WHERE user_uuid = $2",
	// getPostData
	/*18*/ "SELECT post_uuid, title, description, payload, image_urls, likes, comments FROM posts WHERE author_uuid = $1 AND type = $2 AND private = false ORDER BY created_at DESC LIMIT 20 OFFSET $3",
	/*19*/ "SELECT title, description, payload, image_urls, author_uuid, latitude, longitude, type FROM posts WHERE post_uuid = $1 AND private = false ORDER BY created_at DESC LIMIT 1",
	/*20*/ "SELECT title, image_urls, post_uuid, author_uuid, likes, comments, description, payload, 0 FROM posts WHERE type = $1 AND private = false ORDER BY RANDOM() LIMIT 20;",
	/*21*/ "SELECT post_uuid, title, description, author_uuid, payload, image_urls, (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance, latitude, longitude FROM posts WHERE latitude <> 0 AND longitude <> 0 AND (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) <= $3 AND private = false ORDER BY distance LIMIT 20",
	// search
	/*22*/ "SELECT user_uuid, username, display_name, (similarity(display_name, $1) + similarity(username, $1)) AS similarity_score FROM users WHERE (similarity(display_name, $1) + similarity(username, $1)) > 0.4 ORDER BY similarity_score DESC LIMIT 5;",
	//login
	/*23*/ "SELECT user_type, hashed_password, user_uuid, username, email FROM users WHERE username = $1 OR email = $1 LIMIT 1",
	//other
	/*24*/ "SELECT COUNT(*) AS count FROM posts WHERE author_uuid = $1 AND type = $2 AND private = false",
	/*25*/ "INSERT INTO posts (title, description, author_username, author_uuid, image_urls, type, private, realty_group_name, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING post_uuid",
	/*26*/ "INSERT INTO comments (post_uuid, author_uuid, content) VALUES ($1, $2, $3) RETURNING comment_uuid",
	/*27*/ "SELECT comment_uuid, author_uuid, content FROM comments WHERE post_uuid = $1 AND parent_comment_uuid IS NULL LIMIT 20",
	/*28*/ "SELECT EXISTS (SELECT 1 FROM users WHERE $1 = ANY(liked_uuids) AND user_uuid = $2) AS is_present",
	/*29*/ "UPDATE posts SET comments = comments + 1 WHERE post_uuid = $1",
	/*30*/ "SELECT author_uuid, post_uuid, likes, comments, image_urls, title, description, likes_for_week[CASE WHEN EXTRACT(WEEK FROM CURRENT_DATE)::int = 1 THEN 51 ELSE EXTRACT(WEEK FROM CURRENT_DATE)::int - 2 END] AS likes_last_week FROM posts WHERE type = 2 AND private = false ORDER BY likes_last_week DESC LIMIT 3",
	/*31*/ "UPDATE posts SET likes_for_week[EXTRACT(WEEK FROM CURRENT_DATE)::int - 1] = likes_for_week[EXTRACT(WEEK FROM CURRENT_DATE)::int - 1] + 1 WHERE post_uuid = $1;",
	/*32*/ "UPDATE posts SET likes_for_week[EXTRACT(WEEK FROM CURRENT_DATE)::int - 1] = likes_for_week[EXTRACT(WEEK FROM CURRENT_DATE)::int - 1] - 1 WHERE post_uuid = $1;",
	/*33*/ "SELECT title, image_urls, post_uuid, author_uuid, likes, comments, description, payload, (similarity(title, $1) * 3 + similarity(author_username, $1) * 2 + similarity(description, $1)) AS similarity_score FROM posts WHERE (similarity(title, $1) + similarity(author_username, $1) + similarity(description, $1)) > 0.25 AND type = $2 AND private = false ORDER BY similarity_score DESC LIMIT 20;",
	/*34*/ "UPDATE posts SET title = $1, description = $2, image_urls = $3, private = $4, payload = $5, type = $8 WHERE post_uuid = $6 AND author_uuid = $7",
	/*35*/ "UPDATE posts SET payload = jsonb_set(payload, '{price}', to_jsonb(($1::numeric)::text), false), type = 1 WHERE post_uuid = $2 AND author_uuid = $3",
	/*36*/ "UPDATE users SET user_type = $1 WHERE user_uuid = $2",
	/*37*/ "SELECT email FROM users WHERE user_uuid = $1 LIMIT 1",
	/*38*/ "SELECT subscription_id FROM users WHERE user_uuid = $1 LIMIT 1",
	/*39*/ "UPDATE users SET subscription_id = $1 WHERE user_uuid = $2",
	/*40*/ "SELECT EXISTS (SELECT 1 FROM posts WHERE author_uuid = $1)",
	/*41*/ "SELECT COUNT(*) FROM posts WHERE author_uuid = $1 AND type = $2 AND private = false",
	/*42*/ "SELECT user_uuid FROM users WHERE (email = $1 OR username = $1) AND user_type = 0",
	/*43*/ "SELECT email FROM users WHERE (email = $1 OR username = $1) AND user_type = 0",
}