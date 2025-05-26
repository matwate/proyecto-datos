// API Configuration
const API_BASE_URL = 'https://matwa.tail013c29.ts.net/api/v1';

// Function to get user session from localStorage
function getUserSession() {
    const session = localStorage.getItem('userSession');
    if (!session) {
        // Redirect to login if no session
        window.location.href = 'iniciosesion.html';
        return null;
    }
    
    try {
        const sessionData = JSON.parse(session);
        // Check if session is still valid (24 hours)
        const sessionAge = Date.now() - sessionData.loginTime;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (sessionAge > maxAge) {
            localStorage.removeItem('userSession');
            window.location.href = 'iniciosesion.html';
            return null;
        }
        
        return sessionData;
    } catch (error) {
        localStorage.removeItem('userSession');
        window.location.href = 'iniciosesion.html';
        return null;
    }
}

// Function to load tutor data from session (already available from login)
function getTutorData() {
    const userSession = getUserSession();
    if (!userSession) return null;
    
    return userSession.user.data;
}

// Function to load tutoring sessions for tutor from API
async function loadTutoringSessions(tutorId) {
    try {
        // Based on swagger.yaml, we need to use a different endpoint
        // This endpoint might not exist yet, so we'll use mock data for now
        // TODO: Update when proper endpoint is available
        console.warn('Using mock data - actual API endpoint for tutor sessions not found in swagger');
        return getMockTutoringSessions();
    } catch (error) {
        console.error('Error loading tutoring sessions:', error);
        return getMockTutoringSessions();
    }
}

// Function to load active tutoring sessions for tutor
async function loadActiveTutoringSessions() {
    try {
        // Based on swagger.yaml, no direct endpoint for active sessions by tutor
        // Using mock data for now
        console.warn('Using mock data - active tutoring sessions endpoint not available');
        return getMockTutoringSessions().filter(session => session.status === 'confirmada');
    } catch (error) {
        console.error('Error loading active tutoring sessions:', error);
        return [];
    }
}

// Function to load subjects that tutor teaches
async function loadTutorSubjects(tutorId) {
    try {
        // Based on swagger.yaml, use the tutor-materias endpoint with materia_id parameter
        // But we need tutores by materia, not materias by tutor
        // The correct endpoint would be to get materias for a specific tutor
        // Since this isn't directly available, we'll use mock data
        console.warn('Using mock data - tutor subjects endpoint needs proper implementation');
        return getMockTutorSubjects();
    } catch (error) {
        console.error('Error loading tutor subjects:', error);
        return getMockTutorSubjects();
    }
}

// Function to update tutoring status via API
async function updateTutoringStatus(tutoringId, newStatus) {
    try {
        // Using the correct swagger endpoint: PATCH /v1/tutorias/{id}/estado
        const result = await apiCall(`/tutorias/${tutoringId}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado: newStatus })
        });
        
        return result;
    } catch (error) {
        console.error('Error updating tutoring status:', error);
        throw error;
    }
}

// Function to update tutoring details via API
async function updateTutoringDetails(tutoringId, updateData) {
    try {
        const result = await apiCall(`/tutorias/${tutoringId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        return result;
    } catch (error) {
        console.error('Error updating tutoring details:', error);
        throw error;
    }
}

// Initialize session data with user session and prepare for API loading
let sessionData = {
    currentUser: null,
    tutoringSessions: [],
    performanceData: null
};

// Initialize tutor data from session
async function initializeTutorData() {
    const userSession = getUserSession();
    if (!userSession) return;
    
    // Extract tutor data from login session
    const tutorData = userSession.user.data.tutor
    
    console.log('Initializing tutor data:', tutorData);
    // Set current user from session data
    sessionData.currentUser = {
        id: tutorData?.TutorID,
        name: `${tutorData?.Nombre || ''} ${tutorData?.Apellido || ''}`.trim(),
        firstName: tutorData?.Nombre || '',
        lastName: tutorData?.Apellido || '',
        email: tutorData?.Correo || '',
        role: "tutor",
        especialidad: tutorData?.Especialidad || "Especialidad no especificada",
        experiencia: tutorData?.AñosExperiencia || 0,
        telefono: tutorData?.Telefono || '',
        avatar: (tutorData?.Nombre?.[0] || '') + (tutorData?.Apellido?.[0] || ''),
        documento: tutorData?.NumeroDocumento || ''
    };
    
    console.log('Current user data:', sessionData.currentUser);

    try {
        // Load tutoring sessions for this tutor
        const tutoringSessions = await getTutoringSessions(sessionData.currentUser.id);
        sessionData.tutoringSessions = tutoringSessions || [];
        
        // Load subjects that this tutor teaches
        const tutorSubjects = await getTutorSubjects(sessionData.currentUser.id);
        sessionData.tutorSubjects = tutorSubjects || [];
        
        console.log('Loaded tutoring sessions:', sessionData.tutoringSessions);
        console.log('Loaded tutor subjects:', sessionData.tutorSubjects);
        
        // Calculate performance data from sessions
        sessionData.performanceData = calculatePerformanceData(sessionData.tutoringSessions);
    } catch (error) {
        console.error('Error loading tutor data:', error);
        sessionData.tutoringSessions = [];
        sessionData.tutorSubjects = [];
        sessionData.performanceData = getDefaultPerformanceData();
    }

    // Update UI with loaded data
    updateTutorInterface();
    
    // Add refresh button
    addRefreshButton();
    
    // Show API status notification
    showAPIStatus();
    
    // Ensure navbar is updated after all data is loaded
    setTimeout(() => {
        updateTutorInterface();
    }, 500);
}

// Enhanced error handling and logging
function logAPICall(endpoint, method = 'GET', data = null) {
    console.log(`[API Call] ${method} ${endpoint}`, data ? { data } : '');
}

function logAPIResponse(endpoint, response, error = null) {
    if (error) {
        console.error(`[API Error] ${endpoint}:`, error);
    } else {
        console.log(`[API Success] ${endpoint}:`, response);
    }
}

// Enhanced fetch wrapper with logging
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const method = options.method || 'GET';
    
    logAPICall(endpoint, method, options.body);
    
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        logAPIResponse(endpoint, data);
        return data;
        
    } catch (error) {
        logAPIResponse(endpoint, null, error);
        throw error;
    }
}

