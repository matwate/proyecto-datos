-- filepath: /home/matwa/Desktop/Code/proyecto-datos/migrations/000004_create_admins_table.up.sql
CREATE TABLE ADMINS (
    admin_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- To store hashed passwords
    rol VARCHAR(50) NOT NULL DEFAULT 'admin',
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
