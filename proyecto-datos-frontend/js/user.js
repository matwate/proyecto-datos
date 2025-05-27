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

// Function to load user data from session (already available from login)
function getUserData() {
    const userSession = getUserSession();
    if (!userSession) return null;
    
    return userSession.user.data;
}

// Function to load upcoming tutoring sessions from API
async function loadUpcomingTutoringSessions(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutorias?proximas_estudiante_id=${userId}`);
        if (!response.ok) throw new Error('Failed to load upcoming tutoring sessions');
        return await response.json();
    } catch (error) {
        console.error('Error loading upcoming tutoring sessions:', error);
        return [];
    }
}

// Function to load all tutoring sessions for a student
async function loadAllTutoringSessions(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutorias?estudiante_id=${userId}`);
        if (!response.ok) throw new Error('Failed to load tutoring sessions');
        return await response.json();
    } catch (error) {
        console.error('Error loading all tutoring sessions:', error);
        return [];
    }
}

// Function to load available subjects from API
async function loadSubjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/materias?nombres=true`);
        if (!response.ok) throw new Error('Failed to load subjects');
        return await response.json();
    } catch (error) {
        console.error('Error loading subjects:', error);
        return [];
    }
}

// Function to load available tutors for a subject
async function loadTutorsForSubject(materiaId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutor-materias?materia_id=${materiaId}`);
        if (!response.ok) throw new Error('Failed to load tutors');
        return await response.json();
    } catch (error) {
        console.error('Error loading tutors for subject:', error);
        return [];
    }
}

