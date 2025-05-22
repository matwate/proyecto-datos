package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/matwate/proyecto-datos/db"
)

// CreateTutorRequest represents the request body for creating a new tutor from an existing student.
type CreateTutorRequest struct {
	EstudianteID int32 `json:"estudiante_id" example:"1"` // Changed to int32 to match SelectEstudianteById param type
}

// CreateTutorResponse represents the response body after creating a new tutor.
type CreateTutorResponse struct {
	TutorID int32 `json:"tutor_id"` // Changed to int32 to match sqlc generated type
}

// LoginTutorRequest represents the request body for tutor login.
type LoginTutorRequest struct {
	Correo string `json:"correo" example:"tutor.perez@urosario.edu.co"`
	TI     int32  `json:"ti" example:"1000123456"`
}

// LoginTutorResponse represents the response for a successful tutor login.
type LoginTutorResponse struct {
	Estudiante db.Estudiante `json:"estudiante"`
	Tutor      db.Tutore     `json:"tutor"`
}

// CreateTutorHandler handles the creation of a new tutor from an existing student.
// @Summary      Create Tutor from Estudiante
// @Description  Creates a new tutor record using data from an existing student.
// @Tags         Tutores
// @Accept       json
// @Produce      json
// @Param        tutor body CreateTutorRequest true "Estudiante ID to become Tutor"
// @Success      201 {object} CreateTutorResponse "Successfully created tutor"
// @Failure      400 {object} ErrorResponse "Invalid request body or Estudiante ID"
// @Failure      404 {object} ErrorResponse "Estudiante not found"
// @Failure      500 {object} ErrorResponse "Failed to create tutor"
// @Router       /v1/tutores [post]
func CreateTutorHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req CreateTutorRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.EstudianteID <= 0 {
			http.Error(w, "Invalid Estudiante ID", http.StatusBadRequest)
			return
		}

		// 1. Fetch Estudiante data
		estudiante, err := queries.SelectEstudianteById(r.Context(), req.EstudianteID) // req.EstudianteID is now int32
		if err != nil {
			if err == sql.ErrNoRows || err.Error() == "no rows in result set" { // pgx might return "no rows in result set"
				http.Error(w, "Estudiante not found", http.StatusNotFound)
				return
			}
			http.Error(w, "Failed to fetch student data: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// 2. Create Tutor using Estudiante's data
		tutorParams := db.CreateTutorParams{
			Nombre:            estudiante.Nombre,                                                                            // string
			Apellido:          estudiante.Apellido,                                                                          // string
			Correo:            estudiante.Correo,                                                                            // string
			ProgramaAcademico: pgtype.Text{String: estudiante.ProgramaAcademico, Valid: estudiante.ProgramaAcademico != ""}, // Convert string to pgtype.Text
		}

		tutorID, err := queries.CreateTutor(r.Context(), tutorParams)
		if err != nil {
			http.Error(w, "Failed to create tutor: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(CreateTutorResponse{TutorID: tutorID})
	}
}
