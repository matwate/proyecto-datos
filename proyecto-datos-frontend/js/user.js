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
        program: userData.data?.Programa || "Programa no especificado",
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

        // Función para verificar si se puede confirmar una tutoría (12 horas antes)
        function canConfirmTutoring(tutoring) {
            const status = tutoring.estado || tutoring.status;
            if (status !== 'solicitada') return false;
            
            const now = new Date();
            const fecha = tutoring.fecha || tutoring.date;
            const horaInicio = tutoring.horaInicio || tutoring.hora_inicio || (tutoring.time ? tutoring.time.split('-')[0] : null);
            
            if (!fecha || !horaInicio) return false;
            
            const tutoringDateTime = new Date(`${fecha}T${horaInicio}:00`);
            const hoursUntil = (tutoringDateTime - now) / (1000 * 60 * 60);
            
            return hoursUntil >= 12;
        }

        // Función para generar botones de acción según el estado y condiciones
        function generateActionButtons(tutoring) {
            const tutoriaId = tutoring.tutoriaID || tutoring.tutoria_id || tutoring.id;
            const status = tutoring.estado || tutoring.status;
            
            let buttons = `<button class="btn btn-primary" onclick="openTutoriaDetail(${tutoriaId})">Ver</button>`;
            
            if (status === 'solicitada') {
                if (canConfirmTutoring(tutoring)) {
                    buttons += ` <button class="btn btn-success" onclick="confirmarTutoriaDirecta(${tutoriaId})">Confirmar</button>`;
                } else {
                    buttons += ` <button class="btn btn-success" disabled title="Solo se puede confirmar 12 horas antes">Confirmar</button>`;
                }
                buttons += ` <button class="btn btn-danger" onclick="openCancelModal(${tutoriaId})">Cancelar</button>`;
            } else if (status === 'confirmada') {
                buttons += ` <button class="btn btn-danger" onclick="openCancelModal(${tutoriaId})">Cancelar</button>`;
            }
            
            return buttons;
        }

        // Función para actualizar tabla del dashboard
        function updateDashboardTable() {
            const tableBody = document.getElementById('dashboardTableBody');
            if (!tableBody) return;

            tableBody.innerHTML = '';
            
            // Mostrar solo tutorías futuras
            const futureTutorings = sessionData.tutoringSessions.filter(tutoring => {
                const tutoringDate = new Date(tutoring.fecha || tutoring.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const status = tutoring.estado || tutoring.status;
                return tutoringDate >= today && (status === 'solicitada' || status === 'confirmada');
            });

            futureTutorings.forEach(tutoring => {
                const row = document.createElement('tr');
                
                // Map API data to display format - handle both API response format and local format
                const subject = tutoring.materiaNombre || tutoring.materia_nombre || tutoring.subject || 'N/A';
                const tutor = (tutoring.tutorNombre && tutoring.tutorApellido) 
                    ? `${tutoring.tutorNombre} ${tutoring.tutorApellido}` 
                    : (tutoring.tutor_nombre && tutoring.tutor_apellido) 
                    ? `${tutoring.tutor_nombre} ${tutoring.tutor_apellido}` 
                    : tutoring.tutor || 'N/A';
                const fecha = tutoring.fecha || tutoring.date;
                const time = tutoring.time || (tutoring.horaInicio && tutoring.horaFin 
                    ? `${tutoring.horaInicio}-${tutoring.horaFin}` 
                    : (tutoring.hora_inicio && tutoring.hora_fin 
                    ? `${tutoring.hora_inicio}-${tutoring.hora_fin}` 
                    : 'N/A'));
                const status = tutoring.estado || tutoring.status;
                const tutoriaId = tutoring.tutoriaID || tutoring.tutoria_id || tutoring.id;
                
                const statusClass = `status-${status}`;
                const statusText = getStatusText(status);
                
                row.innerHTML = `
                    <td>${subject}</td>
                    <td>${tutor}</td>
                    <td>${formatDate(fecha)}</td>
                    <td>${time}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${generateActionButtons(tutoring)}</td>
                `;
                
                tableBody.appendChild(row);
            });

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

        // Función para abrir detalle de tutoría
        function openTutoriaDetail(tutoriaId) {
            const tutoring = sessionData.tutoringSessions.find(t => (t.tutoriaID || t.tutoria_id || t.id) === tutoriaId);
            if (!tutoring) return;

            currentTutoriaId = tutoriaId;

            // Map API data to display format - handle both API response format and local format
            const subject = tutoring.materiaNombre || tutoring.materia_nombre || tutoring.subject || 'N/A';
            const tutor = (tutoring.tutorNombre && tutoring.tutorApellido) 
                ? `${tutoring.tutorNombre} ${tutoring.tutorApellido}` 
                : (tutoring.tutor_nombre && tutoring.tutor_apellido) 
                ? `${tutoring.tutor_nombre} ${tutoring.tutor_apellido}` 
                : tutoring.tutor || 'N/A';
            const fecha = tutoring.fecha || tutoring.date;
            const time = tutoring.time || (tutoring.horaInicio && tutoring.horaFin 
                ? `${tutoring.horaInicio}-${tutoring.horaFin}` 
                : (tutoring.hora_inicio && tutoring.hora_fin 
                ? `${tutoring.hora_inicio}-${tutoring.hora_fin}` 
                : 'N/A'));
            const location = tutoring.lugar || tutoring.location || 'N/A';
            const status = tutoring.estado || tutoring.status || 'N/A';

            // Llenar datos del modal
            document.getElementById('detalleMateria').textContent = subject;
            document.getElementById('detalleTutor').textContent = tutor;
            document.getElementById('detalleFecha').textContent = formatDate(fecha);
            document.getElementById('detalleHora').textContent = time;
            document.getElementById('detalleLugar').textContent = location;
            
            const statusClass = `status-${status}`;
            const statusText = getStatusText(status);
            document.getElementById('detalleEstado').innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;

            // Llenar temas
            const temasUl = document.getElementById('detalleTemas');
            temasUl.innerHTML = '';
            
            // Handle topics from API (temas_tratados) or mock data (topics)
            const topics = [];
            if (tutoring.temasTratados && tutoring.temasTratados.String) {
                // API format (camelCase from JSON)
                topics.push(tutoring.temasTratados.String);
            } else if (tutoring.temas_tratados && tutoring.temas_tratados.String) {
                // API format (snake_case if using different serialization)
                topics.push(tutoring.temas_tratados.String);
            } else if (tutoring.topics && Array.isArray(tutoring.topics)) {
                topics.push(...tutoring.topics);
            } else if (typeof tutoring.topics === 'string') {
                topics.push(tutoring.topics);
            }
            
            if (topics.length > 0) {
                topics.forEach(topic => {
                    const li = document.createElement('li');
                    li.textContent = topic;
                    temasUl.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'Sin temas especificados';
                temasUl.appendChild(li);
            }

            // Llenar notas
            const notes = tutoring.observaciones || tutoring.notes || 'Sin notas adicionales.';
            document.getElementById('detalleNotas').textContent = notes;

            // Mostrar/ocultar botones según estado
            const confirmarBtn = document.getElementById('confirmarBtn');
            const cancelarBtn = document.getElementById('cancelarBtn');

            if (tutoring.status === 'solicitada' && canConfirmTutoring(tutoring)) {
                confirmarBtn.style.display = 'inline-flex';
            } else {
                confirmarBtn.style.display = 'none';
            }

            if (tutoring.status === 'completada' || tutoring.status === 'cancelada') {
                cancelarBtn.style.display = 'none';
            } else {
                cancelarBtn.style.display = 'inline-flex';
            }

            openModal('detalleTutoria');
        }

        // Función para confirmar tutoría desde el detalle
        async function confirmarAsistencia() {
            if (!currentTutoriaId) return;

            const tutoring = sessionData.tutoringSessions.find(t => (t.tutoriaID || t.tutoria_id || t.id) === currentTutoriaId);
            if (!tutoring || !canConfirmTutoring(tutoring)) {
                showNotification('No se puede confirmar esta tutoría en este momento', 'error');
                return;
            }

            try {
                const result = await updateTutoringStatus(currentTutoriaId, 'confirmada');
                if (result) {
                    // Update both possible status fields
                    tutoring.status = 'confirmada';
                    tutoring.estado = 'confirmada';
                    showNotification('Tutoría confirmada exitosamente', 'success');
                    closeModal('detalleTutoria');
                    updateTutoriasTable();
                    updateDashboardTable();
                } else {
                    showNotification('Error al confirmar la tutoría. Inténtalo nuevamente.', 'error');
                }
            } catch (error) {
                console.error('Error confirming tutoring:', error);
                showNotification('Error al confirmar la tutoría. Inténtalo nuevamente.', 'error');
            }
        }

        // Función para confirmar tutoría directamente desde la tabla
        async function confirmarTutoriaDirecta(tutoriaId) {
            const tutoring = sessionData.tutoringSessions.find(t => (t.tutoriaID || t.tutoria_id || t.id) === tutoriaId);
            if (!tutoring || !canConfirmTutoring(tutoring)) {
                showNotification('No se puede confirmar esta tutoría. Debe confirmarse mínimo 12 horas antes.', 'warning');
                return;
            }

            try {
                const result = await updateTutoringStatus(tutoriaId, 'confirmada');
                if (result) {
                    // Update both possible status fields
                    tutoring.status = 'confirmada';
                    tutoring.estado = 'confirmada';
                    showNotification('Tutoría confirmada exitosamente', 'success');
                    updateTutoriasTable();
                    updateDashboardTable();
                } else {
                    showNotification('Error al confirmar la tutoría. Inténtalo nuevamente.', 'error');
                }
            } catch (error) {
                console.error('Error confirming tutoring:', error);
                showNotification('Error al confirmar la tutoría. Inténtalo nuevamente.', 'error');
            }
        }

        // Función para abrir modal de cancelación
        function openCancelModal(tutoriaId) {
            currentTutoriaId = tutoriaId;
            openModal('confirmarCancelacion');
        }

        // Función para cancelar tutoría desde el detalle
        function cancelarTutoria() {
            if (!currentTutoriaId) return;
            openCancelModal(currentTutoriaId);
            closeModal('detalleTutoria');
        }

        // Función para confirmar la cancelación
        async function confirmarCancelacionTutoria() {
            if (!currentTutoriaId) return;

            const tutoring = sessionData.tutoringSessions.find(t => (t.tutoriaID || t.tutoria_id || t.id) === currentTutoriaId);
            if (!tutoring) return;

            try {
                const result = await updateTutoringStatus(currentTutoriaId, 'cancelada');
                if (result) {
                    // Update both possible status fields
                    tutoring.status = 'cancelada';
                    tutoring.estado = 'cancelada';
                    showNotification('Tutoría cancelada exitosamente', 'success');
                    closeModal('confirmarCancelacion');
                    updateTutoriasTable();
                    updateDashboardTable();
                    currentTutoriaId = null;
                } else {
                    showNotification('Error al cancelar la tutoría. Inténtalo nuevamente.', 'error');
                }
            } catch (error) {
                console.error('Error canceling tutoring:', error);
                showNotification('Error al cancelar la tutoría. Inténtalo nuevamente.', 'error');
            } finally {
                closeModal('confirmarCancelacion');
                currentTutoriaId = null;
            }
        }

        // Función para obtener texto del estado
        function getStatusText(status) {
            const statusTexts = {
                'solicitada': 'Solicitada',
                'confirmada': 'Confirmada',
                'completada': 'Completada',
                'cancelada': 'Cancelada'
            };
            return statusTexts[status] || status;
        }

        // Función para formatear fecha
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }

        // Función para actualizar información del perfil
        function updateProfileInfo() {
            const user = sessionData.currentUser;
            if (!user) return;

            // Update navbar user info
            const navbarUserName = document.getElementById('navbar-user-name');
            const navbarUserSubtitle = document.getElementById('navbar-user-subtitle');
            const navbarUserAvatar = document.getElementById('navbar-user-avatar');
            const profileAvatarLarge = document.getElementById('profile-avatar-large');
            
            if (navbarUserName) {
                navbarUserName.textContent = user.name;
            }
            if (navbarUserSubtitle) {
                navbarUserSubtitle.textContent = `Estudiante - ${user.program}`;
            }
            if (navbarUserAvatar) {
                navbarUserAvatar.textContent = user.avatar || user.name.split(' ').map(n => n[0]).join('').toUpperCase();
            }
            if (profileAvatarLarge) {
                profileAvatarLarge.textContent = user.avatar || user.name.split(' ').map(n => n[0]).join('').toUpperCase();
            }

            // Update profile page info
            const profileNombre = document.getElementById('profile-nombre');
            const profileApellido = document.getElementById('profile-apellido');
            const profileEmail = document.getElementById('profile-email');
            const profilePrograma = document.getElementById('profile-programa');
            const profileFecha = document.getElementById('profile-fecha');

            if (profileNombre) {
                profileNombre.textContent = user.firstName || user.name.split(' ')[0] || '';
            }
            if (profileApellido) {
                profileApellido.textContent = user.lastName || user.name.split(' ').slice(1).join(' ') || '';
            }
            if (profileEmail) {
                profileEmail.textContent = user.email || 'Email no disponible';
            }
            if (profilePrograma) {
                profilePrograma.textContent = user.program || 'Programa no especificado';
            }
            if (profileFecha) {
                profileFecha.textContent = user.registrationDate || 'Fecha no disponible';
            }
        }

        // Function to update the entire user interface
        function updateUserInterface() {
            updateProfileInfo();
            updateDashboardTable();
            updateTutoriasTable();
            updateDashboardStats();
        }

        // Helper function to get subject name from materia ID
        function GetIdFromName(materiaId) {
            if (!sessionData.subjects || !materiaId) return 'N/A';
            
            const materia = sessionData.subjects.find(m => m.materia_id === materiaId || m.id === materiaId);
            return materia ? (materia.nombre || materia.name || 'N/A') : 'N/A';
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
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 4000);
        }

        // Función para actualizar estadísticas del dashboard
        function updateDashboardStats() {
            if (!sessionData.tutoringSessions) return;
            
            // Handle both API data format (estado) and mock data format (status)
            const completedSessions = sessionData.tutoringSessions.filter(s => 
                (s.estado || s.status) === 'completada'
            ).length;
            
            const pendingSessions = sessionData.tutoringSessions.filter(s => 
                (s.estado || s.status) === 'confirmada' || (s.estado || s.status) === 'solicitada'
            ).length;
            
            const totalSessions = sessionData.tutoringSessions.length;
            
            // Update stat cards if they exist
            const statCards = document.querySelectorAll('.stat-card h3');
            if (statCards.length >= 3) {
                statCards[0].textContent = pendingSessions; // Próximas tutorías
                statCards[1].textContent = completedSessions; // Tutorías completadas
                statCards[2].textContent = totalSessions; // Total de tutorías
            }
            
            // Update individual stat elements by ID if they exist
            const statElements = {
                'proximas-tutorias': pendingSessions,
                'tutorias-completadas': completedSessions,
                'total-tutorias': totalSessions,
                'tasa-asistencia': totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) + '%' : '0%'
            };
            
            Object.entries(statElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
        }

        // Function to check for tutoring conflicts
function checkTutoringConflicts(fecha, hora) {
    const conflicts = sessionData.tutoringSessions.filter(tutoring => {
        if ((tutoring.estado || tutoring.status) === 'cancelada') return false;
        
        // Handle API data format vs mock data format
        const tutoringDate = tutoring.fecha || tutoring.date;
        let tutoringTimeStart;
        
        if (tutoring.horaInicio) {
            // API format (camelCase from JSON)
            tutoringTimeStart = tutoring.horaInicio;
        } else if (tutoring.hora_inicio) {
            // API format (snake_case if using different serialization)
            tutoringTimeStart = tutoring.hora_inicio;
        } else if (tutoring.time) {
            // Mock data format
            tutoringTimeStart = tutoring.time.split('-')[0];
        } else {
            return false; // No time data available
        }
        
        // Check if same date and overlapping time
        return tutoringDate === fecha && tutoringTimeStart === hora;
    });
    
    return conflicts.length > 0;
}

// Function to format tutoring request data for API
function formatTutoringRequestData(formData, estudianteId) {
    return {
        EstudianteID: estudianteId,
        ProgramaID: formData.programa,
        MateriaID: formData.materia,
        FechaPreferida: formData.fecha,
        HoraPreferida: formData.hora,
        SedeID: formData.lugar,
        Temas: formData.temas || '',
        Estado: 'solicitada',
        FechaSolicitud: new Date().toISOString().split('T')[0],
        Observaciones: ''
    };
}

// Function to load materias (subjects) from API - this is the main function used throughout the app
async function loadMaterias() {
    try {
        const response = await fetch(`${API_BASE_URL}/materias?nombres=true`);
        if (!response.ok) throw new Error('Failed to load materias');
        return await response.json();
    } catch (error) {
        console.error('Error loading materias:', error);
        // Return fallback materias if API fails
        return [
            { materia_id: 1, nombre: 'Cálculo I' },
            { materia_id: 2, nombre: 'Cálculo II' },
            { materia_id: 3, nombre: 'Cálculo III' },
            { materia_id: 4, nombre: 'Programación I' },
            { materia_id: 5, nombre: 'Álgebra Lineal' },
            { materia_id: 6, nombre: 'Algoritmos y Estructura de datos' },
            { materia_id: 7, nombre: 'Física I' }
        ];
    }
}

// Function to populate materia dropdown
async function populateMateriaDropdown() {
    const materiaSelect = document.getElementById('materia');
    const filtroMateriaSelect = document.getElementById('filtroMateriaModal');
    
    if (!materiaSelect) return;
    
    try {
        // Use the subjects already loaded in sessionData
        let materias = sessionData.subjects || [];
        
        // If no subjects loaded yet, try to load them
        if (materias.length === 0) {
            materias = await loadSubjects();
            sessionData.subjects = materias;
        }

        console.log('Materias for dropdown:', materias);
        
        // Clear existing options except the first placeholder
        while (materiaSelect.options.length > 1) {
            materiaSelect.remove(1);
        }
        
        if (filtroMateriaSelect) {
            while (filtroMateriaSelect.options.length > 1) {
                filtroMateriaSelect.remove(1);
            }
        }
        
        // Add materias to dropdown
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia.nombre || materia.Nombre;
            option.textContent = materia.nombre || materia.Nombre;
            materiaSelect.appendChild(option);
            
            // Also add to filter dropdown if it exists
            if (filtroMateriaSelect) {
                const filterOption = document.createElement('option');
                filterOption.value = materia.materia_id || materia.MateriaID;
                filterOption.textContent = materia.nombre || materia.Nombre;
                filtroMateriaSelect.appendChild(filterOption);
            }
        });
        
        console.log('Materias loaded successfully:', materias.length, 'materias');
    } catch (error) {
        console.error('Error populating materia dropdown:', error);
    }
}