// Function to submit new tutoring request to API
async function submitTutoringRequest(requestData) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutorias`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) throw new Error('Failed to submit tutoring request');
        return await response.json();
    } catch (error) {
        console.error('Error submitting tutoring request:', error);
        throw error;
    }
}

// Function to update tutoring status via API
async function updateTutoringStatus(tutoringId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutorias/${tutoringId}/estado`, {
            method: 'PATCH',
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

// Function to update tutoring attendance via API
async function updateTutoringAttendance(tutoringId, confirmed) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutorias/${tutoringId}/asistencia`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ asistencia_confirmada: confirmed })
        });
        
        if (!response.ok) throw new Error('Failed to update tutoring attendance');
        return await response.json();
    } catch (error) {
        console.error('Error updating tutoring attendance:', error);
        throw error;
    }
}

// Initialize session data with user session and prepare for API loading
let sessionData = {
    currentUser: null,
    tutoringSessions: []
};

// Initialize user data from session
async function initializeUserData() {
    const userSession = getUserSession();
    if (!userSession) return;

    // Extract user data from login session
    const userData = userSession.user;
    
    // Set current user from session data
    sessionData.currentUser = {
        id: userData.data?.EstudianteID || userData.data?.TutorID || userData.data?.AdminID,
        name: `${userData.data?.Nombre || ''} ${userData.data?.Apellido || ''}`.trim(),
        firstName: userData.data?.Nombre || '',
        lastName: userData.data?.Apellido || '',
        email: userData.data?.Correo || '',
        role: "student",
        program: userData.data?.ProgramaAcademico || "Programa no especificado",
        registrationDate: userData.data?.FechaRegistro || "Fecha no disponible",
        avatar: (userData.data?.Nombre?.[0] || '') + (userData.data?.Apellido?.[0] || ''),
        documento: userData.data?.NumeroDocumento || '',
        telefono: userData.data?.Telefono || ''
    };

    // Load tutoring sessions from API
    try {
        const upcomingSessions = await loadUpcomingTutoringSessions(sessionData.currentUser.id);
        const allSessions = await loadAllTutoringSessions(sessionData.currentUser.id);
        
        sessionData.tutoringSessions = allSessions || [];
        sessionData.upcomingSessions = upcomingSessions || [];
        
        console.log('Loaded tutoring sessions:', sessionData.tutoringSessions);
    } catch (error) {
        console.error('Error loading tutoring sessions:', error);
        sessionData.tutoringSessions = [];
        sessionData.upcomingSessions = [];
    }

    // Load subjects for the request form
    try {
        const subjects = await loadSubjects();
        sessionData.subjects = subjects || [];
        console.log('Loaded subjects:', sessionData.subjects);
    } catch (error) {
        console.error('Error loading subjects:', error);
        sessionData.subjects = [];
    }

    // Update UI with loaded data
    updateUserInterface();
    
    // Populate materias dropdown after data is loaded
    populateMateriasDropdown();
}

// Mock data for development/fallback
function getMockTutoringSessions() {
    return [
        {
            id: 1,
            subject: "Cálculo Diferencial",
            tutor: "Prof. María García",
            date: "2025-05-27",
            time: "14:00-15:00",
            status: "solicitada",
            location: "Aula 201",
            topics: ["Derivadas por definición", "Regla de la cadena", "Aplicaciones de derivadas"],
            notes: "Recuerda traer tu libro de ejercicios y calculadora. Revisaremos los problemas del capítulo 3."
        },
        {
            id: 2,
            subject: "Programación I",
            tutor: "Prof. Carlos López",
            date: "2025-05-25",
            time: "10:00-11:00",
            status: "confirmada",
            location: "Lab. Informática",
            topics: ["POO", "Herencia", "Polimorfismo"],
            notes: "Trae tu laptop con el IDE configurado."
        },
        {
            id: 3,
            subject: "Álgebra Linear",
            tutor: "Prof. Ana Rodríguez",
            date: "2025-05-20",
            time: "16:00-17:00",
            status: "completada",
            location: "Aula 105",
            topics: ["Matrices", "Determinantes", "Sistemas de ecuaciones"],
            notes: "Excelente participación. Continúa practicando los ejercicios del libro."
        },
        {
            id: 4,
            subject: "Física I",
            tutor: "Prof. Roberto Silva",
            date: "2025-05-26",
            time: "09:00-10:00",
            status: "solicitada",
            location: "Laboratorio de Física",
            topics: ["Cinemática", "Movimiento rectilíneo"],
            notes: ""
        }
    ];
}

        let currentTutoriaId = null;

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

            // Actualizar tablas cuando se cambie de pestaña
            if (tabName === 'tutorias') {
                updateTutoriasTable();
            } else if (tabName === 'dashboard') {
                updateDashboardTable();
            }

            // Actualizar información del perfil si es necesario
            if (tabName === 'perfil') {
                updateProfileInfo();
            }
        }

        // Función para verificar si se puede confirmar asistencia (estudiante puede confirmar en cualquier momento)
        function canConfirmTutoring(tutoring) {
            console.log('Checking if attendance can be confirmed:', tutoring.TutoriaID);
            const status = tutoring.Estado || tutoring.estado || tutoring.status;
            console.log('Tutoring status:', status);
            
            // Cannot confirm attendance if status is canceled
            if (status === 'cancelada') {
                console.log('Cannot confirm attendance: session is canceled');
                return false;
            }
            
            // Cannot confirm attendance if not in 'solicitada' status
            if (status !== 'solicitada') {
                console.log('Cannot confirm attendance: status is not solicitada, current status:', status);
                return false;
            }
            
            // Check if attendance is already confirmed
            const attendanceConfirmed = tutoring.asistencia_confirmada || tutoring.asistenciaConfirmada;
            if (attendanceConfirmed) {
                console.log('Cannot confirm attendance: already confirmed');
                return false;
            }
            
            // Check if tutoring is in the past
            const now = new Date();
            const fecha = tutoring.Fecha || tutoring.fecha || tutoring.date;
            let horaInicio = tutoring.HoraInicio || tutoring.hora_inicio || (tutoring.time ? tutoring.time.split('-')[0] : null);
            console.log('Fecha:', fecha, 'Hora Inicio:', horaInicio);
            
            if (!fecha || !horaInicio) {
                console.log('Cannot confirm attendance: missing date or time');
                return false;
            }
            
            // Handle different time formats
            if (typeof horaInicio === 'object' && horaInicio.Microseconds) {
                // Convert microseconds to hours and minutes
                const startHour = Math.floor(horaInicio.Microseconds / 3600000000);
                const startMinute = Math.floor((horaInicio.Microseconds % 3600000000) / 60000000);
                horaInicio = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
            }
            
            // Ensure time format is HH:MM
            if (typeof horaInicio === 'string' && !horaInicio.includes(':')) {
                // If it's just hour like "14", convert to "14:00"
                horaInicio = horaInicio.padStart(2, '0') + ':00';
            }

            const tutoringDateTime = new Date(`${fecha}T${horaInicio}:00`);
            
            // Check if the date is valid
            if (isNaN(tutoringDateTime.getTime())) {
                console.log('Cannot confirm attendance: invalid date/time format');
                return false;
            }

            // Students can confirm attendance at any time if the session hasn't passed yet
            const hoursUntil = (tutoringDateTime - now) / (1000 * 60 * 60);
            console.log('DateTime:', tutoringDateTime, 'Current time:', now, 'Hours until:', hoursUntil);
            
            // Can confirm if the tutoring session is in the future
            const canConfirm = hoursUntil > 0;
            console.log('Can confirm attendance (session is in the future):', canConfirm);
            return canConfirm;
        }

        // Función para generar botones de acción según el estado y condiciones
        function generateActionButtons(tutoring) {
            const tutoriaId = tutoring.TutoriaID || tutoring.tutoria_id || tutoring.id;
            const status = tutoring.Estado || tutoring.estado || tutoring.status;
            
            let buttons = `<button class="btn btn-primary" onclick="openTutoriaDetail(${tutoriaId})">Ver</button>`;
            
            // No action buttons for canceled or completed sessions
            if (status === 'cancelada' || status === 'completada') {
                return buttons;
            }
            
            if (status === 'solicitada') {
                // Check attendance confirmation status more comprehensively
                const attendanceConfirmed = tutoring.asistencia_confirmada || tutoring.asistenciaConfirmada || 
                                          tutoring.attendance_confirmed || tutoring.attendanceConfirmed;
                
                if (attendanceConfirmed) {
                    // Attendance already confirmed - show disabled button
                    buttons += ` <button class="btn btn-success" disabled title="Asistencia ya confirmada">Asistencia Confirmada</button>`;
                } else if (canConfirmTutoring(tutoring)) {
                    // Can confirm attendance - show active button
                    buttons += ` <button class="btn btn-success" onclick="confirmarTutoriaDirecta(${tutoriaId})">Confirmar Asistencia</button>`;
                } else {
                    // Cannot confirm attendance - show disabled button with reason
                    const message = getConfirmationStatusMessage(tutoring);
                    buttons += ` <button class="btn btn-success" disabled title="${message}">Confirmar Asistencia</button>`;
                }
                buttons += ` <button class="btn btn-danger" onclick="openCancelModal(${tutoriaId})">Cancelar</button>`;
            } else if (status === 'confirmada') {
                // Disable cancel button if tutoria is confirmed
                const cancelDisabled = status === 'confirmada' ? 'disabled' : '';
                buttons += ` <button class="btn btn-danger" onclick="openCancelModal(${tutoriaId})" ${cancelDisabled}>Cancelar</button>`;
            }
            
            return buttons;
        }

        // Función para actualizar tabla del dashboard
        async function updateDashboardTable() {
            const tableBody = document.getElementById('dashboardTableBody');
            if (!tableBody) return;

            tableBody.innerHTML = '';
            
            // Mostrar solo tutorías futuras
            const futureTutorings = sessionData.tutoringSessions.filter(tutoring => {
                const tutoringDate = new Date(tutoring.fecha || tutoring.Fecha || tutoring.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const status = tutoring.estado || tutoring.Estado || tutoring.status;
                return tutoringDate >= today && (status === 'solicitada' || status === 'confirmada');
            });

            // Process each tutoring session asynchronously
            for (const tutoring of futureTutorings) {
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
                    
                    // Handle tutor name
                    let tutor = 'N/A';
                    if (tutoring.tutorNombre && tutoring.tutorApellido) {
                        tutor = `${tutoring.tutorNombre} ${tutoring.tutorApellido}`;
                    } else if (tutoring.tutor_nombre && tutoring.tutor_apellido) {
                        tutor = `${tutoring.tutor_nombre} ${tutoring.tutor_apellido}`;
                    } else if (tutoring.tutor) {
                        tutor = tutoring.tutor;
                    } else if (tutoring.TutorID) {
                        tutor = await getTutorName(tutoring.TutorID);
                    }
                    
                    // Handle date
                    const fecha = tutoring.fecha || tutoring.Fecha || tutoring.date || 'N/A';
                    
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
                    
                    row.innerHTML = `
                        <td>${materiaName}</td>
                        <td>${tutor}</td>
                        <td>${formatDate(fecha)}</td>
                        <td>${time}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${generateActionButtons(tutoring)}</td>
                    `;
                    
                    tableBody.appendChild(row);
                } catch (error) {
                    console.error('Error processing tutoring session in dashboard:', error, tutoring);
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

            if (futureTutorings.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="6" style="text-align: center; color: #666;">No tienes tutorías programadas</td>';
                tableBody.appendChild(row);
            }
        }

        // Función para actualizar tabla de tutorías
        async function updateTutoriasTable() {
            const tableBody = document.getElementById('tutoriasTableBody');
            if (!tableBody) return;

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
                    
                    // Handle tutor name
                    let tutor = 'N/A';
                    if (tutoring.tutorNombre && tutoring.tutorApellido) {
                        tutor = `${tutoring.tutorNombre} ${tutoring.tutorApellido}`;
                    } else if (tutoring.tutor_nombre && tutoring.tutor_apellido) {
                        tutor = `${tutoring.tutor_nombre} ${tutoring.tutor_apellido}`;
                    } else if (tutoring.tutor) {
                        tutor = tutoring.tutor;
                    } else if (tutoring.TutorID) {
                        tutor = await getTutorName(tutoring.TutorID);
                    }
                    
                    // Handle date
                    const fecha = tutoring.fecha || tutoring.Fecha || tutoring.date || 'N/A';
                    
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
                    
                    // Handle location
                    const location = tutoring.lugar || tutoring.Lugar || tutoring.location || 'N/A';
                    
                    // Handle status
                    const status = tutoring.estado || tutoring.Estado || tutoring.status || 'N/A';
                    
                    const statusClass = `status-${status}`;
                    const statusText = getStatusText(status);
                    
                    row.innerHTML = `
                        <td>#${tutoriaId.toString().padStart(3, '0')}</td>
                        <td>${materiaName}</td>
                        <td>${tutor}</td>
                        <td>${formatDate(fecha)}</td>
                        <td>${time}</td>
                        <td>${location}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${generateActionButtons(tutoring)}</td>
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
                row.innerHTML = '<td colspan="8" style="text-align: center; color: #666;">No tienes tutorías registradas</td>';
                tableBody.appendChild(row);
            }
        }

        // Function to populate materias dropdown from available tutoring sessions
