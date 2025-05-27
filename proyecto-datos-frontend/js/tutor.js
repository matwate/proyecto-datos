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
        const response = await apiCall(`/tutorias/tutor/${tutorId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        // Assuming apiCall returns an object like { success: true, data: [...] }
        // or the direct data array if the API is structured that way.
        // The original check was !Array.isArray(response.data)
        if (response && response.data && Array.isArray(response.data)) {
            return response.data;
        } else if (response && Array.isArray(response)) { // If apiCall returns the array directly
            return response;
        } else {
            console.warn('Invalid or empty response format for tutoring sessions:', response);
            return []; // Return empty array for invalid format or no data
        }
    } catch (error) {
        console.error('Error loading tutoring sessions:', error);
        return []; // Return empty array on error, no mock data
    }
}

// Function to load active tutoring sessions for tutor
async function loadActiveTutoringSessions(tutorId) {
    try {
        // Plausible endpoint for active/upcoming sessions for a tutor
        const response = await apiCall(`/tutorias/tutor/${tutorId}/activas`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        if (response && response.data && Array.isArray(response.data)) {
            return response.data;
        } else if (response && Array.isArray(response)) {
            return response;
        } else {
            console.warn('Invalid or empty response format for active tutoring sessions:', response);
            return [];
        }
    } catch (error) {
        console.error('Error loading active tutoring sessions:', error);
        return [];
    }
}

// Function to load subjects that tutor teaches
async function loadTutorSubjects(tutorId) {
    try {
        // Plausible endpoint for subjects taught by a tutor
        const response = await apiCall(`/tutores/${tutorId}/materias`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        if (response && response.data && Array.isArray(response.data)) {
            return response.data;
        } else if (response && Array.isArray(response)) {
            return response;
        } else {
            console.warn('Invalid or empty response format for tutor subjects:', response);
            return [];
        }
    } catch (error) {
        console.error('Error loading tutor subjects:', error);
        return [];
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
            let apiErrorMessage = `Error ${response.status}: ${response.statusText}`; // Default message
            try {
                const errorBodyText = await response.text(); // Get the raw error body as text
                if (errorBodyText) {
                    try {
                        // Attempt to parse the text as JSON
                        const errorData = JSON.parse(errorBodyText);
                        if (errorData) {
                            if (errorData.message) apiErrorMessage = errorData.message;
                            else if (errorData.detail) apiErrorMessage = errorData.detail; // Common in FastAPI/Django REST
                            else if (errorData.error) apiErrorMessage = errorData.error;
                            // If it's JSON but not one of the expected structures, stringify it if it's an object
                            else if (typeof errorData === 'object' && errorData !== null) apiErrorMessage = JSON.stringify(errorData);
                            // If errorData is a string after parsing (e.g. JSON.parse('"just a string"')) or already a string from a non-JSON text body
                            else if (typeof errorData === 'string') apiErrorMessage = errorData;
                        }
                    } catch (jsonParseError) {
                        // If JSON.parse fails, the errorBodyText itself is the message (e.g., plain text error from API)
                        apiErrorMessage = errorBodyText;
                    }
                }
            } catch (bodyReadError) {
                // If reading the body text itself fails, log it, but we still have the default statusText message
                console.warn('Failed to read error response body:', bodyReadError);
            }
            throw new Error(apiErrorMessage);
        }
        
        if (response.status === 204) { // Handle No Content response
            logAPIResponse(endpoint, { status: 204, message: "No Content" });
            return { success: true, status: 204, message: "Operation successful, no content returned." }; 
        }

        const data = await response.json();
        logAPIResponse(endpoint, data);
        return data;
        
    } catch (error) { 
        logAPIResponse(endpoint, null, error);
        throw error;
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
        // Check for the specific error message
        if (error && error.message && error.message.includes('las tutorias deben ser confirmadas 12 horas antes')) {
            // Throw a new error with a flag or specific message to be caught by callers
            throw { specificError: true, message: 'las tutorias deben ser confirmadas 12 horas antes' };
        }
        throw error; // Re-throw other errors (these will have error.message from apiCall)
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

// Initialize tutor data from session (copied exact pattern from user.js)
async function initializeTutorData() {
    const userSession = getUserSession();
    if (!userSession) return;

    // Extract tutor data from login session (exact pattern from user.js)
    const tutorData = userSession.user.data.tutor
    console.log('Initializing tutor data from session:', tutorData);
    // Set current user from session data (exactly like user.js)
    sessionData.currentUser = {
        id: tutorData.TutorID,
        name: `${tutorData.Nombre || ''} ${tutorData.Apellido || ''}`.trim(),
        firstName: tutorData.Nombre || '',
        lastName: tutorData.Apellido || '',
        email: tutorData.Correo || '',
        role: "tutor",
        especialidad: tutorData.Especialidad || " ",
        experiencia: tutorData.AñosExperiencia || 0,
        telefono: tutorData.Telefono || ' ',
        avatar: (tutorData.data?.Nombre?.[0] || '') + (tutorData.data?.Apellido?.[0] || ''),
        documento: tutorData.data?.NumeroDocumento || '',
        registrationDate: tutorData.data?.FechaRegistro || "Fecha no disponible",
        lugarPredeterminado: tutorData.data?.LugarPredeterminadoTutorias || "Oficina del tutor",
        notasPredeterminadas: tutorData.data?.NotasPredeterminadasTutorias || "Traer material de estudio y dudas preparadas."
    };
    
    console.log('Current user data:', sessionData.currentUser);

    try {
        // Load tutoring sessions for this tutor
        const tutoringSessions = await loadTutoringSessions(sessionData.currentUser.id);
        sessionData.tutoringSessions = tutoringSessions || [];
        
        // Load subjects that this tutor teaches
        const tutorSubjects = await loadTutorSubjects(sessionData.currentUser.id);
        sessionData.tutorSubjects = tutorSubjects || [];
        
        console.log('Loaded tutoring sessions:', sessionData.tutoringSessions);
        console.log('Loaded tutor subjects:', sessionData.tutorSubjects);
        
            } catch (error) {
        console.error('Error initializing tutor data (sessions, subjects, performance):', error);
        sessionData.tutoringSessions = [];
        sessionData.tutorSubjects = [];
        sessionData.performanceData = calculatePerformanceData([], []);
    }

    // Update UI with loaded data
    updateTutorInterface();
    
    // Add refresh button
    addRefreshButton(); // Ensure this function exists or is implemented
    
    // Show API status notification
    showAPIStatus(); // Ensure this function exists or is implemented
    
    // Ensure navbar is updated after all data is loaded
    setTimeout(() => {
        if (sessionData.currentUser) {
            updateNavbar(sessionData.currentUser);
        }
    }, 100); // Short delay to ensure DOM is ready
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

// Mock data for development/fallback - following API structure from swagger
function getMockTutoringSessions() {
    // This function should ideally be removed or only used if API calls consistently fail
    // For now, per user request, focusing on API calls.
    console.warn("getMockTutoringSessions called - should be replaced by API calls.");
    return []; 
}

function getMockTutorSubjects() {
    // This function should ideally be removed.
    console.warn("getMockTutorSubjects called - should be replaced by API calls.");
    return [];
}

// Helper function to format date (e.g., YYYY-MM-DD to DD/MM/YYYY)
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
             // Try to parse if it's already in DD/MM/YYYY or other common non-standard formats
            const parts = dateString.split(/[-/]/);
            if (parts.length === 3) {
                // Assuming DD/MM/YYYY or MM/DD/YYYY - this is ambiguous without more context
                // For safety, return original if initial parsing failed broadly
                return dateString; 
            }
            return dateString;
        }
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString; 
    }
}

// Helper function to format time (e.g., 14:00:00 to 14:00)
function formatTime(timeString) {
    if (!timeString) return 'N/A';
    // Handles "HH:MM:SS" or "HH:MM"
    if (typeof timeString === 'string' && timeString.includes(':')) {
        const parts = timeString.split(':');
        return `${parts[0]}:${parts[1]}`;
    }
    return timeString; // Fallback
}

// Helper function to get status text
function getStatusText(status) {
    if (!status) return 'Desconocido';
    const statusMap = {
        'solicitada': 'Solicitada',
        'confirmada': 'Confirmada',
        'completada': 'Completada',
        'cancelada': 'Cancelada',
        'pendiente': 'Pendiente',
        'rechazada': 'Rechazada'
    };
    return statusMap[status.toLowerCase()] || status;
}

// Placeholder for fetching student name - adapt if student details are part of tutoria object
async function getStudentName(studentId, session) {
    if (session && session.NombreEstudiante) return session.NombreEstudiante;
    if (session && session.estudiante && session.estudiante.Nombre) return `${session.estudiante.Nombre} ${session.estudiante.Apellido || ''}`;
    // Actual API call would be:
     try {
       const student = await apiCall(`/estudiantes/${studentId}`);
       return student
     } catch (e) {
      console.error(`Error fetching student ${studentId}`, e);
     }
    return `Estudiante ID: ${studentId}`; // Fallback
}

// Placeholder for fetching subject name - adapt if subject details are part of tutoria object
async function getSubjectName(materiaId, session) {
    if (session && session.NombreMateria) return session.NombreMateria;
    if (session && session.materia && session.materia.Nombre) return session.materia.Nombre;
    // Actual API call would be:
     try {
       const materia = await apiCall(`/materias/${materiaId}`);
       return materia.Nombre
    } catch (e) {
      console.error(`Error fetching materia ${materiaId}`, e);
     return `Materia ID: ${materiaId}`;
    }
    return `Materia ID: ${materiaId}`; // Fallback
}


// Function to calculate performance data
function calculatePerformanceData(tutoringSessions, tutorSubjects) {
    if (!tutoringSessions) tutoringSessions = [];
    if (!tutorSubjects) tutorSubjects = [];

    const completedSessions = tutoringSessions.filter(s => (s.Estado || s.estado || s.status) === 'completada');
    const upcomingSessions = tutoringSessions.filter(s => {
        const status = (s.Estado || s.estado || s.status);
        const sessionDate = new Date(s.Fecha || s.fecha || s.date);
        return (status === 'confirmada' || status === 'solicitada') && sessionDate >= new Date();
    });

    let totalHours = 0;
    completedSessions.forEach(s => {
        // Assuming HoraInicio and HoraFin are in "HH:MM:SS" format or can be parsed
        // This is a simplified hour calculation, real calculation would parse HH:MM
        if (s.HoraInicio && s.HoraFin) {
            try {
                const start = new Date(`1970-01-01T${s.HoraInicio}`);
                const end = new Date(`1970-01-01T${s.HoraFin}`);
                const diffMillis = end - start;
                if (diffMillis > 0) {
                    totalHours += diffMillis / (1000 * 60 * 60);
                } else {
                    totalHours += 1; // Default to 1 hour if calculation fails
                }
            } catch (e) { totalHours +=1; }
        } else {
            totalHours += 1; // Default to 1 hour if times are not available
        }
    });

    const topicsCount = {};
    tutoringSessions.forEach(s => {
        if (s.TemasTratados && Array.isArray(s.TemasTratados)) {
            s.TemasTratados.forEach(topic => {
                topicsCount[topic] = (topicsCount[topic] || 0) + 1;
            });
        } else if (s.TemasTratados && typeof s.TemasTratados === 'string') {
             // If topics is a comma-separated string
            s.TemasTratados.split(',').forEach(topic => {
                const trimmedTopic = topic.trim();
                if(trimmedTopic) topicsCount[trimmedTopic] = (topicsCount[trimmedTopic] || 0) + 1;
            });
        }
    });
    const topTopics = Object.entries(topicsCount)
        .sort(([,a],[,b]) => b-a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    return {
        totalCompleted: completedSessions.length,
        totalHours: totalHours.toFixed(1),
        // Placeholder for attendance rate, requires 'asistencia_confirmada_tutor' or similar field
        attendanceRate: completedSessions.length > 0 ? ((completedSessions.filter(s => s.asistencia_confirmada_tutor === true || s.asistencia_confirmada_tutor === 1).length / completedSessions.length) * 100).toFixed(0) : '0',
        upcomingScheduled: upcomingSessions.length,
        topTopics: topTopics,
        // For chart data, you might group sessions by subject
        // performanceBySubject: tutorSubjects.map(subj => ({
        //    name: subj.NombreMateria,
        //    count: tutoringSessions.filter(s => s.MateriaID === subj.MateriaID && s.Estado === 'completada').length
        // })),
    };
}


// --- UI Update Functions ---
function updateNavbar(currentUser) {
    if (!currentUser) return;
    const userDetailsDiv = document.querySelector('.navbar .user-details');
    const profileBtn = document.querySelector('.navbar .profile-btn');
    // const userAvatarDiv = document.querySelector('.navbar .user-avatar'); // This div might be part of profileBtn or separate

    console.log(userDetailsDiv, profileBtn, currentUser);

    if (userDetailsDiv) {
        userDetailsDiv.innerHTML = `
            <span>${currentUser.name}</span>
            <small style="text-transform: capitalize;">${currentUser.role}</small>
        `;

        console.log('Updated user details in navbar:', currentUser.name, currentUser.role);
    }
    if (profileBtn) {
        profileBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${currentUser.avatar || (currentUser.firstName?.[0] || '') + (currentUser.lastName?.[0] || '')}`;
    }
    // if (userAvatarDiv) { // If there's a separate avatar element
    //    userAvatarDiv.textContent = currentUser.avatar || (currentUser.firstName?.[0] || '') + (currentUser.lastName?.[0] || '');
    // }
}

