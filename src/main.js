import { AuthService } from './services/auth.js';
import { LoginView } from './views/login.js';
import { AdminView } from './views/admin.js';
import { FormView } from './views/form.js';

const app = document.getElementById('app');

function renderApp() {
    const user = AuthService.getCurrentUser();

    app.innerHTML = '';

    if (!user) {
        // Show Login
        app.innerHTML = LoginView.render();
        LoginView.attachEvents((loggedInUser) => {
            renderApp(); // Re-render after login
        });
        return;
    }

    if (user.role === 'admin') {
        // Show Admin Panel
        app.innerHTML = AdminView.render();
        AdminView.attachEvents(renderApp); // Pass renderApp to refresh after actions
    } else {
        // Show Vendor Form
        app.innerHTML = FormView.render();
        FormView.attachEvents(renderApp);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', renderApp);
