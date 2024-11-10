// This is the main package...
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
	"github.com/resend/resend-go/v2"
	"github.com/stripe/stripe-go/v79"
	"github.com/stripe/stripe-go/v79/customer"
	"github.com/stripe/stripe-go/v79/price"
	"github.com/stripe/stripe-go/v79/subscription"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
    UserUUID        string          `json:"user_uuid"`
    Username        string          `json:"username"`
    Description     *string          `json:"description"`
    Email           string          `json:"email"`
    CreatedAt       string          `json:"created_at"`
    DisplayName     string          `json:"display_name"`
    Followers       pq.StringArray  `json:"followers"`
    Follower_Amt     int             `json:"follower_amt"`
    Following       pq.StringArray  `json:"following"`
    Following_Amt   int             `json:"following_amt"`
    Realtor         bool            `json:"realtor"`
    Bookmarks       pq.StringArray  `json:"bookmark_uuids"`
    Liked           pq.StringArray  `json:"liked_uuids"`
    Type            int             `json:"user_type"`
    RealtyGroup     string          `json:"realty_group"`
    RealtyGroupUUID string          `json:"realty_group_uuid"`
    ProfilePicURL   string          `json:"profile_picture_url"`
    Removed         bool            `json:"removed"`
    Properties_Amt  int             `json:"properties_amt"`
    Sold_Amt        int             `json:"sold_amt"`
    Posts_Amt       int             `json:"posts_amt"`
}

type Post struct {
    PostUUID        string          `json:"post_uuid"`
    Title           string          `json:"title"`
    Description     string          `json:"description"`
    AuthorName      string          `json:"author_name"`
    AuthorUsername  string          `json:"author_username"`
    AuthorUUID      string          `json:"author_uuid"`
    CreatedDate     string          `json:"created_date"`
    ImageURLs       pq.StringArray  `json:"image_urls"`
    Views           int             `json:"views"`
    Likes           int             `json:"likes"`
    Bookmarks       int             `json:"bookmarks"`
    Type            int             `json:"type"`
    Private         bool            `json:"private"`
    Removed         bool            `json:"removed"`
    RealtyGroupUUID string          `json:"realty_group_uuid"`
    RealtyGroup     string          `json:"realty_group"`
    Latitude        float64         `json:"latitude"`
    Longitude       float64         `json:"longitude"`
    Payload         string          `json:"payload"`
}

type Comment struct {
    CommentUUID     string          `json:"comment_uuid"`
    PostUUID        string          `json:"post_uuid"`
    AuthorUUID      string          `json:"author_uuid"`
    ParentUUID      string          `json:"parent_comment_uuid"`
    Content         string          `json:"content"`
    CreatedDate     string          `json:"created_date"`
    UpdatedDate     string          `json:"updated_date"`
    Removed         bool            `json:"removed"`
}

type Group struct {
    GroupUUID       string          `json:"group_uuid"`
    Username        string          `json:"username"`
    Email           string          `json:"email"`
    Description     string          `json:"description"`
    DisplayName     string          `json:"display_name"`
    CreatedDate     string          `json:"created_date"`
    Realtors        pq.StringArray  `json:"realtors"`
    Followers       pq.StringArray  `json:"followers"`
    Following       pq.StringArray  `json:"following"`
    Type            int             `json:"type"`
    Removed         bool            `json:"removed"`
}

var db *sql.DB;
var preparedStatements = make([]*sql.Stmt, len(statements))

var jwtKey = []byte("my_secret_key")

type response struct {
    Success bool   `json:"success"`
    Message string `json:"message"`
}

func handleCORS(w http.ResponseWriter, r *http.Request) bool {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "POST")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        return true
    }
    return false
}

func sendJSONResponse(w http.ResponseWriter, success bool, message string, statusCode int) {
    resp := response{
        Success: success,
        Message: message,
    }

    log.Println(message)

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode) // Set the status code
    if err := json.NewEncoder(w).Encode(resp); err != nil {
        log.Printf("Failed to encode JSON response: %v", err)
        http.Error(w, "Internal Server Error", http.StatusInternalServerError)
    }
}

type Claims struct {
	UserUUID string `json:"user_uuid"`
    Username string `json:"username"`
    Email   string  `json:"email"`
	jwt.RegisteredClaims
}

const (
    RequestLimit = 15        // Max number of requests allowed per second
    BlockDuration = time.Minute // Duration to block IPs that exceed the limit
)

// Define a struct to track request counts and last request time
type RequestInfo struct {
    Count       int
    LastRequest time.Time
}

// Create maps for tracking requests and blocked IPs
var (
    requestCounts = make(map[string]*RequestInfo)
    blockedIPs    = make(map[string]time.Time)
    mu            sync.Mutex
)

func timeTrack(start time.Time, name string) {
    elapsed := time.Since(start)
    log.Printf("%s took %s", name, elapsed)
}


