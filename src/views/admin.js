import { StorageService } from '../services/storage.js';
import { AuthService } from '../services/auth.js';

export const AdminView = {
    render: () => {
        const users = StorageService.getUsers();
        const reports = StorageService.getReports();

        const userRows = users.map(u => `
            <tr>
                <td>${u.username}</td>
                <td>${u.name}</td>
                <td>${u.role}</td>
            </tr>
        `).join('');

        const reportRows = reports.map(r => `
            <tr>
                <td>${r.asesor}</td>
                <td>${r.fecha}</td>
                <td>${r.empresa}</td>
                <td>${r.tipo_actividad}</td>
                <td>${r.monto ? '$' + r.monto : '-'}</td>
                <td>${r.cobranza ? 'Sí' : 'No'}</td>
            </tr>
        `).join('');

        return `
            <div class="admin-dashboard">
                <header class="dashboard-header">
                    <h2>Panel Administrativo</h2>
                    <button id="logoutBtn" class="btn-secondary">Cerrar Sesión</button>
                </header>

                <div class="dashboard-section">
                    <h3>Crear Nuevo Vendedor</h3>
                    <form id="createVendorForm" class="inline-form">
                        <input type="text" id="newUsername" placeholder="Usuario" required>
                        <input type="password" id="newPassword" placeholder="Contraseña" required>
                        <input type="text" id="newName" placeholder="Nombre completo" required>
                        <button type="submit" class="btn-primary">Crear</button>
                    </form>
                </div>

                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <h3>Usuarios</h3>
                        <div class="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Nombre</th>
                                        <th>Rol</th>
                                    </tr>
                                </thead>
                                <tbody id="usersTableBody">
                                    ${userRows}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="dashboard-card">
                        <h3>Reportes Recientes</h3>
                        <div class="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Asesor</th>
                                        <th>Fecha</th>
                                        <th>Empresa</th>
                                        <th>Tipo</th>
                                        <th>Monto</th>
                                        <th>Cobranza</th>
                                    </tr>
                                </thead>
                                <tbody id="reportsTableBody">
                                    ${reportRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents: (renderApp) => {
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            AuthService.logout();
        });

        // Create Vendor
        document.getElementById('createVendorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const newUser = {
                    username: document.getElementById('newUsername').value,
                    password: document.getElementById('newPassword').value,
                    name: document.getElementById('newName').value,
                    role: 'vendor'
                };
                StorageService.addUser(newUser);
                alert('Vendedor creado exitosamente');
                // Re-render to show new user
                renderApp();
            } catch (err) {
                alert(err.message);
            }
        });
    }
};