function updateProfileTab(currentUser) {
    if (!currentUser) return;
    const profileHeaderDiv = document.querySelector('#perfil .profile-header');
    const profileInfoDiv = document.querySelector('#perfil .profile-info');

    if (profileHeaderDiv) {
        // Using Font Awesome icon as a placeholder avatar
        profileHeaderDiv.innerHTML = `
            <div class="profile-avatar-large"><i class="fas fa-user-tie fa-3x"></i></div>
            <h2>${currentUser.name}</h2>
            <p>${currentUser.especialidad || 'Tutor Académico'}</p>
        `;
    }
    if (profileInfoDiv) {
        profileInfoDiv.innerHTML = `
            <p><strong><i class="fas fa-envelope"></i> Correo Electrónico:</strong> ${currentUser.email || 'No disponible'}</p>
            <p><strong><i class="fas fa-id-card"></i> Documento:</strong> ${currentUser.documento || 'No disponible'}</p>
            <p><strong><i class="fas fa-phone"></i> Teléfono:</strong> ${currentUser.telefono || 'No disponible'}</p>
            <p><strong><i class="fas fa-briefcase"></i> Años de Experiencia:</strong> ${currentUser.experiencia === undefined ? 'No disponible' : currentUser.experiencia}</p>
            <p><strong><i class="fas fa-calendar-check"></i> Miembro Desde:</strong> ${formatDate(currentUser.registrationDate)}</p>
            <p><strong><i class="fas fa-map-marker-alt"></i> Lugar Predeterminado Tutorías:</strong> ${currentUser.lugarPredeterminado || 'No especificado'}</p>
            <p><strong><i class="fas fa-info-circle"></i> Notas Predeterminadas:</strong> ${currentUser.notasPredeterminadas || 'No especificadas'}</p>
        `;
    }
}

