package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

func createUser(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
		return
	}

	var requestBody struct {
		Username    string `json:"username"`
		DisplayName string `json:"display_name"`
		Password    string `json:"password"`
		Email       string `json:"email"`
		Realtor     bool   `json:"realtor"`
		RealtyGroup string `json:"realty_group"`
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendJSONResponse(w, false, "Unable to read request body", http.StatusInternalServerError)
		return
	}

	requestBody.Username = strings.ToLower(requestBody.Username)
	requestBody.Email = strings.ToLower(requestBody.Email)

	// Print the body
	fmt.Println("Request Body:", string(body))

	if err := json.Unmarshal(body, &requestBody); err != nil {
		sendJSONResponse(w, false, "Invalid request body", http.StatusBadRequest)
		return
	}

	hashedPassword, err := hashFunction(requestBody.Password)
	if err != nil {
		sendJSONResponse(w, false, "Hash function failed", http.StatusInternalServerError)
		return
	}
	var UserUUID string

	// "INSERT INTO users (username, display_name, email, hashed_password, realtor, realty_group) VALUES ($1, $2, $3, $4, $5, $6)",
	err = preparedStatements[2].QueryRow(requestBody.Username, requestBody.DisplayName, requestBody.Email, hashedPassword, requestBody.Realtor, requestBody.RealtyGroup).Scan(&UserUUID)
	if err != nil {
		sendJSONResponse(w, false, "Failed to create user." + err.Error(), http.StatusInternalServerError)
		return
	}

	srcFile, err := os.Open("/var/uploads/default.jpg")
    if err != nil {
		sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
        return
    }
    defer srcFile.Close()

    // Create the destination file
    destFile, err := os.Create("/var/uploads/" + UserUUID + "_pfp.jpg")
    if err != nil {
		sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
        return
    }
    defer destFile.Close()

    // Copy the contents from the source file to the destination file
    _, err = io.Copy(destFile, srcFile)
    if err != nil {
		sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
        return
    }

	_, err = sendEmail(requestBody.Email)
	if(err != nil) {
		sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	sendJSONResponse(w, true, "Success", http.StatusOK)
}