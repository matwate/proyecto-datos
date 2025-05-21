package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype" // Import pgtype
	"github.com/matwate/proyecto-datos/db"
)

type LoginRequest struct {
	Correo string `json:"correo"`
	TI     int32  `json:"ti"`
}

func LoginHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		estudiante, err := queries.LoginEstudiante(r.Context(), db.LoginEstudianteParams{
			Correo: req.Correo,
			Ti:     pgtype.Int4{Int32: req.TI, Valid: true}, // Use pgtype.Int4
		})
		if err != nil {
			if err == sql.ErrNoRows { // pgxpool.ErrNoRows or pgx.ErrNoRows might be more appropriate depending on the driver
				http.Error(w, "Invalid credentials", http.StatusUnauthorized)
				return
			}
			http.Error(w, "Failed to login", http.StatusInternalServerError)
			return
		}

		// Here you would typically generate a token (e.g., JWT) and return it.
		// For simplicity, we'll just return the student data.
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(estudiante)
	}
}