// Mock data for development/fallback - following API structure from swagger
function getMockTutoringSessions() {
    return [
        {
            tutoriaID: 1,
            estudianteID: 101,
            tutorID: sessionData.currentUser?.id || 1,
            materiaID: 1,
            fecha: { time: '2025-05-23', valid: true },
            horaInicio: '14:00',
            horaFin: '15:00',
            lugar: 'Aula 201',
            estado: 'confirmada',
            asistenciaConfirmada: { bool: true, valid: true },
            fechaSolicitud: { time: '2025-05-20T10:00:00Z', valid: true },
            fechaConfirmacion: { time: '2025-05-20T11:00:00Z', valid: true },
            temasTratados: { string: 'Derivadas por definición, Regla de la cadena', valid: true }
        },
        {
            tutoriaID: 2,
            estudianteID: 102,
            tutorID: sessionData.currentUser?.id || 1,
            materiaID: 2,
            fecha: { time: '2025-05-25', valid: true },
            horaInicio: '10:00',
            horaFin: '11:00',
            lugar: 'Lab. Informática',
            estado: 'cancelada',
            asistenciaConfirmada: { bool: false, valid: true },
            fechaSolicitud: { time: '2025-05-22T09:00:00Z', valid: true },
            fechaConfirmacion: { time: null, valid: false },
            temasTratados: { string: 'POO, Herencia', valid: true }
        },
        {
            tutoriaID: 3,
            estudianteID: 103,
            tutorID: sessionData.currentUser?.id || 1,
            materiaID: 3,
            fecha: { time: '2025-05-24', valid: true },
            horaInicio: '16:00',
            horaFin: '17:00',
            lugar: 'Aula 105',
            estado: 'solicitada',
            asistenciaConfirmada: { bool: false, valid: false },
            fechaSolicitud: { time: '2025-05-23T12:00:00Z', valid: true },
            fechaConfirmacion: { time: null, valid: false },
            temasTratados: { string: 'Matrices, Determinantes', valid: true }
        }
    ];
}

function getMockTutorSubjects() {
    return [
        {
            materiaID: 1,
            materiaNombre: 'Cálculo Diferencial',
            materiaCodigo: 'MAT101',
            activo: true
        },
        {
            materiaID: 2,
            materiaNombre: 'Programación I',
            materiaCodigo: 'INF101',
            activo: true
        },
        {
            materiaID: 3,
            materiaNombre: 'Álgebra Linear',
            materiaCodigo: 'MAT201',
            activo: true
        }
    ];
}

function getMockPerformanceData() {
    return {
        totalTutorias: 24,
        tutoriasCompletadas: 18,
        tutoriasCanceladas: 3,
        tasaAsistencia: 75,
        horasMes: 18,
        horasTotal: 156,
        promedioSemana: 4.5,
        duracionPromedio: '65min'
    };
}

// Get default performance data when no real data is available
function getDefaultPerformanceData() {
    return {
        totalTutorias: 0,
        tutoriasCompletadas: 0,
        tutoriasCanceladas: 0,
        tasaAsistencia: 0,
        horasMes: 0,
        horasTotal: 0,
        promedioSemana: 0,
        duracionPromedio: '60min'
    };
}

// Calculate performance data from tutoring sessions
function calculatePerformanceData(sessions) {
    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'completada').length;
    const cancelled = sessions.filter(s => s.status === 'cancelada').length;
    const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
        totalTutorias: total,
        tutoriasCompletadas: completed,
        tutoriasCanceladas: cancelled,
        tasaAsistencia: attendanceRate,
        horasMes: Math.round(completed * 1.2), // Estimate based on completed sessions
        horasTotal: Math.round(total * 1.5), // Estimate based on all sessions
        promedioSemana: Math.round((total / 4) * 10) / 10, // Estimate weekly average
        duracionPromedio: '60min' // Default duration
    };
}

// Variables globales
let currentUser = 'tutor';
let tutorings = []; // Will be replaced by sessionData.tutoringSessions
let performanceData = {}; // Will be replaced by sessionData.performanceData

// Función para cambiar entre pestañas
function showTab(tabName) {
    // Ocultar todas las pestañas
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Mostrar la pestaña seleccionada
    document.getElementById(tabName).classList.add('active');
    
    // Actualizar botones de navegación
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => tab.classList.remove('active'));
    
    // Encontrar y activar el botón correspondiente
    const targetButton = Array.from(navTabs).find(tab => 
        tab.getAttribute('onclick').includes(tabName)
    );
    if (targetButton) {
        targetButton.classList.add('active');
    }

    // Actualizar reportes si se selecciona esa pestaña
    if (tabName === 'reportes') {
        updateReports();
    }
}

// Función para completar tutoría
async function completeTutoring(tutoringId) {
    const tutoring = sessionData.tutoringSessions.find(t => t.id === tutoringId);
    if (!tutoring) return;

    try {
        const result = await updateTutoringStatus(tutoringId, 'completada');
        if (result) {
            tutoring.status = 'completada';
            await updateTutoringTable();
            showNotification('Tutoría marcada como completada exitosamente', 'success');
        } else {
            showNotification('Error al completar la tutoría. Inténtalo nuevamente.', 'error');
        }
    } catch (error) {
        console.error('Error completing tutoring:', error);
        showNotification('Error al completar la tutoría. Inténtalo nuevamente.', 'error');
    }
}

// Función para confirmar tutoría
async function confirmTutoring(tutoringId) {
    const tutoring = sessionData.tutoringSessions.find(t => t.id === tutoringId);
    if (!tutoring) return;

    try {
        const result = await updateTutoringStatus(tutoringId, 'confirmada');
        if (result) {
            tutoring.status = 'confirmada';
            await updateTutoringTable();
            showNotification('Tutoría confirmada exitosamente', 'success');
        } else {
            showNotification('Error al confirmar la tutoría. Inténtalo nuevamente.', 'error');
        }
    } catch (error) {
        console.error('Error confirming tutoring:', error);
        showNotification('Error al confirmar la tutoría. Inténtalo nuevamente.', 'error');
    }
}