function populateMateriasDropdown() {
    const dropdown = document.getElementById('filtroMateriaModal');
    if (!dropdown || !sessionData.tutoringSessions) return;

    // Get unique materias from tutoring sessions
    const materias = new Set();
    
    sessionData.tutoringSessions.forEach(tutoring => {
        let materiaName = '';
        
        if (tutoring.materiaNombre) {
            materiaName = tutoring.materiaNombre;
        } else if (tutoring.materia_nombre) {
            materiaName = tutoring.materia_nombre;
        } else if (tutoring.subject) {
            materiaName = tutoring.subject;
        } else if (tutoring.MateriaID) {
            materiaName = GetIdFromName(tutoring.MateriaID);
        }
        
        if (materiaName && materiaName !== 'N/A') {
            materias.add(materiaName);
        }
    });

    // Clear existing options (except the first one)
    const firstOption = dropdown.firstElementChild;
    dropdown.innerHTML = '';
    dropdown.appendChild(firstOption);

    // Add options for each unique materia
    materias.forEach(materia => {
        const option = document.createElement('option');
        option.value = materia;
        option.textContent = materia;
        console.log('Adding materia option:', materia);
        dropdown.appendChild(option);
    });
}

// Function to populate solicitud form materias dropdown from API data
function populateSolicitudMateriasDropdown() {
    const dropdown = document.getElementById('materia');
    if (!dropdown || !sessionData.subjects) return;

    console.log('Populating solicitud materias dropdown with:', sessionData.subjects);

    // Clear existing options (except the first one)
    const firstOption = dropdown.firstElementChild;
    dropdown.innerHTML = '';
    dropdown.appendChild(firstOption);

    // Add options for each materia from API
    sessionData.subjects.forEach(subject => {
        const option = document.createElement('option');
        // Use the subject ID as value and name as text
        option.value = subject.materia_id || subject.id || subject.MateriaID;
        option.textContent = subject.nombre || subject.name || subject.Nombre || 'Materia sin nombre';
        console.log('Adding solicitud materia option:', option.textContent, 'with value:', option.value);
        dropdown.appendChild(option);
    });
}

