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

// CreateDisponibilidadRequest represents the request body for creating disponibilidad.
type CreateDisponibilidadRequest struct {
	TutorID    int32  `json:"tutor_id" example:"1"`
	DiaSemana  int32  `json:"dia_semana" example:"1"` // 1 = Monday, 7 = Sunday
	HoraInicio string `json:"hora_inicio" example:"09:00"`
	HoraFin    string `json:"hora_fin" example:"11:00"`
}

// CreateDisponibilidadResponse represents the response after creating disponibilidad.
type CreateDisponibilidadResponse struct {
	DisponibilidadID int32 `json:"disponibilidad_id"`
}

// UpdateDisponibilidadRequest represents the request body for updating disponibilidad.
type UpdateDisponibilidadRequest struct {
	DiaSemana  int32  `json:"dia_semana" example:"1"`
	HoraInicio string `json:"hora_inicio" example:"09:00"`
	HoraFin    string `json:"hora_fin" example:"11:00"`
}

// DisponibilidadHandlers handles all disponibilidad-related endpoints using Go 1.24 routing patterns.
// @Summary      Handle Disponibilidad Operations
// @Description  Comprehensive CRUD operations for tutor availability.
// @Tags         Disponibilidad
func DisponibilidadHandlers(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			createDisponibilidadHandler(w, r, queries)
		case http.MethodGet:
			handleDisponibilidadGET(w, r, queries)
		case http.MethodPut:
			updateDisponibilidadHandler(w, r, queries)
		case http.MethodDelete:
			deleteDisponibilidadHandler(w, r, queries)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// parseTimeString parses time string in HH:MM format to pgtype.Time
func parseTimeString(timeStr string) (pgtype.Time, error) {
	t, err := time.Parse("15:04", timeStr)
	if err != nil {
		return pgtype.Time{}, err
	}

	return pgtype.Time{
		Microseconds: int64(t.Hour()*3600+t.Minute()*60) * 1000000,
		Valid:        true,
	}, nil
}

// createDisponibilidadHandler handles POST /v1/disponibilidad
// @Summary      Create Disponibilidad
// @Description  Creates a new tutor availability slot.
// @Tags         Disponibilidad
// @Accept       json
// @Produce      json
// @Param        disponibilidad body CreateDisponibilidadRequest true "Disponibilidad Data"
// @Success      201 {object} CreateDisponibilidadResponse "Successfully created disponibilidad"
// @Failure      400 {object} ErrorResponse "Invalid request body"
// @Failure      500 {object} ErrorResponse "Failed to create disponibilidad"
// @Router       /v1/disponibilidad [post]
func createDisponibilidadHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	var req CreateDisponibilidadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
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

	params := db.CreateDisponibilidadParams{
		TutorID:    req.TutorID,
		DiaSemana:  req.DiaSemana,
		HoraInicio: horaInicio,
		HoraFin:    horaFin,
	}

	disponibilidad, err := queries.CreateDisponibilidad(r.Context(), params)
	if err != nil {
		http.Error(w, "Failed to create disponibilidad: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(CreateDisponibilidadResponse{DisponibilidadID: disponibilidad.DisponibilidadID})
}

// handleDisponibilidadGET handles GET requests for disponibilidad
func handleDisponibilidadGET(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/disponibilidad")

	if path == "" || path == "/" {
		// Check for query parameters
		if tutorID := r.URL.Query().Get("tutor_id"); tutorID != "" {
			// GET /v1/disponibilidad?tutor_id={tutor_id}
			listDisponibilidadByTutorHandler(w, r, queries, tutorID)
			return
		}
		if dia := r.URL.Query().Get("dia_semana"); dia != "" {
			// GET /v1/disponibilidad?dia_semana={dia}
			listDisponibilidadByDiaHandler(w, r, queries, dia)
			return
		}
		http.Error(w, "Missing required query parameter: tutor_id or dia_semana", http.StatusBadRequest)
		return
	}

	// Parse ID from path: /v1/disponibilidad/{id}
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) == 1 && pathParts[0] != "" {
		getDisponibilidadByIDHandler(w, r, queries, pathParts[0])
		return
	}

	http.Error(w, "Invalid path", http.StatusBadRequest)
}

// getDisponibilidadByIDHandler handles GET /v1/disponibilidad/{id}
// @Summary      Get Disponibilidad by ID
// @Description  Retrieves a specific disponibilidad by its ID.
// @Tags         Disponibilidad
// @Produce      json
// @Param        id path int true "Disponibilidad ID"
// @Success      200 {object} db.Disponibilidad "Successfully retrieved disponibilidad"
// @Failure      400 {object} ErrorResponse "Invalid disponibilidad ID"
// @Failure      404 {object} ErrorResponse "Disponibilidad not found"
// @Failure      500 {object} ErrorResponse "Failed to retrieve disponibilidad"
// @Router       /v1/disponibilidad/{id} [get]
func getDisponibilidadByIDHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, idStr string) {
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid disponibilidad ID", http.StatusBadRequest)
		return
	}

	disponibilidad, err := queries.SelectDisponibilidadById(r.Context(), int32(id))
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Disponibilidad not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to retrieve disponibilidad: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(disponibilidad)
}