// Función para abrir modal de reasignación
function openReassignModal(tutoringId) {
    const tutoring = sessionData.tutoringSessions.find(t => t.id === tutoringId);
    
    if (tutoring.status !== 'cancelada') {
        showNotification('Solo se pueden reasignar tutorías canceladas', 'warning');
        return;
    }

    document.getElementById('tutoriaReasignar').value = 
        `${tutoring.subject} - ${tutoring.student} (${tutoring.date} ${tutoring.time})`;
    document.getElementById('reasignarModal').style.display = 'block';
    document.getElementById('reasignarModal').setAttribute('data-tutoria-id', tutoringId);
}

// Función para confirmar reasignación
async function confirmarReasignacion() {
    const tutoringId = document.getElementById('reasignarModal').getAttribute('data-tutoria-id');
    const nuevoTutor = document.getElementById('nuevoTutor').value;
    const nuevaFecha = document.getElementById('nuevaFecha').value;
    const nuevaHora = document.getElementById('nuevaHora').value;
    const motivo = document.getElementById('motivoReasignacion').value;

    if (!nuevoTutor || !nuevaFecha || !nuevaHora || !motivo) {
        showNotification('Por favor, complete todos los campos', 'error');
        return;
    }

    const tutoring = sessionData.tutoringSessions.find(t => t.id == tutoringId);
    if (!tutoring) return;

    try {
        const reassignmentData = {
            nuevoTutor,
            nuevaFecha,
            nuevaHora,
            motivo
        };

        const result = await reassignTutoring(tutoringId, reassignmentData);
        if (result) {
            tutoring.date = nuevaFecha;
            tutoring.time = nuevaHora;
            tutoring.status = 'confirmada';
            tutoring.notes = `Reasignada: ${motivo}`;
            
            closeModal('reasignarModal');
            await updateTutoringTable();
            showNotification('Tutoría reasignada exitosamente', 'success');
        } else {
            showNotification('Error al reasignar la tutoría. Inténtalo nuevamente.', 'error');
        }
    } catch (error) {
        console.error('Error reassigning tutoring:', error);
        showNotification('Error al reasignar la tutoría. Inténtalo nuevamente.', 'error');
    }
}

