package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"

	"github.com/lib/pq"
)

type Location struct {
    Lat float64 `json:"lat"`
    Lng float64 `json:"lng"`
}

type Bounds struct {
    Northeast Location `json:"northeast"`
    Southwest Location `json:"southwest"`
}

type Viewport struct {
    Northeast Location `json:"northeast"`
    Southwest Location `json:"southwest"`
}

type Geometry struct {
    Bounds      Bounds   `json:"bounds"`
    Location    Location `json:"location"`
    LocationType string  `json:"location_type"`
    Viewport    Viewport `json:"viewport"`
}

type AddressComponent struct {
    LongName  string   `json:"long_name"`
    ShortName string   `json:"short_name"`
    Types     []string `json:"types"`
}

type Result struct {
    AddressComponents []AddressComponent `json:"address_components"`
    FormattedAddress  string             `json:"formatted_address"`
    Geometry          Geometry           `json:"geometry"`
    PlaceID           string             `json:"place_id"`
    Types             []string           `json:"types"`
}

type Response struct {
    Results []Result `json:"results"`
    Status  string  `json:"status"`
}

type Position struct {
	Left	float32		`json:"left"`
	Top		float32		`json:"top"`
}

type Image struct {
	Src			string 		`json:"src"`
	Scale		float32		`json:"scale"`
	Pos			Position	`json:"position"`
}

type CreatePostBody struct {
	Title           string         `json:"title"`
	Description     string         `json:"description"`
	Token           string         `json:"token"`
	ImageUrls       []Image			`json:"image_urls"`
	Type            int            `json:"type"`
	Private         bool           `json:"private"`
	RealtyGroupName string         `json:"realty_group_name"`
	Payload         string         `json:"payload"`
}

func createPost(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
		return
	}

	var req_body CreatePostBody

	if err := json.NewDecoder(r.Body).Decode(&req_body); err != nil {
		sendJSONResponse(w, false, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := validateCreatePostBody(req_body); err != nil {
		sendJSONResponse(w, false, err.Error(), http.StatusBadRequest)
		return
	}

	switch req_body.Type {
		case 0:
			createPropertyPost(w, req_body)
		case 1:
			createPropertyPost(w, req_body)
		case 2:
			createSpotlightPost(w, req_body)
    }
}

func createSpotlightPost(w http.ResponseWriter, req_body CreatePostBody) {
	token_data, err := getTokenPayload(req_body.Token)
	if err != nil {
		sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	imageUrlStrings := make([]string, len(req_body.ImageUrls))
	for i, value := range req_body.ImageUrls {
		imageUrlStrings[i] = value.Src
	}

	// /*25*/ "INSERT INTO posts (title, description, author_username, author_uuid, image_urls, type, private, realty_group_name, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING post_uuid",
	var uuid string;
	err = preparedStatements[25].QueryRow(req_body.Title, req_body.Description, token_data["username"], token_data["user_uuid"], pq.Array(imageUrlStrings), req_body.Type, req_body.Private, req_body.RealtyGroupName, req_body.Payload).Scan(&uuid)

	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONResponse(w, false, "Not found", http.StatusNotFound)
		} else {
			sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		}
		return
	}

	sendJSONResponse(w, true, "/spotlightInfo/?uuid=" + uuid, http.StatusOK)	
}