// Event listeners and initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize user data when page loads
    initializeUserData().catch(error => {
        console.error('Error initializing user data:', error);
        // Fallback to mock data if API fails
        sessionData.tutoringSessions = getMockTutoringSessions();
        updateUserInterface();
    });

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
            
            // Apply filters
            const filteredResults = filterTutorings();
            
            // Show result count
            const resultCount = filteredResults.length;
            showNotification(`Filtros aplicados: ${resultCount} tutoría${resultCount !== 1 ? 's' : ''} encontrada${resultCount !== 1 ? 's' : ''}`, 'success');
            
            // Close modal
            closeModal('filtros');
        });
    }

    // Manejar envío del formulario de solicitud de tutoría
    const solicitudForm = document.getElementById('solicitudForm');
    if (solicitudForm) {
        solicitudForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const programa = document.getElementById('programa').value;
            const materia = document.getElementById('materia').value;
            const fecha = document.getElementById('fecha').value;
            const hora = document.getElementById('hora').value;
            const lugar = document.getElementById('lugar').value;
            const temas = document.getElementById('temas').value;
            
            // Validate required fields
            if (!programa || !materia || !fecha || !hora || !lugar || !temas) {
                showNotification('Por favor, completa todos los campos', 'error');
                return;
            }
            
            // Get current user data
            const userData = getUserData();
            if (!userData) {
                showNotification('Error: No se encontró información del usuario', 'error');
                return;
            }
            
            // Prepare request data
            const requestData = {
                estudiante_id: userData.EstudianteID,
                materia_id: parseInt(materia),
                tutor_id: 0,
                fecha: fecha,
                hora_inicio: hora,
                hora_fin: (() => {
                    // Parse the time string
                    let hourNum = parseInt(hora.split(':')[0]);
                    // Add 2 hours and handle overflow
                    hourNum = (hourNum + 2) % 24;
                    // Format the end time based on the format of the start time
                    if (hora.includes(':')) {
                        return `${hourNum.toString().padStart(2, '0')}:${hora.split(':')[1]}`;
                    } else {
                        return hourNum.toString().padStart(2, '0');
                    }
                })(),
                lugar: lugar,
                estado: 'solicitada',
            };
            
            console.log('Submitting tutoring request:', requestData);
            
            // Submit the request
            submitTutoringRequest(requestData)
                .then(result => {
                    if (result) {
                        showNotification('Solicitud de tutoría enviada exitosamente', 'success');
                        
                        // Reset form
                        solicitudForm.reset();
                        
                        // Reset minimum date
                        document.getElementById('fecha').min = new Date().toISOString().split('T')[0];
                        
                        // Refresh data to include the new request
                        initializeUserData().catch(error => {
                            console.error('Error refreshing user data:', error);
                        });
                        
                        // Switch to "Mis Tutorías" tab to see the new request
                        showTab('tutorias');
                    } else {
                        showNotification('Error al enviar la solicitud. Inténtalo nuevamente.', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error submitting tutoring request:', error);
                    showNotification('Error al enviar la solicitud. Inténtalo nuevamente.', 'error');
                });
        });
    }

    // Initialize tables
    updateUserInterface();
    
    // Set minimum date for fecha input to today
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        fechaInput.min = new Date().toISOString().split('T')[0];
    }
    
    // Set up a timeout to populate dropdown after data loads
    setTimeout(() => {
        if (sessionData.tutoringSessions && sessionData.tutoringSessions.length > 0) {
            populateMateriasDropdown();
        }
    }, 1000);
});

