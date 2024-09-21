package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

const (
    WRONG_DELAY = 2
)

type LoginUserRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
}

type LoginResponse struct {
	Token     string `json:"token"`
	UserUUID  string `json:"user_uuid"`
	Username  string `json:"username"`
}

// loginUser handles user login requests.
//
//   Request Body:
//   - username: string
//   - password: string
//
//   Output:
//   - token: string
//   - user_uuid: string
//   - username: string
func loginUser(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
		return
	}

	var req_body LoginUserRequest

	if err := json.NewDecoder(r.Body).Decode(&req_body); err != nil {
		sendJSONResponse(w, false, "Invalid request body", http.StatusBadRequest)
		return
	}

    req_body.Username = strings.ToLower(req_body.Username)

	var userType int
    var hashedPassword, userUUID, username, email string
	// 	/*23*/ "SELECT user_type, hashed_password, user_uuid, username, email FROM users WHERE username = $1 OR email = $1 LIMIT 1,
    err := preparedStatements[23].QueryRow(req_body.Username).Scan(
		&userType, &hashedPassword, &userUUID, &username, &email,
    )

    if err != nil {
        if err == sql.ErrNoRows {
            time.Sleep(WRONG_DELAY * time.Second)
            sendJSONResponse(w, false, "Invalid username or password", http.StatusUnauthorized)
            return
        } 
        sendJSONResponse(w, false, "Internal server error", http.StatusInternalServerError)
        return
    }

    if !verifyHash(req_body.Password, hashedPassword) {
        time.Sleep(WRONG_DELAY * time.Second)
		sendJSONResponse(w, false, "Invalid username or password", http.StatusUnauthorized)
        return
    }

    // Check if user is verified
	if userType == 0 {
		sendJSONResponse(w, false, "Not verified", http.StatusForbidden)
		return
	}

    token, err := createToken(userUUID, username, email)
    if (err != nil) {
        sendJSONResponse(w, false, "Error creating token", http.StatusInternalServerError)
        return
    }

    response := LoginResponse{
		Token:    token,
		UserUUID: userUUID,
		Username: username,
	}

    w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}