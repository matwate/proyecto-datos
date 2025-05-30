package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/matwate/proyecto-datos/db"
)

// CreateTutoriaRequest represents the request body for creating a tutoria.
// TutorID is optional - if not provided or 0, an available qualified tutor will be assigned automatically.
type CreateTutoriaRequest struct {
	EstudianteID int32  `json:"estudiante_id" example:"1"`
	TutorID      int32  `json:"tutor_id,omitempty" example:"1"` // Optional: if 0 or not provided, auto-assign qualified tutor
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
	Estado               string `json:"estado,omitempty" example:"confirmada"`
	TemasTratados        string `json:"temas_tratados,omitempty" example:"Derivadas y límites"`
	AsistenciaConfirmada bool   `json:"asistencia_confirmada" example:"true"`
}

// UpdateTutoriaEstadoRequest represents the request body for updating tutoria status.
type UpdateTutoriaEstadoRequest struct {
	Estado string `json:"estado" example:"confirmada"`
}

// UpdateTutoriaAsistenciaRequest represents the request body for updating tutoria attendance confirmation.
type UpdateTutoriaAsistenciaRequest struct {
	AsistenciaConfirmada bool `json:"asistencia_confirmada" example:"true"`
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
		case http.MethodPatch:
			handleTutoriaPATCH(w, r, queries)
		case http.MethodDelete:
			handleTutoriaDELETE(w, r, queries)
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

// getDayOfWeek converts date to day of week number (1=Monday, 7=Sunday)
func getDayOfWeek(date time.Time) int32 {
	dayOfWeek := int(date.Weekday())
	if dayOfWeek == 0 { // Sunday is 0 in Go, but we want it to be 7
		return 7
	}
	return int32(dayOfWeek)
}

// checkTutorConflicts checks if tutor has conflicting tutoring sessions
func checkTutorConflicts(ctx context.Context, queries *db.Queries, tutorID int32, fecha pgtype.Date, horaInicio, horaFin pgtype.Time) (bool, error) {
	tutorTutorias, err := queries.ListTutoriasByTutor(ctx, tutorID)
	if err != nil {
		return false, err
	}

	for _, tutoria := range tutorTutorias {
		// Skip cancelled tutorias
		if tutoria.Estado == "cancelada" {
			continue
		}

		// Check for same date
		if tutoria.Fecha.Time.Format("2006-01-02") == fecha.Time.Format("2006-01-02") {
			// Check for time overlap
			existingStart := tutoria.HoraInicio.Microseconds / 1000000 // Convert to seconds
			existingEnd := tutoria.HoraFin.Microseconds / 1000000
			newStart := horaInicio.Microseconds / 1000000
			newEnd := horaFin.Microseconds / 1000000

			// Times overlap if: new_start < existing_end AND new_end > existing_start
			if newStart < existingEnd && newEnd > existingStart {
				return true, nil
			}
		}
	}

	return false, nil
}

// createTutoriaHandler handles POST /v1/tutorias
// @Summary      Create Tutoria
// @Description  Creates a new tutoring session with intelligent tutor assignment and validation.
// @Tags         Tutorias
// @Accept       json
// @Produce      json
// @Param        tutoria body CreateTutoriaRequest true "Tutoria Data"
// @Success      201 {object} CreateTutoriaResponse "Successfully created tutoria"
// @Failure      400 {object} ErrorResponse "Invalid request body or validation failed"
// @Failure      500 {object} ErrorResponse "Failed to create tutoria"
// @Router       /v1/tutorias [post]
func createTutoriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	var req CreateTutoriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Parse and validate fecha
	fecha, err := parseDateString(req.Fecha)
	if err != nil {
		http.Error(w, "Invalid fecha format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	// Parse and validate times
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

	// Validate that hora_fin is after hora_inicio
	if horaFin.Microseconds <= horaInicio.Microseconds {
		http.Error(w, "hora_fin must be after hora_inicio", http.StatusBadRequest)
		return
	}

	// Validate that the date is not in the past
	if fecha.Time.Before(time.Now().Truncate(24 * time.Hour)) {
		http.Error(w, "Cannot create tutoria for past dates", http.StatusBadRequest)
		return
	}

	var assignedTutorID int32

	// If no tutor specified, find an available qualified tutor
	if req.TutorID == 0 {
		// Get day of week for the requested date
		dayOfWeek := getDayOfWeek(fecha.Time)

		// Find available tutors for this materia and day
		availableTutors, err := queries.ListTutoresDisponiblesByMateriaAndDia(r.Context(), db.ListTutoresDisponiblesByMateriaAndDiaParams{
			MateriaID: req.MateriaID,
			DiaSemana: dayOfWeek,
		})
		if err != nil {
			http.Error(w, "Failed to find available tutors: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if len(availableTutors) == 0 {
			http.Error(w, "No qualified tutors available for the requested subject and day", http.StatusBadRequest)
			return
		}

		// Find a tutor who is available at the requested time and has no conflicts
		var selectedTutor *db.ListTutoresDisponiblesByMateriaAndDiaRow
		for _, tutor := range availableTutors {

			hasConflicts, err := checkTutorConflicts(r.Context(), queries, tutor.TutorID, fecha, horaInicio, horaFin)
			if err != nil {
				continue // Skip this tutor and try the next one
			}

			if !hasConflicts {
				selectedTutor = &tutor
				break
			}

		}

		if selectedTutor == nil {
			http.Error(w, "No available tutors found for the requested time slot. Please try a different time or day.", http.StatusBadRequest)
			return
		}

		assignedTutorID = selectedTutor.TutorID
	} else {
		// If tutor is specified, validate that they are qualified and available
		assignedTutorID = req.TutorID

		// Check if tutor is qualified for this materia
		materiasByTutor, err := queries.ListMateriasByTutor(r.Context(), assignedTutorID)
		if err != nil {
			http.Error(w, "Failed to verify tutor qualification: "+err.Error(), http.StatusInternalServerError)
			return
		}

		isQualified := false
		for _, materia := range materiasByTutor {
			if materia.MateriaID == req.MateriaID && materia.Activo {
				isQualified = true
				break
			}
		}

		if !isQualified {
			http.Error(w, "Specified tutor is not qualified to teach the requested subject", http.StatusBadRequest)
			return
		}

		// Check for scheduling conflicts
		hasConflicts, err := checkTutorConflicts(r.Context(), queries, assignedTutorID, fecha, horaInicio, horaFin)
		if err != nil {
			http.Error(w, "Failed to check tutor availability: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if hasConflicts {
			http.Error(w, "Tutor has a scheduling conflict at the requested time", http.StatusBadRequest)
			return
		}

		// Check if tutor is available on the requested day and time
		dayOfWeek := getDayOfWeek(fecha.Time)
		tutorAvailability, err := queries.ListDisponibilidadByTutor(r.Context(), assignedTutorID)
		if err != nil {
			http.Error(w, "Failed to check tutor availability: "+err.Error(), http.StatusInternalServerError)
			return
		}

		isAvailable := false
		for _, availability := range tutorAvailability {
			if availability.DiaSemana == dayOfWeek {
				tutorStartTime := availability.HoraInicio.Microseconds / 1000000
				tutorEndTime := availability.HoraFin.Microseconds / 1000000
				requestedStartTime := horaInicio.Microseconds / 1000000
				requestedEndTime := horaFin.Microseconds / 1000000

				if requestedStartTime >= tutorStartTime && requestedEndTime <= tutorEndTime {
					isAvailable = true
					break
				}
			}
		}

		if !isAvailable {
			http.Error(w, "Tutor is not available at the requested day and time", http.StatusBadRequest)
			return
		}
	}

	// Create the tutoria with the assigned tutor
	params := db.CreateTutoriaParams{
		EstudianteID:   req.EstudianteID,
		TutorID:        assignedTutorID,
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
		// The database trigger will also validate tutor-materia assignment
		if strings.Contains(err.Error(), "tutor no está asignado") {
			http.Error(w, "Tutor is not qualified to teach the requested subject", http.StatusBadRequest)
			return
		}
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
		// Add this new case for proximas tutorias by estudiante_id
		if estudianteID := r.URL.Query().Get("proximas_estudiante_id"); estudianteID != "" {
			// GET /v1/tutorias?proximas_estudiante_id={estudiante_id}
			getProximasTutoriasByEstudianteHandler(w, r, queries, estudianteID)
			return
		}
		http.Error(w, "Missing required query parameter: estudiante_id, tutor_id, estado, activas=true, or proximas_estudiante_id", http.StatusBadRequest)
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
// @Router       /v1/tutorias [get] // Note: Swagger might not differentiate this well from other GET /v1/tutorias based on query params alone
func listTutoriasActivasHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	tutorias, err := queries.ListTutoriasActivas(r.Context())
	if err != nil {
		http.Error(w, "Failed to retrieve active tutorias: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutorias)
}

// getProximasTutoriasByEstudianteHandler handles GET /v1/tutorias?proximas_estudiante_id={estudiante_id}
// @Summary      Get Upcoming Tutorias for Student
// @Description  Retrieves upcoming tutorias for a specific student that have not started yet.
// @Tags         Tutorias
// @Produce      json
// @Param        proximas_estudiante_id query int true "Student ID"
// @Success      200 {array} db.Tutoria "Successfully retrieved upcoming tutorias"
// @Failure      400 {object} ErrorResponse "Invalid student ID"
// @Failure      500 {object} ErrorResponse "Failed to retrieve upcoming tutorias"
// @Router       /v1/tutorias [get] // Note: Swagger might not differentiate this well
func getProximasTutoriasByEstudianteHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, estudianteIDStr string) {
	estudianteID, err := strconv.ParseInt(estudianteIDStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid estudiante ID", http.StatusBadRequest)
		return
	}

	tutorias, err := queries.GetProximasTutoriasByEstudiante(r.Context(), int32(estudianteID))
	if err != nil {
		http.Error(w, "Failed to retrieve upcoming tutorias: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutorias)
}

// SelectTutoriaByTutorIDHandler handles GET /v1/tutorias/tutor/{tutor_id}
// @Summary      List Tutorias by Tutor ID
// @Description  Retrieves all tutorias for a specific tutor.
// @Tags         Tutorias
// @Produce      json
// @Param        tutor_id path int true "Tutor ID"
// @Success      200 {array} db.SelectTutoriaByTutorIdRow "Successfully retrieved tutorias"
// @Failure      400 {object} ErrorResponse "Invalid tutor ID"
// @Failure      500 {object} ErrorResponse "Failed to retrieve tutorias"
// @Router       /v1/tutorias/tutor/{tutor_id} [get]
func SelectTutoriaByTutorIDHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	tutorIDStr := r.PathValue("tutor_id")
	tutorID, err := strconv.ParseInt(tutorIDStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutor ID", http.StatusBadRequest)
		return
	}

	tutorias, err := queries.SelectTutoriaByTutorId(r.Context(), int32(tutorID))
	if err != nil {
		http.Error(w, "Failed to retrieve tutorias by tutor ID: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutorias)
}

// SelectTutoriaByEstudianteIDHandler handles GET /v1/tutorias/estudiante/{estudiante_id}
// @Summary      List Tutorias by Estudiante ID
// @Description  Retrieves all tutorias for a specific student.
// @Tags         Tutorias
// @Produce      json
// @Param        estudiante_id path int true "Estudiante ID"
// @Success      200 {array} db.SelectTutoriaByEstudianteIdRow "Successfully retrieved tutorias"
// @Failure      400 {object} ErrorResponse "Invalid estudiante ID"
// @Failure      500 {object} ErrorResponse "Failed to retrieve tutorias"
// @Router       /v1/tutorias/estudiante/{estudiante_id} [get]
func SelectTutoriaByEstudianteIDHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	estudianteIDStr := r.PathValue("estudiante_id")
	estudianteID, err := strconv.ParseInt(estudianteIDStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid estudiante ID", http.StatusBadRequest)
		return
	}

	tutorias, err := queries.SelectTutoriaByEstudianteId(r.Context(), int32(estudianteID))
	if err != nil {
		http.Error(w, "Failed to retrieve tutorias by estudiante ID: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutorias)
}

// handleTutoriaPUT handles PUT requests for tutorias
func handleTutoriaPUT(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutorias")
	pathParts := strings.Split(strings.Trim(path, "/"), "/")

	if len(pathParts) < 1 || pathParts[0] == "" {
		http.Error(w, "Invalid path: tutoria ID required", http.StatusBadRequest)
		return
	}

	tutoriaID, err := strconv.ParseInt(pathParts[0], 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutoria ID", http.StatusBadRequest)
		return
	}

	// Check if this is a status update: /v1/tutorias/{id}/estado
	if len(pathParts) == 2 && pathParts[1] == "estado" {
		updateTutoriaEstadoHandler(w, r, queries, int32(tutoriaID))
		return
	}

	// Regular tutoria update: /v1/tutorias/{id}
	if len(pathParts) == 1 {
		updateTutoriaHandler(w, r, queries, int32(tutoriaID))
		return
	}

	http.Error(w, "Invalid path", http.StatusBadRequest)
}

// handleTutoriaDELETE handles DELETE requests for tutorias
func handleTutoriaDELETE(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/tutorias")
	pathParts := strings.Split(strings.Trim(path, "/"), "/")

	if len(pathParts) != 1 || pathParts[0] == "" {
		http.Error(w, "Invalid path: tutoria ID required", http.StatusBadRequest)
		return
	}

	tutoriaID, err := strconv.ParseInt(pathParts[0], 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutoria ID", http.StatusBadRequest)
		return
	}

	deleteTutoriaHandler(w, r, queries, int32(tutoriaID))
}

// updateTutoriaEstadoHandler handles PUT /v1/tutorias/{id}/estado
// @Summary      Update Tutoria Status
// @Description  Updates the status of a specific tutoria.
// @Tags         Tutorias
// @Accept       json
// @Produce      json
// @Param        id path int true "Tutoria ID"
// @Param        estado body UpdateTutoriaEstadoRequest true "Status Update Data"
// @Success      200 {object} db.Tutoria "Successfully updated tutoria status"
// @Failure      400 {object} ErrorResponse "Invalid request body or tutoria ID"
// @Failure      404 {object} ErrorResponse "Tutoria not found"
// @Failure      500 {object} ErrorResponse "Failed to update tutoria status"
// @Router       /v1/tutorias/{id}/estado [put]
func updateTutoriaEstadoHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, tutoriaID int32) {
	var req UpdateTutoriaEstadoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// First, get the existing tutoria data
	existingTutoria, err := queries.SelectTutoriaById(r.Context(), tutoriaID)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Tutoria not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get tutoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update using the existing data but with new estado
	params := db.UpdateTutoriaParams{
		TutoriaID:            tutoriaID,
		Fecha:                existingTutoria.Fecha,
		HoraInicio:           existingTutoria.HoraInicio,
		HoraFin:              existingTutoria.HoraFin,
		Lugar:                existingTutoria.Lugar,
		Estado:               req.Estado,
		AsistenciaConfirmada: existingTutoria.AsistenciaConfirmada,
		TemasTratados:        existingTutoria.TemasTratados,
	}

	tutoria, err := queries.UpdateTutoria(r.Context(), params)
	if err != nil {
		http.Error(w, "Failed to update tutoria status: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tutoria)
}

// updateTutoriaHandler handles PUT /v1/tutorias/{id}
// @Summary      Update Tutoria
// @Description  Updates a specific tutoria with new details.
// @Tags         Tutorias
// @Accept       json
// @Produce      json
// @Param        id path int true "Tutoria ID"
// @Param        tutoria body UpdateTutoriaRequest true "Tutoria Update Data"
// @Success      200 {object} db.Tutoria "Successfully updated tutoria"
// @Failure      400 {object} ErrorResponse "Invalid request body or tutoria ID"
// @Failure      404 {object} ErrorResponse "Tutoria not found"
// @Failure      500 {object} ErrorResponse "Failed to update tutoria"
// @Router       /v1/tutorias/{id} [put]
func updateTutoriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, tutoriaID int32) {
	var req UpdateTutoriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// First, get the existing tutoria data to preserve estado
	existingTutoria, err := queries.SelectTutoriaById(r.Context(), tutoriaID)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Tutoria not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get tutoria: "+err.Error(), http.StatusInternalServerError)
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
		TutoriaID:  tutoriaID,
		Fecha:      fecha,
		HoraInicio: horaInicio,
		HoraFin:    horaFin,
		Lugar:      req.Lugar,
		Estado: func() string {
			if req.Estado != "" {
				return req.Estado
			} else {
				return existingTutoria.Estado
			}
		}(),
		AsistenciaConfirmada: pgtype.Bool{Bool: req.AsistenciaConfirmada, Valid: true},
		TemasTratados:        pgtype.Text{String: req.TemasTratados, Valid: req.TemasTratados != ""},
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

// deleteTutoriaHandler handles DELETE /v1/tutorias/{id}
// @Summary      Delete Tutoria
// @Description  Deletes a specific tutoria.
// @Tags         Tutorias
// @Produce      json
// @Param        id path int true "Tutoria ID"
// @Success      204 "Successfully deleted tutoria"
// @Failure      400 {object} ErrorResponse "Invalid tutoria ID"
// @Failure      404 {object} ErrorResponse "Tutoria not found"
// @Failure      500 {object} ErrorResponse "Failed to delete tutoria"
// @Router       /v1/tutorias/{id} [delete]
func deleteTutoriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, tutoriaID int32) {
	err := queries.DeleteTutoria(r.Context(), tutoriaID)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Tutoria not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to delete tutoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// handleTutoriaPATCH handles PATCH requests for tutorias (legacy handler)
func handleTutoriaPATCH(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	http.Error(w, "Use specific PATCH endpoints: /v1/tutorias/{id}/estado or /v1/tutorias/{id}/asistencia", http.StatusBadRequest)
}

// UpdateTutoriaEstadoEndpoint handles PATCH /v1/tutorias/{id}/estado using Go 1.22 routing
// @Summary      Update Tutoria Estado
// @Description  Updates only the estado (status) of a specific tutoria using path parameter.
// @Tags         Tutorias
// @Accept       json
// @Produce      json
// @Param        id path int true "Tutoria ID"
// @Param        estado body UpdateTutoriaEstadoRequest true "Estado Update Data"
// @Success      200 {object} db.Tutoria "Successfully updated tutoria estado"
// @Failure      400 {object} ErrorResponse "Invalid request body or tutoria ID"
// @Failure      404 {object} ErrorResponse "Tutoria not found"
// @Failure      500 {object} ErrorResponse "Failed to update tutoria estado"
// @Router       /v1/tutorias/{id}/estado [patch]
func UpdateTutoriaEstadoEndpoint(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get tutoria ID from path parameter using Go 1.22
		idStr := r.PathValue("id")
		if idStr == "" {
			http.Error(w, "Tutoria ID is required", http.StatusBadRequest)
			return
		}

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

		// First, get the existing tutoria data
		existingTutoria, err := queries.SelectTutoriaById(r.Context(), int32(id))
		if err != nil {
			if err.Error() == "no rows in result set" {
				http.Error(w, "Tutoria not found", http.StatusNotFound)
				return
			}
			http.Error(w, "Failed to get tutoria: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Update using existing data but with new estado
		params := db.UpdateTutoriaParams{
			TutoriaID:            int32(id),
			Fecha:                existingTutoria.Fecha,
			HoraInicio:           existingTutoria.HoraInicio,
			HoraFin:              existingTutoria.HoraFin,
			Lugar:                existingTutoria.Lugar,
			Estado:               req.Estado,
			AsistenciaConfirmada: existingTutoria.AsistenciaConfirmada,
			TemasTratados:        existingTutoria.TemasTratados,
		}

		updatedTutoria, err := queries.UpdateTutoria(r.Context(), params)
		if err != nil {
			http.Error(w, "Failed to update tutoria estado: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(updatedTutoria)
	}
}

// UpdateTutoriaAsistenciaEndpoint handles PATCH /v1/tutorias/{id}/asistencia using Go 1.22 routing
// @Summary      Update Tutoria Asistencia
// @Description  Updates only the asistencia_confirmada field of a specific tutoria using path parameter.
// @Tags         Tutorias
// @Accept       json
// @Produce      json
// @Param        id path int true "Tutoria ID"
// @Param        asistencia body UpdateTutoriaAsistenciaRequest true "Asistencia Update Data"
// @Success      200 {object} db.Tutoria "Successfully updated tutoria asistencia"
// @Failure      400 {object} ErrorResponse "Invalid request body or tutoria ID"
// @Failure      404 {object} ErrorResponse "Tutoria not found"
// @Failure      500 {object} ErrorResponse "Failed to update tutoria asistencia"
// @Router       /v1/tutorias/{id}/asistencia [patch]
func UpdateTutoriaAsistenciaEndpoint(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get tutoria ID from path parameter using Go 1.22
		idStr := r.PathValue("id")
		if idStr == "" {
			http.Error(w, "Tutoria ID is required", http.StatusBadRequest)
			return
		}

		id, err := strconv.ParseInt(idStr, 10, 32)
		if err != nil {
			http.Error(w, "Invalid tutoria ID", http.StatusBadRequest)
			return
		}

		var req UpdateTutoriaAsistenciaRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// First, get the existing tutoria data
		existingTutoria, err := queries.SelectTutoriaById(r.Context(), int32(id))
		if err != nil {
			if err.Error() == "no rows in result set" {
				http.Error(w, "Tutoria not found", http.StatusNotFound)
				return
			}
			http.Error(w, "Failed to get tutoria: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Update using existing data but with new asistencia_confirmada
		params := db.UpdateTutoriaParams{
			TutoriaID:            int32(id),
			Fecha:                existingTutoria.Fecha,
			HoraInicio:           existingTutoria.HoraInicio,
			HoraFin:              existingTutoria.HoraFin,
			Lugar:                existingTutoria.Lugar,
			Estado:               existingTutoria.Estado,
			AsistenciaConfirmada: pgtype.Bool{Bool: req.AsistenciaConfirmada, Valid: true},
			TemasTratados:        existingTutoria.TemasTratados,
		}

		updatedTutoria, err := queries.UpdateTutoria(r.Context(), params)
		if err != nil {
			http.Error(w, "Failed to update tutoria asistencia: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(updatedTutoria)
	}
}
