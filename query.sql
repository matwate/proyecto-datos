-- ========================================
-- ESTUDIANTES QUERIES
-- ========================================

-- name: CreateEstudiante :one
INSERT INTO ESTUDIANTES (nombre, apellido, correo, programa_academico, semestre, ti)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING estudiante_id, nombre, apellido, correo, programa_academico, semestre, ti, fecha_registro;

-- name: SelectEstudianteById :one
SELECT * FROM ESTUDIANTES WHERE estudiante_id = $1;

-- name: SelectEstudianteByCorreo :one
SELECT * FROM ESTUDIANTES WHERE correo = $1;

-- name: SelectEstudianteByTI :one
SELECT * FROM ESTUDIANTES WHERE ti = $1;

-- name: UpdateEstudiante :one
UPDATE ESTUDIANTES 
SET nombre = $2, apellido = $3, correo = $4, programa_academico = $5, semestre = $6, ti = $7
WHERE estudiante_id = $1
RETURNING *;

-- name: DeleteEstudiante :exec
DELETE FROM ESTUDIANTES WHERE estudiante_id = $1;

-- name: ListEstudiantes :many
SELECT * FROM ESTUDIANTES ORDER BY apellido, nombre;

-- name: ListEstudiantesByPrograma :many
SELECT * FROM ESTUDIANTES WHERE programa_academico = $1 ORDER BY apellido, nombre;

-- name: LoginEstudiante :one
SELECT * FROM ESTUDIANTES WHERE correo = $1 AND ti = $2;

-- ========================================
-- TUTORES QUERIES  
-- ========================================

-- name: CreateTutor :one
INSERT INTO TUTORES (nombre, apellido, correo, programa_academico)
VALUES ($1, $2, $3, $4)
RETURNING tutor_id, nombre, apellido, correo, programa_academico, fecha_registro;

-- name: SelectTutorById :one
SELECT * FROM TUTORES WHERE tutor_id = $1;

-- name: SelectTutorByCorreo :one
SELECT * FROM TUTORES WHERE correo = $1;

-- name: UpdateTutor :one
UPDATE TUTORES 
SET nombre = $2, apellido = $3, correo = $4, programa_academico = $5
WHERE tutor_id = $1
RETURNING *;

-- name: DeleteTutor :exec
DELETE FROM TUTORES WHERE tutor_id = $1;

-- name: ListTutores :many
SELECT * FROM TUTORES ORDER BY apellido, nombre;

-- name: LoginTutor :one
SELECT * FROM TUTORES WHERE correo = $1;

-- ========================================
-- ADMINS QUERIES
-- ========================================

-- name: CreateAdmin :one
INSERT INTO ADMINS (nombre, apellido, correo, password_hash, rol, activo)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING admin_id, nombre, apellido, correo, rol, activo, fecha_registro;

-- name: SelectAdminById :one
SELECT * FROM ADMINS WHERE admin_id = $1;

-- name: SelectAdminByCorreo :one
SELECT * FROM ADMINS WHERE correo = $1;

-- name: UpdateAdmin :one
UPDATE ADMINS 
SET nombre = $2, apellido = $3, correo = $4, password_hash = $5, rol = $6, activo = $7
WHERE admin_id = $1
RETURNING *;

-- name: UpdateAdminPassword :one
UPDATE ADMINS 
SET password_hash = $2
WHERE admin_id = $1
RETURNING admin_id, correo;

-- name: DeleteAdmin :exec
DELETE FROM ADMINS WHERE admin_id = $1;

-- name: ListAdmins :many
SELECT admin_id, nombre, apellido, correo, rol, activo, fecha_registro FROM ADMINS ORDER BY apellido, nombre;

-- name: LoginAdmin :one
SELECT admin_id, nombre, apellido, correo, password_hash, rol, activo, fecha_registro FROM ADMINS
WHERE correo = $1;

-- ========================================
-- MATERIAS QUERIES
-- ========================================

-- name: CreateMateria :one
INSERT INTO MATERIAS (nombre, codigo, facultad, descripcion, creditos)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: SelectMateriaById :one
SELECT * FROM MATERIAS WHERE materia_id = $1;

-- name: SelectMateriaByCodigo :one
SELECT * FROM MATERIAS WHERE codigo = $1;

-- name: UpdateMateria :one
UPDATE MATERIAS 
SET nombre = $2, codigo = $3, facultad = $4, descripcion = $5, creditos = $6
WHERE materia_id = $1
RETURNING *;

-- name: DeleteMateria :exec
DELETE FROM MATERIAS WHERE materia_id = $1;