async function updateDashboardTable(tutoringSessions) {
    const dashboardTable = document.querySelector('#dashboard .table-container table');
    if (!dashboardTable) {
        console.error("Dashboard table element not found");
        return;
    }

    const now = new Date();
    // Filter for upcoming sessions (confirmada or solicitada, and today or in the future)
    const upcomingSessions = (tutoringSessions || []).filter(session => {
        const status = (session.Estado || session.estado || session.status || '').toLowerCase();
        const sessionDate = new Date(session.Fecha)
        // Adjust date to ignore time for comparison with 'now' for "today"
        sessionDate.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);

        return (status === 'confirmada' || status === 'solicitada') && sessionDate >= today;
    })
    .sort((a,b) => new Date(a.Fecha || a.fecha || a.date) - new Date(b.Fecha || b.fecha || b.date) || (a.HoraInicio || '').localeCompare(b.HoraInicio || ''))
    .slice(0, 5); // Show top 5 upcoming

    if (upcomingSessions.length === 0) {
        dashboardTable.innerHTML = '<tr><td colspan="6">No tienes tutorías próximas.</td></tr>';
        return;
    }

    let tableHTML = `
        <thead>
            <tr>
                <th>Asignatura</th>
                <th>Estudiante</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Lugar</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
    `;
    for (const session of upcomingSessions) {
        const studentName = await getStudentName(session.EstudianteID, session);
        const subjectName = await getSubjectName(session.MateriaID, session);
        const status = (session.Estado || session.estado || session.status);
        console.log(session.HoraInicio)
        tableHTML += `
            <tr>
                <td>${subjectName}</td>
                <td>${studentName}</td>
                <td>${formatDate(session.Fecha || session.fecha || session.date)}</td>
                <td>${formatTime(session.HoraInicio.Microseconds / 3600000000 || session.hora_inicio || session.time)}:00</td>
                <td>${session.Lugar || session.modalidad || 'N/A'}</td>
                <td><span class="status-badge status-${status.toLowerCase()}">${getStatusText(status)}</span></td>
            </tr>
        `;
    }
    tableHTML += '</tbody>';
    dashboardTable.innerHTML = tableHTML;
}