// Function to load programas from API
async function loadProgramas() {
    try {
        const response = await fetch(`${API_BASE_URL}/programas`);
        if (!response.ok) throw new Error('Failed to load programas');
        return await response.json();
    } catch (error) {
        console.error('Error loading programas:', error);
        // Return fallback programas if API fails
        return [
            { id: 'matematicas', nombre: 'Matemáticas Aplicadas en Ciencias de la Computación' },
            { id: 'ingenieria', nombre: 'Ingeniería de Sistemas' },
            { id: 'fisica', nombre: 'Física' }
        ];
    }
}

// Function to load sedes from API
async function loadSedes() {
    try {
        const response = await fetch(`${API_BASE_URL}/sedes`);
        if (!response.ok) throw new Error('Failed to load sedes');
        return await response.json();
    } catch (error) {
        console.error('Error loading sedes:', error);
        // Return fallback sedes if API fails
        return [
            { id: 'sede-norte', nombre: 'Sede Norte' },
            { id: 'claustro', nombre: 'Claustro' },
            { id: 'mutis', nombre: 'Mutis' }
        ];
    }
}

// Function to populate programa dropdown
async function populateProgramaDropdown() {
    const programaSelect = document.getElementById('programa');
    if (!programaSelect) return;
    
    try {
        const programas = await loadProgramas();
        
        // Clear existing options except the first placeholder
        while (programaSelect.options.length > 1) {
            programaSelect.remove(1);
        }
        
        // Add programas to dropdown
        programas.forEach(programa => {
            const option = document.createElement('option');
            option.value = programa.id;
            option.textContent = programa.nombre;
            programaSelect.appendChild(option);
        });
        
        console.log('Programas loaded successfully:', programas.length, 'programas');
    } catch (error) {
        console.error('Error populating programa dropdown:', error);
    }
}

