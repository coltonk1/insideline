package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"

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

var requestBody struct {
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

	token_data, err := getTokenPayload(requestBody.Token)
	if err != nil {
		sendJSONResponse(w, false, "Invalid request body", http.StatusBadRequest)
		return
	}

	if(requestBody.Type == 0) {
		prod_id, _, err := GetUserSubscription(token_data["email"].(string))
		var listings int;
		if err != nil {
			listings = 0;
		} else {
			listings = SubMap[prod_id].Listings
		}
		// /*41*/ "SELECT COUNT(*) FROM posts WHERE author_uuid = $1 AND type = $2",
		var amt int;
		preparedStatements[41].QueryRow(token_data["user_uuid"].(string), 0).Scan(&amt)
		
		if(listings < amt) {
			sendJSONResponse(w, false, fmt.Sprintf("Already at listing limit of %d", listings), http.StatusBadRequest)
			return
		}
		createPropertyPost(w, r, body);
	} else if(requestBody.Type == 2) {
		createSpotlightPost(w, r, body);
	}
}

func createSpotlightPost(w http.ResponseWriter, r *http.Request, body []byte) {
	token_data, err := getTokenPayload(requestBody.Token)
	if err != nil {
		sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	log.Println("Creating post?")

	var imageUrlStrings []string
	for _, value := range requestBody.ImageUrls {
		imageUrlStrings = append(imageUrlStrings, value.Src)
	}

	// /*25*/ "INSERT INTO posts (title, description, author_username, author_uuid, image_urls, type, private, realty_group_name, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING post_uuid",
	var uuid string;
	err = preparedStatements[25].QueryRow(requestBody.Title, requestBody.Description, token_data["username"], token_data["user_uuid"], pq.Array(imageUrlStrings), requestBody.Type, requestBody.Private, requestBody.RealtyGroupName, requestBody.Payload).Scan(&uuid)

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

func createPropertyPost(w http.ResponseWriter, r *http.Request, body []byte) {
	type NecessaryData struct {
		Price   string `json:"price"`
		Address string `json:"address"`
	}

	token_data, err := getTokenPayload(requestBody.Token)
	if err != nil {
		sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	var data NecessaryData
	err = json.Unmarshal([]byte(requestBody.Payload), &data)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	// api_key := "da728a60c8e04dd0884f4b0670645b2e"
	// endpoint := "https://api.geoapify.com/v1/geocode/search"
	// params := url.Values{}
	// params.Add("text", data.Address)
	// params.Add("apiKey", api_key)

	
	api_key := "AIzaSyAHz5ybmJZiZcHTlfHXGdin_Y2Olt0KViE"
	endpoint := "https://maps.googleapis.com/maps/api/geocode/json"
	params := url.Values{}
	params.Add("address", data.Address)
	params.Add("key", api_key)

	// https://maps.googleapis.com/maps/api/geocode/json?address=%22649%20Hall%Station%20Rd%20Kingston%20GA%22&key=AIzaSyAHz5ybmJZiZcHTlfHXGdin_Y2Olt0KViE

	resp, err := http.Get(endpoint + "?" + params.Encode())
	if err != nil {
		log.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err = io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response body: %v", err)
	}

	var response Response;
	err = json.Unmarshal(body, &response)
	if err != nil {
		log.Fatalf("Failed to parse JSON: %v", err)
	}

	log.Println("Creating post?")

	var imageUrlStrings []string
	for _, value := range requestBody.ImageUrls {
		imageUrlStrings = append(imageUrlStrings, value.Src)
	}

	var lat, lng float64

	if response.Status == "OK" && len(response.Results) > 0 {
		// Extract latitude and longitude from the response
		lat = response.Results[0].Geometry.Location.Lat
		lng = response.Results[0].Geometry.Location.Lng
	} else {
		// Set default values if no valid result is found
		lat = 0
		lng = 0
	}

	// "INSERT INTO posts (title, description, author_username, author_uuid, image_urls, type, private, realty_group_name, latitude, longitude, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING post_uuid",
	var uuid string;
	err = preparedStatements[11].QueryRow(requestBody.Title, requestBody.Description, token_data["username"], token_data["user_uuid"], pq.Array(imageUrlStrings), requestBody.Type, requestBody.Private, requestBody.RealtyGroupName, lat, lng, requestBody.Payload).Scan(&uuid)

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