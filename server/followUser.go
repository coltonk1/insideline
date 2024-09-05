package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

func followUser(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
		return
	}

	var requestBody struct {
		UserUUID   string `json:"user_uuid"`
		TargetUUID string `json:"target_uuid"`
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendJSONResponse(w, false, "Unable to read request body", http.StatusInternalServerError)
		return
	}

	// Print the body
	fmt.Println("Request Body:", string(body))

	if err := json.Unmarshal(body, &requestBody); err != nil {
		sendJSONResponse(w, false, "Invalid request body", http.StatusBadRequest)
		return
	}

	var found bool
	err = preparedStatements[5].QueryRow(requestBody.UserUUID, requestBody.TargetUUID).Scan(&found)

	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONResponse(w, false, "Not found", http.StatusNotFound)
		} else {
			sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		}
		return
	}

	if found {
		log.Println("String found!")
		_, err = preparedStatements[7].Exec(requestBody.TargetUUID, requestBody.UserUUID)

		if err != nil {
			sendJSONResponse(w, false, "Unable to execute", http.StatusInternalServerError)
			return
		}

		_, err = preparedStatements[9].Exec(requestBody.UserUUID, requestBody.TargetUUID)

		if err != nil {
			sendJSONResponse(w, false, "Unable to execute", http.StatusInternalServerError)
			return
		}
	} else {
		log.Println("String not found.")
		_, err = preparedStatements[6].Exec(requestBody.TargetUUID, requestBody.UserUUID)

		if err != nil {
			sendJSONResponse(w, false, "Unable to execute", http.StatusInternalServerError)
			return
		}

		_, err = preparedStatements[8].Exec(requestBody.UserUUID, requestBody.TargetUUID)

		if err != nil {
			sendJSONResponse(w, false, "Unable to execute", http.StatusInternalServerError)
			return
		}
	}

	sendJSONResponse(w, true, "Success", http.StatusOK)
}