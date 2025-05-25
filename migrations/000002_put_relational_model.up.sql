-- Tabla de Estudiantes
CREATE TABLE ESTUDIANTES (
    estudiante_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    programa_academico VARCHAR(100) NOT NULL, -- Changed to NOT NULL
    semestre INTEGER CHECK (semestre > 0 AND semestre <= 12),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Tutores
CREATE TABLE TUTORES (
    tutor_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    programa_academico VARCHAR(100) NOT NULL, -- Changed to NOT NULL
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Materias
CREATE TABLE MATERIAS (
    materia_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    facultad VARCHAR(100) NOT NULL, -- Changed to NOT NULL
    descripcion TEXT NOT NULL, -- Changed to NOT NULL
    creditos INTEGER NOT NULL CHECK (creditos > 0)
);

-- Tabla de asignación de tutores a materias
CREATE TABLE TUTOR_MATERIAS (
    asignacion_id SERIAL PRIMARY KEY,
    tutor_id INTEGER NOT NULL REFERENCES TUTORES(tutor_id) ON DELETE CASCADE,
    materia_id INTEGER NOT NULL REFERENCES MATERIAS(materia_id) ON DELETE CASCADE,
    fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT unique_tutor_materia UNIQUE (tutor_id, materia_id)
);

-- Tabla de disponibilidad de los tutores
CREATE TABLE DISPONIBILIDAD (
    disponibilidad_id SERIAL PRIMARY KEY,
    tutor_id INTEGER NOT NULL REFERENCES TUTORES(tutor_id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1 = Lunes, 7 = Domingo
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    CHECK (hora_inicio < hora_fin)
);

-- Tabla de tutorías
CREATE TABLE TUTORIAS (
    tutoria_id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES ESTUDIANTES(estudiante_id) ON DELETE CASCADE,
    tutor_id INTEGER NOT NULL REFERENCES TUTORES(tutor_id) ON DELETE CASCADE,
    materia_id INTEGER NOT NULL REFERENCES MATERIAS(materia_id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(100) NOT NULL, -- solicitada, confirmada, completada, cancelada
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_confirmacion TIMESTAMP WITH TIME ZONE,
    lugar VARCHAR(100) NOT NULL, -- Changed to NOT NULL
    CHECK (hora_inicio < hora_fin),
    CHECK (fecha >= CURRENT_DATE OR (fecha = CURRENT_DATE AND hora_inicio >= CURRENT_TIME)),
    CHECK (fecha_confirmacion IS NULL OR estado != 'confirmada' OR 
           (fecha_confirmacion + INTERVAL '12 hours') <= (fecha || ' ' || hora_inicio)::TIMESTAMP)
);

-- Restricción: Un estudiante solo puede tener 1 tutoría activa por materia al mismo tiempo
CREATE UNIQUE INDEX idx_una_tutoria_activa_por_materia ON TUTORIAS (estudiante_id, materia_id) 
WHERE (estado = 'solicitada' OR estado = 'confirmada');

-- Tabla de reportes
CREATE TABLE REPORTES (
    reporte_id SERIAL PRIMARY KEY,
    tipo_reporte VARCHAR(100) NOT NULL,
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    generado_por INTEGER NOT NULL, -- ID del usuario que generó el reporte
    datos JSONB, -- Datos del reporte en formato JSON
    CHECK (periodo_inicio <= periodo_fin)
);

-- Índices para optimizar consultas frecuentes
CREATE INDEX idx_tutorias_por_estudiante ON TUTORIAS(estudiante_id, estado);
CREATE INDEX idx_tutorias_por_tutor ON TUTORIAS(tutor_id, fecha, estado);
CREATE INDEX idx_disponibilidad_por_tutor ON DISPONIBILIDAD(tutor_id, dia_semana);
CREATE INDEX idx_tutor_materias ON TUTOR_MATERIAS(tutor_id, materia_id);

-- Vista para tutorías activas
CREATE VIEW tutoriasActivas AS
SELECT t.tutoria_id, e.nombre AS nombre_estudiante, e.apellido AS apellido_estudiante,
       tu.nombre AS nombre_tutor, tu.apellido AS apellido_tutor,
       m.nombre AS materia, t.fecha, t.hora_inicio, t.hora_fin, 
       t.lugar, t.estado
FROM TUTORIAS t
JOIN ESTUDIANTES e ON t.estudiante_id = e.estudiante_id
JOIN TUTORES tu ON t.tutor_id = tu.tutor_id
JOIN MATERIAS m ON t.materia_id = m.materia_id
WHERE t.estado IN ('solicitada', 'confirmada');

-- Vista para reportes de desempeño de tutores
CREATE VIEW desempenoTutores AS
SELECT 
    tu.tutor_id,
    tu.nombre || ' ' || tu.apellido AS tutor,
    m.nombre AS materia,
    COUNT(t.tutoria_id) AS total_tutorias,
    SUM(CASE WHEN t.asistencia_confirmada THEN 1 ELSE 0 END) AS tutorias_completadas,
    SUM(CASE WHEN t.estado = 'cancelada' THEN 1 ELSE 0 END) AS tutorias_canceladas,
    ROUND(SUM(CASE WHEN t.asistencia_confirmada THEN 1 ELSE 0 END)::numeric / 
          NULLIF(COUNT(t.tutoria_id), 0)::numeric * 100, 2) AS porcentaje_asistencia
FROM TUTORES tu
LEFT JOIN TUTORIAS t ON tu.tutor_id = t.tutor_id
LEFT JOIN MATERIAS m ON t.materia_id = m.materia_id
GROUP BY tu.tutor_id, tu.nombre, tu.apellido, m.nombre;

-- Función para validar que tutores solo gestionen materias asignadas
CREATE OR REPLACE FUNCTION validar_tutor_materia()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM TUTOR_MATERIAS 
        WHERE tutor_id = NEW.tutor_id 
        AND materia_id = NEW.materia_id
        AND activo = TRUE
    ) THEN
        RAISE EXCEPTION 'El tutor no está asignado a esta materia';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar tutorías
CREATE TRIGGER validar_tutoria_trigger
BEFORE INSERT OR UPDATE ON TUTORIAS
FOR EACH ROW EXECUTE FUNCTION validar_tutor_materia();

-- Función para verificar confirmación de tutorías con 12 horas de anticipación
CREATE OR REPLACE FUNCTION validar_confirmacion_tutoria()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'confirmada' AND NEW.fecha_confirmacion IS NOT NULL THEN
        IF (NEW.fecha || ' ' || NEW.hora_inicio)::TIMESTAMP - NEW.fecha_confirmacion < INTERVAL '12 hours' THEN
            RAISE EXCEPTION 'Las tutorías deben confirmarse con al menos 12 horas de anticipación';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar confirmación de tutorías
CREATE TRIGGER validar_confirmacion_tutoria_trigger
BEFORE INSERT OR UPDATE ON TUTORIAS
FOR EACH ROW EXECUTE FUNCTION validar_confirmacion_tutoria();
