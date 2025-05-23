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

// CreateTutoriaRequest represents the request body for creating a tutoria.
type CreateTutoriaRequest struct {
	EstudianteID int32  `json:"estudiante_id" example:"1"`
	TutorID      int32  `json:"tutor_id" example:"1"`
	MateriaID    int32  `json:"materia_id" example:"1"`
	Fecha        string `json:"fecha" example:"2024-12-15"`
	HoraInicio   string `json:"hora_inicio" example:"10:00"`
	HoraFin      string `json:"hora_fin" example:"11:00"`
	Estado       string `json:"estado" example:"solicitada"`
	Lugar        string `json:"lugar" example:"Biblioteca Central"`
}

// CreateTutoriaResponse represents the response after creating a tutoria.
type CreateTutoriaResponse struct {
	TutoriaID int32 `json:"tutoria_id"`
}

// UpdateTutoriaRequest represents the request body for updating a tutoria.
type UpdateTutoriaRequest struct {
	Fecha                string `json:"fecha" example:"2024-12-15"`
	HoraInicio           string `json:"hora_inicio" example:"10:00"`
	HoraFin              string `json:"hora_fin" example:"11:00"`
	Lugar                string `json:"lugar" example:"Biblioteca Central"`
	TemasTratados        string `json:"temas_tratados,omitempty" example:"Derivadas y límites"`
	AsistenciaConfirmada bool   `json:"asistencia_confirmada" example:"true"`
}

// UpdateTutoriaEstadoRequest represents the request body for updating tutoria status.
type UpdateTutoriaEstadoRequest struct {
	Estado string `json:"estado" example:"confirmada"`
}

// TutoriaHandlers handles all tutoria-related endpoints using Go 1.24 routing patterns.
// @Summary      Handle Tutoria Operations
// @Description  Comprehensive CRUD operations for tutorias (tutoring sessions).
// @Tags         Tutorias
func TutoriaHandlers(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			createTutoriaHandler(w, r, queries)
		case http.MethodGet:
			handleTutoriaGET(w, r, queries)
		case http.MethodPut:
			handleTutoriaPUT(w, r, queries)
		case http.MethodDelete:
			deleteTutoriaHandler(w, r, queries)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// parseDateString parses date string in YYYY-MM-DD format to pgtype.Date
func parseDateString(dateStr string) (pgtype.Date, error) {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return pgtype.Date{}, err
	}

	return pgtype.Date{
		Time:  t,
		Valid: true,
	}, nil
}

// createTutoriaHandler handles POST /v1/tutorias
// @Summary      Create Tutoria
// @Description  Creates a new tutoring session.
// @Tags         Tutorias
// @Accept       json
// @Produce      json
// @Param        tutoria body CreateTutoriaRequest true "Tutoria Data"
// @Success      201 {object} CreateTutoriaResponse "Successfully created tutoria"
// @Failure      400 {object} ErrorResponse "Invalid request body"
// @Failure      500 {object} ErrorResponse "Failed to create tutoria"
// @Router       /v1/tutorias [post]
func createTutoriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	var req CreateTutoriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fecha, err := parseDateString(req.Fecha)
	if err != nil {
		http.Error(w, "Invalid fecha format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	horaInicio, err := parseTimeString(req.HoraInicio)
	if err != nil {
		http.Error(w, "Invalid hora_inicio format (use HH:MM)", http.StatusBadRequest)
		return
	}

	horaFin, err := parseTimeString(req.HoraFin)
	if err != nil {
		http.Error(w, "Invalid hora_fin format (use HH:MM)", http.StatusBadRequest)
		return
	}

	params := db.CreateTutoriaParams{
		EstudianteID:   req.EstudianteID,
		TutorID:        req.TutorID,
		MateriaID:      req.MateriaID,
		Fecha:          fecha,
		HoraInicio:     horaInicio,
		HoraFin:        horaFin,
		Estado:         req.Estado,
		FechaSolicitud: pgtype.Timestamp{Time: time.Now(), Valid: true},
		Lugar:          req.Lugar,
	}

	tutoria, err := queries.CreateTutoria(r.Context(), params)
	if err != nil {
		http.Error(w, "Failed to create tutoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(CreateTutoriaResponse{TutoriaID: tutoria.TutoriaID})
}

// handleTutoriaGET handles GET requests for tutorias
func handleTutoriaGET(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutorias")

	if path == "" || path == "/" {
		// Check for query parameters
		if estudianteID := r.URL.Query().Get("estudiante_id"); estudianteID != "" {
			// GET /v1/tutorias?estudiante_id={estudiante_id}
			listTutoriasByEstudianteHandler(w, r, queries, estudianteID)
			return
		}
		if tutorID := r.URL.Query().Get("tutor_id"); tutorID != "" {
			// GET /v1/tutorias?tutor_id={tutor_id}
			listTutoriasByTutorHandler(w, r, queries, tutorID)
			return
		}
		if estado := r.URL.Query().Get("estado"); estado != "" {
			// GET /v1/tutorias?estado={estado}
			listTutoriasByEstadoHandler(w, r, queries, estado)
			return
		}
		if r.URL.Query().Get("activas") == "true" {
			// GET /v1/tutorias?activas=true
			listTutoriasActivasHandler(w, r, queries)
			return
		}
		http.Error(w, "Missing required query parameter: estudiante_id, tutor_id, estado, or activas=true", http.StatusBadRequest)
		return
	}

	// Parse ID from path: /v1/tutorias/{id}
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) == 1 && pathParts[0] != "" {
		getTutoriaByIDHandler(w, r, queries, pathParts[0])
		return
	}

	http.Error(w, "Invalid path", http.StatusBadRequest)
}

// getTutoriaByIDHandler handles GET /v1/tutorias/{id}
// @Summary      Get Tutoria by ID
// @Description  Retrieves a specific tutoria by its ID.
// @Tags         Tutorias
// @Produce      json
// @Param        id path int true "Tutoria ID"
// @Success      200 {object} db.Tutoria "Successfully retrieved tutoria"
// @Failure      400 {object} ErrorResponse "Invalid tutoria ID"
// @Failure      404 {object} ErrorResponse "Tutoria not found"
// @Failure      500 {object} ErrorResponse "Failed to retrieve tutoria"
// @Router       /v1/tutorias/{id} [get]
func getTutoriaByIDHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, idStr string) {
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutoria ID", http.StatusBadRequest)
		return
	}

	tutoria, err := queries.SelectTutoriaById(r.Context(), int32(id))
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Tutoria not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to retrieve tutoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutoria)
}