func limitRequestSize(next http.Handler, maxSize int64) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.ContentLength > maxSize {
            log.Println("Too large!");
            http.Error(w, "Request size exceeds limit", http.StatusRequestEntityTooLarge)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func getHeaders(w http.ResponseWriter, req *http.Request) {
    IPAddress := readUserIP(req)
    if isBlocked(IPAddress) {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    // Check and update request count
    if !checkRateLimit(IPAddress) {
        http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
        return
    }

    for name, headers := range req.Header {
        for _, h := range headers {
            fmt.Fprintf(w, "%v: %v\n", name, h)
        }
    }

    fmt.Fprintf(w, "%v\n", IPAddress)
}

func isValidIP(ip string) bool {
    parsedIP := net.ParseIP(ip)
    return parsedIP != nil
}

func readUserIP(r *http.Request) string {
    ipAddress := r.Header.Get("X-Real-Ip")
    if ipAddress == "" {
        ipAddress = r.Header.Get("X-Forwarded-For")
        if ipAddress != "" {
            ips := strings.Split(ipAddress, ",")
            for _, ip := range ips {
                ip = strings.TrimSpace(ip)
                if isValidIP(ip) {
                    return ip
                }
            }
        }
    }
    
    ipAddress = r.RemoteAddr
    ip, _, err := net.SplitHostPort(ipAddress)
    if err == nil && isValidIP(ip) {
        checkRateLimit(ip)
        isBlocked(ip)
        return ip
    }
    
    return ""
}

func checkRateLimit(IPAddress string) bool {
    mu.Lock()
    defer mu.Unlock()

    now := time.Now()
    if blockTime, blocked := blockedIPs[IPAddress]; blocked {
        if now.Sub(blockTime) > BlockDuration {
            delete(blockedIPs, IPAddress)
        } else {
            return false
        }
    }

    if info, exists := requestCounts[IPAddress]; exists {
        if now.Sub(info.LastRequest) > time.Second {
            // Reset count if the last request was more than a second ago
            info.Count = 0
        }
        info.LastRequest = now
        info.Count++
        if info.Count > RequestLimit {
            blockedIPs[IPAddress] = now
            return false
        }
    } else {
        requestCounts[IPAddress] = &RequestInfo{Count: 1, LastRequest: now}
    }
    return true
}

func isBlocked(IPAddress string) bool {
    mu.Lock()
    defer mu.Unlock()

    if blockTime, exists := blockedIPs[IPAddress]; exists {
        if time.Since(blockTime) > BlockDuration {
            delete(blockedIPs, IPAddress)
            return false
        }
        return true
    }
    return false
}

func verifyToken(tokenString string) (bool){
    claims := &Claims{}

	// Parse the JWT string and store the result in `claims`.
	// The `jwtKey` variable holds the secret key used to sign the token.
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtKey, nil
	})

	if err != nil {
		fmt.Printf("Error verifying token: %v\n", err)
		return false
	}

	if !token.Valid {
		fmt.Println("Invalid token")
		return false
	}

	return true
}

func createToken(user_uuid string, username string, email string) (string, error) {
	claims := &Claims{
        UserUUID: user_uuid,
        Username: username,
        Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			// The token expires 4 hour from now
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(10 * 365 * 24 * time.Hour)),
		},
	}

	// Create the token using the HS256 signing method
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with the secret key
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func getTokenPayload(tokenString string) (jwt.MapClaims, error) {
    if !verifyToken(tokenString) {
        return nil, fmt.Errorf("invalid token")
    }
    token, _, err := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{})
    if err != nil {
        return nil, err
    }

    if claims, ok := token.Claims.(jwt.MapClaims); ok {
        return claims, nil
    } else {
        return nil, fmt.Errorf("invalid token claims")
    }
}

func hashFunction(stringToHash string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(stringToHash), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func verifyHash(unhashedString string, hashedString string) (bool) {
    err := bcrypt.CompareHashAndPassword([]byte(hashedString), []byte(unhashedString))
    return err == nil
}

func deleteUser(w http.ResponseWriter, r *http.Request) {
    // Your handler code here
}

func reportUser(w http.ResponseWriter, r *http.Request) {
    // Your handler code here
}

func reply(w http.ResponseWriter, r *http.Request) {
    // Your handler code here
}


type updateRequestBody struct {
    Title           string         `json:"title"`
    Description     string         `json:"description"`
    Token           string         `json:"token"`
    ImageUrls       []Image			`json:"image_urls"`
    Type            int            `json:"type"`
    Private         bool           `json:"private"`
    RealtyGroupName string         `json:"realty_group_name"`
    Payload         string         `json:"payload"`
    PostUuid        string          `json:"post_uuid"`
}

func updatePost(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
		return
	}

    var requestBody updateRequestBody

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

	UserUUID := payload["user_uuid"].(string)

	if(requestBody.Type == 0) {
		updatePropertyPost(w, r, UserUUID, requestBody);
    } else if requestBody.Type == 1 {
		updatePropertyPost(w, r, UserUUID, requestBody);
	} else if(requestBody.Type == 2) {
		updateSpotlightPost(w, r, UserUUID, requestBody);
	}
}

