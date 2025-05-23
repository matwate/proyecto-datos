package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/matwate/proyecto-datos/db"
)

// CreateTutorMateriaRequest represents the request body for creating a tutor-materia assignment.
type CreateTutorMateriaRequest struct {
	TutorID         int32  `json:"tutor_id" example:"1"`
	MateriaID       int32  `json:"materia_id" example:"1"`
	FechaAsignacion string `json:"fecha_asignacion" example:"2024-12-15"`
	Activo          bool   `json:"activo" example:"true"`
}

// CreateTutorMateriaResponse represents the response after creating a tutor-materia assignment.
type CreateTutorMateriaResponse struct {
	AsignacionID int32 `json:"asignacion_id"`
}

// UpdateTutorMateriaRequest represents the request body for updating a tutor-materia assignment.
type UpdateTutorMateriaRequest struct {
	Activo bool `json:"activo" example:"false"`
}

// TutorMateriaHandlers handles all tutor-materia assignment endpoints using Go 1.24 routing patterns.
// @Summary      Handle TutorMateria Operations
// @Description  Comprehensive CRUD operations for tutor-materia assignments.
// @Tags         TutorMaterias
func TutorMateriaHandlers(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			createTutorMateriaHandler(w, r, queries)
		case http.MethodGet:
			handleTutorMateriaGET(w, r, queries)
		case http.MethodPut:
			updateTutorMateriaHandler(w, r, queries)
		case http.MethodDelete:
			deleteTutorMateriaHandler(w, r, queries)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// parseDateString parses date string in YYYY-MM-DD format to pgtype.Date
func parseDateStringTM(dateStr string) (pgtype.Date, error) {
	parsedTime, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return pgtype.Date{}, err
	}

	return pgtype.Date{
		Time:  parsedTime,
		Valid: true,
	}, nil
}

// createTutorMateriaHandler handles POST /v1/tutor-materias
// @Summary      Create TutorMateria Assignment
// @Description  Creates a new tutor-materia assignment.
// @Tags         TutorMaterias
// @Accept       json
// @Produce      json
// @Param        assignment body CreateTutorMateriaRequest true "TutorMateria Assignment Data"
// @Success      201 {object} CreateTutorMateriaResponse "Successfully created assignment"
// @Failure      400 {object} ErrorResponse "Invalid request body"
// @Failure      500 {object} ErrorResponse "Failed to create assignment"
// @Router       /v1/tutor-materias [post]
func createTutorMateriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	var req CreateTutorMateriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fechaAsignacion, err := parseDateStringTM(req.FechaAsignacion)
	if err != nil {
		http.Error(w, "Invalid fecha_asignacion format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	params := db.CreateTutorMateriaParams{
		TutorID:         req.TutorID,
		MateriaID:       req.MateriaID,
		FechaAsignacion: fechaAsignacion,
		Activo:          req.Activo,
	}

	assignment, err := queries.CreateTutorMateria(r.Context(), params)
	if err != nil {
		http.Error(w, "Failed to create assignment: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(CreateTutorMateriaResponse{AsignacionID: assignment.AsignacionID})
}

// handleTutorMateriaGET handles GET requests for tutor-materia assignments
func handleTutorMateriaGET(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutor-materias")

	if path == "" || path == "/" {
		// Check for query parameters
		if tutorID := r.URL.Query().Get("tutor_id"); tutorID != "" {
			// GET /v1/tutor-materias?tutor_id={tutor_id}
			listMateriasByTutorHandler(w, r, queries, tutorID)
			return
		}
		if materiaID := r.URL.Query().Get("materia_id"); materiaID != "" {
			// GET /v1/tutor-materias?materia_id={materia_id}
			listTutoresByMateriaHandler(w, r, queries, materiaID)
			return
		}
		http.Error(w, "Missing required query parameter: tutor_id or materia_id", http.StatusBadRequest)
		return
	}

	// Parse ID from path: /v1/tutor-materias/{id}
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) == 1 && pathParts[0] != "" {
		getTutorMateriaByIDHandler(w, r, queries, pathParts[0])
		return
	}

	http.Error(w, "Invalid path", http.StatusBadRequest)
}

// getTutorMateriaByIDHandler handles GET /v1/tutor-materias/{id}
// @Summary      Get TutorMateria by ID
// @Description  Retrieves a specific tutor-materia assignment by its ID.
// @Tags         TutorMaterias
// @Produce      json
// @Param        id path int true "Assignment ID"
// @Success      200 {object} db.TutorMateria "Successfully retrieved assignment"
// @Failure      400 {object} ErrorResponse "Invalid assignment ID"
// @Failure      404 {object} ErrorResponse "Assignment not found"
// @Failure      500 {object} ErrorResponse "Failed to retrieve assignment"
// @Router       /v1/tutor-materias/{id} [get]
func getTutorMateriaByIDHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, idStr string) {
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid assignment ID", http.StatusBadRequest)
		return
	}

	assignment, err := queries.SelectTutorMateriaById(r.Context(), int32(id))
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Assignment not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to retrieve assignment: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(assignment)
}

