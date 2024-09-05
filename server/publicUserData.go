package main

import (
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"
)

func publicUserData(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
		return
	}
	
	// logDBStats()
	var requestBody struct {
        UserUUID string `json:"uuid"`
    }

    body, err := io.ReadAll(r.Body)
	if err != nil {
		sendJSONResponse(w, false, "Unable to read request body", http.StatusInternalServerError)
		return
	}

	if err := json.Unmarshal(body, &requestBody); err != nil {
		sendJSONResponse(w, false, "Invalid request body", http.StatusBadRequest)
		return
	}

	// /*0*/ "SELECT user_uuid, username, description, display_name, COALESCE(array_length(followers, 1), 0) as followers_count, COALESCE(array_length(following, 1), 0) as following_count, bookmark_uuids, user_type, realtor, realty_group, created_at FROM users WHERE user_uuid = $1 AND removed = false LIMIT 1",

    var user User
    err = preparedStatements[0].QueryRow(requestBody.UserUUID).Scan(
        &user.UserUUID, 
		&user.Username, 
        &user.Description,
		&user.DisplayName, 
        &user.Follower_Amt, 
		&user.Following_Amt, 
        &user.Type,
		&user.Realtor,
        &user.RealtyGroup,
    )

    if err != nil {
        log.Println(err)
        if err == sql.ErrNoRows {
            http.Error(w, "User not found", http.StatusNotFound)
        } else {
            http.Error(w, "Database error", http.StatusInternalServerError)
        }
        return
    }
	// /*24*/ "SELECT COUNT(*) AS count FROM posts WHERE author_uuid = $1 AND type = $2",

    err = preparedStatements[24].QueryRow(requestBody.UserUUID, 0).Scan(
        &user.Properties_Amt,
    )

    if err != nil {
        log.Println(err)
        if err == sql.ErrNoRows {
            http.Error(w, "User not found", http.StatusNotFound)
        } else {
            http.Error(w, "Database error", http.StatusInternalServerError)
        }
        return
    }

    err = preparedStatements[24].QueryRow(requestBody.UserUUID, 1).Scan(
        &user.Sold_Amt,
    )

    if err != nil {
        log.Println(err)
        if err == sql.ErrNoRows {
            http.Error(w, "User not found", http.StatusNotFound)
        } else {
            http.Error(w, "Database error", http.StatusInternalServerError)
        }
        return
    }

    err = preparedStatements[24].QueryRow(requestBody.UserUUID, 2).Scan(
        &user.Posts_Amt,
    )

    if err != nil {
        log.Println(err)
        if err == sql.ErrNoRows {
            http.Error(w, "User not found", http.StatusNotFound)
        } else {
            http.Error(w, "Database error", http.StatusInternalServerError)
        }
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}