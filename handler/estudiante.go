package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/matwate/proyecto-datos/db"
)

// CreateEstudianteRequest represents the request body for creating a new student.
type CreateEstudianteRequest struct {
	Nombre            string `json:"nombre"             example:"Juan"`
	Apellido          string `json:"apellido"           example:"Perez"`
	Correo            string `json:"correo"             example:"juan.perez@urosario.edu.co"`
	ProgramaAcademico string `json:"programa_academico" example:"Ingeniería de Sistemas"`
	Semestre          int32  `json:"semestre"           example:"5"`
	TI                int32  `json:"ti"                 example:"1000123456"`
}

// CreateEstudianteResponse represents the response body after creating a new student.
type CreateEstudianteResponse struct {
	EstudianteID int32 `json:"estudiante_id"`
}

// UpdateEstudianteRequest represents the request body for updating a student.
type UpdateEstudianteRequest struct {
	Nombre            string `json:"nombre"             example:"Juan Carlos"`
	Apellido          string `json:"apellido"           example:"Perez"`
	Correo            string `json:"correo"             example:"juan.perez@urosario.edu.co"`
	ProgramaAcademico string `json:"programa_academico" example:"Ingeniería de Sistemas"`
	Semestre          int32  `json:"semestre"           example:"6"`
	TI                int32  `json:"ti"                 example:"1000123456"`
}

// EstudianteHandlers handles all estudiante-related endpoints using Go 1.24 routing patterns.
// @Summary      Handle Estudiante Operations
// @Description  Comprehensive CRUD operations for students.
// @Tags         Estudiantes
func EstudianteHandlers(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			createEstudianteHandler(w, r, queries)
		case http.MethodGet:
			handleEstudianteGET(w, r, queries)
		case http.MethodPut:
			updateEstudianteHandler(w, r, queries)
		case http.MethodDelete:
			deleteEstudianteHandler(w, r, queries)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// createEstudianteHandler handles POST /v1/estudiantes
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
func createEstudianteHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
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
	json.NewEncoder(w).Encode(CreateEstudianteResponse{EstudianteID: estudianteID.EstudianteID})
}

// handleEstudianteGET handles GET requests for estudiantes
func handleEstudianteGET(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/estudiantes")

	if path == "" || path == "/" {
		// Check for query parameters
		if programa := r.URL.Query().Get("programa"); programa != "" {
			// GET /v1/estudiantes?programa={programa}
			listEstudiantesByProgramaHandler(w, r, queries, programa)
			return
		}
		// GET /v1/estudiantes - List all estudiantes
		listEstudiantesHandler(w, r, queries)
		return
	}

	// Parse ID from path: /v1/estudiantes/{id}
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) == 1 && pathParts[0] != "" {
		getEstudianteByIDHandler(w, r, queries, pathParts[0])
		return
	}

	http.Error(w, "Invalid path", http.StatusBadRequest)
}

// listEstudiantesHandler handles GET /v1/estudiantes
// @Summary      List All Estudiantes
// @Description  Retrieves a list of all students.
// @Tags         Estudiantes
// @Produce      json
// @Success      200 {array} db.Estudiante "Successfully retrieved estudiantes"
// @Failure      500 {object} ErrorResponse "Failed to retrieve estudiantes"
// @Router       /v1/estudiantes [get]
func listEstudiantesHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	estudiantes, err := queries.ListEstudiantes(r.Context())
	if err != nil {
		http.Error(
			w,
			"Failed to retrieve estudiantes: "+err.Error(),
			http.StatusInternalServerError,
		)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(estudiantes)
}

// getEstudianteByIDHandler handles GET /v1/estudiantes/{id}
// @Summary      Get Estudiante by ID
// @Description  Retrieves a specific student by their ID.
// @Tags         Estudiantes
// @Produce      json
// @Param        id path int true "Estudiante ID"
// @Success      200 {object} db.Estudiante "Successfully retrieved estudiante"
// @Failure      400 {object} ErrorResponse "Invalid estudiante ID"
// @Failure      404 {object} ErrorResponse "Estudiante not found"
// @Failure      500 {object} ErrorResponse "Failed to retrieve estudiante"
// @Router       /v1/estudiantes/{id} [get]
func getEstudianteByIDHandler(
	w http.ResponseWriter,
	r *http.Request,
	queries *db.Queries,
	idStr string,
) {
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid estudiante ID", http.StatusBadRequest)
		return
	}

	estudiante, err := queries.SelectEstudianteById(r.Context(), int32(id))
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Estudiante not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to retrieve estudiante: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(estudiante)
}

// listEstudiantesByProgramaHandler handles GET /v1/estudiantes?programa={programa}
// @Summary      List Estudiantes by Program
// @Description  Retrieves students filtered by academic program.
// @Tags         Estudiantes
// @Produce      json
// @Param        programa query string true "Academic program"
// @Success      200 {array} db.Estudiante "Successfully retrieved estudiantes"
// @Failure      500 {object} ErrorResponse "Failed to retrieve estudiantes"
// @Router       /v1/estudiantes [get]
func listEstudiantesByProgramaHandler(
	w http.ResponseWriter,
	r *http.Request,
	queries *db.Queries,
	programa string,
) {
	estudiantes, err := queries.ListEstudiantesByPrograma(r.Context(), programa)
	if err != nil {
		http.Error(
			w,
			"Failed to retrieve estudiantes: "+err.Error(),
			http.StatusInternalServerError,
		)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(estudiantes)
}

// updateEstudianteHandler handles PUT /v1/estudiantes/{id}
// @Summary      Update Estudiante
// @Description  Updates an existing student.
// @Tags         Estudiantes
// @Accept       json
// @Produce      json
// @Param        id path int true "Estudiante ID"
// @Param        estudiante body UpdateEstudianteRequest true "Updated Estudiante Data"
// @Success      200 {object} db.Estudiante "Successfully updated estudiante"
// @Failure      400 {object} ErrorResponse "Invalid request body or estudiante ID"
// @Failure      404 {object} ErrorResponse "Estudiante not found"
// @Failure      500 {object} ErrorResponse "Failed to update estudiante"
// @Router       /v1/estudiantes/{id} [put]
func updateEstudianteHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/estudiantes/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid estudiante ID", http.StatusBadRequest)
		return
	}

	var req UpdateEstudianteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	params := db.UpdateEstudianteParams{
		EstudianteID:      int32(id),
		Nombre:            req.Nombre,
		Apellido:          req.Apellido,
		Correo:            req.Correo,
		ProgramaAcademico: req.ProgramaAcademico,
		Semestre:          pgtype.Int4{Int32: req.Semestre, Valid: true},
		Ti:                pgtype.Int4{Int32: req.TI, Valid: true},
	}

	estudiante, err := queries.UpdateEstudiante(r.Context(), params)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Estudiante not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update estudiante: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(estudiante)
}

// deleteEstudianteHandler handles DELETE /v1/estudiantes/{id}
// @Summary      Delete Estudiante
// @Description  Deletes a student by their ID.
// @Tags         Estudiantes
// @Param        id path int true "Estudiante ID"
// @Success      204 "Successfully deleted estudiante"
// @Failure      400 {object} ErrorResponse "Invalid estudiante ID"
// @Failure      500 {object} ErrorResponse "Failed to delete estudiante"
// @Router       /v1/estudiantes/{id} [delete]
func deleteEstudianteHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/estudiantes/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid estudiante ID", http.StatusBadRequest)
		return
	}

	err = queries.DeleteEstudiante(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "Failed to delete estudiante: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
