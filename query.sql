-- name: SelectEstudiante :one 
select * from ESTUDIANTES where estudiante_id = $1;

-- name: LoginEstudiante :one
SELECT * FROM ESTUDIANTES
WHERE correo = $1 AND ti = $2;

-- name: CreateEstudiante :one
INSERT INTO ESTUDIANTES (nombre, apellido, correo, programa_academico, semestre, ti)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING estudiante_id;

-- name: SelectEstudianteById :one
SELECT * FROM ESTUDIANTES WHERE estudiante_id = $1;
-- name: SelectEstudianteByCorreo :one
SELECT * FROM ESTUDIANTES WHERE correo = $1;

-- name: CreateTutor :one
INSERT INTO TUTORES (nombre, apellido, correo, programa_academico)
VALUES ($1, $2, $3, $4)
RETURNING tutor_id;

-- name: SelectTutorByCorreo :one
SELECT * FROM TUTORES WHERE correo = $1;