// listDisponibilidadByTutorHandler handles GET /v1/disponibilidad?tutor_id={tutor_id}
// @Summary      List Disponibilidad by Tutor
// @Description  Retrieves disponibilidad slots for a specific tutor.
// @Tags         Disponibilidad
// @Produce      json
// @Param        tutor_id query int true "Tutor ID"
// @Success      200 {array} db.Disponibilidad "Successfully retrieved disponibilidad"
// @Failure      400 {object} ErrorResponse "Invalid tutor ID"
// @Failure      500 {object} ErrorResponse "Failed to retrieve disponibilidad"
// @Router       /v1/disponibilidad [get]
func listDisponibilidadByTutorHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, tutorIDStr string) {
	tutorID, err := strconv.ParseInt(tutorIDStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid tutor ID", http.StatusBadRequest)
		return
	}

	disponibilidad, err := queries.ListDisponibilidadByTutor(r.Context(), int32(tutorID))
	if err != nil {
		http.Error(w, "Failed to retrieve disponibilidad: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(disponibilidad)
}

// listDisponibilidadByDiaHandler handles GET /v1/disponibilidad?dia_semana={dia}
// @Summary      List Disponibilidad by Day
// @Description  Retrieves disponibilidad slots for a specific day of the week.
// @Tags         Disponibilidad
// @Produce      json
// @Param        dia_semana query int true "Day of week (1=Monday, 7=Sunday)"
// @Success      200 {array} db.ListDisponibilidadByDiaRow "Successfully retrieved disponibilidad"
// @Failure      400 {object} ErrorResponse "Invalid day"
// @Failure      500 {object} ErrorResponse "Failed to retrieve disponibilidad"
// @Router       /v1/disponibilidad [get]
func listDisponibilidadByDiaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, diaStr string) {
	dia, err := strconv.ParseInt(diaStr, 10, 32)
	if err != nil || dia < 1 || dia > 7 {
		http.Error(w, "Invalid day (must be 1-7)", http.StatusBadRequest)
		return
	}

	disponibilidad, err := queries.ListDisponibilidadByDia(r.Context(), int32(dia))
	if err != nil {
		http.Error(w, "Failed to retrieve disponibilidad: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(disponibilidad)
}

// updateDisponibilidadHandler handles PUT /v1/disponibilidad/{id}
// @Summary      Update Disponibilidad
// @Description  Updates an existing disponibilidad slot.
// @Tags         Disponibilidad
// @Accept       json
// @Produce      json
// @Param        id path int true "Disponibilidad ID"
// @Param        disponibilidad body UpdateDisponibilidadRequest true "Updated Disponibilidad Data"
// @Success      200 {object} db.Disponibilidad "Successfully updated disponibilidad"
// @Failure      400 {object} ErrorResponse "Invalid request body or disponibilidad ID"
// @Failure      404 {object} ErrorResponse "Disponibilidad not found"
// @Failure      500 {object} ErrorResponse "Failed to update disponibilidad"
// @Router       /v1/disponibilidad/{id} [put]
func updateDisponibilidadHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/disponibilidad/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid disponibilidad ID", http.StatusBadRequest)
		return
	}

	var req UpdateDisponibilidadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
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

	params := db.UpdateDisponibilidadParams{
		DisponibilidadID: int32(id),
		DiaSemana:        req.DiaSemana,
		HoraInicio:       horaInicio,
		HoraFin:          horaFin,
	}

	disponibilidad, err := queries.UpdateDisponibilidad(r.Context(), params)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Disponibilidad not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update disponibilidad: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(disponibilidad)
}

// deleteDisponibilidadHandler handles DELETE /v1/disponibilidad/{id}
// @Summary      Delete Disponibilidad
// @Description  Deletes a disponibilidad slot by its ID.
// @Tags         Disponibilidad
// @Param        id path int true "Disponibilidad ID"
// @Success      204 "Successfully deleted disponibilidad"
// @Failure      400 {object} ErrorResponse "Invalid disponibilidad ID"
// @Failure      500 {object} ErrorResponse "Failed to delete disponibilidad"
// @Router       /v1/disponibilidad/{id} [delete]
func deleteDisponibilidadHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/disponibilidad/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid disponibilidad ID", http.StatusBadRequest)
		return
	}

	err = queries.DeleteDisponibilidad(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "Failed to delete disponibilidad: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