// Function to populate sede dropdown
async function populateSedeDropdown() {
    const sedeSelect = document.getElementById('lugar');
    if (!sedeSelect) return;
    
    try {
        const sedes = await loadSedes();
        
        // Clear existing options except the first placeholder
        while (sedeSelect.options.length > 1) {
            sedeSelect.remove(1);
        }
        
        // Add sedes to dropdown
        sedes.forEach(sede => {
            const option = document.createElement('option');
            option.value = sede.id;
            option.textContent = sede.nombre;
            sedeSelect.appendChild(option);
        });
        
        console.log('Sedes loaded successfully:', sedes.length, 'sedes');
    } catch (error) {
        console.error('Error populating sede dropdown:', error);
    }
}

// Event listeners
        document.addEventListener('DOMContentLoaded', async function() {
            // Initialize user data from session and API
            await initializeUserData();
            
            // Load and populate dropdowns from database
            await Promise.all([
                populateProgramaDropdown(),
                populateMateriaDropdown(),
                populateSedeDropdown()
            ]);
            
            // Configurar fecha mínima para solicitudes
            const fechaInput = document.getElementById('fecha');
            if (fechaInput) {
                const today = new Date().toISOString().split('T')[0];
                fechaInput.min = today;
            }

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

            // Manejar envío del formulario de solicitud
            const solicitudForm = document.getElementById('solicitudForm');
            if (solicitudForm) {
                solicitudForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const formData = {
                        programa: document.getElementById('programa').value,
                        materia: document.getElementById('materia').value,
                        fecha: document.getElementById('fecha').value,
                        hora: document.getElementById('hora').value,
                        lugar: document.getElementById('lugar').value,
                        temas: document.getElementById('temas').value
                    };
                    
                    // Validar campos requeridos
                    if (!formData.programa || !formData.materia || !formData.fecha || !formData.hora || !formData.lugar) {
                        showNotification('Por favor, completa todos los campos requeridos.', 'error');
                        return;
                    }
                    
                    // Validar que la fecha sea futura
                    const selectedDate = new Date(formData.fecha);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (selectedDate < today) {
                        showNotification('La fecha debe ser futura.', 'error');
                        return;
                    }
                    
                    // Validar que la fecha no sea más de 30 días en el futuro
                    const maxDate = new Date();
                    maxDate.setDate(maxDate.getDate() + 30);
                    if (selectedDate > maxDate) {
                        showNotification('No se pueden solicitar tutorías con más de 30 días de anticipación.', 'error');
                        return;
                    }
                    
                    // Validar que los temas no excedan 500 caracteres
                    if (formData.temas && formData.temas.length > 500) {
                        showNotification('Los temas no pueden exceder 500 caracteres.', 'error');
                        return;
                    }
                    
                    // Verificar conflictos con tutorías existentes
                    if (checkTutoringConflicts(formData.fecha, formData.hora)) {
                        showNotification('Ya tienes una tutoría programada para esa fecha y hora.', 'warning');
                        return;
                    }

                    // Check for tutoring conflicts
                    const horaFin = (parseInt(formData.hora.split(':')[0]) + 1).toString().padStart(2, '0') + ':00';
                    const conflicts = checkTutoringConflicts(formData.fecha, formData.hora.split(':')[0] + ':00');
                    if (conflicts) {
                        showNotification('Conflicto de horario: Ya tienes una tutoría solicitada a esta hora.', 'error');
                        return;
                    }

                    // Show loading state
                    const submitButton = solicitudForm.querySelector('button[type="submit"]');
                    const originalText = submitButton.innerHTML;
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
                    submitButton.disabled = true;
                    
                    try {
                        // Calculate hora_fin (1 hour after inicio)
                        const horaInicio = formData.hora;
                        const [hours, minutes] = horaInicio.split(':');
                        const horaFin = `${(parseInt(hours) + 1).toString().padStart(2, '0')}:${minutes}`;

                        // Find materia ID from loaded subjects
                        let materiaId = null;
                        if (sessionData.subjects && sessionData.subjects.length > 0) {
                            const selectedMateria = sessionData.subjects.find(m => m.nombre === formData.materia);
                            materiaId = selectedMateria ? selectedMateria.materia_id : null;
                        }

                        // Prepare API request data matching backend structure
                        const submitData = {
                            estudiante_id: parseInt(sessionData.currentUser.id),
                            tutor_id: 0, // System will automatically assign qualified and available tutor
                            materia_id: materiaId || 1, // Use found ID or fallback
                            fecha: formData.fecha,
                            hora_inicio: horaInicio,
                            hora_fin: horaFin,
                            estado: "solicitada",
                            lugar: formData.lugar
                        };

                        console.log('Submitting tutoring request:', submitData);

                        // Submit to API
                        const result = await submitTutoringRequest(submitData);
                        
                        if (result && result.tutoria_id) {
                            // Get the actual materia and sede names for display
                            const materiaName = formData.materia;
                            const sedeName = document.getElementById('lugar').options[document.getElementById('lugar').selectedIndex].text;
                            
                            // Add to local session data for immediate UI update
                            const newTutoring = {
                                tutoriaID: result.tutoria_id,
                                tutoria_id: result.tutoria_id,
                                id: result.tutoria_id,
                                materiaNombre: materiaName,
                                materia_nombre: materiaName,
                                subject: materiaName,
                                tutorNombre: result.tutorNombre || result.tutor_nombre || 'Tutor',
                                tutorApellido: result.tutorApellido || result.tutor_apellido || 'Asignado',
                                tutor_nombre: result.tutorNombre || result.tutor_nombre || 'Tutor',
                                tutor_apellido: result.tutorApellido || result.tutor_apellido || 'Asignado',
                                tutor: (result.tutorNombre && result.tutorApellido) 
                                    ? `${result.tutorNombre} ${result.tutorApellido}` 
                                    : (result.tutor_nombre && result.tutor_apellido) 
                                    ? `${result.tutor_nombre} ${result.tutor_apellido}` 
                                    : 'Sistema asignará automáticamente',
                                fecha: formData.fecha,
                                date: formData.fecha,
                                horaInicio: horaInicio,
                                horaFin: horaFin,
                                hora_inicio: horaInicio,
                                hora_fin: horaFin,
                                time: `${horaInicio}-${horaFin}`,
                                estado: 'solicitada',
                                status: 'solicitada',
                                lugar: sedeName,
                                location: sedeName,
                                temasTratados: formData.temas ? { String: formData.temas } : null,
                                temas_tratados: formData.temas ? { String: formData.temas } : null,
                                topics: formData.temas ? formData.temas.split(',').map(t => t.trim()) : [],
                                observaciones: '',
                                notes: ''
                            };
                            
                            sessionData.tutoringSessions.unshift(newTutoring);
                            updateUserInterface();
                            
                            showNotification('¡Solicitud de tutoría enviada exitosamente! Te notificaremos cuando sea confirmada.', 'success');
                            
                            // Clear form
                            solicitudForm.reset();
                            
                            // Switch to tutoring tab
                            showTab('tutorias');
                        } else {
                            // If tutoria_id is not present, it means there was an error or specific message from backend
                            const errorMessage = (result && (result.message || result.error)) || 'No se pudo crear la tutoría. Verifique los datos.';
                            throw new Error(errorMessage);
                        }
                    } catch (error) {
                        console.error('Error submitting tutoring request:', error);
                        // Display the error message from the backend, or a fallback generic message.
                        // error.message should contain the message from 'throw new Error(serverMessage)' in the 'else' block,
                        // or from an error thrown by submitTutoringRequest itself (e.g., network error, or HTTP 4xx/5xx).
                        const displayMessage = (error && typeof error.message === 'string' && error.message.trim() !== '')
                                             ? error.message
                                             : 'Error al enviar la solicitud. Por favor, inténtalo nuevamente o contacta a soporte si el problema persiste.';
                        showNotification(displayMessage, 'error');
                    } finally {
                        // Restore button state
                        submitButton.innerHTML = originalText;
                        submitButton.disabled = false;
                    }
                });
            }

            // Manejar envío del formulario de filtros
            const filtrosForm = document.getElementById('filtrosForm');
            if (filtrosForm) {
                filtrosForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    showNotification('Filtros aplicados correctamente', 'success');
                    closeModal('filtros');
                });
            }

            // Populate materia dropdowns
            await populateMateriaDropdown();
        });

        // Animación de entrada suave al cargar la página
        window.addEventListener('load', () => {
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.5s ease-in';
            setTimeout(() => {
                document.body.style.opacity = '1';
            }, 100);
        });

        // Efecto parallax suave en elementos flotantes
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const circles = document.querySelectorAll('.floating-circle');
            
            circles.forEach((circle, index) => {
                const speed = 0.5 + (index * 0.2);
                circle.style.transform = `translateY(${scrolled * speed}px)`;
            });
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

        // Actualizar estadísticas cada 30 segundos
        setInterval(updateDashboardStats, 30000);

        // Actualizar habilitación de botones cada minuto
        setInterval(() => {
            updateTutoriasTable();
            updateDashboardTable();
        }, 60000);

async function getTutorName(tutorId) {
   try {
        const response = await fetch(`${API_BASE_URL}/tutores/${tutorId}/nombre`);
        if (!response.ok) throw new Error('Failed to fetch tutor name');
        const data = await response.json()
        
        // API returns both Nombre and Apellido, combine them
        if (data.Nombre && data.Apellido) {
            return `${data.Nombre} ${data.Apellido}`;
        } else if (data.Nombre) {
            return data.Nombre;
        } else {
            return 'Tutor no encontrado';
        }
   } catch (error) {
        console.error('Error fetching tutor name:', error);
        return 'Tutor no encontrado';
    }
}