// Function to show notifications (same as tutor.js)
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

// Function to update dashboard statistics
function updateDashboardStats() {
    if (!sessionData.tutoringSessions) return;

    const totalTutorias = sessionData.tutoringSessions.length;
    const tutoriasCompletadas = sessionData.tutoringSessions.filter(t => 
        (t.estado || t.Estado || t.status) === 'completada'
    ).length;
    const tutoriasPendientes = sessionData.tutoringSessions.filter(t => 
        ['solicitada', 'confirmada'].includes(t.estado || t.Estado || t.status)
    ).length;

    // Update stat elements if they exist
    const totalElement = document.getElementById('total-tutorias');
    const completadasElement = document.getElementById('tutorias-completadas');
    const pendientesElement = document.getElementById('tutorias-pendientes');

    if (totalElement) totalElement.textContent = totalTutorias;
    if (completadasElement) completadasElement.textContent = tutoriasCompletadas;
    if (pendientesElement) pendientesElement.textContent = tutoriasPendientes;
}

// Function to confirm attendance from modal
async function confirmarAsistencia() {
    if (!currentTutoriaId) {
        showNotification('Error: No se encontró la tutoría', 'error');
        return;
    }
    
    try {
        const result = await updateTutoringAttendance(currentTutoriaId, true);
        if (result) {
            // Update the tutoring object in sessionData with multiple field variants
            const tutoring = sessionData.tutoringSessions.find(t => 
                (t.TutoriaID || t.tutoria_id || t.id) === currentTutoriaId
            );
            
            if (tutoring) {
                // Set multiple attendance confirmation field variants for persistence
                tutoring.asistencia_confirmada = true;
                tutoring.asistenciaConfirmada = true;
                tutoring.attendance_confirmed = true;
                tutoring.attendanceConfirmed = true;
                
                // Also update sessionData to ensure persistence
                sessionData.tutoringSessions = sessionData.tutoringSessions.map(t => 
                    (t.TutoriaID || t.tutoria_id || t.id) === currentTutoriaId ? tutoring : t
                );
            }
            
            showNotification('Asistencia confirmada exitosamente', 'success');
            closeModal('detalleTutoria');
            await updateTutoriasTable();
            await updateDashboardTable();
        }
    } catch (error) {
        console.error('Error confirming attendance:', error);
        showNotification('Error al confirmar asistencia', 'error');
    }
}

