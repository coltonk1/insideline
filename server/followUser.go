package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
)


type FollowUserRequest struct {
	Token   string `json:"token"`
	TargetUUID string `json:"target_uuid"`
}

func followUser(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
		return
	}

	var req_body FollowUserRequest
	
	if err := json.NewDecoder(r.Body).Decode(&req_body); err != nil {
		sendJSONResponse(w, false, "Invalid request body", http.StatusBadRequest)
		return
	}

	token_data, err := getTokenPayload(req_body.Token)
	if err != nil {
		sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	var found bool
	err = preparedStatements[5].QueryRow(token_data["user_uuid"].(string), req_body.TargetUUID).Scan(&found)

	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONResponse(w, false, "Not found", http.StatusNotFound)
		} else {
			sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		}
		return
	}

	if found {
		_, err = preparedStatements[7].Exec(req_body.TargetUUID, token_data["user_uuid"].(string))

		if err != nil {
			sendJSONResponse(w, false, "Unable to execute", http.StatusInternalServerError)
			return
		}

		_, err = preparedStatements[9].Exec(token_data["user_uuid"].(string), req_body.TargetUUID)

		if err != nil {
			sendJSONResponse(w, false, "Unable to execute", http.StatusInternalServerError)
			return
		}
	} else {
		_, err = preparedStatements[6].Exec(req_body.TargetUUID, token_data["user_uuid"].(string))

		if err != nil {
			sendJSONResponse(w, false, "Unable to execute", http.StatusInternalServerError)
			return
		}

		_, err = preparedStatements[8].Exec(token_data["user_uuid"].(string), req_body.TargetUUID)

		if err != nil {
			sendJSONResponse(w, false, "Unable to execute", http.StatusInternalServerError)
			return
		}
	}

	sendJSONResponse(w, true, "Success", http.StatusOK)
}