func updatePropertyPost(w http.ResponseWriter, r *http.Request, UserUUID string, requestBody updateRequestBody) {
	// /*34*/ "UPDATE posts SET title = $1, description = $2, image_urls = $3, private = $4, payload = $5, type = $8 WHERE post_uuid = $6 AND author_uuid = $7",
    var imageUrlStrings []string
	for _, value := range requestBody.ImageUrls {
		imageUrlStrings = append(imageUrlStrings, value.Src)
	}

    _, err := preparedStatements[34].Exec(
		requestBody.Title,
		requestBody.Description,
		pq.Array(imageUrlStrings),
		requestBody.Private,
		requestBody.Payload,
		requestBody.PostUuid,
        UserUUID,
        requestBody.Type,
	)

    if err != nil {
        sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	sendJSONResponse(w, true, "/propertyInfo/?uuid=" + requestBody.PostUuid, http.StatusOK)	
}

func updateSpotlightPost(w http.ResponseWriter, r *http.Request, UserUUID string, requestBody updateRequestBody) {
    var imageUrlStrings []string
	for _, value := range requestBody.ImageUrls {
		imageUrlStrings = append(imageUrlStrings, value.Src)
	}

	// /*34*/ "UPDATE posts SET title = $1, description = $2, image_urls = $3, private = $4, payload = $5 WHERE post_uuid = $6 AND author_uuid = $7",

    _, err := preparedStatements[34].Exec(
		requestBody.Title,
		requestBody.Description,
		pq.Array(imageUrlStrings),
		requestBody.Private,
		requestBody.Payload,
		requestBody.PostUuid,
        UserUUID,
	)

    if err != nil {
        sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	sendJSONResponse(w, true, "/spotlightInfo/?uuid=" + requestBody.PostUuid, http.StatusOK)
}

func removePost(w http.ResponseWriter, r *http.Request) {
        if handleCORS(w, r) {
            return
        }
    
        var requestBody struct {
            Token string `json:"token"`
            PostUUID string `json:"post_uuid"`
        }
    
        if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
            http.Error(w, "Invalid request body", http.StatusBadRequest)
            return
        }

        log.Printf("Received post_uuid: %s", requestBody.PostUUID)
    
        validToken := verifyToken(requestBody.Token)
    
        if (!validToken) {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return;
        }
    
        payload, err := getTokenPayload(requestBody.Token)
        if (err != nil) {
            http.Error(w, "Invalid token", http.StatusInternalServerError)
            return;
        }
    
        UserUUID := payload["user_uuid"].(string)

        var owner bool;

	// /*40*/ "SELECT EXISTS (SELECT 1 FROM posts WHERE author_uuid = $1)",
        err = preparedStatements[40].QueryRow(UserUUID).Scan(&owner)
        if (err != nil) {
            http.Error(w, "Cant query post", http.StatusInternalServerError)
            return;
        }
        if (!owner) {
            http.Error(w, "Not the owner of the post...", http.StatusInternalServerError)
            return;
        }

    	// /*12*/ "DELETE FROM posts WHERE post_uuid = $1",
        _, err = preparedStatements[12].Exec(requestBody.PostUUID)
        if (err != nil) {
            log.Printf("Error executing DELETE query: %v", err) // Log the actual error
            http.Error(w, "Can't execute delete", http.StatusInternalServerError)
            return;
        }
        w.WriteHeader(http.StatusOK) // Set the status code to 200 OK
        w.Write([]byte("Post removed"))
}

func reportPost(w http.ResponseWriter, r *http.Request) {
    // Your handler code here
}

func viewedPost(w http.ResponseWriter, r *http.Request) {
    // Your handler code here
}

func changeUserType(uuid string, user_type int) error {
	// /*36*/ "UPDATE users SET user_type = $1 WHERE user_uuid = $2",
    _, err := db.Exec(statements[36], user_type, uuid)
    return err
}

func getUserEmailByUUID(uuid string) (string, error) {
    var Email string
    err := db.QueryRow(statements[37], uuid).Scan(&Email)
    return Email, err
}

func sold(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }

    var requestBody struct {
        PostUUID  string  `json:"post_uuid"`
        Token string   `json:"token"`
        SoldPrice int   `json:"sold_price"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    token_data, err := getTokenPayload(requestBody.Token);
    if err != nil {
        sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

    _, err = preparedStatements[35].Exec(requestBody.SoldPrice, requestBody.PostUUID, token_data["user_uuid"]);
    if(err != nil) {
        sendJSONResponse(w, false, "bad" + string(err.Error()), http.StatusInternalServerError)
    }
    sendJSONResponse(w, false, "Good!", http.StatusOK)
}

func userLiked(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }

    var requestBody struct {
        Token       string  `json:"token"`
        PostUuid    string  `json:"post_uuid"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    token, err := getTokenPayload(requestBody.Token);
    if err != nil {
        sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	// /*28*/ "SELECT EXISTS (SELECT 1 FROM users WHERE $1 = ANY(liked_uuids) AND user_uuid = $2) AS is_present;",

    var isLiked bool;
    err = preparedStatements[28].QueryRow(requestBody.PostUuid, token["user_uuid"]).Scan(&isLiked);

    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    type Response struct {
        IsLiked bool `json:"is_liked"`
    }

    response := Response{
        IsLiked: isLiked,
    }

    w.Header().Set("Content-Type", "application/json")

    // Encode response to JSON and write to the response writer
    if err := json.NewEncoder(w).Encode(response); err != nil {
        http.Error(w, "Failed to encode response", http.StatusInternalServerError)
        return
    }
}

func likePost(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }

    var requestBody struct {
        Token       string  `json:"token"`
        PostUuid    string  `json:"post_uuid"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    token, err := getTokenPayload(requestBody.Token);
    if err != nil {
        sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}

	// /*28*/ "SELECT EXISTS (SELECT 1 FROM users WHERE $1 = ANY(liked_uuids) AND user_uuid = $2) AS is_present;",

    var isLiked bool;
    err = preparedStatements[28].QueryRow(requestBody.PostUuid, token["user_uuid"]).Scan(&isLiked);

    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    // 	/*14*/ "UPDATE posts SET likes = likes + 1 WHERE post_uuid = $1",
	// /*15*/ "UPDATE posts SET likes = likes - 1 WHERE post_uuid = $1",
	// /*16*/ "UPDATE users SET liked_uuids = array_append(liked_uuids, $1) WHERE user_uuid = $2",
	// /*17*/ "UPDATE users SET liked_uuids = array_remove(liked_uuids, $1) WHERE user_uuid = $2",

    	// /*31*/ "UPDATE posts SET likes_for_week[EXTRACT(WEEK FROM CURRENT_DATE)::int - 1] = likes_for_week[EXTRACT(WEEK FROM CURRENT_DATE)::int - 1] + 1 WHERE post_uuid = $1",
	// /*32*/ "UPDATE posts SET likes_for_week[EXTRACT(WEEK FROM CURRENT_DATE)::int - 1] = likes_for_week[EXTRACT(WEEK FROM CURRENT_DATE)::int - 1] - 1 WHERE post_uuid = $1",
    if(isLiked) {
        _, err = preparedStatements[15].Exec(requestBody.PostUuid);
        if err != nil {
            http.Error(w, "Database error", http.StatusInternalServerError)
            return
        }

        _, err = preparedStatements[17].Exec(requestBody.PostUuid, token["user_uuid"]);
        if err != nil {
            http.Error(w, "Database error", http.StatusInternalServerError)
            return
        }

        _, err = preparedStatements[32].Exec(requestBody.PostUuid);
        if err != nil {
            http.Error(w, "Database error", http.StatusInternalServerError)
            return
        }
    } else {
        _, err = preparedStatements[14].Exec(requestBody.PostUuid);
        if err != nil {
            http.Error(w, "Database error", http.StatusInternalServerError)
            return
        }

        _, err = preparedStatements[16].Exec(requestBody.PostUuid, token["user_uuid"]);
        if err != nil {
            http.Error(w, "Database error", http.StatusInternalServerError)
            return
        }

        _, err = preparedStatements[31].Exec(requestBody.PostUuid);
        if err != nil {
            http.Error(w, "Database error", http.StatusInternalServerError)
            return
        }
    }

    sendJSONResponse(w, false, "Good!", http.StatusOK)
}

func getPostData(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }
    
    var requestBody struct {
        AuthorUUID  string  `json:"author_uuid"`
        Type        int     `json:"type"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    
    type PostData struct {
        PostUuid       string
        Title           string
        Description     string
        Payload         string
        ImageURLs       pq.StringArray
        Likes           int
        Comments        int
    }

	// /*18*/ "SELECT post_uuid, title, description, payload, image_urls, likes, comments FROM posts WHERE author_uuid = $1 AND type = $2 LIMIT 20 OFFSET $3",

    rows, err := preparedStatements[18].Query(requestBody.AuthorUUID, requestBody.Type, 0)
    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "User not found", http.StatusNotFound)
        } else {
            http.Error(w, "Database error", http.StatusInternalServerError)
        }
        return
    }
    defer rows.Close();


    var posts []PostData

    for rows.Next() {
		var post PostData
		err := rows.Scan(&post.PostUuid, &post.Title, &post.Description, &post.Payload, &post.ImageURLs, &post.Likes, &post.Comments)
		if err != nil {
            http.Error(w, "Database error .", http.StatusInternalServerError)
            return
		}
		posts = append(posts, post)
	}

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(posts)
}