// listTutoriasByEstudianteHandler handles GET /v1/tutorias?estudiante_id={estudiante_id}
// @Summary      List Tutorias by Student
// @Description  Retrieves tutorias for a specific student.
// @Tags         Tutorias
// @Produce      json
// @Param        estudiante_id query int true "Student ID"
// @Success      200 {array} db.ListTutoriasByEstudianteRow "Successfully retrieved tutorias"
// @Failure      400 {object} ErrorResponse "Invalid student ID"
// @Failure      500 {object} ErrorResponse "Failed to retrieve tutorias"
// @Router       /v1/tutorias [get]
func listTutoriasByEstudianteHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, estudianteIDStr string) {
	estudianteID, err := strconv.ParseInt(estudianteIDStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid estudiante ID", http.StatusBadRequest)
		return
	}

	tutorias, err := queries.ListTutoriasByEstudiante(r.Context(), int32(estudianteID))
	if err != nil {
		http.Error(w, "Failed to retrieve tutorias: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutorias)
}

// listTutoriasByTutorHandler handles GET /v1/tutorias?tutor_id={tutor_id}
// @Summary      List Tutorias by Tutor
// @Description  Retrieves tutorias for a specific tutor.
// @Tags         Tutorias
// @Produce      json
// @Param        tutor_id query int true "Tutor ID"
// @Success      200 {array} db.ListTutoriasByTutorRow "Successfully retrieved tutorias"
// @Failure      400 {object} ErrorResponse "Invalid tutor ID"
// @Failure      500 {object} ErrorResponse "Failed to retrieve tutorias"
// @Router       /v1/tutorias [get]
func listTutoriasByTutorHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, tutorIDStr string) {
	tutorID, err := strconv.ParseInt(tutorIDStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutor ID", http.StatusBadRequest)
		return
	}

	tutorias, err := queries.ListTutoriasByTutor(r.Context(), int32(tutorID))
	if err != nil {
		http.Error(w, "Failed to retrieve tutorias: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutorias)
}

// listTutoriasByEstadoHandler handles GET /v1/tutorias?estado={estado}
// @Summary      List Tutorias by Status
// @Description  Retrieves tutorias filtered by status.
// @Tags         Tutorias
// @Produce      json
// @Param        estado query string true "Tutoria status"
// @Success      200 {array} db.ListTutoriasByEstadoRow "Successfully retrieved tutorias"
// @Failure      500 {object} ErrorResponse "Failed to retrieve tutorias"
// @Router       /v1/tutorias [get]
func listTutoriasByEstadoHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, estado string) {
	tutorias, err := queries.ListTutoriasByEstado(r.Context(), estado)
	if err != nil {
		http.Error(w, "Failed to retrieve tutorias: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutorias)
}

// listTutoriasActivasHandler handles GET /v1/tutorias?activas=true
// @Summary      List Active Tutorias
// @Description  Retrieves all active tutorias.
// @Tags         Tutorias
// @Produce      json
// @Success      200 {array} db.Tutoriasactiva "Successfully retrieved active tutorias"
// @Failure      500 {object} ErrorResponse "Failed to retrieve tutorias"
// @Router       /v1/tutorias [get]
func listTutoriasActivasHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	tutorias, err := queries.ListTutoriasActivas(r.Context())
	if err != nil {
		http.Error(w, "Failed to retrieve active tutorias: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutorias)
}

// handleTutoriaPUT handles PUT requests for tutorias
func handleTutoriaPUT(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutorias/")
	pathParts := strings.Split(path, "/")

	if len(pathParts) >= 2 && pathParts[1] == "estado" {
		// PUT /v1/tutorias/{id}/estado
		updateTutoriaEstadoHandler(w, r, queries, pathParts[0])
		return
	}

	if len(pathParts) == 1 && pathParts[0] != "" {
		// PUT /v1/tutorias/{id}
		updateTutoriaHandler(w, r, queries, pathParts[0])
		return
	}

	http.Error(w, "Invalid path", http.StatusBadRequest)
}

// updateTutoriaHandler handles PUT /v1/tutorias/{id}
// @Summary      Update Tutoria
// @Description  Updates an existing tutoria.
// @Tags         Tutorias
// @Accept       json
// @Produce      json
// @Param        id path int true "Tutoria ID"
// @Param        tutoria body UpdateTutoriaRequest true "Updated Tutoria Data"
// @Success      200 {object} db.Tutoria "Successfully updated tutoria"
// @Failure      400 {object} ErrorResponse "Invalid request body or tutoria ID"
// @Failure      404 {object} ErrorResponse "Tutoria not found"
// @Failure      500 {object} ErrorResponse "Failed to update tutoria"
// @Router       /v1/tutorias/{id} [put]
func updateTutoriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, idStr string) {
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutoria ID", http.StatusBadRequest)
		return
	}

	var req UpdateTutoriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fecha, err := parseDateString(req.Fecha)
	if err != nil {
		http.Error(w, "Invalid fecha format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	horaInicio, err := parseTimeString(req.HoraInicio)
	if err != nil {
		http.Error(w, "Invalid hora_inicio format (use HH:MM)", http.StatusBadRequest)
		return
	}

	horaFin, err := parseTimeString(req.HoraFin)
	if err != nil {
		http.Error(w, "Invalid hora_fin format (use HH:MM)", http.StatusBadRequest)
		return
	}

	params := db.UpdateTutoriaParams{
		TutoriaID:            int32(id),
		Fecha:                fecha,
		HoraInicio:           horaInicio,
		HoraFin:              horaFin,
		Lugar:                req.Lugar,
		TemasTratados:        pgtype.Text{String: req.TemasTratados, Valid: req.TemasTratados != ""},
		AsistenciaConfirmada: pgtype.Bool{Bool: req.AsistenciaConfirmada, Valid: true},
	}

	tutoria, err := queries.UpdateTutoria(r.Context(), params)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Tutoria not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update tutoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutoria)
}

// updateTutoriaEstadoHandler handles PUT /v1/tutorias/{id}/estado
// @Summary      Update Tutoria Status
// @Description  Updates the status of an existing tutoria.
// @Tags         Tutorias
// @Accept       json
// @Produce      json
// @Param        id path int true "Tutoria ID"
// @Param        estado body UpdateTutoriaEstadoRequest true "New Status"
// @Success      200 {object} db.Tutoria "Successfully updated tutoria status"
// @Failure      400 {object} ErrorResponse "Invalid request body or tutoria ID"
// @Failure      404 {object} ErrorResponse "Tutoria not found"
// @Failure      500 {object} ErrorResponse "Failed to update tutoria status"
// @Router       /v1/tutorias/{id}/estado [put]
func updateTutoriaEstadoHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, idStr string) {
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutoria ID", http.StatusBadRequest)
		return
	}

	var req UpdateTutoriaEstadoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	params := db.UpdateTutoriaEstadoParams{
		TutoriaID: int32(id),
		Estado:    req.Estado,
	}

	tutoria, err := queries.UpdateTutoriaEstado(r.Context(), params)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Tutoria not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update tutoria status: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutoria)
}

// deleteTutoriaHandler handles DELETE /v1/tutorias/{id}
// @Summary      Delete Tutoria
// @Description  Deletes a tutoria by its ID.
// @Tags         Tutorias
// @Param        id path int true "Tutoria ID"
// @Success      204 "Successfully deleted tutoria"
// @Failure      400 {object} ErrorResponse "Invalid tutoria ID"
// @Failure      500 {object} ErrorResponse "Failed to delete tutoria"
// @Router       /v1/tutorias/{id} [delete]
func deleteTutoriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutorias/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutoria ID", http.StatusBadRequest)
		return
	}

	err = queries.DeleteTutoria(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "Failed to delete tutoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
