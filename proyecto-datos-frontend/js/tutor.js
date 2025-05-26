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
        const response = await fetch(`${API_BASE_URL}/tutorias?tutor_id=${tutorId}`);
        if (!response.ok) throw new Error('Failed to load tutoring sessions');
        return await response.json();
    } catch (error) {
        console.error('Error loading tutoring sessions:', error);
        return [];
    }
}

// Function to load active tutoring sessions for tutor
async function loadActiveTutoringSessions() {
    try {
        const response = await fetch(`${API_BASE_URL}/tutorias?activas=true`);
        if (!response.ok) throw new Error('Failed to load active tutoring sessions');
        return await response.json();
    } catch (error) {
        console.error('Error loading active tutoring sessions:', error);
        return [];
    }
}

// Function to load subjects that tutor teaches
async function loadTutorSubjects(tutorId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutor-materias?tutor_id=${tutorId}`);
        if (!response.ok) throw new Error('Failed to load tutor subjects');
        return await response.json();
    } catch (error) {
        console.error('Error loading tutor subjects:', error);
        return [];
    }
}

// Function to update tutoring status via API
async function updateTutoringStatus(tutoringId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutorias/${tutoringId}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ estado: newStatus })
        });
        
        if (!response.ok) throw new Error('Failed to update tutoring status');
        return await response.json();
    } catch (error) {
        console.error('Error updating tutoring status:', error);
        throw error;
    }
}

// Function to update tutoring details via API
async function updateTutoringDetails(tutoringId, updateData) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutorias/${tutoringId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) throw new Error('Failed to update tutoring details');
        return await response.json();
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
    const tutorData = userSession.user.data;
    
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
    
    try {
        // Load tutoring sessions for this tutor
        const tutoringSessions = await loadTutoringSessions(sessionData.currentUser.id);
        sessionData.tutoringSessions = tutoringSessions || [];
        
        // Load subjects that this tutor teaches
        const tutorSubjects = await loadTutorSubjects(sessionData.currentUser.id);
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
}

// Mock data for development/fallback
function getMockTutoringSessions() {
    return [
        {
            id: 1,
            subject: 'Cálculo Diferencial',
            student: 'María Rodríguez',
            date: '2025-05-23',
            time: '14:00-15:00',
            status: 'confirmada',
            location: 'Aula 201',
            topics: ['Derivadas por definición', 'Regla de la cadena'],
            notes: ''
        },
        {
            id: 2,
            subject: 'Programación I',
            student: 'Carlos López',
            date: '2025-05-25',
            time: '10:00-11:00',
            status: 'cancelada',
            location: 'Lab. Informática',
            topics: ['POO', 'Herencia'],
            notes: ''
        },
        {
            id: 3,
            subject: 'Álgebra Linear',
            student: 'Ana García',
            date: '2025-05-24',
            time: '16:00-17:00',
            status: 'solicitada',
            location: 'Aula 105',
            topics: ['Matrices', 'Determinantes'],
            notes: ''
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
            updateTutoringTable();
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
            updateTutoringTable();
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
            updateTutoringTable();
            showNotification('Tutoría reasignada exitosamente', 'success');
        } else {
            showNotification('Error al reasignar la tutoría. Inténtalo nuevamente.', 'error');
        }
    } catch (error) {
        console.error('Error reassigning tutoring:', error);
        showNotification('Error al reasignar la tutoría. Inténtalo nuevamente.', 'error');
    }
}

// Función para actualizar tabla de tutorías
function updateTutoringTable() {
    const tableBody = document.getElementById('tutoriasTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    sessionData.tutoringSessions.forEach(tutoring => {
        const row = document.createElement('tr');
        row.setAttribute('data-tutoria-id', tutoring.id);
        
        const statusClass = `status-${tutoring.status}`;
        const statusText = getStatusText(tutoring.status);
        
        let actions = `<button class="btn btn-primary" onclick="openModal('detalleTutoria')">Ver</button>`;
        
        if (tutoring.status === 'confirmada') {
            actions += ` <button class="btn btn-success" onclick="completeTutoring(${tutoring.id})">Completar</button>`;
        } else if (tutoring.status === 'solicitada') {
            actions += ` <button class="btn btn-success" onclick="confirmTutoring(${tutoring.id})">Confirmar</button>`;
        } else if (tutoring.status === 'cancelada') {
            actions += ` <button class="btn btn-warning" onclick="openReassignModal(${tutoring.id})">Reasignar</button>`;
        }
        
        row.innerHTML = `
            <td>${tutoring.subject}</td>
            <td>${tutoring.student}</td>
            <td>${tutoring.date}</td>
            <td>${tutoring.time}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${actions}</td>
        `;
        
        tableBody.appendChild(row);
    });
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

// Función para obtener texto del estado
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
            updateTutoriasTable();
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
            updateTutoriasTable();
            updateTutorDashboard();
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
                updateTutoriasTable();
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
    updateTutoringTable();
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
function updateTutorInterface() {
    const userSession = getUserSession();
    if (!userSession || !sessionData.currentUser) return;

    const user = sessionData.currentUser;

    // Update navbar with tutor info
    const navbarUserName = document.getElementById('navbar-user-name');
    const navbarUserSubtitle = document.getElementById('navbar-user-subtitle');
    const navbarUserAvatar = document.getElementById('navbar-user-avatar');

    if (navbarUserName) navbarUserName.textContent = user.name || 'Tutor';
    if (navbarUserSubtitle) navbarUserSubtitle.textContent = `Tutor - ${user.especialidad || 'Especialidad'}`;
    if (navbarUserAvatar) navbarUserAvatar.textContent = user.avatar || user.name.split(' ').map(n => n[0]).join('').toUpperCase();

    // Update profile section with tutor data
    const profileNombre = document.getElementById('profile-nombre');
    const profileApellido = document.getElementById('profile-apellido');
    const profileEmail = document.getElementById('profile-email');
    const profileTelefono = document.getElementById('profile-telefono');
    const profileCarrera = document.getElementById('profile-carrera');
    const profileMaterias = document.getElementById('profile-materias');
    const profileFechaRegistro = document.getElementById('profile-fecha-registro');

    if (profileNombre) profileNombre.textContent = user.firstName || '';
    if (profileApellido) profileApellido.textContent = user.lastName || '';
    if (profileEmail) profileEmail.textContent = user.email || '';
    if (profileTelefono) profileTelefono.textContent = user.telefono || '';
    if (profileCarrera) profileCarrera.textContent = user.especialidad || '';
    
    // Display subjects that tutor teaches
    if (profileMaterias && sessionData.tutorSubjects) {
        const materiaNames = sessionData.tutorSubjects.map(ts => ts.materia_nombre || ts.Nombre).join(', ');
        profileMaterias.textContent = materiaNames || 'No asignadas';
    }
    
    if (profileFechaRegistro) {
        const fechaRegistro = user.fechaRegistro || userSession.user.data?.FechaRegistro;
        if (fechaRegistro) {
            const fecha = new Date(fechaRegistro).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            profileFechaRegistro.textContent = fecha;
        } else {
            profileFechaRegistro.textContent = 'No disponible';
        }
    }

    // Update dashboard tables and statistics
    updateTutorDashboard();
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
    updateTutorInterface();
});

// Also handle page visibility changes to refresh data
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page became visible, refresh data
        updateTutorInterface();
    }
});

// Update tutor dashboard with session data
function updateTutorDashboard() {
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
    updateTutoriasTable();
    
    // Update reports if available
    if (typeof updateReports === 'function') {
        updateReports();
    }
}

// Update tutoring sessions table with real data
function updateTutoriasTable() {
    const tableBody = document.getElementById('tutoriasTableBody');
    if (!tableBody || !sessionData.tutoringSessions) return;

    tableBody.innerHTML = '';
    
    sessionData.tutoringSessions.forEach(tutoring => {
        const row = document.createElement('tr');
        const statusClass = `status-${tutoring.estado || tutoring.status}`;
        const statusText = getStatusText(tutoring.estado || tutoring.status);
        
        row.innerHTML = `
            <td>#${(tutoring.tutoria_id || tutoring.id || '').toString().padStart(3, '0')}</td>
            <td>${tutoring.materia_nombre || tutoring.subject || 'N/A'}</td>
            <td>${tutoring.estudiante_nombre || tutoring.student || 'N/A'}</td>
            <td>${formatDate(tutoring.fecha || tutoring.date)}</td>
            <td>${formatTime(tutoring.hora_inicio, tutoring.hora_fin) || tutoring.time || 'N/A'}</td>
            <td>${tutoring.lugar || tutoring.location || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${generateTutorActionButtons(tutoring)}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    if (sessionData.tutoringSessions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="8" style="text-align: center; color: #666;">No tienes tutorías asignadas</td>';
        tableBody.appendChild(row);
    }
}

// Generate action buttons for tutor view
function generateTutorActionButtons(tutoring) {
    const status = tutoring.estado || tutoring.status;
    let buttons = `<button class="btn btn-primary" onclick="openTutoriaDetail(${tutoring.tutoria_id || tutoring.id})">Ver</button>`;
    
    if (status === 'confirmada') {
        buttons += ` <button class="btn btn-success" onclick="completarTutoria(${tutoring.tutoria_id || tutoring.id})">Completar</button>`;
        buttons += ` <button class="btn btn-warning" onclick="openRescheduleModal(${tutoring.tutoria_id || tutoring.id})">Reprogramar</button>`;
    } else if (status === 'solicitada') {
        buttons += ` <button class="btn btn-success" onclick="confirmarTutoria(${tutoring.tutoria_id || tutoring.id})">Confirmar</button>`;
        buttons += ` <button class="btn btn-danger" onclick="rechazarTutoria(${tutoring.tutoria_id || tutoring.id})">Rechazar</button>`;
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