async function updateTutoriasTable(tutoringSessions) {
    const tutoriasTable = document.querySelector('#tutorias .table-container table');
    if (!tutoriasTable) {
        console.error("Tutorias table element not found");
        return;
    }

    if (!tutoringSessions || tutoringSessions.length === 0) {
        tutoriasTable.innerHTML = '<tr><td colspan="8">No hay tutorías para mostrar.</td></tr>';
        return;
    }
    // Sort by date descending, then time
    const sortedSessions = [...tutoringSessions].sort((a,b) => 
        new Date(b.Fecha || b.fecha || b.date) - new Date(a.Fecha || a.fecha || a.date) || 
        (b.HoraInicio > a.HoraInicio ? -1 : 1) // Sort by time if dates are equal
    );

    console.log('Sorted tutoring sessions:', sortedSessions);

    let tableHTML = `
        <thead>
            <tr>
                <th>Asignatura</th>
                <th>Estudiante</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Lugar</th>
                <th>Estado</th>
                <th>Temas</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
    `;
    for (const session of sortedSessions) {
        const studentName = await getStudentName(session.EstudianteID, session);
        const subjectName = await getSubjectName(session.MateriaID, session);
        const tutoriaId = session.TutoriaID || session.id;
        const status = (session.Estado || session.estado || session.status);
        const temas = Array.isArray(session.TemasTratados) ? session.TemasTratados.join(', ') : (session.TemasTratados || 'No especificados');

        let actionButtons = `<button class="btn-action btn-view" onclick="openTutoriaDetailModal('${tutoriaId}')" title="Ver Detalles"><i class="fas fa-eye"></i></button>`;
        if (status === 'solicitada') {
            actionButtons += ` <button class="btn-action btn-confirm" onclick="confirmTutoria('${tutoriaId}')" title="Confirmar Tutoría"><i class="fas fa-check"></i></button>`;
            actionButtons += ` <button class="btn-action btn-reject" onclick="rejectTutoria('${tutoriaId}')" title="Rechazar Tutoría"><i class="fas fa-times"></i></button>`;
        }
        if (status === 'confirmada' && new Date(session.Fecha || session.fecha || session.date) <= new Date()) { // Can mark completed if today or past
             actionButtons += ` <button class="btn-action btn-complete" onclick="markTutoriaCompleted('${tutoriaId}')" title="Marcar como Completada"><i class="fas fa-check-circle"></i></button>`;
        }
        // Disable cancel button if tutoria is confirmed
        const cancelDisabled = status === 'confirmada' ? 'disabled' : '';
        if (status === 'confirmada' || status === 'solicitada') {
            actionButtons += ` <button class="btn-action btn-cancel" onclick="openCancelTutoriaModal('${tutoriaId}')" title="Cancelar Tutoría" ${cancelDisabled}><i class="fas fa-calendar-times"></i></button>`;
        }
        // Add reassign button if applicable
        // actionButtons += ` <button class="btn-action btn-reassign" onclick="openReassignModal('${tutoriaId}')" title="Reasignar Tutoría"><i class="fas fa-exchange-alt"></i></button>`;


        tableHTML += `
            <tr data-tutoria-id="${tutoriaId}">
                <td>${subjectName}</td>
                <td>${studentName.Nombre} ${studentName.Apellido}</td>
                <td>${formatDate(session.Fecha || session.fecha || session.date)}</td>
                <td>${formatTime(session.HoraInicio.Microseconds / 3600000000)}:00</td>
                <td>${session.Lugar || session.modalidad || 'N/A'}</td>
                <td><span class="status-badge status-${status.toLowerCase()}">${getStatusText(status)}</span></td>
                <td title="${temas}">${temas.length > 20 ? temas.substring(0, 20) + '...' : temas}</td>
                <td>${actionButtons}</td>
            </tr>
        `;
    }
    tableHTML += '</tbody>';
    tutoriasTable.innerHTML = tableHTML;
}

