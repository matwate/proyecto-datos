package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	// Load environment variables from .env file
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "OK HEALthY")
	})

	log.Fatal(func(mux http.Handler) error {
		fmt.Printf("Starting server on port %s...\n", os.Getenv("PORT"))
		return http.ListenAndServe(":"+os.Getenv("PORT"), mux)
	}(mux))
}
