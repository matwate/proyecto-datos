-- name: SelectEstudiante :one 
select * from ESTUDIANTES where estudiante_id = $1;