// listMateriasByTutorHandler handles GET /v1/tutor-materias?tutor_id={tutor_id}
// @Summary      List Materias by Tutor
// @Description  Retrieves materias assigned to a specific tutor.
// @Tags         TutorMaterias
// @Produce      json
// @Param        tutor_id query int true "Tutor ID"
// @Success      200 {array} db.ListMateriasByTutorRow "Successfully retrieved materias"
// @Failure      400 {object} ErrorResponse "Invalid tutor ID"
// @Failure      500 {object} ErrorResponse "Failed to retrieve materias"
// @Router       /v1/tutor-materias [get]
func listMateriasByTutorHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, tutorIDStr string) {
	tutorID, err := strconv.ParseInt(tutorIDStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutor ID", http.StatusBadRequest)
		return
	}

	materias, err := queries.ListMateriasByTutor(r.Context(), int32(tutorID))
	if err != nil {
		http.Error(w, "Failed to retrieve materias: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(materias)
}

// listTutoresByMateriaHandler handles GET /v1/tutor-materias?materia_id={materia_id}
// @Summary      List Tutores by Materia
// @Description  Retrieves tutores assigned to a specific materia.
// @Tags         TutorMaterias
// @Produce      json
// @Param        materia_id query int true "Materia ID"
// @Success      200 {array} db.ListTutoresByMateriaRow "Successfully retrieved tutores"
// @Failure      400 {object} ErrorResponse "Invalid materia ID"
// @Failure      500 {object} ErrorResponse "Failed to retrieve tutores"
// @Router       /v1/tutor-materias [get]
func listTutoresByMateriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, materiaIDStr string) {
	materiaID, err := strconv.ParseInt(materiaIDStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid materia ID", http.StatusBadRequest)
		return
	}

	tutores, err := queries.ListTutoresByMateria(r.Context(), int32(materiaID))
	if err != nil {
		http.Error(w, "Failed to retrieve tutores: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutores)
}

// updateTutorMateriaHandler handles PUT /v1/tutor-materias/{id}
// @Summary      Update TutorMateria Assignment
// @Description  Updates an existing tutor-materia assignment.
// @Tags         TutorMaterias
// @Accept       json
// @Produce      json
// @Param        id path int true "Assignment ID"
// @Param        assignment body UpdateTutorMateriaRequest true "Updated Assignment Data"
// @Success      200 {object} db.TutorMateria "Successfully updated assignment"
// @Failure      400 {object} ErrorResponse "Invalid request body or assignment ID"
// @Failure      404 {object} ErrorResponse "Assignment not found"
// @Failure      500 {object} ErrorResponse "Failed to update assignment"
// @Router       /v1/tutor-materias/{id} [put]
func updateTutorMateriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutor-materias/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid assignment ID", http.StatusBadRequest)
		return
	}

	var req UpdateTutorMateriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	params := db.UpdateTutorMateriaParams{
		AsignacionID: int32(id),
		Activo:       req.Activo,
	}

	assignment, err := queries.UpdateTutorMateria(r.Context(), params)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Assignment not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update assignment: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(assignment)
}

// deleteTutorMateriaHandler handles DELETE /v1/tutor-materias/{id}
// @Summary      Delete TutorMateria Assignment
// @Description  Deletes a tutor-materia assignment by its ID.
// @Tags         TutorMaterias
// @Param        id path int true "Assignment ID"
// @Success      204 "Successfully deleted assignment"
// @Failure      400 {object} ErrorResponse "Invalid assignment ID"
// @Failure      500 {object} ErrorResponse "Failed to delete assignment"
// @Router       /v1/tutor-materias/{id} [delete]
func deleteTutorMateriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutor-materias/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid assignment ID", http.StatusBadRequest)
		return
	}

	err = queries.DeleteTutorMateria(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "Failed to delete assignment: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
