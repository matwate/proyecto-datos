package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/matwate/proyecto-datos/db"
	"golang.org/x/crypto/bcrypt"
)

// ErrorResponse represents a generic error response for API operations.
type ErrorResponse struct {
	Error string `json:"error" example:"Descriptive error message"`
}

// UnifiedLoginRequest represents the request body for the unified login endpoint.
type UnifiedLoginRequest struct {
	Correo   string `json:"correo" example:"user@urosario.edu.co"`
	Password string `json:"password,omitempty" example:"securepassword123"` // For admin login
	TI       *int32 `json:"ti,omitempty" example:"123456789"`               // For student/tutor login
}

// LoginResponse represents a successful login response.
type LoginResponse struct {
	UserType string      `json:"user_type"` // "estudiante", "tutor", or "admin"
	Data     interface{} `json:"data"`      // The actual user data
}

// StudentLoginRequest represents the request body for the legacy student login endpoint.
type StudentLoginRequest struct {
	Correo string `json:"correo" example:"test@urosario.edu.co"` // Correo is the email of the student.
	TI     int32  `json:"ti"     example:"123456789"`            // TI is the student's identity number.
}

// UnifiedLoginHandler handles authentication for different user types based on path parameter.
// @Summary      Unified Login
// @Description  Authenticates users (estudiantes, tutores, or admins) based on the mode parameter.
// @Tags         Authentication
// @Accept       json
// @Produce      json
// @Param        mode path string true "Login mode" Enums(estudiante, tutor, admin)
// @Param        login body UnifiedLoginRequest true "Login Credentials"
// @Success      200 {object} LoginResponse "Successfully authenticated"
// @Failure      400 {object} ErrorResponse "Invalid request body or mode"
// @Failure      401 {object} ErrorResponse "Invalid credentials"
// @Failure      405 {object} ErrorResponse "Method not allowed"
// @Failure      500 {object} ErrorResponse "Internal server error"
// @Router       /v1/login/{mode} [post]
func UnifiedLoginHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Extract mode from URL path
		pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(pathParts) < 3 {
			http.Error(w, "Invalid URL format. Expected /v1/login/{mode}", http.StatusBadRequest)
			return
		}
		mode := pathParts[2] // v1/login/{mode}
		fmt.Println("Login mode:", mode)
		var req UnifiedLoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")

		switch mode {
		case "estudiante":
			handleEstudianteLogin(w, r, queries, req)
		case "tutor":
			handleTutorLogin(w, r, queries, req)
		case "admin":
			handleAdminLogin(w, r, queries, req)
		default:
			http.Error(w, "Invalid login mode. Use 'estudiante', 'tutor', or 'admin'", http.StatusBadRequest)
		}
	}
}

func handleEstudianteLogin(w http.ResponseWriter, r *http.Request, queries *db.Queries, req UnifiedLoginRequest) {
	if req.TI == nil {
		http.Error(w, "TI is required for student login", http.StatusBadRequest)
		return
	}

	estudiante, err := queries.LoginEstudiante(r.Context(), db.LoginEstudianteParams{
		Correo: req.Correo,
		Ti:     pgtype.Int4{Int32: *req.TI, Valid: true},
	})
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid student credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Failed to authenticate student", http.StatusInternalServerError)
		return
	}

	response := LoginResponse{
		UserType: "estudiante",
		Data:     estudiante,
	}
	json.NewEncoder(w).Encode(response)
}

func handleTutorLogin(w http.ResponseWriter, r *http.Request, queries *db.Queries, req UnifiedLoginRequest) {
	if req.TI == nil {
		http.Error(w, "TI is required for tutor login", http.StatusBadRequest)
		return
	}

	// First authenticate as estudiante
	estudiante, err := queries.LoginEstudiante(r.Context(), db.LoginEstudianteParams{
		Correo: req.Correo,
		Ti:     pgtype.Int4{Int32: *req.TI, Valid: true},
	})
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid student credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Failed to authenticate as student", http.StatusInternalServerError)
		return
	}

	// Then check if tutor exists with the same email
	tutor, err := queries.SelectTutorByCorreo(r.Context(), estudiante.Correo)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Tutor record not found for this student", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Failed to fetch tutor data", http.StatusInternalServerError)
		return
	}

	response := LoginResponse{
		UserType: "tutor",
		Data: map[string]interface{}{
			"estudiante": estudiante,
			"tutor":      tutor,
		},
	}
	json.NewEncoder(w).Encode(response)
}

func handleAdminLogin(w http.ResponseWriter, r *http.Request, queries *db.Queries, req UnifiedLoginRequest) {
	if req.Password == "" {
		http.Error(w, "Password is required for admin login", http.StatusBadRequest)
		return
	}

	admin, err := queries.LoginAdmin(r.Context(), req.Correo)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid admin credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Failed to authenticate admin", http.StatusInternalServerError)
		return
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password))
	if err != nil {
		http.Error(w, "Invalid admin credentials", http.StatusUnauthorized)
		return
	}

	// Remove password hash from response
	adminResponse := map[string]interface{}{
		"admin_id":       admin.AdminID,
		"nombre":         admin.Nombre,
		"apellido":       admin.Apellido,
		"correo":         admin.Correo,
		"rol":            admin.Rol,
		"fecha_registro": admin.FechaRegistro,
		"activo":         admin.Activo,
	}

	response := LoginResponse{
		UserType: "admin",
		Data:     adminResponse,
	}
	json.NewEncoder(w).Encode(response)
}

// LoginHandler is deprecated, UnifiedLoginHandler should be used instead.
// @Summary      Student Login (Legacy)
// @Description  Authenticates a student using their email and TI (Tarjeta de Identidad).
// @Tags         Authentication
// @Accept       json
// @Produce      json
// @Param        login body StudentLoginRequest true "Login Credentials"
// @Success      200 {object} db.Estudiante  "Successfully authenticated. Returns student details."
// @Failure      400 {object} ErrorResponse "Invalid request body"
// @Failure      401 {object} ErrorResponse "Invalid credentials (user not found or TI mismatch)"
// @Failure      405 {object} ErrorResponse "Method not allowed"
// @Failure      500 {object} ErrorResponse "Internal server error during login"
// @Router       /v1/login [post]
func LoginHandler(queries *db.Queries) http.HandlerFunc {
	// LoginHandler is deprecated, UnifiedLoginHandler should be used instead.
	return func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "This endpoint is deprecated. Use /v1/login/estudiante.", http.StatusMovedPermanently)
	}
}

// LoginTutorHandler is deprecated, UnifiedLoginHandler should be used instead.
// @Summary      Tutor Login (Legacy)
// @Description  Authenticates a tutor using their email and TI (Tarjeta de Identidad), then fetches tutor-specific data.
// @Tags         Authentication
// @Accept       json
// @Produce      json
// @Param        login body StudentLoginRequest true "Login Credentials for Tutor (as Student)"
// @Success      200 {object} map[string]interface{} "Successfully authenticated. Returns combined student and tutor details."
// @Failure      400 {object} ErrorResponse "Invalid request body"
// @Failure      401 {object} ErrorResponse "Invalid credentials or tutor record not found"
// @Failure      405 {object} ErrorResponse "Method not allowed"
// @Failure      500 {object} ErrorResponse "Internal server error"
// @Router       /v1/tutores/login [post]
func LoginTutorHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// This handler is deprecated. Use UnifiedLoginHandler at /v1/login/tutor instead.
		http.Error(w, "This endpoint is deprecated. Use /v1/login/tutor.", http.StatusMovedPermanently)
	}
}