func getMarkersNear(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }

    var input struct {
        Lat float32 `json:"lat"`
        Lng float32 `json:"lng"`
    }

    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

	// /*21*/ "SELECT post_uuid, title, description, author_uuid, payload, image_urls, (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance, latitude, longitude FROM posts WHERE (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) <= $3 ORDER BY distance LIMIT 20;",
    rows, err := preparedStatements[21].Query(input.Lat, input.Lng, 16)
    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "User not found", http.StatusNotFound)
        } else {
            http.Error(w, "Database error", http.StatusInternalServerError)
        }
        return
    }
    defer rows.Close();

    type PostData struct {
        PostUuid       string
        Title           string
        Description     string
        AuthorUuid      string
        Payload         string
        ImageURLs       pq.StringArray
        Distance        float32
        Lat             float32
        Lng             float32
    }

    var posts []PostData;

    for rows.Next() {
		var post PostData
		err := rows.Scan(&post.PostUuid, &post.Title, &post.Description, &post.AuthorUuid, &post.Payload, &post.ImageURLs, &post.Distance, &post.Lat, &post.Lng)
		if err != nil {
            if err == sql.ErrNoRows {
                http.Error(w, "User not found", http.StatusNotFound)
            } else {
                http.Error(w, string(err.Error()), http.StatusInternalServerError)
            }
		}
		posts = append(posts, post)
	}
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(posts)
}

func getSpecificPostData(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }
    
    var requestBody struct {
        PostUUID  string  `json:"post_uuid"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    
    type PostData struct {
        Title           string
        Description     string
        Payload         string
        ImageURLs       pq.StringArray
        AuthorUUID      string
        Latitude        *float32
        Longitude       *float32
        Type            int
    }

	// /*19*/ "SELECT title, description, payload, image_urls, author_uuid, latitude, longitude FROM posts WHERE post_uuid = $1 LIMIT 1",
    var postData PostData;
    err := preparedStatements[19].QueryRow(requestBody.PostUUID).Scan(
        &postData.Title, 
        &postData.Description, 
        &postData.Payload, 
        &postData.ImageURLs,
        &postData.AuthorUUID,
        &postData.Latitude,
        &postData.Longitude,
        &postData.Type,
    );

    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "User not found", http.StatusNotFound)
        } else {
            http.Error(w, "Database error", http.StatusInternalServerError)
        }
        return
    }


    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(postData)
}

func getRecommendedPostData(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }

    var requestBody struct {
        Token  string  `json:"token"`
        Query  string  `json:"query"`
        Type   int  `json:"type"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    if(requestBody.Token == "") {
        useRandomData(requestBody.Query, requestBody.Type, w);
        return
    }
    usePrefferedData(requestBody.Query, requestBody.Type, w);
}

