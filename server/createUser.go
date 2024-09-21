package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"unicode"
)

const (
	// MIN_USERNAME_LENGTH defines the minimum length for usernames.
	MIN_USERNAME_LENGTH = 4
	// MAX_USERNAME_LENGTH defines the maximum length for usernames.
	MAX_USERNAME_LENGTH = 30
	// MAX_EMAIL_LENGTH defines the maximum length for emails.
	MAX_EMAIL_LENGTH = 100
	// MIN_PASSWORD_LENGTH defines the minimum length for passwords.
	MIN_PASSWORD_LENGTH = 8
)

var email_regex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

type CreateUserRequest struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Password    string `json:"password"`
	Email       string `json:"email"`
	Realtor     bool   `json:"realtor"`
	RealtyGroup string `json:"realty_group"`
}

// createUser handles the HTTP request to create a new user.
//
//   Request Body:
//   - username: string (must be 4-30 characters long)
//   - display_name: string
//   - password: string (must be at least 8 characters long and meet complexity requirements)
//   - email: string (must be a valid email format and no longer than 100 characters)
//   - realtor: bool
//   - realty_group: string
//
// Sends an HTTP response indicating the success or failure of the user creation process.
// On success, it sends a confirmation email and a success message; on failure,
// it sends an appropriate error message.
func createUser(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
		return
	}

	var req_body CreateUserRequest
	
	if err := json.NewDecoder(r.Body).Decode(&req_body); err != nil {
		sendJSONResponse(w, false, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Ensure case insensitive variables are lowercase
	req_body.Username = strings.ToLower(req_body.Username)
	req_body.Email = strings.ToLower(req_body.Email)

	if err := validateCreateUserBody(req_body); err != nil {
		sendJSONResponse(w, false, err.Error(), http.StatusBadRequest)
		return
	}

	hashedPassword, err := hashFunction(req_body.Password)
	if err != nil {
		sendJSONResponse(w, false, "Hash function failed", http.StatusInternalServerError)
		return
	}

	var UserUUID string
	// "INSERT INTO users (username, display_name, email, hashed_password, realtor, realty_group) VALUES ($1, $2, $3, $4, $5, $6)",
	err = preparedStatements[2].QueryRow(req_body.Username, req_body.DisplayName, req_body.Email, hashedPassword, req_body.Realtor, req_body.RealtyGroup).Scan(&UserUUID)
	if err != nil {
		sendJSONResponse(w, false, "Failed to create user." + err.Error(), http.StatusConflict)
		return
	}

	err = copyDefaultProfilePicture(UserUUID)
	if err != nil {
		sendJSONResponse(w, false, "Failed to copy default profile picture." + err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = sendEmail(req_body.Email)
	if err != nil {
		sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	sendJSONResponse(w, true, "Success", http.StatusOK)
}

// copyDefaultProfilePicture copies the default profile picture to the user's profile directory.
// It takes the user UUID as input and returns an error if the copy fails.
func copyDefaultProfilePicture(user_uuid string) error {
	src_path := "/var/uploads/default.jpg"
	dest_path := fmt.Sprintf("/var/uploads/%s_pfp.jpg", user_uuid)
	
	src_file, err := os.Open(src_path)
    if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
    defer src_file.Close()

    dest_file, err := os.Create(dest_path)
    if err != nil {
		return fmt.Errorf("failed to create destination file: %w", err)
	}
    defer dest_file.Close()

    if _, err := io.Copy(dest_file, src_file); err != nil {
		return fmt.Errorf("failed to copy file: %w", err)
	}

	return nil
}

func isValidUsername(username string) bool {
	if len(username) > MAX_USERNAME_LENGTH {
		return false
	}
	if len(username) < MIN_USERNAME_LENGTH {
		return false
	}

	for _, char := range username {
		if unicode.IsSpace(char) || unicode.IsControl(char) {
			return false
		}
	}

	return true
}

// isValidPassword checks if the given password meets the complexity requirements.
// It returns true if the password has at least one uppercase letter, one lowercase letter,
// one number, and one special character; otherwise, it returns false.
func isValidPassword(password string) bool {
	if len(password) < MIN_PASSWORD_LENGTH {
		return false
	}

	var hasUpper, hasLower, hasNumber, hasSpecial bool
	validCharacters := true;

	for _, char := range password {
		switch {
			case unicode.IsUpper(char):
				hasUpper = true
			case unicode.IsLower(char):
				hasLower = true
			case unicode.IsDigit(char):
				hasNumber = true
			case unicode.IsPunct(char) || unicode.IsSymbol(char):
				hasSpecial = true
			case unicode.IsSpace(char) || unicode.IsControl(char):
				validCharacters = false
		}
	}

	// Password is valid if it has at least one upper, lower, number, and special character
	return hasUpper && hasLower && hasNumber && hasSpecial && validCharacters
}

// validateCreateUserBody validates the input for user creation.
// It checks the username, email format, and password complexity.
// Returns an error if any validation fails; otherwise, returns nil.
func validateCreateUserBody(reqBody CreateUserRequest) error {
	if !isValidUsername(reqBody.Username) {
		return fmt.Errorf("username must be at least %d and no more than %d characters long, and must not have invalid characters", MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH)
	}
	if len(reqBody.Username) > MAX_USERNAME_LENGTH {
		return fmt.Errorf("username must be no more than %d characters long", MAX_USERNAME_LENGTH+1)
	}
	if len(reqBody.Email) > MAX_EMAIL_LENGTH {
		return fmt.Errorf("email too long")
	}
	if !email_regex.MatchString(reqBody.Email) {
		return fmt.Errorf("email not formatted correctly")
	}
	if !isValidPassword(reqBody.Password) {
		return fmt.Errorf("password must be at least %d characters long and meet complexity requirements", MIN_PASSWORD_LENGTH)
	}
	return nil
}