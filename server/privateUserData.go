package main

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
)

func privateUserData(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
		return
	}

	var requestBody struct {
		Token string `json:"token"`
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

	validToken := verifyToken(requestBody.Token)

	if (!validToken) {
        http.Error(w, "Invalid token", http.StatusUnauthorized)
	}

	payload, err := getTokenPayload(requestBody.Token)
	if (err != nil) {
        http.Error(w, "Invalid token", http.StatusInternalServerError)
	}

	userUUID := payload["user_uuid"].(string)

    type User struct {
        UserUUID string `json:"user_uuid"`
        Username string `json:"username"`
        Description *string  `json:"description"`
        DisplayName string `json:"display_name"`
        Followers   int `json:"follower_amt"`
        Following   int `json:"following_amt"`
        Type        int `json:"type"`
        Realtor     bool    `json:"is_realtor"`
        RealtyGroup *string  `json:"realty_group"`
    }

    var user User
	// /*0*/ "SELECT user_uuid, username, description, display_name, COALESCE(array_length(followers, 1), 0) as followers_count, COALESCE(array_length(following, 1), 0) as following_count, user_type, realtor, realty_group FROM users WHERE user_uuid = $1 AND removed = false LIMIT 1",
    err = preparedStatements[0].QueryRow(userUUID).Scan(
        &user.UserUUID, 
		&user.Username, 
        &user.Description,
		&user.DisplayName, 
        &user.Followers, 
		&user.Following,
		&user.Type, 
		&user.Realtor,
		&user.RealtyGroup,
    )

    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "User not found", http.StatusNotFound)
        } else {
            http.Error(w, "Database error: " + err.Error(), http.StatusInternalServerError)
        }
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}