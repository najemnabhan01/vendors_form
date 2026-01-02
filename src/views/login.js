import { AuthService } from '../services/auth.js';

export const LoginView = {
    render: () => {
        return `
            <div class="login-wrapper">
                <div class="vendor-form login-form">
                    <div class="form-header">
                        <h1>Iniciar Sesión</h1>
                        <p>Ingrese sus credenciales para continuar</p>
                    </div>
                    <form id="loginForm">
                        <div class="form-group">
                            <label for="username">Usuario</label>
                            <input type="text" id="username" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Contraseña</label>
                            <input type="password" id="password" required>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-submit">Ingresar</button>
                        </div>
                        <div id="loginError" class="error-message" style="display:none; color: red; margin-top: 10px; text-align: center;">
                            Usuario o contraseña incorrectos
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    attachEvents: (onLoginSuccess) => {
        const form = document.getElementById('loginForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            const user = AuthService.login(username, password);
            if (user) {
                onLoginSuccess(user);
            } else {
                const errorDiv = document.getElementById('loginError');
                errorDiv.style.display = 'block';
            }
        });
    }
};
