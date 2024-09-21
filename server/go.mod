module server

go 1.22.5

require (
	github.com/golang-jwt/jwt/v5 v5.2.1 // direct
	github.com/lib/pq v1.10.9 // direct
	golang.org/x/crypto v0.25.0 // direct
)

require (
	github.com/google/uuid v1.6.0
	github.com/nfnt/resize v0.0.0-20180221191011-83c6a9932646
)

require (
	github.com/resend/resend-go/v2 v2.11.0
	github.com/stripe/stripe-go/v79 v79.8.0
)

require github.com/joho/godotenv v1.5.1