async function updateDisponibilidadTab(tutorSubjects, currentUser) {
    const disponibilidadContainer = document.querySelector('#disponibilidad .dashboard-disponibilidad');
    const pageTitle = document.querySelector('#disponibilidad .availability-container h2');
    const additionalInfoDiv = document.querySelector('#disponibilidad .additional-info');
    const formActionsButton = document.querySelector('#disponibilidad .form-actions button.btn-primary');


    if (pageTitle) {
        pageTitle.innerHTML = `<i class="fas fa-calendar-alt"></i> Mi Disponibilidad y Materias`;
    }

    if (disponibilidadContainer) {
        let contentHTML = '<h4><i class="fas fa-book-reader"></i> Materias que Impartes:</h4>';
        if (!tutorSubjects || tutorSubjects.length === 0) {
            contentHTML += '<p>No tienes materias asignadas actualmente.</p>';
        } else {
            contentHTML += '<ul>';
            for (let i = 0; i < tutorSubjects.length; i++) {
                const subject = tutorSubjects[i];
                const nombreMateria = await getSubjectName(subject.MateriaID || subject.id, subject);
                contentHTML += `<li>${nombreMateria || subject.name || `ID: ${subject.MateriaID}`}</li>`;
            }
            contentHTML += '</ul>';
        }
        disponibilidadContainer.innerHTML = contentHTML;
    }

    if (additionalInfoDiv && currentUser) {
        additionalInfoDiv.innerHTML = `
            <div class="form-group">
                <label for="tutor-location"><i class="fas fa-map-marker-alt"></i> Lugar Predeterminado para Tutorías Presenciales:</label>
                <input type="text" id="tutor-location" name="tutor-location" class="form-control" value="${currentUser.lugarPredeterminado || ''}">
            </div>
            <div class="form-group">
                <label for="tutor-notes"><i class="fas fa-sticky-note"></i> Notas Predeterminadas para Estudiantes:</label>
                <textarea id="tutor-notes" name="tutor-notes" class="form-control" rows="3">${currentUser.notasPredeterminadas || ''}</textarea>
            </div>
             <div class="form-group">
                <label for="max-students"><i class="fas fa-users"></i> Máximo de estudiantes por tutoría grupal:</label>
                <input type="number" id="max-students" name="max-students" class="form-control" value="${currentUser.maxEstudiantesGrupo || 5}" min="1">
            </div>
        `;
    }
    if (formActionsButton) {
        formActionsButton.innerHTML = `<i class="fas fa-save"></i> Guardar Cambios de Disponibilidad`;
        formActionsButton.onclick = saveTutorAvailabilityPreferences; // Ensure this function is defined
    }
}