// Function to confirm attendance directly from table button
async function confirmarTutoriaDirecta(tutoriaId) {
    try {
        const result = await updateTutoringAttendance(tutoriaId, true);
        if (result) {
            // Update the tutoring object in sessionData with multiple field variants
            const tutoring = sessionData.tutoringSessions.find(t => 
                (t.TutoriaID || t.tutoria_id || t.id) === tutoriaId
            );
            
            if (tutoring) {
                // Set multiple attendance confirmation field variants for persistence
                tutoring.asistencia_confirmada = true;
                tutoring.asistenciaConfirmada = true;
                tutoring.attendance_confirmed = true;
                tutoring.attendanceConfirmed = true;
                
                // Also update sessionData to ensure persistence
                sessionData.tutoringSessions = sessionData.tutoringSessions.map(t => 
                    (t.TutoriaID || t.tutoria_id || t.id) === tutoriaId ? tutoring : t
                );
            }
            
            showNotification('Asistencia confirmada exitosamente', 'success');
            await updateTutoriasTable();
            await updateDashboardTable();
        }
    } catch (error) {
        console.error('Error confirming attendance:', error);
        showNotification('Error al confirmar asistencia', 'error');
    }
}

// Function to filter tutoring sessions
function filterTutorings() {
    const estado = document.getElementById('filtroEstado').value;
    const materia = document.getElementById('filtroMateriaModal').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    if (!sessionData || !sessionData.tutoringSessions) {
        return [];
    }

    let filteredTutorings = sessionData.tutoringSessions;

    // Filter by status
    if (estado) {
        filteredTutorings = filteredTutorings.filter(t => {
            const status = t.estado || t.Estado || t.status;
            return status === estado;
        });
    }

    // Filter by subject/materia
    if (materia) {
        filteredTutorings = filteredTutorings.filter(t => {
            let materiaName = '';
            if (t.materiaNombre) {
                materiaName = t.materiaNombre;
            } else if (t.materia_nombre) {
                materiaName = t.materia_nombre;
            } else if (t.subject) {
                materiaName = t.subject;
            } else if (t.MateriaID) {
                materiaName = GetIdFromName(t.MateriaID);
            }
            console.log('Filtering by materia:', materia, 'Found:', materiaName);
            return materiaName.toLowerCase().includes(materia.toLowerCase());
        });
    }

    // Filter by start date
    if (fechaInicio) {
        filteredTutorings = filteredTutorings.filter(t => {
            const fecha = t.fecha || t.Fecha || t.date;
            return fecha >= fechaInicio;
        });
    }

    // Filter by end date
    if (fechaFin) {
        filteredTutorings = filteredTutorings.filter(t => {
            const fecha = t.fecha || t.Fecha || t.date;
            return fecha <= fechaFin;
        });
    }

    // Update the table with filtered results
    updateTutoriasTableWithFiltered(filteredTutorings);
    return filteredTutorings;
}

// Function to clear all filters
function limpiarFiltros() {
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroMateriaModal').value = '';
    document.getElementById('fechaInicio').value = '';
    document.getElementById('fechaFin').value = '';
    
    // Reset table to show all tutoring sessions
    updateTutoriasTable();
    showNotification('Filtros limpiados', 'info');
}

