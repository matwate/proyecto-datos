package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/matwate/proyecto-datos/db"
)

// CreateMateriaRequest represents the request body for creating a new materia.
type CreateMateriaRequest struct {
	Nombre      string      `json:"nombre" example:"Cálculo I"`
	Codigo      string      `json:"codigo" example:"MATH101"`
	Facultad    string      `json:"facultad" example:"Ingeniería"`
	Descripcion pgtype.Text `json:"descripcion,omitempty" example:"Introducción al cálculo diferencial e integral"`
	Creditos    int32       `json:"creditos" example:"4"`
}

// CreateMateriaResponse represents the response body after creating a new materia.
type CreateMateriaResponse struct {
	MateriaID int32 `json:"materia_id"`
}

// UpdateMateriaRequest represents the request body for updating a materia.
type UpdateMateriaRequest struct {
	Nombre      string      `json:"nombre" example:"Cálculo I"`
	Codigo      string      `json:"codigo" example:"MATH101"`
	Facultad    string      `json:"facultad" example:"Ingeniería"`
	Descripcion pgtype.Text `json:"descripcion,omitempty" example:"Introducción al cálculo diferencial e integral"`
	Creditos    int32       `json:"creditos" example:"4"`
}

// MateriaHandlers handles all materia-related endpoints using Go 1.24 routing patterns.
// @Summary      Handle Materia Operations
// @Description  Comprehensive CRUD operations for materias (subjects).
// @Tags         Materias
func MateriaHandlers(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			createMateriaHandler(w, r, queries)
		case http.MethodGet:
			handleMateriaGET(w, r, queries)
		case http.MethodPut:
			updateMateriaHandler(w, r, queries)
		case http.MethodDelete:
			deleteMateriaHandler(w, r, queries)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// createMateriaHandler handles POST /v1/materias
// @Summary      Create Materia
// @Description  Creates a new materia (subject).
// @Tags         Materias
// @Accept       json
// @Produce      json
// @Param        materia body CreateMateriaRequest true "Materia Data"
// @Success      201 {object} CreateMateriaResponse "Successfully created materia"
// @Failure      400 {object} ErrorResponse "Invalid request body"
// @Failure      500 {object} ErrorResponse "Failed to create materia"
// @Router       /v1/materias [post]
func createMateriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	var req CreateMateriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	params := db.CreateMateriaParams{
		Nombre:      req.Nombre,
		Codigo:      req.Codigo,
		Facultad:    req.Facultad,
		Descripcion: req.Descripcion,
		Creditos:    req.Creditos,
	}

	materia, err := queries.CreateMateria(r.Context(), params)
	if err != nil {
		http.Error(w, "Failed to create materia: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(CreateMateriaResponse{MateriaID: materia.MateriaID})
}

// handleMateriaGET handles GET requests for materias with various endpoints
func handleMateriaGET(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/materias")

	if path == "" || path == "/" {
		// Check for nombres query parameter
		if r.URL.Query().Get("nombres") == "true" {
			// GET /v1/materias?nombres=true
			listMateriaNombresHandler(w, r, queries)
			return
		}
		// GET /v1/materias - List all materias
		listMateriasHandler(w, r, queries)
		return
	}

	// Check for query parameters first
	if facultad := r.URL.Query().Get("facultad"); facultad != "" {
		// GET /v1/materias?facultad={facultad}
		listMateriasByFacultadHandler(w, r, queries, facultad)
		return
	}

	// Parse ID from path: /v1/materias/{id}
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) == 1 && pathParts[0] != "" {
		if pathParts[0] == "codigo" && len(pathParts) > 1 {
			// GET /v1/materias/codigo/{codigo}
			getMateriaByCodigoHandler(w, r, queries, pathParts[1])
			return
		}

		// GET /v1/materias/{id}
		getMateriaByIDHandler(w, r, queries, pathParts[0])
		return
	}

	http.Error(w, "Invalid path", http.StatusBadRequest)
}

// listMateriasHandler handles GET /v1/materias
// @Summary      List All Materias
// @Description  Retrieves a list of all materias.
// @Tags         Materias
// @Produce      json
// @Success      200 {array} db.Materia "Successfully retrieved materias"
// @Failure      500 {object} ErrorResponse "Failed to retrieve materias"
// @Router       /v1/materias [get]
func listMateriasHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	materias, err := queries.ListMaterias(r.Context())
	if err != nil {
		http.Error(w, "Failed to retrieve materias: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(materias)
}

// getMateriaByIDHandler handles GET /v1/materias/{id}
// @Summary      Get Materia by ID
// @Description  Retrieves a specific materia by its ID.
// @Tags         Materias
// @Produce      json
// @Param        id path int true "Materia ID"
// @Success      200 {object} db.Materia "Successfully retrieved materia"
// @Failure      400 {object} ErrorResponse "Invalid materia ID"
// @Failure      404 {object} ErrorResponse "Materia not found"
// @Failure      500 {object} ErrorResponse "Failed to retrieve materia"
// @Router       /v1/materias/{id} [get]
func getMateriaByIDHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, idStr string) {
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid materia ID", http.StatusBadRequest)
		return
	}

	materia, err := queries.SelectMateriaById(r.Context(), int32(id))
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Materia not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to retrieve materia: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(materia)
}