/*
function updateReportesTab(performanceData) {
    const reportsContainerTitle = document.querySelector('#reportes .reports-container h2');
    const reportsGrid = document.querySelector('#reportes .reports-grid');
    const performanceChartDiv = document.querySelector('#reportes .performance-chart');
    const topTopicsCard = document.querySelector('#reportes .report-card'); // This is one of the cards in the grid, let's use a specific ID if needed or select differently
    const actionButtonsDiv = document.querySelector('#reportes .reports-container div[style*="text-align: center"]');


    if (reportsContainerTitle) {
        reportsContainerTitle.innerHTML = `<i class="fas fa-chart-line"></i> Reportes de Desempeño`;
    }

    if (reportsGrid && performanceData) {
        reportsGrid.innerHTML = `
            <div class="report-card">
                <h4><i class="fas fa-check-double"></i> Tutorías Completadas</h4>
                <p class="stat">${performanceData.totalCompleted || 0}</p>
            </div>
            <div class="report-card">
                <h4><i class="fas fa-clock"></i> Horas Impartidas</h4>
                <p class="stat">${performanceData.totalHours || 0} hrs</p>
            </div>
            <div class="report-card">
                <h4><i class="fas fa-user-check"></i> Tasa de Asistencia (Est.)</h4>
                <p class="stat">${performanceData.attendanceRate || '0'}%</p>
            </div>
            <div class="report-card">
                <h4><i class="fas fa-calendar-alt"></i> Próximas Agendadas</h4>
                <p class="stat">${performanceData.upcomingScheduled || 0}</p>
            </div>
        `;
    }
    // This was targeting a generic .report-card, let's assume it's for top topics and it's separate or we add a new div
    const topTopicsSpecificDiv = document.getElementById('topTopicsReportCard'); // Add this ID to tutor.html if needed
    if (topTopicsSpecificDiv && performanceData && performanceData.topTopics) {
         topTopicsSpecificDiv.innerHTML = `
            <h4><i class="fas fa-tags"></i> Temas Más Solicitados</h4>
            ${performanceData.topTopics.length > 0 ? 
                `<ul>${performanceData.topTopics.map(topic => `<li>${topic.name} (${topic.count} veces)</li>`).join('')}</ul>`
                : '<p>No hay datos de temas suficientes.</p>'
            }
        `;
    } else if (topTopicsCard && performanceData && performanceData.topTopics) { // Fallback to the first .report-card if specific div not found
        // This might overwrite one of the stats cards, better to have a dedicated div for topics.
        // For now, I'll assume the user will add a div like: <div id="topTopicsReportCard" class="report-card"></div>
        // Or, if the existing .report-card in HTML is meant for this:
         topTopicsCard.innerHTML = `
            <h4><i class="fas fa-tags"></i> Temas Más Solicitados</h4>
            ${performanceData.topTopics.length > 0 ? 
                `<ul>${performanceData.topTopics.map(topic => `<li>${topic.name} (${topic.count} veces)</li>`).join('')}</ul>`
                : '<p>No hay datos de temas suficientes.</p>'
            }
        `;
    }


    if (performanceChartDiv) {
        performanceChartDiv.innerHTML = '<h4><i class="fas fa-chart-bar"></i> Rendimiento por Materia (Gráfico)</h4><canvas id="tutorPerformanceChart"></canvas>';
        // Placeholder for chart rendering logic, e.g., using Chart.js
        // renderPerformanceChart(performanceData.performanceBySubject); // Needs a function and data
        if (typeof Chart !== 'undefined' && performanceData.performanceBySubject) {
            renderTutorPerformanceChart(performanceData.performanceBySubject, 'tutorPerformanceChart');
        } else {
            performanceChartDiv.innerHTML += '<p>Gráfico no disponible (Chart.js no cargado o sin datos).</p>';
        }
    }

    if (actionButtonsDiv) {
        actionButtonsDiv.innerHTML = `
            <button class="btn btn-secondary" onclick="exportReportData('pdf')"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
            <button class="btn btn-secondary" onclick="exportReportData('csv')"><i class="fas fa-file-csv"></i> Exportar CSV</button>
        `;
    }
}
*/

