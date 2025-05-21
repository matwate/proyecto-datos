-- name: SelectEstudiante :one 
select * from ESTUDIANTES where estudiante_id = $1;

-- name: LoginEstudiante :one
SELECT * FROM ESTUDIANTES
WHERE correo = $1 AND ti = $2;


