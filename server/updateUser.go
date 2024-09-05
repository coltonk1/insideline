package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

func updateUser(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
		return
	}

	var requestBody struct {
		DisplayName string `json:"display_name"`
		Email       string `json:"email"`
		Realtor     bool   `json:"realtor"`
		RealtyGroup string `json:"realty_group"`
		Description string `json:"description"`
		Password    string `json:"password"`
		Token    string `json:"token"`
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

	hashedPassword := ""
	if(requestBody.Password != "") {
		hashedPassword, err = hashFunction(requestBody.Password)
		if err != nil {
			sendJSONResponse(w, false, "Hash function failed", http.StatusInternalServerError)
			return
		}
	}

	token_data, err := getTokenPayload(requestBody.Token)
	if err != nil {
		sendJSONResponse(w, false, "Token data failed", http.StatusInternalServerError)
		return
	}

	query := "UPDATE users SET"
    args := []interface{}{}
	placeholders := []string{}
	index := 1
	addPlaceholder := func(column string) {
        placeholders = append(placeholders, fmt.Sprintf("%d", index))
        index++
        args = append(args, column)
    }

    if requestBody.DisplayName != "" {
        query += fmt.Sprintf(" display_name = $%d,", index)
        addPlaceholder(requestBody.DisplayName)
    }
    if requestBody.Email != "" {
        query += fmt.Sprintf(" email = $%d,", index)
        addPlaceholder(requestBody.Email)
    }
	query += fmt.Sprintf(" realtor = $%d,", index)
	addPlaceholder(fmt.Sprintf("%t",requestBody.Realtor))
    if requestBody.RealtyGroup != "" {
        query += fmt.Sprintf(" realty_group = $%d,", index)
        addPlaceholder(requestBody.RealtyGroup)
    }
	query += fmt.Sprintf(" description = $%d,", index)
	addPlaceholder(requestBody.Description)
    if hashedPassword != "" {
        query += fmt.Sprintf(" hashed_password = $%d,", index)
        addPlaceholder(hashedPassword)
    }

    // Remove the trailing comma
    query = strings.TrimSuffix(query, ",")

    query += fmt.Sprintf(" WHERE user_uuid = $%d", index)
    args = append(args, token_data["user_uuid"].(string))

    _, err = db.Exec(query, args...)
	if err != nil {
		sendJSONResponse(w, false, "Unable to execute " + query, http.StatusInternalServerError)
		return
	}

	sendJSONResponse(w, true, "Success", http.StatusOK)
}