package handler

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/matwate/proyecto-datos/db"
)

// CreateEstudianteRequest represents the request body for creating a new student.
type CreateEstudianteRequest struct {
	Nombre            string `json:"nombre" example:"Juan"`
	Apellido          string `json:"apellido" example:"Perez"`
	Correo            string `json:"correo" example:"juan.perez@urosario.edu.co"`
	ProgramaAcademico string `json:"programa_academico" example:"Ingeniería de Sistemas"`
	Semestre          int32  `json:"semestre" example:"5"`
	TI                int32  `json:"ti" example:"1000123456"`
}

// CreateEstudianteResponse represents the response body after creating a new student.
type CreateEstudianteResponse struct {
	EstudianteID int32 `json:"estudiante_id"`
}

// CreateEstudianteHandler handles the creation of a new student.
// @Summary      Create Estudiante
// @Description  Creates a new student record.
// @Tags         Estudiantes
// @Accept       json
// @Produce      json
// @Param        estudiante body CreateEstudianteRequest true "Estudiante Data"
// @Success      201 {object} CreateEstudianteResponse "Successfully created student"
// @Failure      400 {object} ErrorResponse "Invalid request body"
// @Failure      500 {object} ErrorResponse "Failed to create student"
// @Router       /v1/estudiantes [post]
func CreateEstudianteHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req CreateEstudianteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		params := db.CreateEstudianteParams{
			Nombre:            req.Nombre,
			Apellido:          req.Apellido,
			Correo:            req.Correo,
			ProgramaAcademico: req.ProgramaAcademico,
			Semestre:          pgtype.Int4{Int32: req.Semestre, Valid: true},
			Ti:                pgtype.Int4{Int32: req.TI, Valid: true},
		}

		estudianteID, err := queries.CreateEstudiante(r.Context(), params)
		if err != nil {
			http.Error(w, "Failed to create student: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(CreateEstudianteResponse{EstudianteID: estudianteID})
	}
}
