package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5"

	"github.com/matwate/proyecto-datos/db"
)

func main() {
	// Load environment variables from .env file
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "OK")
	})

	mux.HandleFunc("/api/v1/test", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		con, err := pgx.Connect(ctx, os.Getenv("POSTGRES_URL"))
		if err != nil {
			http.Error(w, "Database connection error", http.StatusInternalServerError)
			return
		}
		defer con.Close(ctx)

		queries := db.New(con)
		res, err := queries.TestSelect(ctx)
		if err != nil {
			http.Error(w, "Database query error", http.StatusInternalServerError)
			return
		}

		// Res is a slice of ints.
		// Convert it to a string for demonstration purposes.

		resStr := ""
		for _, r := range res {
			resStr += fmt.Sprintf("%d ", r.Int32)
		}

		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "Test query result:", res)
	})

	log.Fatal(func(mux http.Handler) error {
		fmt.Printf("Starting server on port %s...\n", os.Getenv("PORT"))
		return http.ListenAndServe(":"+os.Getenv("PORT"), mux)
	}(mux))
}
