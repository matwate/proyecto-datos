// Crear partículas animadas
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// API Authentication Configuration
const loginForm = document.getElementById('login-form');
const loginAlert = document.getElementById('login-alert');
const submitBtn = document.getElementById('submit-btn');
const navLoginBtns = document.getElementById('nav-login-btns');
const navUserInfo = document.getElementById('nav-user-info');
const userNameSpan = document.getElementById('user-name');

// API Configuration
const API_BASE_URL = 'https://matwa.tail013c29.ts.net/api/v1'; // Change to your API URL
const LOGIN_ENDPOINT = `${API_BASE_URL}/login/`;

// Request timeout configuration
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Create fetch with timeout
function fetchWithTimeout(url, options = {}) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
        )
    ]);
}

// Authentication function
async function authenticateUser(credentials) {

    var loginData = {
        correo: credentials.username,
        password: credentials.userType === 'admin' ? credentials.password : "",
        ti: credentials.userType !== 'admin' ? parseInt(credentials.password) : undefined,
    }


    try {
        const response = await fetchWithTimeout(`${LOGIN_ENDPOINT}${credentials.userType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        console.log('Response data:', data);

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        // Check if we got user data (not null)
        if (data && (data.data.EstudianteID || data.data.tutor.TutorID || data.data.AdminID)) {
            return {
                success: true,
                data: data
            };
        } else {
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function showAlert(message, type) {
    loginAlert.className = `alert alert-${type}`;
    loginAlert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
        ${message}
    `;
    loginAlert.classList.remove('hidden');
    
    setTimeout(() => {
        loginAlert.classList.add('hidden');
    }, 5000);
}

function setLoading(loading) {
    if (loading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Ingresar al Sistema';
    }
}

loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const userType = document.getElementById('user-type').value;
    
    // Basic validation
    if (!username || !password || !userType) {
        showAlert('Por favor, completa todos los campos.', 'danger');
        return;
    }
    
    setLoading(true);
    
    try {
        const credentials = {
            username: username,
            password: password,
            userType: userType
        };
        
        const result = await authenticateUser(credentials);
        
        if (result) {
            showAlert('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
            
            setTimeout(() => {
                // Update UI for successful login
                const userData = result.data;
                const displayName = userData.Nombre + ' ' + userData.Apellido;
                console.log('User data:', userData);


                userNameSpan.textContent = displayName;
                navLoginBtns.classList.add('hidden');
                navUserInfo.classList.remove('hidden');
                document.getElementById('login-screen').style.display = 'none';
                
                // Optional: Store user data in localStorage for session
                localStorage.setItem('userSession', JSON.stringify({
                    user: userData,
                    loginTime: Date.now()
                }));
                
                // Optional: Redirect based on user type
                const redirectUrls = {
                    'estudiante': 'user.html',
                    'tutor': 'tutor.html',
                    'admin': 'iniciosesion.html'
                };
                
                if (redirectUrls[userType]) {
                    window.location.href = redirectUrls[userType];
                }
            }, 1500);
        } else {
            let errorMessage = 'Error de autenticación. Por favor, verifica tus credenciales.';
            
            // Handle specific error messages
            if (result.error.includes('timeout')) {
                errorMessage = 'Error de profile-programaconexión. Verifica tu conexión a internet e inténtalo nuevamente.';
            } else if (result.error.includes('401') || result.error.includes('Invalid credentials')) {
                errorMessage = 'Credenciales incorrectas. Verifica tu usuario y contraseña.';
            } else if (result.error.includes('403')) {
                errorMessage = 'No tienes permisos para acceder con este tipo de usuario.';
            }
            
            showAlert(errorMessage, 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Error inesperado. Por favor, intenta nuevamente.', 'danger');
    } finally {
        setLoading(false);
    }
});

// Cerrar sesión
document.getElementById('logout-btn').addEventListener('click', function() {
    // Clear session storage
    localStorage.removeItem('userSession');
    
    navUserInfo.classList.add('hidden');
    navLoginBtns.classList.remove('hidden');
    document.getElementById('login-screen').style.display = 'block';
    loginForm.reset();
    showAlert('Sesión cerrada correctamente.', 'success');
});

// Efectos de interacción
document.querySelectorAll('.form-group input, .form-group select').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

// Inicializar partículas al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    
    // Animación de entrada suave
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in';
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Efecto parallax suave para las formas geométricas
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const shapes = document.querySelectorAll('.geometric-shape');
    
    shapes.forEach((shape, index) => {
        const speed = 0.5 + (index * 0.2);
        shape.style.transform += ` translateY(${scrolled * speed}px)`;
    });
});
