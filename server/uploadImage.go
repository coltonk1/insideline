package main

import (
	"fmt"
	"image"
	"image/jpeg"
	_ "image/jpeg"
	"image/png"
	_ "image/png"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/nfnt/resize"
)

const maxFileSize = 5 * 1024 * 1024 // 5 MB

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	defer timeTrack(time.Now(), "Timer")
	if handleCORS(w, r) {
		return
	}

	var requestBody struct {
		Token 	string 	`json:"token"`
		Type 	int		`json:"type"`
	}

	type_, err := strconv.Atoi(r.FormValue("type"))
	if err != nil {
		sendJSONResponse(w, false, "int->string error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	requestBody.Type = type_
	requestBody.Token = r.FormValue("token")

	if requestBody.Token == "" {
		http.Error(w, "Token is missing", http.StatusBadRequest)
		return
	}

	validToken := verifyToken(requestBody.Token)
	if !validToken {
		sendJSONResponse(w, false, "Invalid Token", http.StatusUnauthorized)
		return
	}

	token_data, err := getTokenPayload(requestBody.Token)
	if err != nil {
		sendJSONResponse(w, false, "Internal error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	err = r.ParseMultipartForm(maxFileSize)
	if err != nil {
		sendJSONResponse(w, false, "File size too large", http.StatusRequestEntityTooLarge)
		return
	}

	// Retrieve the file from the form
	file, _, err := r.FormFile("image")
	if err != nil {
		sendJSONResponse(w, false, "Failed to get file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Check if the file is a valid image
	_, format, err := image.DecodeConfig(file)
	if err != nil {
		sendJSONResponse(w, false, "File is not a valid image: "+err.Error(), http.StatusBadRequest)
		return
	}

	format = "." + format
	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		sendJSONResponse(w, false, "Failed to reset file pointer: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Check file size
	fileSize := int64(0)
	buffer := make([]byte, 1024*1024) // 1 MB buffer
	for {
		n, err := file.Read(buffer)
		if err != nil && err != io.EOF {
			sendJSONResponse(w, false, "Failed to read file: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if n == 0 {
			break
		}
		fileSize += int64(n)
		if fileSize > maxFileSize {
			sendJSONResponse(w, false, "File size exceeds 5 MB limit", http.StatusRequestEntityTooLarge)
			return
		}
	}

	// Reset the file pointer to the beginning for saving
	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		sendJSONResponse(w, false, "Failed to reset file pointer: "+err.Error(), http.StatusInternalServerError)
		return
	}

	ImageUUID := uuid.New()
	var originalPath string
	log.Printf("Type: %d", requestBody.Type)
	originalPath = filepath.Join("/var/uploads", ImageUUID.String()+format)
	if requestBody.Type == 3 {
		userUUID, ok := token_data["user_uuid"].(string)
		if !ok {
			sendJSONResponse(w, false, "Invalid user UUID format", http.StatusInternalServerError)
			return
		}
		log.Printf("UserUUID: %s", userUUID)
		originalPath = filepath.Join("/var/uploads", userUUID+format)
	}

	// Create a file and stream data to it directly
	outFile, err := os.Create(originalPath)
	if err != nil {
		sendJSONResponse(w, false, "Failed to create file: "+err.Error(), http.StatusInternalServerError)
		log.Println("Failed to create file:", err)
		return
	}
	defer outFile.Close()

	// Stream file data directly to disk
	if _, err := io.Copy(outFile, file); err != nil {
		sendJSONResponse(w, false, "Failed to save file: "+err.Error(), http.StatusInternalServerError)
		log.Println("Failed to save file:", err)
		return
	}

    log.Println("Processing type:", requestBody.Type)
    var previewPath string
    var previewErr error
    
    switch requestBody.Type {
    case 0:
        previewPath, previewErr = createPreviewImage(originalPath)
    case 2:
        previewPath, previewErr = createPreviewImageNormal(originalPath)
    case 3:
        previewPath, previewErr = createProfileImage(originalPath, token_data["user_uuid"].(string))
    default:
        previewErr = fmt.Errorf("unknown type: %d", requestBody.Type)
    }

    log.Println(previewPath)
    
    if previewErr != nil {
        sendJSONResponse(w, false, "Failed to create preview image: "+previewErr.Error(), http.StatusInternalServerError)
        log.Printf("Failed to create preview image: %v", previewErr)
        return
    }

	sendJSONResponse(w, true, filepath.Base(originalPath), http.StatusOK)
	log.Println("File uploaded")
}

func createProfileImage(originalPath string, uuid string) (string, error) {
    log.Println("Creating square preview for profile")

    // Open the original image
    file, err := os.Open(originalPath)
    if err != nil {
        return "", err
    }
    defer file.Close()

    // Decode the image
    img, _, err := image.Decode(file)
    if err != nil {
        return "", err
    }

    // Get the bounds of the image
    bounds := img.Bounds()
    width := bounds.Dx()
    height := bounds.Dy()

    // Calculate the size and position for cropping
    size := width
    if height < width {
        size = height
    }
    x := (width - size) / 2
    y := (height - size) / 2

    // Crop the image
    croppedImg := img.(interface {
        SubImage(r image.Rectangle) image.Image
    }).SubImage(image.Rect(x, y, x+size, y+size))

    // Resize the cropped image to 150x150
    previewImg := resize.Resize(150, 150, croppedImg, resize.Lanczos3)

    // Set the preview filename to have a .jpg extension
    previewFileName := uuid + "_pfp.jpg"

    // Ensure the directory exists
    previewDir := "/var/uploads"
    if _, err := os.Stat(previewDir); os.IsNotExist(err) {
        err = os.MkdirAll(previewDir, os.ModePerm)
        if err != nil {
            return "", err
        }
    }

    // Save the preview image
    previewPath := filepath.Join(previewDir, previewFileName)
    previewFile, err := os.Create(previewPath)
    if err != nil {
        return "", err
    }
    defer previewFile.Close()

    // Always save as JPEG
    err = jpeg.Encode(previewFile, previewImg, nil)
    if err != nil {
        return "", err
    }

    return previewFileName, nil
}

func createPreviewImage(originalPath string) (string, error) {
	log.Println("Creating square preview")

    // Open the original image
    file, err := os.Open(originalPath)
    if err != nil {
        return "", err
    }
    defer file.Close()

    // Decode the image
    img, _, err := image.Decode(file)
    if err != nil {
        return "", err
    }

    // Get the bounds of the image
    bounds := img.Bounds()
    width := bounds.Dx()
    height := bounds.Dy()

    // Calculate the size and position for cropping
    size := width
    if height < width {
        size = height
    }
    x := (width - size) / 2
    y := (height - size) / 2

    // Crop the image
    croppedImg := img.(interface {
        SubImage(r image.Rectangle) image.Image
    }).SubImage(image.Rect(x, y, x+size, y+size))

    // Resize the cropped image to 300x300
    previewImg := resize.Resize(400, 400, croppedImg, resize.Lanczos3)

    // Generate preview filename
    ext := filepath.Ext(originalPath)
    previewFileName := strings.TrimSuffix(filepath.Base(originalPath), ext) + "_preview" + ext

    // Ensure the directory exists
    previewDir := "/var/uploads"
    if _, err := os.Stat(previewDir); os.IsNotExist(err) {
        err = os.MkdirAll(previewDir, os.ModePerm)
        if err != nil {
            return "", err
        }
    }

    // Save the preview image
    previewPath := filepath.Join(previewDir, previewFileName)
    previewFile, err := os.Create(previewPath)
    if err != nil {
        return "", err
    }
    defer previewFile.Close()

    // Encode and save based on file extension
    switch strings.ToLower(ext) {
    case ".jpg", ".jpeg":
        err = jpeg.Encode(previewFile, previewImg, nil)
    case ".png":
        err = png.Encode(previewFile, previewImg)
    default:
        return "", fmt.Errorf("unsupported image format: %s", ext)
    }

    if err != nil {
        return "", err
    }

    return previewFileName, nil
}

const (
    PREVIEW_WIDTH        = 500
    PREVIEW_HEIGHT       = 700
    MIN_HEIGHT           = 300
    UPLOAD_DIRECTORY_PATH = "/var/uploads"
)

func createPreviewImageNormal(originalPath string) (string, error) {
    file, err := os.Open(originalPath)
    if err != nil {
        return "", err
    }
    defer file.Close()

    // Decode the image
    img, _, err := image.Decode(file)
    if err != nil {
        return "", err
    }

    // Resize the image width to 300px, maintaining aspect ratio
    previewImg := resize.Resize(PREVIEW_WIDTH, 0, img, resize.Lanczos3)

    // Get the new bounds of the image after resizing
    newBounds := previewImg.Bounds()
    newWidth := newBounds.Dx()
    newHeight := newBounds.Dy()

    // If the new height is below 150, scale up the height to 100px
	if newHeight < MIN_HEIGHT {
        // Calculate new width while maintaining aspect ratio
        newWidth = int(float64(newWidth) * (float64(MIN_HEIGHT) / float64(newHeight)))
        previewImg = resize.Resize(uint(newWidth), MIN_HEIGHT, previewImg, resize.Lanczos3)

        // Update the new bounds
        newBounds = previewImg.Bounds()
        newWidth = newBounds.Dx()
        newHeight = newBounds.Dy()

		if newWidth > PREVIEW_WIDTH {
			x := (newWidth - PREVIEW_WIDTH) / 2
			y := 0
	
			// Crop the image to 300x150 from the center
			previewImg = previewImg.(interface {
				SubImage(r image.Rectangle) image.Image
			}).SubImage(image.Rect(x, y, x+PREVIEW_WIDTH, y+MIN_HEIGHT))
		}
    }

    if newHeight > PREVIEW_HEIGHT {
        x := 0
        y := (newHeight - PREVIEW_HEIGHT) / 2

        previewImg = previewImg.(interface {
            SubImage(r image.Rectangle) image.Image
        }).SubImage(image.Rect(x, y, x+newWidth, y+PREVIEW_HEIGHT))
    }

    // Generate preview filename
    ext := filepath.Ext(originalPath)
    previewFileName := strings.TrimSuffix(filepath.Base(originalPath), ext) + "_preview" + ext

    // Ensure the directory exists
    previewDir := "/var/uploads"
    if _, err := os.Stat(previewDir); os.IsNotExist(err) {
        err = os.MkdirAll(previewDir, os.ModePerm)
        if err != nil {
            return "", err
        }
    }

    // Save the preview image
    previewPath := filepath.Join(previewDir, previewFileName)
    previewFile, err := os.Create(previewPath)
    if err != nil {
        return "", err
    }
    defer previewFile.Close()

    // Encode and save based on file extension
    switch strings.ToLower(ext) {
    case ".jpg", ".jpeg":
        err = jpeg.Encode(previewFile, previewImg, nil)
    case ".png":
        err = png.Encode(previewFile, previewImg)
    default:
        return "", fmt.Errorf("unsupported image format: %s", ext)
    }

    if err != nil {
        return "", err
    }

    return previewFileName, nil
}