func useRandomData(query string, post_type int, w http.ResponseWriter) {

    type PostData struct {
        PostUuid   string
        AuthorUuid string
        Title      string
        ImageURLs  pq.StringArray
        Likes      int
        Comments   int
        Description string
        Payload string
        SimilarityScore *float32
    }

    var rows *sql.Rows
    var err error

    if query == "" {
        rows, err = preparedStatements[20].Query(post_type)
    } else {
        rows, err = preparedStatements[33].Query(query, post_type)
    }

    // Handle possible errors from the query execution
    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "No posts found", http.StatusNotFound)
        } else {
            log.Printf("Database error: %v", err)
            http.Error(w, "Database error", http.StatusInternalServerError)
        }
        return
    }
    defer rows.Close()

    var posts []PostData

	// /*33*/ "SELECT title, image_urls, post_uuid, author_uuid, likes, comments, (similarity(title, $1) + similarity(author_username, $1) + similarity(description, $1)) AS similarity_score FROM posts WHERE (similarity(title, $1) + similarity(author_username, $1) + similarity(description, $1)) > 0.4 AND type = $2 ORDER BY similarity_score DESC LIMIT 20;",

    for rows.Next() {
        var post PostData
        err := rows.Scan(&post.Title, &post.ImageURLs, &post.PostUuid, &post.AuthorUuid, &post.Likes, &post.Comments, &post.Description, &post.Payload, &post.SimilarityScore)
        if err != nil {
            log.Printf("Error scanning row: %v", err)
            http.Error(w, "Error processing data", http.StatusInternalServerError)
            return
        }
        posts = append(posts, post)
    }

    // Check for errors that might have occurred during iteration
    if err := rows.Err(); err != nil {
        log.Printf("Error during row iteration: %v", err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    err = json.NewEncoder(w).Encode(posts)
    if err != nil {
        log.Printf("Error encoding JSON: %v", err)
        http.Error(w, "Failed to encode JSON", http.StatusInternalServerError)
    }
}

func usePrefferedData(query string, post_type int, w http.ResponseWriter) {
    useRandomData(query, post_type, w);
}

func getSubscriptionsByEmail(userEmail string) ([]*stripe.Subscription, error) {
    // Step 1: Retrieve the customer by email
    customerParams := &stripe.CustomerListParams{
        Email: stripe.String(userEmail),
    }
    customerParams.Limit = stripe.Int64(1)

    i := customer.List(customerParams)

    if err := i.Err(); err != nil {
        log.Printf("Error retrieving customer by email: %v", err)
        return nil, fmt.Errorf("error retrieving customer by email: %w", err)
    }

    if !i.Next() {
        log.Println("No customer found with this email")
        // No customer found, return an empty slice without error
        return []*stripe.Subscription{}, nil
    }

    cust := i.Customer()
    log.Printf("Found customer ID: %s", cust.ID)

    // Step 2: List subscriptions for the retrieved customer
    subscriptionParams := &stripe.SubscriptionListParams{
        Customer: stripe.String(cust.ID),
        Status:   stripe.String("all"),
    }

    subscriptionList := subscription.List(subscriptionParams)

    if err := subscriptionList.Err(); err != nil {
        log.Printf("Error retrieving subscriptions for customer ID %s: %v", cust.ID, err)
        return nil, fmt.Errorf("error retrieving subscriptions: %w", err)
    }

    var subscriptions []*stripe.Subscription
    for subscriptionList.Next() {
        subscriptions = append(subscriptions, subscriptionList.Subscription())
    }

    log.Printf("Retrieved %d subscriptions for customer ID %s", len(subscriptions), cust.ID)

    return subscriptions, nil
}

var subscriptionInformation = map[string]struct{
    UserType int `json:"user_type"`
    ListingLimit int `json:"listing_limit"`
}{
    "prod_QgZYc1Nqtsrqzj": {
        UserType: 2,
        ListingLimit: 10,
    },
}

func verifyUser(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
		return
	}

	params := r.URL.Query()
    token := params.Get("token")
    if token == "" {
		http.Error(w, "token is required", http.StatusBadRequest)
		return
	}

    token_data, err := getTokenPayload(token);
    if(err != nil) {
        sendJSONResponse(w, false, "Token unverified", http.StatusBadRequest)
		return
    }

	// /*42*/ "SELECT user_uuid FROM users WHERE email = $1 AND user_type = 0",
    var uuid string;
    preparedStatements[42].QueryRow(token_data["email"].(string)).Scan(&uuid)

    userType := 1
    err = changeUserType(uuid, userType)
    if err != nil {
        sendJSONResponse(w, false, "Something went wrong while changing user type", http.StatusBadRequest)
		return
    }

    http.Redirect(w, r, "https://insidelineproperties.com/login?status=2", http.StatusFound)
}

func initStripe() {
    // stripe.Key = "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"
    stripe.Key = "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"

}

func createComment(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
		return
	}

	var requestBody struct {
		PostUuid    string `json:"post_uuid"`
		ReplyUuid   string `json:"reply_to"`
		Text        string `json:"text"`
        Token       string `json:"token"`
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

    valid := verifyToken(requestBody.Token);
    if (!valid) {
		sendJSONResponse(w, false, "Invalid token", http.StatusBadRequest)
        return;
    }

    token, err := getTokenPayload(requestBody.Token);
    if err != nil {
        sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		return
	}


    var Output struct {
        CommentUuid     string      `json:"comment_uuid"`
        UserUuid        string      `json:"user_uuid"`
    }

    if (requestBody.ReplyUuid == "") {
        // /*26*/ "INSERT INTO comments (post_uuid, author_uuid, content) VALUES ($1, $2, $3) RETURNING comment_uuid",
        err = preparedStatements[26].QueryRow(requestBody.PostUuid, token["user_uuid"], requestBody.Text).Scan(&Output.CommentUuid)
    } else {
        // /*10*/ "INSERT INTO comments (post_uuid, author_uuid, parent_comment_uuid, content) VALUES ($1, $2, $3, $4)",
        err = preparedStatements[10].QueryRow(requestBody.PostUuid, token["user_uuid"], requestBody.ReplyUuid, requestBody.Text).Scan(&Output.CommentUuid)
    }

	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONResponse(w, false, "Not found", http.StatusNotFound)
		} else {
			sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
		}
		return
	}

    // /*29*/ "UPDATE posts SET comments = comments + 1 WHERE post_uuid = $1",
    _, err = preparedStatements[29].Exec(requestBody.PostUuid)

    if(err != nil) {
        sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
    }

    Output.UserUuid = token["user_uuid"].(string)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(Output)
}