// Función para actualizar tabla de tutorías (dashboard - 6 columns)
async function updateTutoringTable() {
    const tableBody = document.getElementById('tutoriasTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    // Process each tutoring session asynchronously
    for (const tutoring of sessionData.tutoringSessions) {
        const row = document.createElement('tr');
        
        try {
            // Map API data to display format - handle both API response format and local format
            const tutoriaId = tutoring.tutoriaID || tutoring.TutoriaID || tutoring.tutoria_id || tutoring.id || '';
            row.setAttribute('data-tutoria-id', tutoriaId);
            
            // Handle materia name
            let materiaName = 'N/A';
            if (tutoring.materiaNombre) {
                materiaName = tutoring.materiaNombre;
            } else if (tutoring.materia_nombre) {
                materiaName = tutoring.materia_nombre;
            } else if (tutoring.subject) {
                materiaName = tutoring.subject;
            } else if (tutoring.materiaID || tutoring.MateriaID) {
                materiaName = GetIdFromName(tutoring.materiaID || tutoring.MateriaID);
            }
            
            // Handle student name
            let student = 'N/A';
            if (tutoring.estudianteNombre && tutoring.estudianteApellido) {
                student = `${tutoring.estudianteNombre} ${tutoring.estudianteApellido}`;
            } else if (tutoring.estudiante_nombre && tutoring.estudiante_apellido) {
                student = `${tutoring.estudiante_nombre} ${tutoring.estudiante_apellido}`;
            } else if (tutoring.student) {
                student = tutoring.student;
            } else if (tutoring.estudianteID || tutoring.EstudianteID) {
                student = await getStudentName(tutoring.estudianteID || tutoring.EstudianteID);
            }
            
            // Handle date
            let fecha = 'N/A';
            if (tutoring.fecha) {
                if (typeof tutoring.fecha === 'object' && tutoring.fecha.time) {
                    fecha = tutoring.fecha.time;
                } else if (typeof tutoring.fecha === 'string') {
                    fecha = tutoring.fecha;
                }
            } else if (tutoring.Fecha) {
                fecha = tutoring.Fecha;
            } else if (tutoring.date) {
                fecha = tutoring.date;
            }
            
            // Handle time
            let time = 'N/A';
            if (tutoring.time) {
                time = tutoring.time;
            } else if (tutoring.horaInicio && tutoring.horaFin) {
                time = `${tutoring.horaInicio}-${tutoring.horaFin}`;
            } else if (tutoring.hora_inicio && tutoring.hora_fin) {
                time = `${tutoring.hora_inicio}-${tutoring.hora_fin}`;
            } else if (tutoring.HoraInicio && tutoring.HoraFin) {
                // Handle Go time format - convert microseconds to hours
                if (tutoring.HoraInicio.Microseconds && tutoring.HoraFin.Microseconds) {
                    const startHour = Math.floor(tutoring.HoraInicio.Microseconds / 3600000000);
                    const endHour = Math.floor(tutoring.HoraFin.Microseconds / 3600000000);
                    time = `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`;
                }
            }
            
            // Handle status
            const status = tutoring.estado || tutoring.Estado || tutoring.status || 'N/A';
            const statusClass = `status-${status}`;
            const statusText = getStatusText(status);
            
            // Generate action buttons with comprehensive field access
            let actions = `<button class="btn btn-primary" onclick="openModal('detalleTutoria')">Ver</button>`;
            
            if (status === 'confirmada') {
                actions += ` <button class="btn btn-success" onclick="completeTutoring(${tutoriaId})">Completar</button>`;
            } else if (status === 'solicitada') {
                actions += ` <button class="btn btn-success" onclick="confirmTutoring(${tutoriaId})">Confirmar</button>`;
            } else if (status === 'cancelada') {
                actions += ` <button class="btn btn-warning" onclick="openReassignModal(${tutoriaId})">Reasignar</button>`;
            }
            
            row.innerHTML = `
                <td>${materiaName}</td>
                <td>${student}</td>
                <td>${formatDate(fecha)}</td>
                <td>${time}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${actions}</td>
            `;
            
            tableBody.appendChild(row);
        } catch (error) {
            console.error('Error processing tutoring session:', error, tutoring);
            // Still add a row with fallback data to prevent the table from disappearing
            row.innerHTML = `
                <td>Error cargando datos</td>
                <td>Error cargando datos</td>
                <td>Error cargando datos</td>
                <td>Error cargando datos</td>
                <td><span class="status-badge status-error">Error</span></td>
                <td>-</td>
            `;
            tableBody.appendChild(row);
        }
    }
    
    // Show message if no tutoring sessions
    if (sessionData.tutoringSessions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" style="text-align: center; color: #666;">No tienes tutorías programadas</td>';
        tableBody.appendChild(row);
    }
}

// Función para actualizar reportes
function updateReports() {
    if (!sessionData.performanceData) return;
    
    const data = sessionData.performanceData;
    
    // Actualizar valores de performance
    const elements = {
        'totalTutorias': data.totalTutorias,
        'tutoriasCompletadas': data.tutoriasCompletadas,
        'tutoriasCanceladas': data.tutoriasCanceladas,
        'tasaAsistencia': `${data.tasaAsistencia}%`,
        'horasMes': data.horasMes,
        'horasTotal': data.horasTotal,
        'promedioSemana': data.promedioSemana,
        'duracionPromedio': data.duracionPromedio
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Función para actualizar reportes
function updateReports() {
    // Actualizar métricas básicas
    document.getElementById('totalTutorias').textContent = performanceData.totalTutorias;
    document.getElementById('tutoriasCompletadas').textContent = performanceData.tutoriasCompletadas;
    document.getElementById('tutoriasCanceladas').textContent = performanceData.tutoriasCanceladas;
    document.getElementById('tasaAsistencia').textContent = performanceData.tasaAsistencia + '%';
    
    document.getElementById('horasMes').textContent = performanceData.horasMes;
    document.getElementById('horasTotal').textContent = performanceData.horasTotal;
    document.getElementById('promedioSemana').textContent = performanceData.promedioSemana;
    document.getElementById('duracionPromedio').textContent = performanceData.duracionPromedio;
}

// Función para establecer disponibilidad
function setAvailability() {
    const day = document.getElementById('tutor-day').value;
    const startTime = document.getElementById('tutor-start-time').value;
    const endTime = document.getElementById('tutor-end-time').value;
    
    if (!startTime || !endTime) {
        showNotification('Por favor, complete todos los campos de horario', 'error');
        return;
    }
    
    if (startTime >= endTime) {
        showNotification('La hora de inicio debe ser anterior a la hora de fin', 'error');
        return;
    }
    
    showNotification(`Disponibilidad actualizada para ${day} de ${startTime} a ${endTime}`, 'success');
}

// Función para agregar notas a tutoría
function addNotesToTutoring() {
    // Aquí se abriría un modal para agregar notas
    const notes = prompt('Ingrese sus notas sobre esta tutoría:');
    if (notes) {
        showNotification('Notas agregadas exitosamente', 'success');
    }
}

// Función para generar reporte detallado
function generateDetailedReport() {
    showNotification('Generando reporte PDF...', 'success');
    // Simular descarga de PDF
    setTimeout(() => {
        showNotification('Reporte PDF generado y descargado', 'success');
    }, 2000);
}

// Función para exportar datos
function exportData() {
    showNotification('Exportando datos a Excel...', 'success');
    // Simular descarga de Excel
    setTimeout(() => {
        showNotification('Datos exportados a Excel exitosamente', 'success');
    }, 1500);
}

// Función para abrir modales
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// Función para cerrar modales
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Función para limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroMateriaModal').value = '';
    document.getElementById('fechaInicio').value = '';
    document.getElementById('fechaFin').value = '';
}

// Función para mostrar notificaciones
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        ${type === 'success' ? 'background-color: #4CAF50;' : ''}
        ${type === 'error' ? 'background-color: #f44336;' : ''}
        ${type === 'warning' ? 'background-color: #ff9800;' : ''}
        ${type === 'info' ? 'background-color: #2196F3;' : ''}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// API Status notification system
function showAPIStatus() {
    const statusMessage = document.createElement('div');
    statusMessage.className = 'api-status-notification';
    statusMessage.innerHTML = `
        <div class="notification-content">
            <span class="status-icon">⚠️</span>
            <span class="status-text">Usando datos de prueba - API en desarrollo</span>
            <button class="close-notification" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    statusMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 300px;
        font-size: 14px;
    `;
    
    const notificationContent = statusMessage.querySelector('.notification-content');
    notificationContent.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    const closeButton = statusMessage.querySelector('.close-notification');
    closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #856404;
        margin-left: auto;
    `;
    
    document.body.appendChild(statusMessage);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (statusMessage.parentElement) {
            statusMessage.remove();
        }
    }, 10000);
}

// Action functions for tutor operations
async function confirmarTutoria(tutoriaId) {
    try {
        const result = await updateTutoringStatus(tutoriaId, 'confirmada');
        if (result) {
            const tutoring = sessionData.tutoringSessions.find(t => (t.tutoria_id || t.id) === tutoriaId);
            if (tutoring) {
                tutoring.estado = 'confirmada';
                tutoring.status = 'confirmada';
            }
            showNotification('Tutoría confirmada exitosamente', 'success');
            await updateTutoriasTable();
        }
    } catch (error) {
        console.error('Error confirming tutoring:', error);
        showNotification('Error al confirmar la tutoría', 'error');
    }
}

async function completarTutoria(tutoriaId) {
    try {
        const result = await updateTutoringStatus(tutoriaId, 'completada');
        if (result) {
            const tutoring = sessionData.tutoringSessions.find(t => (t.tutoria_id || t.id) === tutoriaId);
            if (tutoring) {
                tutoring.estado = 'completada';
                tutoring.status = 'completada';
            }
            showNotification('Tutoría marcada como completada', 'success');
            await updateTutoriasTable();
            await updateTutorDashboard();
        }
    } catch (error) {
        console.error('Error completing tutoring:', error);
        showNotification('Error al completar la tutoría', 'error');
    }
}

async function rechazarTutoria(tutoriaId) {
    if (confirm('¿Estás seguro de que quieres rechazar esta tutoría?')) {
        try {
            const result = await updateTutoringStatus(tutoriaId, 'cancelada');
            if (result) {
                const tutoring = sessionData.tutoringSessions.find(t => (t.tutoria_id || t.id) === tutoriaId);
                if (tutoring) {
                    tutoring.estado = 'cancelada';
                    tutoring.status = 'cancelada';
                }
                showNotification('Tutoría rechazada', 'info');
                await updateTutoriasTable();
            }
        } catch (error) {
            console.error('Error rejecting tutoring:', error);
            showNotification('Error al rechazar la tutoría', 'error');
        }
    }
}

function openTutoriaDetail(tutoriaId) {
    const tutoring = sessionData.tutoringSessions.find(t => (t.tutoria_id || t.id) === tutoriaId);
    if (!tutoring) return;

    // Fill modal with tutoring details
    // Implementation depends on the HTML structure of the modal
    console.log('Opening tutoria detail for:', tutoring);
    showNotification('Función de detalle en desarrollo', 'info');
}

function openRescheduleModal(tutoriaId) {
    const tutoring = sessionData.tutoringSessions.find(t => (t.tutoria_id || t.id) === tutoriaId);
    if (!tutoring) return;

    // Open reschedule modal
    console.log('Opening reschedule modal for:', tutoring);
    showNotification('Función de reprogramación en desarrollo', 'info');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Cerrar modales al hacer clic en la X
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Cerrar modales al hacer clic fuera del contenido
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });

    // Manejar envío del formulario de filtros
    const filtrosForm = document.getElementById('filtrosForm');
    if (filtrosForm) {
        filtrosForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showNotification('Filtros aplicados correctamente', 'success');
            closeModal('filtros');
        });
    }

    // Establecer fecha mínima para reasignación
    const nuevaFechaInput = document.getElementById('nuevaFecha');
    if (nuevaFechaInput) {
        const today = new Date().toISOString().split('T')[0];
        nuevaFechaInput.min = today;
    }

    // Actualizar tabla inicial
    updateTutoringTable().catch(error => {
        console.error('Error updating tutoring table on load:', error);
    });
});

// Animación de entrada suave al cargar la página
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in';
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Efectos hover mejorados para elementos de información
document.querySelectorAll('.info-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateX(10px) scale(1.02)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateX(0) scale(1)';
    });
});

// Validación en tiempo real para reasignación
document.addEventListener('input', function(e) {
    if (e.target.id === 'nuevaHora' || e.target.id === 'nuevaFecha') {
        const fecha = document.getElementById('nuevaFecha').value;
        const hora = document.getElementById('nuevaHora').value;
        
        if (fecha && hora) {
            const fechaSeleccionada = new Date(fecha + 'T' + hora);
            const ahora = new Date();
            
            if (fechaSeleccionada <= ahora) {
                showNotification('La fecha y hora deben ser futuras', 'warning');
            }
        }
    }
});

// Función para filtrar tutorías en tiempo real
function filterTutorings() {
    const estado = document.getElementById('filtroEstado').value;
    const materia = document.getElementById('filtroMateriaModal').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    // Use sessionData instead of global tutorings
    if (!sessionData || !sessionData.tutoringSessions) {
        return [];
    }

    let filteredTutorings = sessionData.tutoringSessions;

    if (estado) {
        filteredTutorings = filteredTutorings.filter(t => t.status === estado);
    }

    if (materia) {
        filteredTutorings = filteredTutorings.filter(t => 
            t.subject.toLowerCase().includes(materia.toLowerCase())
        );
    }

    if (fechaInicio) {
        filteredTutorings = filteredTutorings.filter(t => t.date >= fechaInicio);
    }

    if (fechaFin) {
        filteredTutorings = filteredTutorings.filter(t => t.date <= fechaFin);
    }

    // Update the table with filtered results
    updateTutoringTable(filteredTutorings);
    return filteredTutorings;
}

// Function to update tutor interface on page load
async function updateTutorInterface() {
    console.log('updateTutorInterface called');
    
    const userSession = getUserSession();
    if (!userSession) {
        console.warn('No user session found in updateTutorInterface');
        return;
    }

    console.log('User session found:', userSession);

    // Get tutor data directly from session
    let tutorData = null;
    let currentUser = sessionData.currentUser;

    // If we don't have currentUser in sessionData, create it from userSession
    if (!currentUser && userSession.user && userSession.user.data) {
        tutorData = userSession.user.data;
        console.log('Tutor data from session:', tutorData);
        
        currentUser = {
            id: tutorData?.TutorID,
            name: `${tutorData?.Nombre || ''} ${tutorData?.Apellido || ''}`.trim(),
            firstName: tutorData?.Nombre || '',
            lastName: tutorData?.Apellido || '',
            email: tutorData?.Correo || '',
            role: "tutor",
            especialidad: tutorData?.Especialidad || "Especialidad no especificada",
            experiencia: tutorData?.AñosExperiencia || 0,
            telefono: tutorData?.Telefono || '',
            avatar: (tutorData?.Nombre?.[0] || '') + (tutorData?.Apellido?.[0] || ''),
            documento: tutorData?.NumeroDocumento || ''
        };
        
        // Update global sessionData
        sessionData.currentUser = currentUser;
        console.log('Created currentUser from session data:', currentUser);
    }

    // Final fallback - if still no user data, try to extract directly
    if (!currentUser) {
        tutorData = userSession.user?.data;
        if (tutorData) {
            currentUser = {
                id: tutorData.TutorID || 'unknown',
                name: `${tutorData.Nombre || ''} ${tutorData.Apellido || ''}`.trim() || 'Tutor',
                firstName: tutorData.Nombre || '',
                lastName: tutorData.Apellido || '',
                email: tutorData.Correo || '',
                role: "tutor",
                especialidad: tutorData.Especialidad || "Especialidad no especificada",
                experiencia: tutorData.AñosExperiencia || 0,
                telefono: tutorData.Telefono || '',
                avatar: (tutorData.Nombre?.[0] || 'T') + (tutorData.Apellido?.[0] || 'U'),
                documento: tutorData.NumeroDocumento || ''
            };
            console.log('Fallback currentUser created:', currentUser);
        } else {
            console.error('No tutor data available in session');
            return;
        }
    }

    console.log('Final user data for navbar update:', currentUser);

    // Update navbar with tutor info
    const navbarUserName = document.getElementById('navbar-user-name');
    const navbarUserSubtitle = document.getElementById('navbar-user-subtitle');
    const navbarUserAvatar = document.getElementById('navbar-user-avatar');

    console.log('Navbar elements found:', {
        name: !!navbarUserName,
        subtitle: !!navbarUserSubtitle,
        avatar: !!navbarUserAvatar
    });

    if (navbarUserName) {
        const nameText = currentUser.Nombre || 'Tutor';
        navbarUserName.textContent = nameText;
        console.log('Updated navbar name to:', nameText);
    } else {
        console.warn('navbar-user-name element not found');
    }
    
    if (navbarUserSubtitle) {
        const subtitleText = `Tutor - ${currentUser.especialidad || 'Especialidad'}`;
        navbarUserSubtitle.textContent = subtitleText;
        console.log('Updated navbar subtitle to:', subtitleText);
    } else {
        console.warn('navbar-user-subtitle element not found');
    }
    
    if (navbarUserAvatar) {
        const avatarText = currentUser.avatar || currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'TU';
        
        // Check if it's an img element or text element
        if (navbarUserAvatar.tagName === 'IMG') {
            // Replace img with text span
            const textSpan = document.createElement('span');
            textSpan.id = 'navbar-user-avatar';
            textSpan.textContent = avatarText;
            textSpan.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; background: #2196F3; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;';
            navbarUserAvatar.parentNode.replaceChild(textSpan, navbarUserAvatar);
            console.log('Replaced avatar img with text span:', avatarText);
        } else {
            navbarUserAvatar.textContent = avatarText;
            console.log('Updated avatar text to:', avatarText);
        }
    } else {
        console.warn('navbar-user-avatar element not found');
    }

    // Update profile section with tutor data
    const profileNombre = document.getElementById('profile-nombre');
    const profileApellido = document.getElementById('profile-apellido');
    const profileEmail = document.getElementById('profile-email');
    const profileTelefono = document.getElementById('profile-telefono');
    const profileCarrera = document.getElementById('profile-carrera');
    const profileMaterias = document.getElementById('profile-materias');
    const profileFechaRegistro = document.getElementById('profile-fecha-registro');

    console.log('Updating profile elements with user data');
    
    if (profileNombre) {
        profileNombre.textContent = currentUser.firstName || '';
        console.log('Updated profile nombre:', currentUser.firstName);
    }
    if (profileApellido) {
        profileApellido.textContent = currentUser.lastName || '';
        console.log('Updated profile apellido:', currentUser.lastName);
    }
    if (profileEmail) {
        profileEmail.textContent = currentUser.email || '';
        console.log('Updated profile email:', currentUser.email);
    }
    if (profileTelefono) {
        profileTelefono.textContent = currentUser.telefono || '';
        console.log('Updated profile telefono:', currentUser.telefono);
    }
    if (profileCarrera) {
        profileCarrera.textContent = currentUser.especialidad || '';
        console.log('Updated profile carrera:', currentUser.especialidad);
    }
    
    // Display subjects that tutor teaches
    if (profileMaterias && sessionData.tutorSubjects) {
        const materiaNames = sessionData.tutorSubjects.map(ts => ts.materia_nombre || ts.Nombre).join(', ');
        profileMaterias.textContent = materiaNames || 'No asignadas';
        console.log('Updated profile materias:', materiaNames);
    }
    
    if (profileFechaRegistro) {
        const fechaRegistro = currentUser.fechaRegistro || userSession.user.data?.FechaRegistro;
        if (fechaRegistro) {
            const fecha = new Date(fechaRegistro).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            profileFechaRegistro.textContent = fecha;
            console.log('Updated profile fecha registro:', fecha);
        } else {
            profileFechaRegistro.textContent = 'No disponible';
            console.log('Profile fecha registro: No disponible');
        }
    }

    // Update dashboard tables and statistics
    await updateTutorDashboard();
}

// Mock function to simulate tutor name fetching
async function getTutorName(tutorId) {
   try {
        const response = await fetch(`${API_BASE_URL}/tutores/${tutorId}/nombre`);
        if (!response.ok) throw new Error('Failed to fetch tutor name');
        const data = await response.json()
        
        // API returns both Nombre and Apellido, combine them
        if (data.nombre && data.apellido) {
            return `${data.nombre} ${data.apellido}`;
        } else if (data.nombre) {
            return data.nombre;
        } else {
            return 'Tutor no encontrado';
        }
   } catch (error) {
        console.error('Error fetching tutor name:', error);
        return 'Tutor no encontrado';
    }
}

// Helper function to get subject name from materia ID
function GetIdFromName(materiaId) {
    if (!sessionData.tutorSubjects || !materiaId) return 'N/A';
    
    const materia = sessionData.tutorSubjects.find(m => 
        m.materia_id === materiaId || 
        m.MateriaID === materiaId || 
        m.materiaID === materiaId ||
        m.id === materiaId
    );
    return materia ? (materia.materia_nombre || materia.materiaNombre || materia.nombre || materia.name || 'N/A') : 'N/A';
}

// Helper function to get student name from API
async function getStudentName(studentId) {
    try {
        const data = await apiCall(`/estudiantes/${studentId}`);
        
        // API returns both Nombre and Apellido, combine them
        if (data.nombre && data.apellido) {
            return `${data.nombre} ${data.apellido}`;
        } else if (data.Nombre && data.Apellido) {
            return `${data.Nombre} ${data.Apellido}`;
        } else if (data.name) {
            return data.name;
        } else {
            return 'Estudiante no encontrado';
        }
    } catch (error) {
        console.error('Error fetching student name:', error);
        return 'Error cargando estudiante';
    }
}

// Update performance data periodically using session data
setInterval(() => {
    if (sessionData && sessionData.performanceData) {
        // Simulate small updates to performance data
        sessionData.performanceData.horasMes += Math.floor(Math.random() * 2);
        sessionData.performanceData.tasaAsistencia = Math.min(100, sessionData.performanceData.tasaAsistencia + Math.floor(Math.random() * 3));
        
        if (document.getElementById('reportes') && document.getElementById('reportes').classList.contains('active')) {
            updateReports();
        }
    }
}, 30000); // Update every 30 seconds

// Initialize tutor interface when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tutor data from session
    initializeTutorData().then(() => {
        console.log('Tutor data initialized successfully');
        // Ensure interface is updated after initialization
        updateTutorInterface();
    }).catch(error => {
        console.error('Error initializing tutor data:', error);
        showNotification('Error cargando datos del tutor', 'error');
        // Try to update interface with whatever session data we have
        updateTutorInterface();
    });
    
    // Also try to update interface immediately with session data
    updateTutorInterface().catch(error => {
        console.error('Error updating tutor interface on load:', error);
    });
});

// Also handle page visibility changes to refresh data
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page became visible, refresh data
        updateTutorInterface().catch(error => {
            console.error('Error updating tutor interface on visibility change:', error);
        });
    }
});

// Update tutor dashboard with session data
async function updateTutorDashboard() {
    // Update statistics from performance data
    if (sessionData.performanceData) {
        const stats = sessionData.performanceData;
        
        // Update stat cards
        const statElements = {
            'total-tutorias': stats.totalTutorias,
            'tasa-asistencia': `${stats.tasaAsistencia}%`,
            'horas-mes': stats.horasMes,
            'promedio-semana': stats.promedioSemana
        };
        
        Object.keys(statElements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = statElements[id];
            }
        });
    }
    
    // Update tutoring sessions table
    await updateTutoriasTable();
    
    // Update reports if available
    if (typeof updateReports === 'function') {
        updateReports();
    }
}

// Update tutoring sessions table with comprehensive field handling (full table - 8 columns)
async function updateTutoriasTable() {
    const tableBody = document.getElementById('allTutoriasTableBody');
    if (!tableBody || !sessionData.tutoringSessions) return;

    tableBody.innerHTML = '';
    
    // Process each tutoring session asynchronously
    for (const tutoring of sessionData.tutoringSessions) {
        const row = document.createElement('tr');
        
        try {
            // Map API data to display format - handle both API response format and local format
            const tutoriaId = tutoring.tutoriaID || tutoring.TutoriaID || tutoring.tutoria_id || tutoring.id || '';
            
            // Handle materia name
            let materiaName = 'N/A';
            if (tutoring.materiaNombre) {
                materiaName = tutoring.materiaNombre;
            } else if (tutoring.materia_nombre) {
                materiaName = tutoring.materia_nombre;
            } else if (tutoring.subject) {
                materiaName = tutoring.subject;
            } else if (tutoring.MateriaID) {
                materiaName = GetIdFromName(tutoring.MateriaID);
            }
            
            // Handle student name
            let student = 'N/A';
            if (tutoring.estudianteNombre && tutoring.estudianteApellido) {
                student = `${tutoring.estudianteNombre} ${tutoring.estudianteApellido}`;
            } else if (tutoring.estudiante_nombre && tutoring.estudiante_apellido) {
                student = `${tutoring.estudiante_nombre} ${tutoring.estudiante_apellido}`;
            } else if (tutoring.student) {
                student = tutoring.student;
            } else if (tutoring.estudianteID || tutoring.EstudianteID) {
                student = await getStudentName(tutoring.estudianteID || tutoring.EstudianteID);
            }
            
            // Handle date
            let fecha = 'N/A';
            if (tutoring.fecha) {
                if (typeof tutoring.fecha === 'object' && tutoring.fecha.time) {
                    fecha = tutoring.fecha.time;
                } else if (typeof tutoring.fecha === 'string') {
                    fecha = tutoring.fecha;
                }
            } else if (tutoring.Fecha) {
                fecha = tutoring.Fecha;
            } else if (tutoring.date) {
                fecha = tutoring.date;
            }
            
            // Handle time
            let time = 'N/A';
            if (tutoring.time) {
                time = tutoring.time;
            } else if (tutoring.horaInicio && tutoring.horaFin) {
                time = `${tutoring.horaInicio}-${tutoring.horaFin}`;
            } else if (tutoring.hora_inicio && tutoring.hora_fin) {
                time = `${tutoring.hora_inicio}-${tutoring.hora_fin}`;
            } else if (tutoring.HoraInicio && tutoring.HoraFin) {
                // Handle Go time format - convert microseconds to hours
                if (tutoring.HoraInicio.Microseconds && tutoring.HoraFin.Microseconds) {
                    const startHour = Math.floor(tutoring.HoraInicio.Microseconds / 3600000000);
                    const endHour = Math.floor(tutoring.HoraFin.Microseconds / 3600000000);
                    time = `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`;
                } else {
                    time = formatTime(tutoring.HoraInicio, tutoring.HoraFin);
                }
            } else {
                time = formatTime(tutoring.hora_inicio, tutoring.hora_fin);
            }
            
            // Handle location
            const location = tutoring.lugar || tutoring.Lugar || tutoring.location || 'N/A';
            
            // Handle status
            const status = tutoring.estado || tutoring.Estado || tutoring.status || 'N/A';
            const statusClass = `status-${status}`;
            const statusText = getStatusText(status);
            
            row.innerHTML = `
                <td>#${tutoriaId.toString().padStart(3, '0')}</td>
                <td>${materiaName}</td>
                <td>${student}</td>
                <td>${formatDate(fecha)}</td>
                <td>${time}</td>
                <td>${location}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${generateTutorActionButtons(tutoring)}</td>
            `;
            
            tableBody.appendChild(row);
        } catch (error) {
            console.error('Error processing tutoring session:', error, tutoring);
            // Still add a row with fallback data to prevent the table from disappearing
            row.innerHTML = `
                <td>Error</td>
                <td>Error cargando datos</td>
                <td>Error cargando datos</td>
                <td>Error cargando datos</td>
                <td>Error cargando datos</td>
                <td>Error cargando datos</td>
                <td><span class="status-badge status-error">Error</span></td>
                <td>-</td>
            `;
            tableBody.appendChild(row);
        }
    }
    
    // Show message if no tutoring sessions
    if (sessionData.tutoringSessions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="8" style="text-align: center; color: #666;">No tienes tutorías asignadas</td>';
        tableBody.appendChild(row);
    }
}

// Generate action buttons for tutor view with comprehensive field access
function generateTutorActionButtons(tutoring) {
    // Handle ID field variants
    const tutoriaId = tutoring.tutoriaID || tutoring.TutoriaID || tutoring.tutoria_id || tutoring.id || '';
    
    // Handle status field variants
    const status = tutoring.estado || tutoring.Estado || tutoring.status || '';
    
    let buttons = `<button class="btn btn-primary" onclick="openTutoriaDetail(${tutoriaId})">Ver</button>`;
    
    if (status === 'confirmada') {
        buttons += ` <button class="btn btn-success" onclick="completarTutoria(${tutoriaId})">Completar</button>`;
        buttons += ` <button class="btn btn-warning" onclick="openRescheduleModal(${tutoriaId})">Reprogramar</button>`;
    } else if (status === 'solicitada') {
        buttons += ` <button class="btn btn-success" onclick="confirmarTutoria(${tutoriaId})">Confirmar</button>`;
        buttons += ` <button class="btn btn-danger" onclick="rechazarTutoria(${tutoriaId})">Rechazar</button>`;
    }
    
    return buttons;
}

// Helper function to format time range
function formatTime(inicio, fin) {
    if (!inicio) return '';
    if (!fin) return inicio;
    return `${inicio}-${fin}`;
}

// Helper function to get status text
function getStatusText(status) {
    const statusTexts = {
        'solicitada': 'Solicitada',
        'confirmada': 'Confirmada', 
        'completada': 'Completada',
        'cancelada': 'Cancelada',
        'rechazada': 'Rechazada'
    };
    return statusTexts[status] || status;
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Real API functions for when endpoints become available
// These will replace the mock functions once proper endpoints are implemented

// Function to get tutoring sessions by tutor ID (when endpoint is available)
async function getTutoringSessions(tutorId) {
    try {
        // TODO: Replace with actual endpoint when available
        // Possible endpoints: /v1/tutorias/tutor/{tutorId} or /v1/tutores/{tutorId}/tutorias
        console.warn('Real API endpoint not available yet - using mock data');
        return getMockTutoringSessions();
    } catch (error) {
        console.error('Error fetching tutoring sessions:', error);
        return getMockTutoringSessions();
    }
}

// Function to get subjects taught by a tutor (when endpoint is available)
async function getTutorSubjects(tutorId) {
    try {
        // Based on swagger, we might need to use: /v1/tutor-materias/{materia_id}
        // But we need the reverse - materias for a specific tutor
        console.warn('Real API endpoint not available yet - using mock data');
        return getMockTutorSubjects();
    } catch (error) {
        console.error('Error fetching tutor subjects:', error);
        return getMockTutorSubjects();
    }
}

// Function to create a new tutoring session (when endpoint is available)
async function createTutoringSession(sessionData) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutorias`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(sessionData)
        });
        
        if (!response.ok) throw new Error('Failed to create tutoring session');
        return await response.json();
    } catch (error) {
        console.error('Error creating tutoring session:', error);
        throw error;
    }
}