func createPropertyPost(w http.ResponseWriter, req_body CreatePostBody) {
	type NecessaryData struct {
		Price   string `json:"price"`
		Address string `json:"address"`
	}

	token_data, err := getTokenPayload(req_body.Token)
	if err != nil {
		sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	prod_id, _, err := GetUserSubscription(token_data["email"].(string))
    listings := getListingsLimit(err, prod_id)

	if isAtListingLimit(listings, token_data["user_uuid"].(string)) {
        sendJSONResponse(w, false, fmt.Sprintf("Already at listing limit of %d", listings), http.StatusBadRequest)
        return
    }

    var data NecessaryData
    if err = json.Unmarshal([]byte(req_body.Payload), &data); err != nil {
        log.Println("Error:", err)
        return
    }
	
	lat, lng, err := getGeolocation(data.Address)
    if err != nil {
        sendJSONResponse(w, false, "Failed to get geolocation", http.StatusInternalServerError)
        return
    }

	var imageUrlStrings []string
	for _, value := range req_body.ImageUrls {
		imageUrlStrings = append(imageUrlStrings, value.Src)
	}

	// "INSERT INTO posts (title, description, author_username, author_uuid, image_urls, type, private, realty_group_name, latitude, longitude, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING post_uuid",
	var uuid string;
	err = preparedStatements[11].QueryRow(req_body.Title, req_body.Description, token_data["username"], token_data["user_uuid"], pq.Array(imageUrlStrings), req_body.Type, req_body.Private, req_body.RealtyGroupName, lat, lng, req_body.Payload).Scan(&uuid)

	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONResponse(w, false, "Not found", http.StatusNotFound)
		} else {
			sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		}
		return
	}

	sendJSONResponse(w, true, "/propertyInfo/?uuid=" + uuid, http.StatusOK)	
}

func getListingsLimit(err error, prodID string) int {
    if err != nil {
        return SubMap["free"].Listings
    }
    return SubMap[prodID].Listings
}

func isAtListingLimit(listings int, userUUID string) bool {
    var amt int
    preparedStatements[41].QueryRow(userUUID, 0).Scan(&amt)
    return listings <= amt
}

func getGeolocation(address string) (float64, float64, error) {
    apiKey := os.Getenv("GOOGLE_API_KEY")
    endpoint := "https://maps.googleapis.com/maps/api/geocode/json"

    params := url.Values{}
    params.Add("address", address)
    params.Add("key", apiKey)

    resp, err := http.Get(endpoint + "?" + params.Encode())
    if err != nil {
        return 0, 0, fmt.Errorf("failed to make request: %w", err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return 0, 0, fmt.Errorf("failed to read response body: %w", err)
    }

    var response Response
    err = json.Unmarshal(body, &response)
    if err != nil {
        return 0, 0, fmt.Errorf("failed to parse JSON: %w", err)
    }

    if response.Status != "OK" || len(response.Results) == 0 {
        return 0, 0, nil
    }

    return response.Results[0].Geometry.Location.Lat, response.Results[0].Geometry.Location.Lng, nil
}

func validateCreatePostBody(req_body CreatePostBody) error {
	// Check if Title is empty
	if req_body.Title == "" {
		return fmt.Errorf("title is required")
	}

	// Check if Description is empty
	if req_body.Description == "" {
		return fmt.Errorf("description is required")
	}

	// Check if Token is empty
	if req_body.Token == "" {
		return fmt.Errorf("token is required")
	}

	// Check if ImageUrls has at least one image
	if len(req_body.ImageUrls) == 0 {
		return fmt.Errorf("at least one image is required")
	}

	// Validate each image URL and its attributes (optional, but recommended)
	for _, image := range req_body.ImageUrls {
		if image.Src == "" {
			return fmt.Errorf("Image URL is required")
		}
		// if image.Scale <= 0 {
		// 	return fmt.Errorf("Image scale must be greater than zero")
		// }
	}

	// Check if Type is within an acceptable range (assuming 0 and 2 are valid types)
	if req_body.Type != 0 && req_body.Type != 1 && req_body.Type != 2 {
		return fmt.Errorf("invalid post type")
	}

	// Check if RealtyGroupName is provided if it's required for certain types
	// if req_body.Type == 0 && req_body.RealtyGroupName == "" {
	// 	return fmt.Errorf("realty group name is required for type 0 posts")
	// }

	// Check if Payload is empty
	if req_body.Payload == "" {
		return fmt.Errorf("payload is required")
	}

	// All validations passed
	return nil
}