func getComments(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }
    
    var requestBody struct {
        PostUUID  string  `json:"post_uuid"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    
    type CommentData struct {
        CommentUuid         string
        AuthorUuid          string
        Text                string
    }

	// /*27*/ "SELECT comment_uuid, author_uuid, text FROM comments WHERE post_uuid = $1 AND parent_comment_uuid IS NULL LIMIT 20",

    rows, err := preparedStatements[27].Query(requestBody.PostUUID)
    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "Comments not found", http.StatusNotFound)
        } else {
            http.Error(w, "Database error", http.StatusInternalServerError)
        }
        return
    }
    defer rows.Close();


    var comments []CommentData

    for rows.Next() {
		var comment CommentData
		err := rows.Scan(&comment.CommentUuid, &comment.AuthorUuid, &comment.Text)
		if err != nil {
			return
		}
		comments = append(comments, comment)
	}

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(comments)
}
 
func getMostLiked(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }

	// /*30*/ "SELECT author_uuid, post_uuid, likes, comments, image_urls, title, description, likes_for_week[CASE WHEN EXTRACT(WEEK FROM CURRENT_DATE)::int = 1 THEN 51 ELSE EXTRACT(WEEK FROM CURRENT_DATE)::int - 2 END] AS likes_last_week FROM posts ORDER BY likes_last_week DESC LIMIT 5",

    var outputs []struct {
        AuthorUUID    string         `json:"author_uuid"`
        PostUUID      string         `json:"post_uuid"`
        Likes         int            `json:"likes"`
        Comments      int            `json:"comments"`
        ImageURLs     pq.StringArray `json:"image_urls"`
        Title         string         `json:"title"`
        Description     *string      `json:"description"`
        LikesLastWeek int            `json:"likes_last_week"`
    }
    
    // Execute the query and get multiple rows
    rows, err := preparedStatements[30].Query()
    if err != nil {
        sendJSONResponse(w, false, "Internal error: "+err.Error(), http.StatusInternalServerError)
        return
    }
    defer rows.Close()
    
    // Iterate through the rows and scan into the slice
    for rows.Next() {
        var output struct {
            AuthorUUID    string         `json:"author_uuid"`
            PostUUID      string         `json:"post_uuid"`
            Likes         int            `json:"likes"`
            Comments      int            `json:"comments"`
            ImageURLs     pq.StringArray `json:"image_urls"`
            Title         string         `json:"title"`
        Description     *string      `json:"description"`
            LikesLastWeek int            `json:"likes_last_week"`
        }
    
        err := rows.Scan(&output.AuthorUUID, &output.PostUUID, &output.Likes, &output.Comments, &output.ImageURLs, &output.Title, &output.Description, &output.LikesLastWeek)
        if err != nil {
            sendJSONResponse(w, false, "Internal error: "+err.Error(), http.StatusInternalServerError)
            return
        }
    
        outputs = append(outputs, output)
    }
    
    // Handle any errors that occurred during iteration
    if err = rows.Err(); err != nil {
        sendJSONResponse(w, false, "Internal error: "+err.Error(), http.StatusInternalServerError)
        return
    }
    
    // Now you have `outputs` populated with the top 5 results
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(outputs)
}

func followingUser(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }

    var requestBody struct {
        UserUUID  string  `json:"user_uuid"`
        TargetUUID string   `json:"target_uuid"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    var output struct {
        Following bool  `json:"following"`
    }

	// /*5*/ "SELECT EXISTS (SELECT 1 FROM users WHERE user_uuid = $1 AND $2 = ANY(following)) AS is_following;",
    err := preparedStatements[5].QueryRow(requestBody.UserUUID, requestBody.TargetUUID).Scan(&output.Following)

    if(err != nil) {
        sendJSONResponse(w, false, "Internal error"+string(err.Error()), http.StatusInternalServerError)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(output)
}

type SubscriptionDetails struct {
    SubscriptionID  string
    CardDetails     string
    ExpirationDate  string
    NextInvoiceID   string
    NextInvoiceDate string
    NextInvoicePrice float64 // Amount in dollars
}

func getCurrentPostal(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }

    userIP := readUserIP(r)
    token := "08864c8ee0dd16"

    if(userIP=="::1") {
        userIP="104.222.19.65"
    }

    url := fmt.Sprintf("https://ipinfo.io/%s?token=%s", userIP, token)

    resp, err := http.Get(url)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()

	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

    fmt.Println(string(body))

    var rawOutput struct {
		Postal string `json:"postal"`
		Loc    string `json:"loc"`
	}

    if err := json.Unmarshal(body, &rawOutput); err != nil {
		fmt.Println("Error:", err)
		return
	}

    locParts := strings.Split(rawOutput.Loc, ",")
	if len(locParts) != 2 {
		fmt.Println("Error: Invalid loc format")
		return
	}

    lat, err := strconv.ParseFloat(locParts[0], 32)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

    lng, err := strconv.ParseFloat(locParts[1], 32)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

    var output struct {
        Postal      int         `json:"postal"`
        Lat         float32     `json:"lat"`
        Lng         float32     `json:"lng"`
    }

    postal, err := strconv.Atoi(rawOutput.Postal)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

    output.Postal = postal
	output.Lat = float32(lat)
	output.Lng = float32(lng)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(output)
}

