package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

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

// UpdateTutorRequest represents the request body for updating a tutor.
type UpdateTutorRequest struct {
	Nombre            string `json:"nombre" example:"Juan Carlos"`
	Apellido          string `json:"apellido" example:"Perez"`
	Correo            string `json:"correo" example:"juan.perez@urosario.edu.co"`
	ProgramaAcademico string `json:"programa_academico,omitempty" example:"Ingeniería de Sistemas"`
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

// TutorHandlers handles all tutor-related endpoints using Go 1.24 routing patterns.
// @Summary      Handle Tutor Operations
// @Description  Comprehensive CRUD operations for tutors.
// @Tags         Tutores
func TutorHandlers(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			createTutorHandler(w, r, queries)
		case http.MethodGet:
			handleTutorGET(w, r, queries)
		case http.MethodPut:
			updateTutorHandler(w, r, queries)
		case http.MethodDelete:
			deleteTutorHandler(w, r, queries)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// createTutorHandler handles POST /v1/tutores
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
func createTutorHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
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
	estudiante, err := queries.SelectEstudianteById(r.Context(), req.EstudianteID)
	if err != nil {
		if err == sql.ErrNoRows || err.Error() == "no rows in result set" {
			http.Error(w, "Estudiante not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch student data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 2. Create Tutor using Estudiante's data
	tutorParams := db.CreateTutorParams{
		Nombre:            estudiante.Nombre,
		Apellido:          estudiante.Apellido,
		Correo:            estudiante.Correo,
		ProgramaAcademico: estudiante.ProgramaAcademico, // Changed from pgtype.Text
	}

	tutorID, err := queries.CreateTutor(r.Context(), tutorParams)
	if err != nil {
		http.Error(w, "Failed to create tutor: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(CreateTutorResponse{TutorID: tutorID.TutorID})
}

// handleTutorGET handles GET requests for tutores
func handleTutorGET(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutores")

	if path == "" || path == "/" {
		// GET /v1/tutores - List all tutores
		listTutoresHandler(w, r, queries)
		return
	}

	// Parse ID from path: /v1/tutores/{id}
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) == 1 && pathParts[0] != "" {
		getTutorByIDHandler(w, r, queries, pathParts[0])
		return
	}

	http.Error(w, "Invalid path", http.StatusBadRequest)
}

// listTutoresHandler handles GET /v1/tutores
// @Summary      List All Tutores
// @Description  Retrieves a list of all tutors.
// @Tags         Tutores
// @Produce      json
// @Success      200 {array} db.Tutore "Successfully retrieved tutores"
// @Failure      500 {object} ErrorResponse "Failed to retrieve tutores"
// @Router       /v1/tutores [get]
func listTutoresHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	tutores, err := queries.ListTutores(r.Context())
	if err != nil {
		http.Error(w, "Failed to retrieve tutores: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutores)
}

// getTutorByIDHandler handles GET /v1/tutores/{id}
// @Summary      Get Tutor by ID
// @Description  Retrieves a specific tutor by their ID.
// @Tags         Tutores
// @Produce      json
// @Param        id path int true "Tutor ID"
// @Success      200 {object} db.Tutore "Successfully retrieved tutor"
// @Failure      400 {object} ErrorResponse "Invalid tutor ID"
// @Failure      404 {object} ErrorResponse "Tutor not found"
// @Failure      500 {object} ErrorResponse "Failed to retrieve tutor"
// @Router       /v1/tutores/{id} [get]
func getTutorByIDHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, idStr string) {
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutor ID", http.StatusBadRequest)
		return
	}

	tutor, err := queries.SelectTutorById(r.Context(), int32(id))
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Tutor not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to retrieve tutor: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutor)
}

// updateTutorHandler handles PUT /v1/tutores/{id}
// @Summary      Update Tutor
// @Description  Updates an existing tutor.
// @Tags         Tutores
// @Accept       json
// @Produce      json
// @Param        id path int true "Tutor ID"
// @Param        tutor body UpdateTutorRequest true "Updated Tutor Data"
// @Success      200 {object} db.Tutore "Successfully updated tutor"
// @Failure      400 {object} ErrorResponse "Invalid request body or tutor ID"
// @Failure      404 {object} ErrorResponse "Tutor not found"
// @Failure      500 {object} ErrorResponse "Failed to update tutor"
// @Router       /v1/tutores/{id} [put]
func updateTutorHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutores/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutor ID", http.StatusBadRequest)
		return
	}

	var req UpdateTutorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	params := db.UpdateTutorParams{
		TutorID:           int32(id),
		Nombre:            req.Nombre,
		Apellido:          req.Apellido,
		Correo:            req.Correo,
		ProgramaAcademico: req.ProgramaAcademico, // Changed from pgtype.Text
	}

	tutor, err := queries.UpdateTutor(r.Context(), params)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Tutor not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update tutor: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutor)
}

// deleteTutorHandler handles DELETE /v1/tutores/{id}
// @Summary      Delete Tutor
// @Description  Deletes a tutor by their ID.
// @Tags         Tutores
// @Param        id path int true "Tutor ID"
// @Success      204 "Successfully deleted tutor"
// @Failure      400 {object} ErrorResponse "Invalid tutor ID"
// @Failure      500 {object} ErrorResponse "Failed to delete tutor"
// @Router       /v1/tutores/{id} [delete]
func deleteTutorHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutores/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutor ID", http.StatusBadRequest)
		return
	}

	err = queries.DeleteTutor(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "Failed to delete tutor: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
