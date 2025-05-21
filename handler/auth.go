package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype" // Import pgtype

	"github.com/matwate/proyecto-datos/db"
)

// ErrorResponse represents a generic error response for API operations.
type ErrorResponse struct {
	Error string `json:"error" example:"Descriptive error message"`
}

// LoginRequest represents the request body for the login endpoint.
type LoginRequest struct {
	Correo string `json:"correo" example:"test@urosario.edu.co"` // Correo is the email of the student.
	TI     int32  `json:"ti"     example:"123456789"`            // TI is the student's identity number.
}

// LoginHandler handles student authentication.
// @Summary      Student Login
// @Description  Authenticates a student using their email and TI (Tarjeta de Identidad).
// @Tags         Authentication
// @Accept       json
// @Produce      json
// @Param        login body LoginRequest true "Login Credentials"
// @Success      200 {object} db.Estudiante  "Successfully authenticated. Returns student details."
// @Failure      400 {object} ErrorResponse "Invalid request body"
// @Failure      401 {object} ErrorResponse "Invalid credentials (user not found or TI mismatch)"
// @Failure      405 {object} ErrorResponse "Method not allowed"
// @Failure      500 {object} ErrorResponse "Internal server error during login"
// @Router       /v1/login [post]
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