-- name: ListMaterias :many
SELECT * FROM MATERIAS ORDER BY codigo;

-- name: ListMateriasByFacultad :many
SELECT * FROM MATERIAS WHERE facultad = $1 ORDER BY codigo;

-- ========================================
-- TUTOR_MATERIAS QUERIES
-- ========================================

-- name: CreateTutorMateria :one
INSERT INTO TUTOR_MATERIAS (tutor_id, materia_id, fecha_asignacion, activo)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: SelectTutorMateriaById :one
SELECT * FROM TUTOR_MATERIAS WHERE asignacion_id = $1;

-- name: UpdateTutorMateria :one
UPDATE TUTOR_MATERIAS 
SET activo = $2
WHERE asignacion_id = $1
RETURNING *;

-- name: DeleteTutorMateria :exec
DELETE FROM TUTOR_MATERIAS WHERE asignacion_id = $1;

-- name: ListMateriasByTutor :many
SELECT tm.*, m.nombre as materia_nombre, m.codigo as materia_codigo
FROM TUTOR_MATERIAS tm
JOIN MATERIAS m ON tm.materia_id = m.materia_id
WHERE tm.tutor_id = $1 AND tm.activo = true
ORDER BY m.codigo;

-- name: ListTutoresByMateria :many
SELECT tm.*, t.nombre as tutor_nombre, t.apellido as tutor_apellido
FROM TUTOR_MATERIAS tm
JOIN TUTORES t ON tm.tutor_id = t.tutor_id
WHERE tm.materia_id = $1 AND tm.activo = true
ORDER BY t.apellido, t.nombre;

-- ========================================
-- DISPONIBILIDAD QUERIES
-- ========================================

-- name: CreateDisponibilidad :one
INSERT INTO DISPONIBILIDAD (tutor_id, dia_semana, hora_inicio, hora_fin)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: SelectDisponibilidadById :one
SELECT * FROM DISPONIBILIDAD WHERE disponibilidad_id = $1;

-- name: UpdateDisponibilidad :one
UPDATE DISPONIBILIDAD 
SET dia_semana = $2, hora_inicio = $3, hora_fin = $4
WHERE disponibilidad_id = $1
RETURNING *;

-- name: DeleteDisponibilidad :exec
DELETE FROM DISPONIBILIDAD WHERE disponibilidad_id = $1;

-- name: ListDisponibilidadByTutor :many
SELECT * FROM DISPONIBILIDAD 
WHERE tutor_id = $1 
ORDER BY dia_semana, hora_inicio;

-- name: ListDisponibilidadByDia :many
SELECT d.*, t.nombre as tutor_nombre, t.apellido as tutor_apellido
FROM DISPONIBILIDAD d
JOIN TUTORES t ON d.tutor_id = t.tutor_id
WHERE d.dia_semana = $1
ORDER BY d.hora_inicio;

-- ========================================
-- TUTORIAS QUERIES
-- ========================================

-- name: CreateTutoria :one
INSERT INTO TUTORIAS (estudiante_id, tutor_id, materia_id, fecha, hora_inicio, hora_fin, estado, fecha_solicitud, lugar)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: SelectTutoriaById :one
SELECT * FROM TUTORIAS WHERE tutoria_id = $1;

-- name: UpdateTutoriaEstado :one
UPDATE TUTORIAS 
SET estado = $2, fecha_confirmacion = CASE WHEN $2 = 'confirmada' THEN CURRENT_TIMESTAMP ELSE fecha_confirmacion END
WHERE tutoria_id = $1
RETURNING *;

-- name: UpdateTutoria :one
UPDATE TUTORIAS 
SET fecha = $2, hora_inicio = $3, hora_fin = $4, lugar = $5
WHERE tutoria_id = $1
RETURNING *;

-- name: DeleteTutoria :exec
DELETE FROM TUTORIAS WHERE tutoria_id = $1;

-- name: ListTutoriasByEstudiante :many
SELECT t.*, tu.nombre as tutor_nombre, tu.apellido as tutor_apellido, m.nombre as materia_nombre
FROM TUTORIAS t
JOIN TUTORES tu ON t.tutor_id = tu.tutor_id
JOIN MATERIAS m ON t.materia_id = m.materia_id
WHERE t.estudiante_id = $1
ORDER BY t.fecha DESC, t.hora_inicio DESC;

