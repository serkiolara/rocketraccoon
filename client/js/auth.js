document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const messageDiv = document.getElementById('auth-message');

    // Manejar Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        const response = await fetch('../server/auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'login',
                username, 
                password 
            })
        });

        const result = await response.json();
        handleAuthResponse(result);
    });

    // Manejar Registro
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        
        if (password !== confirm) {
            showMessage("Las contraseñas no coinciden", "error");
            return;
        }

        const response = await fetch('../server/auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'register',
                username, 
                password 
            })
        });

        const result = await response.json();
        handleAuthResponse(result);
    });

    function handleAuthResponse(result) {
        if (result.status === 'success') {
            // Guardar usuario en sessionStorage
            sessionStorage.setItem('user', JSON.stringify(result.user));
            // Redirigir al lobby
            window.location.href = 'lobby.html';
        } else {
            showMessage(result.message, "error");
        }
    }

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        
        if (type === "error") {
            messageDiv.style.backgroundColor = "#ff6b6b";
        } else {
            messageDiv.style.backgroundColor = "#4CAF50";
        }
    }
});