// getMateriaByCodigoHandler handles GET /v1/materias/codigo/{codigo}
// @Summary      Get Materia by Code
// @Description  Retrieves a specific materia by its code.
// @Tags         Materias
// @Produce      json
// @Param        codigo path string true "Materia Code"
// @Success      200 {object} db.Materia "Successfully retrieved materia"
// @Failure      404 {object} ErrorResponse "Materia not found"
// @Failure      500 {object} ErrorResponse "Failed to retrieve materia"
// @Router       /v1/materias/codigo/{codigo} [get]
func getMateriaByCodigoHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, codigo string) {
	materia, err := queries.SelectMateriaByCodigo(r.Context(), codigo)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Materia not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to retrieve materia: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(materia)
}

// listMateriasByFacultadHandler handles GET /v1/materias?facultad={facultad}
// @Summary      List Materias by Faculty
// @Description  Retrieves materias filtered by faculty.
// @Tags         Materias
// @Produce      json
// @Param        facultad query string true "Faculty name"
// @Success      200 {array} db.Materia "Successfully retrieved materias"
// @Failure      500 {object} ErrorResponse "Failed to retrieve materias"
// @Router       /v1/materias [get]
func listMateriasByFacultadHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries, facultad string) {
	materias, err := queries.ListMateriasByFacultad(r.Context(), facultad)
	if err != nil {
		http.Error(w, "Failed to retrieve materias: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(materias)
}

// updateMateriaHandler handles PUT /v1/materias/{id}
// @Summary      Update Materia
// @Description  Updates an existing materia.
// @Tags         Materias
// @Accept       json
// @Produce      json
// @Param        id path int true "Materia ID"
// @Param        materia body UpdateMateriaRequest true "Updated Materia Data"
// @Success      200 {object} db.Materia "Successfully updated materia"
// @Failure      400 {object} ErrorResponse "Invalid request body or materia ID"
// @Failure      404 {object} ErrorResponse "Materia not found"
// @Failure      500 {object} ErrorResponse "Failed to update materia"
// @Router       /v1/materias/{id} [put]
func updateMateriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/materias/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid materia ID", http.StatusBadRequest)
		return
	}

	var req UpdateMateriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	params := db.UpdateMateriaParams{
		MateriaID:   int32(id),
		Nombre:      req.Nombre,
		Codigo:      req.Codigo,
		Facultad:    req.Facultad,
		Descripcion: req.Descripcion,
		Creditos:    req.Creditos,
	}

	materia, err := queries.UpdateMateria(r.Context(), params)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Materia not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update materia: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(materia)
}

// deleteMateriaHandler handles DELETE /v1/materias/{id}
// @Summary      Delete Materia
// @Description  Deletes a materia by its ID.
// @Tags         Materias
// @Param        id path int true "Materia ID"
// @Success      204 "Successfully deleted materia"
// @Failure      400 {object} ErrorResponse "Invalid materia ID"
// @Failure      500 {object} ErrorResponse "Failed to delete materia"
// @Router       /v1/materias/{id} [delete]
func deleteMateriaHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/materias/")
	id, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		http.Error(w, "Invalid materia ID", http.StatusBadRequest)
		return
	}

	err = queries.DeleteMateria(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "Failed to delete materia: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// listMateriaNombresHandler handles GET /v1/materias?nombres=true
// @Summary      List Materia Names
// @Description  Retrieves a list of all materia names.
// @Tags         Materias
// @Produce      json
// @Success      200 {array} string "Successfully retrieved materia names"
// @Failure      500 {object} ErrorResponse "Failed to retrieve materia names"
// @Router       /v1/materias [get]
func listMateriaNombresHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	materias, err := queries.ListMateriaNombres(r.Context())
	if err != nil {
		http.Error(w, "Failed to retrieve materia names: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create response with materia_id, nombre, and codigo
	type MateriaName struct {
		MateriaID int32  `json:"materia_id"`
		Nombre    string `json:"nombre"`
		Codigo    string `json:"codigo"`
	}

	var response []MateriaName
	for _, materia := range materias {
		response = append(response, MateriaName{
			MateriaID: materia.MateriaID,
			Nombre:    materia.Nombre,
			Codigo:    materia.Codigo,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
