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

// CreateReporteRequest represents the request body for creating a reporte.
type CreateReporteRequest struct {
	TipoReporte   string `json:"tipo_reporte" example:"tutoria_performance"`
	PeriodoInicio string `json:"periodo_inicio" example:"2024-01-01"`
	PeriodoFin    string `json:"periodo_fin" example:"2024-12-31"`
	GeneradoPor   int32  `json:"generado_por" example:"1"`
	Datos         []byte `json:"datos,omitempty" example:"{}"`
}

// CreateReporteResponse represents the response after creating a reporte.
type CreateReporteResponse struct {
	ReporteID int32 `json:"reporte_id"`
}

// UpdateReporteRequest represents the request body for updating reporte data.
type UpdateReporteRequest struct {
	Datos []byte `json:"datos" example:"{}"`
}

// ReporteHandlers handles all reporte-related endpoints using Go 1.24 routing patterns.
// @Summary      Handle Reporte Operations
// @Description  Comprehensive CRUD operations for reports.
// @Tags         Reportes
func ReporteHandlers(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			createReporteHandler(w, r, queries)
		case http.MethodGet:
			handleReporteGET(w, r, queries)
		case http.MethodPut:
			updateReporteHandler(w, r, queries)
		case http.MethodDelete:
			deleteReporteHandler(w, r, queries)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// createReporteHandler handles POST /v1/reportes
// @Summary      Create Reporte
// @Description  Creates a new report.
// @Tags         Reportes
// @Accept       json
// @Produce      json
// @Param        reporte body CreateReporteRequest true "Reporte Data"
// @Success      201 {object} CreateReporteResponse "Successfully created reporte"
// @Failure      400 {object} ErrorResponse "Invalid request body"
// @Failure      500 {object} ErrorResponse "Failed to create reporte"
// @Router       /v1/reportes [post]
func createReporteHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	var req CreateReporteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	periodoInicio, err := parseDateString(req.PeriodoInicio)
	if err != nil {
		http.Error(w, "Invalid periodo_inicio format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	periodoFin, err := parseDateString(req.PeriodoFin)
	if err != nil {
		http.Error(w, "Invalid periodo_fin format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	params := db.CreateReporteParams{
		TipoReporte:     req.TipoReporte,
		FechaGeneracion: pgtype.Timestamp{Time: time.Now(), Valid: true},
		PeriodoInicio:   periodoInicio,
		PeriodoFin:      periodoFin,
		GeneradoPor:     req.GeneradoPor,
		Datos:           req.Datos,
	}

	reporte, err := queries.CreateReporte(r.Context(), params)
	if err != nil {
		http.Error(w, "Failed to create reporte: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(CreateReporteResponse{ReporteID: reporte.ReporteID})
}

// handleReporteGET handles GET requests for reportes
func handleReporteGET(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/reportes")

	if path == "" || path == "/" {
		// Check for query parameters
		if tipoReporte := r.URL.Query().Get("tipo"); tipoReporte != "" {
			// GET /v1/reportes?tipo={tipo}
			listReportesByTipoHandler(w, r, queries, tipoReporte)
			return
		}
		if periodoInicio := r.URL.Query().Get("periodo_inicio"); periodoInicio != "" {
			periodoFin := r.URL.Query().Get("periodo_fin")
			if periodoFin == "" {
				http.Error(w, "periodo_fin is required when periodo_inicio is provided", http.StatusBadRequest)
				return
			}
			// GET /v1/reportes?periodo_inicio={inicio}&periodo_fin={fin}
			listReportesByPeriodoHandler(w, r, queries, periodoInicio, periodoFin)
			return
		}
		// GET /v1/reportes - List all reportes
		listReportesHandler(w, r, queries)
		return
	}

	// Parse ID from path: /v1/reportes/{id}
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) == 1 && pathParts[0] != "" {
		getReporteByIDHandler(w, r, queries, pathParts[0])
		return
	}

	http.Error(w, "Invalid path", http.StatusBadRequest)
}

// listReportesHandler handles GET /v1/reportes
// @Summary      List All Reportes
// @Description  Retrieves a list of all reports.
// @Tags         Reportes
// @Produce      json
// @Success      200 {array} db.Reporte "Successfully retrieved reportes"
// @Failure      500 {object} ErrorResponse "Failed to retrieve reportes"
// @Router       /v1/reportes [get]
func listReportesHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	reportes, err := queries.ListReportes(r.Context())
	if err != nil {
		http.Error(w, "Failed to retrieve reportes: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reportes)
}

// getReporteByIDHandler handles GET /v1/reportes/{id}
// @Summary      Get Reporte by ID
// @Description  Retrieves a specific report by its ID.
// @Tags         Reportes
// @Produce      json
// @Param        id path int true "Reporte ID"
// @Success      200 {object} db.Reporte "Successfully retrieved reporte"
// @Failure      400 {object} ErrorResponse "Invalid reporte ID"
// @Failure      404 {object} ErrorResponse "Reporte not found"
// @Failure      500 {object} ErrorResponse "Failed to retrieve reporte"
// @Router       /v1/reportes/{id} [get]
func getReporteByIDHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, idStr string) {
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid reporte ID", http.StatusBadRequest)
		return
	}

	reporte, err := queries.SelectReporteById(r.Context(), int32(id))
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Reporte not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to retrieve reporte: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reporte)
}

// listReportesByTipoHandler handles GET /v1/reportes?tipo={tipo}
// @Summary      List Reportes by Type
// @Description  Retrieves reports filtered by type.
// @Tags         Reportes
// @Produce      json
// @Param        tipo query string true "Report type"
// @Success      200 {array} db.Reporte "Successfully retrieved reportes"
// @Failure      500 {object} ErrorResponse "Failed to retrieve reportes"
// @Router       /v1/reportes [get]
func listReportesByTipoHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, tipo string) {
	reportes, err := queries.ListReportesByTipo(r.Context(), tipo)
	if err != nil {
		http.Error(w, "Failed to retrieve reportes: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reportes)
}

// listReportesByPeriodoHandler handles GET /v1/reportes?periodo_inicio={inicio}&periodo_fin={fin}
// @Summary      List Reportes by Period
// @Description  Retrieves reports filtered by date period.
// @Tags         Reportes
// @Produce      json
// @Param        periodo_inicio query string true "Start date (YYYY-MM-DD)"
// @Param        periodo_fin query string true "End date (YYYY-MM-DD)"
// @Success      200 {array} db.Reporte "Successfully retrieved reportes"
// @Failure      400 {object} ErrorResponse "Invalid date format"
// @Failure      500 {object} ErrorResponse "Failed to retrieve reportes"
// @Router       /v1/reportes [get]
func listReportesByPeriodoHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, periodoInicioStr, periodoFinStr string) {
	periodoInicio, err := parseDateString(periodoInicioStr)
	if err != nil {
		http.Error(w, "Invalid periodo_inicio format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	periodoFin, err := parseDateString(periodoFinStr)
	if err != nil {
		http.Error(w, "Invalid periodo_fin format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	params := db.ListReportesByPeriodoParams{
		PeriodoInicio: periodoInicio,
		PeriodoFin:    periodoFin,
	}

	reportes, err := queries.ListReportesByPeriodo(r.Context(), params)
	if err != nil {
		http.Error(w, "Failed to retrieve reportes: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reportes)
}

// updateReporteHandler handles PUT /v1/reportes/{id}
// @Summary      Update Reporte
// @Description  Updates the data of an existing report.
// @Tags         Reportes
// @Accept       json
// @Produce      json
// @Param        id path int true "Reporte ID"
// @Param        reporte body UpdateReporteRequest true "Updated Reporte Data"
// @Success      200 {object} db.Reporte "Successfully updated reporte"
// @Failure      400 {object} ErrorResponse "Invalid request body or reporte ID"
// @Failure      404 {object} ErrorResponse "Reporte not found"
// @Failure      500 {object} ErrorResponse "Failed to update reporte"
// @Router       /v1/reportes/{id} [put]
func updateReporteHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/reportes/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid reporte ID", http.StatusBadRequest)
		return
	}

	var req UpdateReporteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	params := db.UpdateReporteParams{
		ReporteID: int32(id),
		Datos:     req.Datos,
	}

	reporte, err := queries.UpdateReporte(r.Context(), params)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Reporte not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update reporte: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reporte)
}

// deleteReporteHandler handles DELETE /v1/reportes/{id}
// @Summary      Delete Reporte
// @Description  Deletes a report by its ID.
// @Tags         Reportes
// @Param        id path int true "Reporte ID"
// @Success      204 "Successfully deleted reporte"
// @Failure      400 {object} ErrorResponse "Invalid reporte ID"
// @Failure      500 {object} ErrorResponse "Failed to delete reporte"
// @Router       /v1/reportes/{id} [delete]
func deleteReporteHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/reportes/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid reporte ID", http.StatusBadRequest)
		return
	}

	err = queries.DeleteReporte(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "Failed to delete reporte: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