// Function to update tutoring table with filtered results
async function updateTutoriasTableWithFiltered(filteredTutorings) {
    const tableBody = document.getElementById('tutoriasTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    // Process each filtered tutoring session
    for (const tutoring of filteredTutorings) {
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
            
            // Handle tutor name
            let tutor = 'N/A';
            if (tutoring.tutorNombre && tutoring.tutorApellido) {
                tutor = `${tutoring.tutorNombre} ${tutoring.tutorApellido}`;
            } else if (tutoring.tutor_nombre && tutoring.tutor_apellido) {
                tutor = `${tutoring.tutor_nombre} ${tutoring.tutor_apellido}`;
            } else if (tutoring.tutor) {
                tutor = tutoring.tutor;
            } else if (tutoring.TutorID) {
                tutor = await getTutorName(tutoring.TutorID);
            }
            
            // Handle date
            const fecha = tutoring.fecha || tutoring.Fecha || tutoring.date || 'N/A';
            
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
            
            // Handle location
            const location = tutoring.lugar || tutoring.Lugar || tutoring.location || 'N/A';
            
            // Handle status
            const status = tutoring.estado || tutoring.Estado || tutoring.status || 'N/A';
            
            const statusClass = `status-${status}`;
            const statusText = getStatusText(status);
            
            row.innerHTML = `
                <td>#${tutoriaId.toString().padStart(3, '0')}</td>
                <td>${materiaName}</td>
                <td>${tutor}</td>
                <td>${formatDate(fecha)}</td>
                <td>${time}</td>
                <td>${location}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${generateActionButtons(tutoring)}</td>
            `;
            
            tableBody.appendChild(row);
        } catch (error) {
            console.error('Error processing filtered tutoring session:', error, tutoring);
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
    
    // Show message if no filtered results
    if (filteredTutorings.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="8" style="text-align: center; color: #666;">No se encontraron tutorías que coincidan con los filtros</td>';
        tableBody.appendChild(row);
    }
}

// Helper functions that may be missing
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openTutoriaDetail(tutoriaId) {
    currentTutoriaId = tutoriaId;
    const tutoring = sessionData.tutoringSessions.find(t => 
        (t.TutoriaID || t.tutoria_id || t.id) === tutoriaId
    );
    
    if (!tutoring) {
        showNotification('Tutoría no encontrada', 'error');
        return;
    }
    
    // Fill modal with tutoring details
    const detalleMateria = document.getElementById('detalleMateria');
    const detalleTutor = document.getElementById('detalleTutor');
    const detalleFecha = document.getElementById('detalleFecha');
    const detalleHora = document.getElementById('detalleHora');
    const detalleLugar = document.getElementById('detalleLugar');
    const detalleEstado = document.getElementById('detalleEstado');
    
    if (detalleMateria) detalleMateria.textContent = tutoring.materiaNombre || tutoring.materia_nombre || tutoring.subject || 'N/A';
    if (detalleTutor) {
        const tutorName = tutoring.tutorNombre && tutoring.tutorApellido ? 
            `${tutoring.tutorNombre} ${tutoring.tutorApellido}` : 
            (tutoring.tutor_nombre && tutoring.tutor_apellido ? 
                `${tutoring.tutor_nombre} ${tutoring.tutor_apellido}` : 
                tutoring.tutor || 'N/A');
        detalleTutor.textContent = tutorName;
    }
    if (detalleFecha) detalleFecha.textContent = formatDate(tutoring.fecha || tutoring.Fecha || tutoring.date);
    if (detalleHora) {
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
        detalleHora.textContent = time;
    }
    if (detalleLugar) detalleLugar.textContent = tutoring.lugar || tutoring.Lugar || tutoring.location || 'N/A';
    if (detalleEstado) {
        const status = tutoring.estado || tutoring.Estado || tutoring.status;
        detalleEstado.textContent = getStatusText(status);
        detalleEstado.className = `status-badge status-${status}`;
    }
    
    // Show/hide confirm button based on ability to confirm attendance
    const confirmarBtn = document.getElementById('confirmarBtn');
    if (confirmarBtn) {
        const attendanceConfirmed = tutoring.asistencia_confirmada || tutoring.asistenciaConfirmada || 
                                   tutoring.attendance_confirmed || tutoring.attendanceConfirmed;
        
        if (attendanceConfirmed) {
            confirmarBtn.style.display = 'none';
        } else if (canConfirmTutoring(tutoring)) {
            confirmarBtn.style.display = 'inline-block';
        } else {
            confirmarBtn.style.display = 'none';
        }
    }
    
    openModal('detalleTutoria');
}

function openCancelModal(tutoriaId) {
    currentTutoriaId = tutoriaId;
    openModal('confirmarCancelacion');
}

function getStatusText(status) {
    const statusMap = {
        'solicitada': 'Solicitada',
        'confirmada': 'Confirmada',
        'completada': 'Completada',
        'cancelada': 'Cancelada'
    };
    return statusMap[status] || status || 'N/A';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    } catch (error) {
        return dateString;
    }
}

function getConfirmationStatusMessage(tutoring) {
    const status = tutoring.Estado || tutoring.estado || tutoring.status;
    
    if (status === 'cancelada') {
        return 'La tutoría está cancelada';
    }
    
    if (status !== 'solicitada') {
        return 'Solo se puede confirmar asistencia en tutorías solicitadas';
    }
    
    const now = new Date();
    const fecha = tutoring.Fecha || tutoring.fecha || tutoring.date;
    let horaInicio = tutoring.HoraInicio || tutoring.hora_inicio || (tutoring.time ? tutoring.time.split('-')[0] : null);
    
    if (!fecha || !horaInicio) {
        return 'Fecha u hora no disponible';
    }
    
    // Handle different time formats
    if (typeof horaInicio === 'object' && horaInicio.Microseconds) {
        const startHour = Math.floor(horaInicio.Microseconds / 3600000000);
        const startMinute = Math.floor((horaInicio.Microseconds % 3600000000) / 60000000);
        horaInicio = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
    }
    
    if (typeof horaInicio === 'string' && !horaInicio.includes(':')) {
        horaInicio = horaInicio.padStart(2, '0') + ':00';
    }

    const tutoringDateTime = new Date(`${fecha}T${horaInicio}:00`);
    
    if (isNaN(tutoringDateTime.getTime())) {
        return 'Formato de fecha/hora inválido';
    }

    const hoursUntil = (tutoringDateTime - now) / (1000 * 60 * 60);
    
    if (hoursUntil <= 0) {
        return 'La tutoría ya pasó';
    }
    
    return 'Disponible para confirmar';
}

// Helper function to get tutor name from API
async function getTutorName(tutorId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tutores/${tutorId}/nombre`);
        if (!response.ok) throw new Error('Failed to fetch tutor name');
        const data = await response.json();
        
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
    if (!sessionData.subjects || !materiaId) return 'N/A';
    
    const materia = sessionData.subjects.find(m => m.materia_id === materiaId || m.id === materiaId);
    return materia ? (materia.nombre || materia.name || 'N/A') : 'N/A';
}

// Function to update user interface
function updateUserInterface() {
    // Update navbar with user info
    const navbarUserName = document.getElementById('navbar-user-name');
    const navbarUserSubtitle = document.getElementById('navbar-user-subtitle');
    const navbarUserAvatar = document.getElementById('navbar-user-avatar');

    if (sessionData.currentUser) {
        if (navbarUserName) navbarUserName.textContent = sessionData.currentUser.name || 'Usuario';
        if (navbarUserSubtitle) navbarUserSubtitle.textContent = 'Estudiante';
        if (navbarUserAvatar) navbarUserAvatar.textContent = sessionData.currentUser.avatar || 'US';
    }

    updateDashboardTable();
    updateTutoriasTable();
    updateDashboardStats();
    populateMateriasDropdown();
    populateSolicitudMateriasDropdown(); // Populate solicitud form dropdown
    updateProfileInfo();
}

// Function to update profile information
function updateProfileInfo() {
    if (!sessionData.currentUser) return;
    
    const profileElements = {
        'profile-nombre': sessionData.currentUser.name,
        'profile-email': sessionData.currentUser.email,
        'profile-documento': sessionData.currentUser.documento,
        'profile-telefono': sessionData.currentUser.telefono,
        'profile-programa': sessionData.currentUser.program,
        'profile-fecha': sessionData.currentUser.registrationDate
    };
    
    Object.entries(profileElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || 'No disponible';
        }
    });
    
    // Update profile avatar if it exists
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar && sessionData.currentUser.avatar) {
        profileAvatar.textContent = sessionData.currentUser.avatar;
    }
}

// Function to cancel tutoring (implement if needed)
function confirmarCancelacionTutoria() {
    if (!currentTutoriaId) {
        showNotification('Error: No se encontró la tutoría', 'error');
        return;
    }
    
    updateTutoringStatus(currentTutoriaId, 'cancelada')
        .then(result => {
            if (result) {
                const tutoring = sessionData.tutoringSessions.find(t => 
                    (t.TutoriaID || t.tutoria_id || t.id) === currentTutoriaId
                );
                
                if (tutoring) {
                    tutoring.estado = 'cancelada';
                    tutoring.Estado = 'cancelada';
                    tutoring.status = 'cancelada';
                }
                
                showNotification('Tutoría cancelada exitosamente', 'success');
                closeModal('confirmarCancelacion');
                updateTutoriasTable();
                updateDashboardTable();
            }
        })
        .catch(error => {
            console.error('Error canceling tutoring:', error);
            showNotification('Error al cancelar la tutoría', 'error');
        });
}