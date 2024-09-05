package main

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

//? maybe slowly increase the time for each wrong attempt?
const WRONG_DELAY = 3

func loginUser(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
		return
	}

	var requestBody struct {
		Username    string `json:"username"`
		Password    string `json:"password"`
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

    requestBody.Username = strings.ToLower(requestBody.Username)

	// 	/*23*/ "SELECT user_type, hashed_password, user_uuid, username, email FROM users WHERE username = $1 OR email = $1 LIMIT 1,
	var userType int
    var hashedPassword string
    var userUUID string
    var username string
    var email string
    err = preparedStatements[23].QueryRow(requestBody.Username).Scan(
		&userType,
        &hashedPassword, 
        &userUUID,
        &username,
        &email,
    )

    if err != nil {
        if err == sql.ErrNoRows {
            time.Sleep(WRONG_DELAY * time.Second)
            sendJSONResponse(w, false, "Invalid username or password", http.StatusUnauthorized)
        } else {
            sendJSONResponse(w, false, "Internal server error", http.StatusInternalServerError)
        }
        return
    }
    if (!verifyHash(requestBody.Password, hashedPassword)) {
        time.Sleep(WRONG_DELAY * time.Second)
		sendJSONResponse(w, false, "Invalid username or password", http.StatusUnauthorized)
        return
    }

	if (userType == 0) {
		sendJSONResponse(w, false, "Not verified", http.StatusUnauthorized)
		return
	}

    token, err := createToken(userUUID, username, email)
    if (err != nil) {
        sendJSONResponse(w, false, "Error creating token", http.StatusInternalServerError)
        return
    }
    sendJSONResponse(w, true, token + "||" + userUUID, http.StatusOK)
}