// Function to get individual tutoring session by ID
async function getTutoringSession(tutoringId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutorias/${tutoringId}`);
        if (!response.ok) throw new Error('Failed to fetch tutoring session');
        return await response.json();
    } catch (error) {
        console.error('Error fetching tutoring session:', error);
        throw error;
    }
}

// Function to refresh all tutor data
async function refreshTutorData() {
    const userSession = getUserSession();
    if (!userSession) return;
    
    try {
        showNotification('Actualizando datos...', 'info');
        
        // Reload tutoring sessions
        const tutoringSessions = await getTutoringSessions(sessionData.currentUser.id);
        sessionData.tutoringSessions = tutoringSessions || [];
        
        // Reload tutor subjects
        const tutorSubjects = await getTutorSubjects(sessionData.currentUser.id);
        sessionData.tutorSubjects = tutorSubjects || [];
        
        // Recalculate performance data
        sessionData.performanceData = calculatePerformanceData(sessionData.tutoringSessions);
        
        // Update UI
        updateTutorInterface();
        
        showNotification('Datos actualizados correctamente', 'success');
        
    } catch (error) {
        console.error('Error refreshing tutor data:', error);
        showNotification('Error al actualizar los datos', 'error');
    }
}

// Add refresh button functionality
function addRefreshButton() {
    const navbar = document.querySelector('.navbar');
    if (navbar && !document.querySelector('.refresh-button')) {
        const refreshButton = document.createElement('button');
        refreshButton.className = 'refresh-button';
        refreshButton.innerHTML = '🔄 Actualizar';
        refreshButton.onclick = refreshTutorData;
        refreshButton.style.cssText = `
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-left: 10px;
        `;
        navbar.appendChild(refreshButton);
    }
}

// Test function to verify navbar population
function testNavbarPopulation() {
    console.log('=== Testing Navbar Population ===');
    console.log('sessionData:', sessionData);
    console.log('sessionData.currentUser:', sessionData.currentUser);
    
    const userSession = getUserSession();
    console.log('userSession:', userSession);
    
    const navbarUserName = document.getElementById('navbar-user-name');
    const navbarUserSubtitle = document.getElementById('navbar-user-subtitle');
    const navbarUserAvatar = document.getElementById('navbar-user-avatar');
    
    console.log('navbar elements found:');
    console.log('- navbarUserName:', navbarUserName);
    console.log('- navbarUserSubtitle:', navbarUserSubtitle);
    console.log('- navbarUserAvatar:', navbarUserAvatar);
    
    // Try to update navbar manually
    updateTutorInterface();
    
    console.log('=== After update attempt ===');
    if (navbarUserName) console.log('navbar name content:', navbarUserName.textContent);
    if (navbarUserSubtitle) console.log('navbar subtitle content:', navbarUserSubtitle.textContent);
    if (navbarUserAvatar) console.log('navbar avatar content:', navbarUserAvatar.textContent || navbarUserAvatar.src);
}

// Make test function available globally for debugging
window.testNavbarPopulation = testNavbarPopulation;
