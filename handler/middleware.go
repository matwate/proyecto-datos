package handler

import (
	"log"
	"net/http"
)

// responseWriterInterceptor is a custom ResponseWriter to capture the status code.
type responseWriterInterceptor struct {
	http.ResponseWriter
	statusCode int
}

// NewResponseWriterInterceptor creates a new responseWriterInterceptor.
func NewResponseWriterInterceptor(w http.ResponseWriter) *responseWriterInterceptor {
	// Default to 200 OK if WriteHeader is not called.
	return &responseWriterInterceptor{w, http.StatusOK}
}

// WriteHeader captures the status code before writing it to the original ResponseWriter.
func (rwi *responseWriterInterceptor) WriteHeader(code int) {
	rwi.statusCode = code
	rwi.ResponseWriter.WriteHeader(code)
}

// Write calls the original Write method. It's important to have this
// as some handlers might write data without explicitly calling WriteHeader,
// in which case the status is implicitly 200 OK.
func (rwi *responseWriterInterceptor) Write(b []byte) (int, error) {
	return rwi.ResponseWriter.Write(b)
}

// LoggingMiddleware logs the request path (endpoint) and response status code.
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create an interceptor to capture the status code
		interceptor := NewResponseWriterInterceptor(w)

		// Call the next handler in the chain with our custom ResponseWriter
		next.ServeHTTP(interceptor, r)

		// Log the details after the handler has finished
		log.Printf("endpoint: %s, status: %d", r.URL.Path, interceptor.statusCode)
	})
}

// CORSMiddleware adds CORS headers to every response.
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*") // Allow any origin
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// If it's an OPTIONS request, send a 200 OK response
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
		next.ServeHTTP(w, r)
	})
}