// --- Modal and Action Functions (Stubs/Placeholders) ---
async function openTutoriaDetailModal(tutoriaId) {
    const tutoria = sessionData.tutoringSessions.find(t => (t.TutoriaID || t.id) == tutoriaId);
    if (!tutoria) {
        showNotification('Error: No se encontraron detalles para esta tutoría.', 'error');
        return;
    }
    const modal = document.getElementById('detalleTutoria');
    const modalContent = modal.querySelector('.modal-content .form-grid'); // Assuming form-grid is where details go
    const modalTitle = modal.querySelector('.modal-content h2');

    if (modalTitle) modalTitle.innerHTML = `<i class="fas fa-info-circle"></i> Detalle de Tutoría - ${getSubjectName(tutoria.MateriaID, tutoria)}`;
    
    let studentName = await getStudentName(tutoria.EstudianteID, tutoria);


    if (modalContent) {
        modalContent.innerHTML = `
            <p><strong>Estudiante:</strong> ${studentName.Nombre} ${studentName.Apellido}</p>
            <p><strong>Fecha:</strong> ${formatDate(tutoria.Fecha)}</p>
            <p><strong>Hora:</strong> ${formatTime(tutoria.HoraInicio.Microseconds / 3600000000)}:00 - ${formatTime(tutoria.HoraFin.Microseconds / 3600000000)}:00</p>
            <p><strong>Estado:</strong> ${getStatusText(tutoria.Estado)}</p>
            <p><strong>Lugar:</strong> ${tutoria.Lugar || 'No especificado'}</p>
            <p><strong>Notas del Estudiante:</strong> ${tutoria.NotasEstudiante || 'Ninguna'}</p>
            <p><strong>Notas del Tutor:</strong> <textarea id="tutorNotesDetail" class="form-control">${tutoria.NotasTutor || ''}</textarea></p>
        `;
    }
    const actionButtonsContainer = modal.querySelector('.modal-content div[style*="margin-top: 20px"]');
    if(actionButtonsContainer){
        actionButtonsContainer.innerHTML = `<button class="btn btn-primary" onclick="saveTutorNotesFromModal('${tutoriaId}')">Guardar Notas</button>`;
    }


    modal.style.display = 'block';
    // Add event listener to close button of this modal
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        }
    }
}

function openCancelTutoriaModal(tutoriaId) {
    // This would typically open a confirmation modal
    if (confirm('¿Estás seguro de que quieres cancelar esta tutoría? Esta acción no se puede deshacer.')) {
        cancelTutoria(tutoriaId);
    }
}

async function cancelTutoria(tutoriaId) {
    try {
        await updateTutoringStatus(tutoriaId, 'cancelada'); // Assuming 'cancelada' is the status
        showNotification('Tutoría cancelada exitosamente.', 'success');
        // Refresh data
        sessionData.tutoringSessions = await loadTutoringSessions(sessionData.currentUser.id);
        updateTutoriasTable(sessionData.tutoringSessions);
        updateDashboardTable(sessionData.tutoringSessions);
        // sessionData.performanceData = calculatePerformanceData(sessionData.tutoringSessions, sessionData.tutorSubjects); // Uncomment if needed
        // updateReportesTab(sessionData.performanceData); // Uncomment if needed
    } catch (error) {
        if (error && error.message) {
            showNotification(error.message, 'error');
        } else {
            showNotification('Error al cancelar la tutoría.', 'error');
        }
        console.error("Error cancelling tutoria:", error);
    }
}


async function markTutoriaCompleted(tutoriaId) {
    try {
        await updateTutoringStatus(tutoriaId, 'completada');
        showNotification('Tutoría marcada como completada.', 'success');
        sessionData.tutoringSessions = await loadTutoringSessions(sessionData.currentUser.id);
        updateTutoriasTable(sessionData.tutoringSessions);
        updateDashboardTable(sessionData.tutoringSessions);
        // sessionData.performanceData = calculatePerformanceData(sessionData.tutoringSessions, sessionData.tutorSubjects); // Uncomment if needed
        // updateReportesTab(sessionData.performanceData); // Uncomment if needed
    } catch (error) {
        if (error && error.message) {
            showNotification(error.message, 'error');
        } else {
            showNotification('Error al marcar tutoría como completada.', 'error');
        }
        console.error("Error marking tutoria completed:", error);
    }
}

async function confirmTutoria(tutoriaId) {
    try {
        await updateTutoringStatus(tutoriaId, 'confirmada');
        showNotification('Tutoría confirmada exitosamente.', 'success');
        sessionData.tutoringSessions = await loadTutoringSessions(sessionData.currentUser.id);
        updateTutoriasTable(sessionData.tutoringSessions);
        updateDashboardTable(sessionData.tutoringSessions);
    } catch (error) {
        if (error && error.message) {
            showNotification(error.message, 'error');
        } else {
            showNotification('Error al confirmar la tutoría.', 'error');
        }
        console.error("Error confirming tutoria:", error);
    }
}

async function rejectTutoria(tutoriaId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta solicitud de tutoría? Esta acción no se puede deshacer.')) {
        return;
    }
    try {
        // Call DELETE endpoint for the tutoria
        await apiCall(`/tutorias/${tutoriaId}`, {
            method: 'DELETE'
        });
        showNotification('Tutoría eliminada exitosamente.', 'success');
        sessionData.tutoringSessions = await loadTutoringSessions(sessionData.currentUser.id);
        updateTutoriasTable(sessionData.tutoringSessions);
        updateDashboardTable(sessionData.tutoringSessions);
    } catch (error) {
        if (error && error.message) {
            showNotification(error.message, 'error');
        } else {
            showNotification('Error al eliminar la tutoría.', 'error');
        }
        console.error("Error deleting tutoria:", error);
    }
}