-- name: ListTutoriasByTutor :many
SELECT t.*, e.nombre as estudiante_nombre, e.apellido as estudiante_apellido, m.nombre as materia_nombre
FROM TUTORIAS t
JOIN ESTUDIANTES e ON t.estudiante_id = e.estudiante_id
JOIN MATERIAS m ON t.materia_id = m.materia_id
WHERE t.tutor_id = $1
ORDER BY t.fecha DESC, t.hora_inicio DESC;

-- name: ListTutoriasByEstado :many
SELECT t.*, e.nombre as estudiante_nombre, e.apellido as estudiante_apellido, 
       tu.nombre as tutor_nombre, tu.apellido as tutor_apellido, m.nombre as materia_nombre
FROM TUTORIAS t
JOIN ESTUDIANTES e ON t.estudiante_id = e.estudiante_id
JOIN TUTORES tu ON t.tutor_id = tu.tutor_id
JOIN MATERIAS m ON t.materia_id = m.materia_id
WHERE t.estado = $1
ORDER BY t.fecha DESC, t.hora_inicio DESC;

-- name: ListTutoriasActivas :many
SELECT * FROM tutoriasActivas ORDER BY fecha, hora_inicio;

-- ========================================
-- REPORTES QUERIES
-- ========================================

-- name: CreateReporte :one
INSERT INTO REPORTES (tipo_reporte, fecha_generacion, periodo_inicio, periodo_fin, generado_por, datos)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: SelectReporteById :one
SELECT * FROM REPORTES WHERE reporte_id = $1;

-- name: UpdateReporte :one
UPDATE REPORTES 
SET datos = $2
WHERE reporte_id = $1
RETURNING *;

-- name: DeleteReporte :exec
DELETE FROM REPORTES WHERE reporte_id = $1;

-- name: ListReportes :many
SELECT * FROM REPORTES ORDER BY fecha_generacion DESC;

-- name: ListReportesByTipo :many
SELECT * FROM REPORTES WHERE tipo_reporte = $1 ORDER BY fecha_generacion DESC;

-- name: ListReportesByPeriodo :many
SELECT * FROM REPORTES 
WHERE periodo_inicio >= $1 AND periodo_fin <= $2 
ORDER BY fecha_generacion DESC;


-- ========================================
-- ADDITIONAL USEFUL QUERIES FOR URTUTORIAS
-- ========================================

-- ========================================
-- TUTORES - MISSING QUERIES
-- ========================================

-- name: ListTutoresWithMaterias :many
SELECT t.*, 
       STRING_AGG(m.nombre, ', ') as materias_asignadas,
       COUNT(tm.materia_id) as total_materias
FROM TUTORES t
LEFT JOIN TUTOR_MATERIAS tm ON t.tutor_id = tm.tutor_id AND tm.activo = true
LEFT JOIN MATERIAS m ON tm.materia_id = m.materia_id
GROUP BY t.tutor_id, t.nombre, t.apellido, t.correo, t.programa_academico, t.fecha_registro
ORDER BY t.apellido, t.nombre;

-- name: ListTutoresDisponiblesByMateriaAndDia :many
SELECT DISTINCT t.*, d.dia_semana, d.hora_inicio, d.hora_fin
FROM TUTORES t
JOIN TUTOR_MATERIAS tm ON t.tutor_id = tm.tutor_id
JOIN DISPONIBILIDAD d ON t.tutor_id = d.tutor_id
WHERE tm.materia_id = $1 AND tm.activo = true AND d.dia_semana = $2
ORDER BY d.hora_inicio;

-- ========================================
-- ESTUDIANTES - MISSING QUERIES
-- ========================================

-- name: CountEstudiantesByPrograma :many
SELECT programa_academico, COUNT(*) as total_estudiantes
FROM ESTUDIANTES
GROUP BY programa_academico
ORDER BY total_estudiantes DESC;

-- name: ListEstudiantesBySemestre :many
SELECT * FROM ESTUDIANTES 
WHERE semestre = $1 
ORDER BY apellido, nombre;

-- name: SelectMateriasByEstudiante :many
-- Get materias corresponding to a specific estudiante's semester
SELECT m.*
FROM MATERIAS m
JOIN ESTUDIANTES e ON e.programa_academico = m.facultad
WHERE e.estudiante_id = $1 AND e.semestre = $2
ORDER BY m.codigo;

-- name: GetProximasTutoriasByEstudiante :many
SELECT *
FROM TUTORIAS
WHERE estudiante_id = $1
  AND (
    fecha > CURRENT_DATE OR
    (fecha = CURRENT_DATE AND hora_inicio > CURRENT_TIME)
  )
ORDER BY fecha, hora_inicio;

-- name: ListMateriaNames :many
SELECT nombre 
FROM MATERIAS
ORDER BY nombre;

