// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.29.0

package db

import (
	"github.com/jackc/pgx/v5/pgtype"
)

type Admin struct {
	AdminID       int32
	Nombre        string
	Apellido      string
	Correo        string
	PasswordHash  string
	Rol           string
	Activo        pgtype.Bool
	FechaRegistro pgtype.Timestamptz
}

type Desempenotutore struct {
	TutorID              int32
	Tutor                interface{}
	Materia              pgtype.Text
	TotalTutorias        int64
	TutoriasCompletadas  int64
	TutoriasCanceladas   int64
	PorcentajeAsistencia pgtype.Numeric
}

type Disponibilidad struct {
	DisponibilidadID int32
	TutorID          int32
	DiaSemana        int32
	HoraInicio       pgtype.Time
	HoraFin          pgtype.Time
}

type Estudiante struct {
	EstudianteID      int32
	Nombre            string
	Apellido          string
	Correo            string
	ProgramaAcademico string
	Semestre          pgtype.Int4
	FechaRegistro     pgtype.Timestamp
	Ti                pgtype.Int4
}

type Materia struct {
	MateriaID   int32
	Nombre      string
	Codigo      string
	Facultad    string
	Descripcion pgtype.Text
	Creditos    int32
}

type Reporte struct {
	ReporteID       int32
	TipoReporte     string
	FechaGeneracion pgtype.Timestamp
	PeriodoInicio   pgtype.Date
	PeriodoFin      pgtype.Date
	GeneradoPor     int32
	Datos           []byte
}

type TutorMateria struct {
	AsignacionID    int32
	TutorID         int32
	MateriaID       int32
	FechaAsignacion pgtype.Date
	Activo          bool
}

type Tutore struct {
	TutorID           int32
	Nombre            string
	Apellido          string
	Correo            string
	ProgramaAcademico pgtype.Text
	FechaRegistro     pgtype.Timestamp
}

type Tutoria struct {
	TutoriaID            int32
	EstudianteID         int32
	TutorID              int32
	MateriaID            int32
	Fecha                pgtype.Date
	HoraInicio           pgtype.Time
	HoraFin              pgtype.Time
	Estado               string
	FechaSolicitud       pgtype.Timestamp
	FechaConfirmacion    pgtype.Timestamp
	TemasTratados        pgtype.Text
	AsistenciaConfirmada pgtype.Bool
	Lugar                string
}

type Tutoriasactiva struct {
	TutoriaID          int32
	NombreEstudiante   string
	ApellidoEstudiante string
	NombreTutor        string
	ApellidoTutor      string
	Materia            string
	Fecha              pgtype.Date
	HoraInicio         pgtype.Time
	HoraFin            pgtype.Time
	Lugar              string
	Estado             string
}