func getLocationFromAddress(w http.ResponseWriter, r *http.Request){
    if handleCORS(w, r) {
        return
    }
    
	var requestBody struct {
		Address string `json:"address"`
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

    api_key := "AIzaSyAHz5ybmJZiZcHTlfHXGdin_Y2Olt0KViE"
	endpoint := "https://maps.googleapis.com/maps/api/geocode/json"
	params := url.Values{}
	params.Add("address", requestBody.Address)
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

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func search(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }

    var requestBody struct {
        SearchString string `json:"search_string"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    type User struct {
        UserUUID     string
        Username     string
        DisplayName  string
        SimilarityScore float32
    }
    
    // Slice to hold the query results
    var users []User

	// /*22*/ "SELECT user_uuid, username, display_name, (similarity(display_name, $1) + similarity(username, $1)) AS similarity_score FROM users WHERE (similarity(display_name, $1) + similarity(username, $1)) > 0.4 ORDER BY similarity_score DESC LIMIT 5;",


    rows, err := preparedStatements[22].Query(requestBody.SearchString)
    if err != nil {
        log.Fatalf("Query failed: %v", err)
    }
    defer rows.Close()
    
    // Iterate through the result rows
    for rows.Next() {
        var user User
        err := rows.Scan(&user.UserUUID, &user.Username, &user.DisplayName, &user.SimilarityScore)
        if err != nil {
            log.Fatalf("Failed to scan row: %v", err)
        }
        users = append(users, user)
    }
    
    // Check for errors encountered during iteration
    if err = rows.Err(); err != nil {
        log.Fatalf("Row iteration failed: %v", err)
    }


    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

func discovery(w http.ResponseWriter, r *http.Request) {
    // Your handler code here
}

const weeksInYear = 52
type LikeTracker struct {
	weeklyLikes [weeksInYear]int
}

func getCurrentWeek() int {
	_, week := time.Now().ISOWeek()
	return week - 1 // Subtract 1 to make it 0-indexed for the array
}

func getLastWeek() int {
	currentWeek := getCurrentWeek()
	if currentWeek == 0 {
		return weeksInYear - 1 // Return the last week of the previous year
	}
	return currentWeek - 1
}

func adminRemovePost(w http.ResponseWriter, r *http.Request) {
    // Your handler code here
}

func adminRemoveUser(w http.ResponseWriter, r *http.Request) {
    // Your handler code here
}

func resendEmailVerification(w http.ResponseWriter, r *http.Request) {
    if handleCORS(w, r) {
        return
    }

    var requestBody struct {
        Email string `json:"email"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    var true_email string;
    err := preparedStatements[43].QueryRow(requestBody.Email).Scan(&true_email)
    if err != nil {
		sendJSONResponse(w, false, "Email error1", http.StatusInternalServerError)
		return
	}

    _, err = sendEmail(true_email);
    if err != nil {
		sendJSONResponse(w, false, "Email error2", http.StatusInternalServerError)
		return
	}

    sendJSONResponse(w, true, "Success", http.StatusOK)
}

func returnBasic(w http.ResponseWriter, r *http.Request) {
    response := map[string]interface{}{
        "response_data": "data", 
        "otherdata": 2,
    }
    jsonResponse, err := json.Marshal(response)

    if err != nil {
        http.Error(w, "Error converting response to JSON", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Header().Set("Content-Type", "application/json")
    w.Write(jsonResponse)
}




func initDB() {
    err := godotenv.Load("/home/duck681/.env")
    if err != nil {
        log.Fatal("Error loading .env file")
    }
    
    dbstring := os.Getenv("POSTGRES_STRING")

    connStr := dbstring + " sslmode=disable"
    db, err = sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal(err)
    }

    for i, query := range statements {
        preparedStatements[i], err = db.Prepare(query)
        if err != nil {
            log.Fatal(err)
        }
    }

    err = db.Ping()
    if err != nil {
        log.Fatal(err)
    }
}

func closePreparedStatements() {
    for _, stmt := range preparedStatements {
        if stmt != nil {
            err := stmt.Close()
            if err != nil {
                log.Printf("Error closing statement: %v", err)
            }
        }
    }
}

func cacheControlFileServer(fs http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Check if the URL path contains "_pfp"
        if strings.Contains(r.URL.Path, "_pfp") {
            // Set cache-control headers for images containing "_pfp"
            w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate") // HTTP 1.1.
            w.Header().Set("Pragma", "no-cache") // HTTP 1.0.
            w.Header().Set("Expires", "0") // Proxies.
        }

        // Serve the file
        fs.ServeHTTP(w, r)
    })
}

func handleFuncs() {
    // consider using "github.com/gorilla/mux"

    // http.HandleFunc("/", returnBasic)
    // Public user data : UserID, specific info (all, name, houses, ...)
    http.HandleFunc("/publicUserData", publicUserData)
    // Private user data : UserID, UserPass, specific info (all, name, houses, email, ...)
    http.HandleFunc("/privateUserData", privateUserData)

    // Login user : UserID, UserPass
    http.HandleFunc("/loginUser", loginUser)
    // Create user : UserID, UserPass, ...
    http.HandleFunc("/createUser", createUser)
    // Update user : UserID, UserPass, updated info
    http.HandleFunc("/updateUser", updateUser)
    // Delete user : UserID, UserPass
    http.HandleFunc("/deleteUser", deleteUser)
    // Report user : UserID (reported), UserID (member), UserPass (member), reason
    http.HandleFunc("/reportUser", reportUser)
    // Follow user : UserID (followed), UserID (member), UserPass (member), follow/unfollow
    http.HandleFunc("/followUser", followUser)
    http.HandleFunc("/followingUser", followingUser)
    // Reply : PostID, CommentID, UserID, UserPass, Words
    http.HandleFunc("/reply", reply)

    http.HandleFunc("/upcomingInvoice", upcomingInvoice)


    // Create post : UserID, UserPass, Type, Data
    http.HandleFunc("/createPost", createPost)
    // Update post: UserID, UserPass, PostID, Data
    http.HandleFunc("/updatePost", updatePost)
    http.HandleFunc("/resendEmailVerification", resendEmailVerification)
    // Remove post: UserID, UserPass, PostID
    http.HandleFunc("/removePost", removePost)
    // Report post : PostID (reported), UserID (member), UserPass (member), reason
    http.HandleFunc("/reportPost", reportPost)
    // Viewed Post : UserID, PostID
    http.HandleFunc("/viewedPost", viewedPost)
    // Like post : UserID, UserPass, PostID, liked/unliked
    http.HandleFunc("/likePost", likePost)
    http.HandleFunc("/userLiked", userLiked)
    // Get post data : PostID
    http.HandleFunc("/getPostData", getPostData)
    http.HandleFunc("/getSpecificPostData", getSpecificPostData)
    http.HandleFunc("/getRecommendedPostData", getRecommendedPostData)
    //
    http.HandleFunc("/createComment", createComment)
    http.HandleFunc("/verifyUser", verifyUser)
    http.HandleFunc("/getComments", getComments)
    //
    http.HandleFunc("/getCurrentPostal", getCurrentPostal)
    //
    http.HandleFunc("/getMarkersNear", getMarkersNear)
    http.HandleFunc("/sold", sold)
    //
    http.HandleFunc("/getLocationFromAddress", getLocationFromAddress)
    // last week
    http.HandleFunc("/getMostLiked", getMostLiked)
    // Search : type(s) (accounts, houses, designs), amount, offset, search settings
    http.HandleFunc("/search", search)
    // Discovery : UserID, type
    // content based filtering
    http.HandleFunc("/discovery", discovery)
    // Admin remove post : PostID, UserID (admin), UserPass (admin), reason
    http.HandleFunc("/adminRemovePost", adminRemovePost)
    // Admin remove user : UserID (to remove), UserID (admin), UserPass (admin), reason
    http.HandleFunc("/adminRemoveUser", adminRemoveUser)
    //
    http.HandleFunc("/createCheckoutSession", createCheckoutSession)
    http.HandleFunc("/createPortalSession", createPortalSession)
    // Upload image
    handler := limitRequestSize(http.HandlerFunc(uploadHandler), 6*1024*1024)
    http.Handle("/uploadImage", handler)

    fs := http.FileServer(http.Dir("/var/uploads"))
	http.Handle("/images/", cacheControlFileServer(http.StripPrefix("/images/", fs)))
}

func closeDB() {
    if db != nil {
        db.Close()
    }
}

func logDBStats() {
    stats := db.Stats()
    log.Printf("DB Stats: Open=%d, InUse=%d, Idle=%d, WaitCount=%d, WaitDuration=%v, MaxOpenConnections=%d\n",
        stats.OpenConnections,
        stats.InUse,
        stats.Idle,
        stats.WaitCount,
        stats.WaitDuration,
        stats.MaxOpenConnections)
}

type SubDetails struct {
    Listings int
}

var SubMap = map[string]SubDetails{
    "free": {Listings: 7}, // $0
    "prod_Ql4uPlQOWQuGQy": {Listings: 20}, // $10
    "prod_Ql4udLUWeBqwN2": {Listings: 100}, // $25
    // "prod_Ql4vhF1VbZSrSw": {Listings: 1000}, // $50
    // "prod_Ql4vbHlnADlhym": {Listings: 1000}, // $100
    // "prod_Ql4vrTOnXUaBgv": {Listings: 1000}, // $1000
}

func GetUserSubscription(email string) (string, string, error) {
    // Retrieve customers by email
    params := &stripe.CustomerListParams{
        Email: stripe.String(email),
    }
    customers := customer.List(params)

    if !customers.Next() {
        return "", "", fmt.Errorf("no customer found with email: %s", email)
    }

    cust := customers.Customer()

    // Fetch subscriptions for the customer
    subParams := &stripe.SubscriptionListParams{
        Customer: stripe.String(cust.ID),
    }
    subs := subscription.List(subParams)

    if !subs.Next() {
        return "", "", fmt.Errorf("no subscription found for customer with email: %s", email)
    }

    sub := subs.Subscription()

    // Check if there's more than one subscription
    if subs.Next() {
        return "", "", fmt.Errorf("more than one subscription found for customer with email: %s", email)
    }

    for _, item := range sub.Items.Data {
        priceID := item.Price.ID
        priceObj, err := price.Get(priceID, nil)
        if err != nil {
            return "", "", err
        }
        fmt.Printf("Price ID: %s, Product ID: %s\n", priceID, priceObj.Product.ID)
        return priceObj.Product.ID, sub.ID, nil
    }
    return "", "", fmt.Errorf("internal error 1680")
}

var client *resend.Client
var ctx context.Context

func createEmailToken(email string) (string, error) {
    type EmailClaim struct {
        Email string `json:"email"`
        jwt.RegisteredClaims
    }
    claims := &EmailClaim{
        Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * time.Minute)),
		},
	}

	// Create the token using the HS256 signing method
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with the secret key
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func sendEmail(user_email string) (bool, error) {
    token, err := createEmailToken(user_email)
    if(err != nil) {
        return false, err
    }
    params := &resend.SendEmailRequest{
        From:        "no-reply <do-not-reply@insidelineproperties.com>",
        To:          []string{user_email},
        Subject:     "Email Verification",
        Html:        "<p>Click this link to verify your email: <a href='https://api.insidelineproperties.com/verifyUser?token="+token+"'>Verify Email</a></p>",
    }
    sent, err := client.Emails.SendWithContext(ctx, params)
    if err != nil {
        return false, err
    }
    log.Println(sent.Id)
    return true, nil
}

func main() {
    err := godotenv.Load("/home/duck681/.env")
    if err != nil {
        log.Fatal("Error loading .env file")
    }
    
    resend_key := os.Getenv("RESEND_KEY")

    ctx = context.TODO()
    client = resend.NewClient(resend_key)

    initDB()
    defer closeDB()
    defer closePreparedStatements()
    handleFuncs()
    initStripe()

    PORT := "8090"
    fmt.Println("Server started on port", PORT)
    log.Fatal(http.ListenAndServe(":" + PORT, nil))
}