// Main UI update orchestrator
function updateTutorInterface() {
    if (!sessionData.currentUser) {
        console.error("No current user data to update interface.");
        // Potentially redirect to login or show error message on page
        document.body.innerHTML = '<p style="text-align:center; margin-top:50px;">Error: No se pudo cargar la información del usuario. Por favor, intente <a href="iniciosesion.html">iniciar sesión</a> de nuevo.</p>';
        return;
    }
    updateNavbar(sessionData.currentUser);
    updateProfileTab(sessionData.currentUser);
    updateDashboardTable(sessionData.tutoringSessions); // Upcoming sessions
    updateTutoriasTable(sessionData.tutoringSessions); // All sessions
    updateDisponibilidadTab(sessionData.tutorSubjects, sessionData.currentUser);
    // updateReportesTab(sessionData.performanceData); // Removed
    updateConfiguracionTab(sessionData.currentUser); // Ensure this is called
}

// Function to show notifications (ensure it's robust)
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container') || document.body;
    const notification = document.createElement('div');
    // Ensure FontAwesome is loaded or use text indicators
    let icon = '';
    if (type === 'success') icon = '<i class="fas fa-check-circle"></i> ';
    else if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i> ';
    else if (type === 'info') icon = '<i class="fas fa-info-circle"></i> ';
    else if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i> ';

    notification.className = `notification ${type}`;
    notification.innerHTML = icon + message;
    
    // If using a dedicated container, append there. Otherwise, append to body.
    if (document.getElementById('notification-container')) {
         container.appendChild(notification);
    } else { // Fallback to simple body append if container doesn't exist
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '10000';
        document.body.appendChild(notification);
    }
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300); // Remove after fade out
    }, 3000);
}

// Function to handle API status display
function showAPIStatus() {
    // This is a placeholder. Could be expanded to show a global API status indicator.
    // For now, success/error of initial load is handled by initializeTutorData's try/catch
    // and individual API calls show notifications.
    // console.log("showAPIStatus called - current implementation is placeholder.");
}

// Add refresh button logic
function addRefreshButton() {
    // Example: Find a place in HTML to add it or append to a common actions bar
    // const navTabsDiv = document.querySelector('.nav-tabs');
    // if (navTabsDiv && !document.getElementById('refreshDataBtn')) {
    //     const refreshBtn = document.createElement('button');
    //     refreshBtn.id = 'refreshDataBtn';
    //     refreshBtn.className = 'btn btn-secondary btn-refresh'; // Add appropriate classes
    //     refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Datos';
    //     refreshBtn.onclick = () => {
    //         showNotification('Actualizando datos...', 'info');
    //         initializeTutorData();
    //     };
    //     navTabsDiv.appendChild(refreshBtn); // Or prepend
    // }
}

// Ensure DOM is fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    initializeTutorData();

    // Close modals when clicking outside
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        });
    }
    // Add close functionality to all modal close buttons (span with class 'close')
    const closeButtons = document.querySelectorAll('.modal .close');
    closeButtons.forEach(button => {
        button.onclick = function() {
            this.closest('.modal').style.display = 'none';
        }
    });
});

// Tab switching logic (ensure it's present and works with dynamic content)
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    } else {
        console.error(`Tab with id '${tabName}' not found.`);
        // Fallback to dashboard if requested tab not found
        document.getElementById('dashboard').classList.add('active');
    }
    
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => tab.classList.remove('active'));
    
    const targetButton = Array.from(navTabs).find(tab => 
        tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(`showTab('${tabName}')`)
    );
    if (targetButton) {
        targetButton.classList.add('active');
    }

    // Optional: Refresh tab content if needed, though initial load populates all.
    if (tabName === 'dashboard') {
        // For dashboard, we might want to show a mix or upcoming
        updateDashboardTable(sessionData.tutoringSessions);
    } else if (tabName === 'perfil') {
        updateProfileTab(sessionData.currentUser);
    } else if (tabName === 'tutorias') {
        updateTutoriasTable(sessionData.tutoringSessions);
    } else if (tabName === 'disponibilidad') {
        updateDisponibilidadTab(sessionData.tutorSubjects, sessionData.currentUser);
    } // else if (tabName === 'reportes') updateReportesTab(sessionData.performanceData); // Removed
    else if (tabName === 'configuracion') {
        updateConfiguracionTab(sessionData.currentUser); // Make sure this function exists and is correctly implemented
    }
}
// Make sure all modal close buttons work
document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const closeButton = modal.querySelector('.close');
        if (closeButton) {
            closeButton.onclick = () => {
                modal.style.display = 'none';
            };
        }
    });
});
