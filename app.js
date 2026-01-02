/**
 * Vendor App - Single File Version
 * Merged to support file:// protocol without CORS errors
 */

// Initialize Namespaces
const App = {
    Services: {},
    Views: {},
    State: {
        filterStart: '',
        filterEnd: ''
    }
};

// ==========================================
// SERVICE: Storage
// ==========================================
(function () {
    const STORAGE_KEY = 'vendor_app_data';

    // Initial Data - Only used on first run
    const INITIAL_DATA = {
        users: [
            { username: 'admin', password: '123', role: 'admin', name: 'Administrador' },
            { username: 'juan', password: '123', role: 'vendor', name: 'Juan Pérez' }
        ],
        clients: [
            { name: 'Tech Solutions', contact: 'Carlos Gomez', phone: '3001234567', type: 'Recurrente' },
            { name: 'Restaurante El Sabor', contact: 'Maria Rodriguez', phone: '3109876543', type: 'Nuevo' }
        ],
        reports: []
    };

    function getData() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
            return INITIAL_DATA;
        }
        return JSON.parse(data);
    }

    function saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    App.Services.Storage = {
        getUsers: () => getData().users,

        addUser: (user) => {
            const data = getData();
            if (data.users.some(u => u.username === user.username)) {
                throw new Error('El usuario ya existe');
            }
            data.users.push(user);
            saveData(data);
        },

        updatePassword: (username, newPassword) => {
            const data = getData();
            const userIndex = data.users.findIndex(u => u.username === username);
            if (userIndex === -1) throw new Error('Usuario no encontrado');

            data.users[userIndex].password = newPassword;
            saveData(data);
        },

        getClients: () => getData().clients,

        addClient: (client) => {
            const data = getData();
            data.clients.push(client);
            saveData(data);
        },

        findClient: (query) => {
            const clients = getData().clients;
            const lowerQuery = query.toLowerCase();
            return clients.filter(c =>
                c.name.toLowerCase().includes(lowerQuery) ||
                c.contact.toLowerCase().includes(lowerQuery)
            );
        },

        checkDuplicateContact: (phone) => {
            const clients = getData().clients;
            return clients.find(c => c.phone === phone);
        },

        getReports: () => getData().reports,

        addReport: (report) => {
            const data = getData();
            data.reports.push({
                ...report,
                id: Date.now(),
                timestamp: new Date().toISOString()
            });

            const exists = data.clients.some(c => c.name === report.empresa);
            if (!exists) {
                data.clients.push({
                    name: report.empresa,
                    contact: report.nombre_cliente,
                    phone: report.contacto,
                    type: report.tipo_cliente || 'Nuevo'
                });
            }
            saveData(data);
        }
    };
})();

// ==========================================
// SERVICE: Auth
// ==========================================
(function () {
    const SESSION_KEY = 'vendor_app_session';

    App.Services.Auth = {
        login: (username, password) => {
            const users = App.Services.Storage.getUsers();
            const user = users.find(u => u.username === username && u.password === password);

            if (user) {
                localStorage.setItem(SESSION_KEY, JSON.stringify(user));
                return user;
            }
            return null;
        },

        logout: () => {
            localStorage.removeItem(SESSION_KEY);
            window.location.reload();
        },

        getCurrentUser: () => {
            const session = localStorage.getItem(SESSION_KEY);
            return session ? JSON.parse(session) : null;
        }
    };
})();

// ==========================================
// VIEW: Login
// ==========================================
App.Views.Login = {
    render: () => {
        return `
            <div class="login-wrapper">
                <div class="vendor-form login-form" style="max-width: 400px; margin: 0 auto;">
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

            const user = App.Services.Auth.login(username, password);
            if (user) {
                onLoginSuccess(user);
            } else {
                const errorDiv = document.getElementById('loginError');
                errorDiv.style.display = 'block';
            }
        });
    }
};

// ==========================================
// VIEW: Admin
// ==========================================
App.Views.Admin = {
    filters: { start: '', end: '' },

    getFilteredReports: () => {
        const reports = App.Services.Storage.getReports();
        return reports.filter(r => {
            if (App.Views.Admin.filters.start && r.fecha < App.Views.Admin.filters.start) return false;
            if (App.Views.Admin.filters.end && r.fecha > App.Views.Admin.filters.end) return false;
            return true;
        });
    },

    exportToCSV: () => {
        const reports = App.Views.Admin.getFilteredReports();
        if (reports.length === 0) {
            alert('No hay datos para exportar en las fechas seleccionadas.');
            return;
        }

        const headers = ['Asesor', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Empresa', 'Cliente', 'Contacto', 'Actividad', 'Descripcion', 'Observaciones', 'Monto', 'Factura', 'Cobranza'];
        const csvContent = [
            headers.join(','),
            ...reports.map(r => [
                r.asesor, r.fecha, r.hora_inicio, r.hora_fin,
                `"${r.empresa}"`, `"${r.nombre_cliente}"`, r.contacto,
                r.tipo_actividad, `"${r.descripcion}"`, `"${r.observaciones}"`,
                r.monto, r.factura, r.cobranza ? 'Si' : 'No'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'reporte_ventas_' + new Date().toISOString().split('T')[0] + '.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    render: () => {
        const users = App.Services.Storage.getUsers();
        // Filter reports
        const reports = App.Views.Admin.getFilteredReports();

        const userRows = users.map(u => `
            <tr>
                <td>${u.username}</td>
                <td>${u.name}</td>
                <td>${u.role}</td>
                <td>
                    <button class="btn-sm btn-password" data-username="${u.username}" style="padding: 4px 8px; font-size: 0.8rem; background: #e2e8f0; border: none; border-radius: 4px; cursor: pointer;">
                        Cambiar Clave
                    </button>
                </td>
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
                    <h3>Gestión de Usuarios</h3>
                    <div class="form-grid">
                         <!-- Create User -->
                        <form id="createVendorForm" class="inline-form" style="display:contents;">
                            <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); grid-column: span 2;">
                                <h4 style="margin-bottom:10px;">Crear Nuevo Usuario</h4>
                                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                    <input type="text" id="newUsername" placeholder="Usuario" required style="flex:1;">
                                    <input type="password" id="newPassword" placeholder="Contraseña" required style="flex:1;">
                                    <input type="text" id="newName" placeholder="Nombre completo" required style="flex:2;">
                                    <button type="submit" class="btn-primary" style="width: auto;">Crear</button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="table-responsive" style="margin-top: 10px; background: white; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <table style="width:100%">
                            <thead>
                                <tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Acciones</th></tr>
                            </thead>
                            <tbody id="usersTableBody">${userRows}</tbody>
                        </table>
                    </div>
                </div>

                <div class="dashboard-section">
                    <h3>Reporte de Actividades</h3>
                    
                    <!-- Filters -->
                    <div class="filters-bar" style="background: white; padding: 16px; border-radius: 12px; margin-bottom: 16px; display: flex; gap: 16px; align-items: end; flex-wrap: wrap;">
                        <div style="flex: 1;">
                            <label style="font-size: 0.8rem;">Fecha Inicio</label>
                            <input type="date" id="filterStart" value="${App.Views.Admin.filters.start}">
                        </div>
                         <div style="flex: 1;">
                            <label style="font-size: 0.8rem;">Fecha Fin</label>
                            <input type="date" id="filterEnd" value="${App.Views.Admin.filters.end}">
                        </div>
                        <button id="btnExport" class="btn-primary" style="width: auto; background-color: #059669;">
                            Descargar Excel/CSV
                        </button>
                    </div>

                    <div class="dashboard-card" style="padding: 10px;">
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
                                    ${reportRows.length ? reportRows : '<tr><td colspan="6" style="text-align:center; color: #888;">No hay reportes en este rango de fechas</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Modals could go here, simply sticking to prompt alerts for password change for simplicity -->
            </div>
        `;
    },

    attachEvents: (renderApp) => {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            App.Services.Auth.logout();
        });

        // Date Filters
        const startInput = document.getElementById('filterStart');
        const endInput = document.getElementById('filterEnd');

        const updateFilters = () => {
            App.Views.Admin.filters.start = startInput.value;
            App.Views.Admin.filters.end = endInput.value;
            renderApp(); // Re-render to show filtered data
        }

        startInput.addEventListener('change', updateFilters);
        endInput.addEventListener('change', updateFilters);

        // Export
        document.getElementById('btnExport').addEventListener('click', () => {
            App.Views.Admin.exportToCSV();
        });

        // Create User
        document.getElementById('createVendorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const newUser = {
                    username: document.getElementById('newUsername').value,
                    password: document.getElementById('newPassword').value,
                    name: document.getElementById('newName').value,
                    role: 'vendor' // Default role
                };
                App.Services.Storage.addUser(newUser);
                alert('Usuario creado exitosamente');
                renderApp();
            } catch (err) {
                alert(err.message);
            }
        });

        // Pswd Change (Event Delegation)
        document.querySelectorAll('.btn-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.getAttribute('data-username');
                const newPass = prompt(`Ingrese nueva contraseña para ${username}:`);
                if (newPass) {
                    try {
                        App.Services.Storage.updatePassword(username, newPass);
                        alert('Contraseña actualizada');
                    } catch (err) {
                        alert(err.message);
                    }
                }
            });
        });
    }
};

// ==========================================
// VIEW: Form
// ==========================================
App.Views.Form = {
    render: () => {
        const user = App.Services.Auth.getCurrentUser();
        const today = new Date().toISOString().split('T')[0];

        return `
            <header class="form-header" style="position: relative;">
                <h1>Reporte de Visita</h1>
                <p>Bienvenido, <strong>${user.name}</strong></p>
                <button id="logoutBtn" style="position: absolute; top: 0; right: 0; background: none; border: none; color: var(--primary-color); cursor: pointer; font-weight: 600;">Cerrar Sesión</button>
            </header>

            <form id="vendorForm" class="vendor-form">
                <fieldset>
                    <legend>Información</legend>
                    <div class="form-group">
                        <label>Nombre del Asesor</label>
                        <input type="text" value="${user.name}" readonly  style="background-color: #e2e8f0; cursor: not-allowed;">
                        <input type="hidden" name="asesor" value="${user.name}">
                    </div>
                    <div class="form-group">
                        <label for="fecha">Fecha</label>
                        <input type="date" id="fecha" name="fecha" value="${today}" required>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>Horario</legend>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="hora_inicio">Inicio</label>
                            <input type="time" id="hora_inicio" name="hora_inicio" required>
                        </div>
                        <div class="form-group">
                            <label for="hora_fin">Fin</label>
                            <input type="time" id="hora_fin" name="hora_fin" required>
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>Datos del Cliente</legend>
                    <div class="form-group" style="position: relative;">
                        <label for="empresa">Empresa</label>
                        <input type="text" id="empresa" name="empresa" required placeholder="Buscar o escribir nombre..." autocomplete="off">
                        <div id="suggestions" class="autocomplete-items"></div>
                    </div>
                    <div class="form-group">
                        <label for="nombre_cliente">Contacto</label>
                        <input type="text" id="nombre_cliente" name="nombre_cliente" required placeholder="Persona de contacto">
                    </div>
                     <div class="form-group">
                        <label for="tipo_cliente">Tipo de Cliente</label>
                        <input type="text" id="tipo_cliente" name="tipo_cliente" placeholder="Ej. Nuevo, Recurrente">
                    </div>
                    <div class="form-group">
                        <label for="contacto">Teléfono</label>
                        <input type="tel" id="contacto" name="contacto" pattern="[0-9]*" inputmode="numeric" required>
                        <small id="duplicateAlert" style="color: #eab308; display: none; font-weight: bold; margin-top: 5px;">⚠ Este número ya existe en el sistema</small>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>Detalles</legend>
                    <div class="form-group radio-group">
                        <div class="radio-options">
                            <label class="radio-container">
                                <input type="radio" name="tipo_actividad" value="visita" checked>
                                <span class="radio-custom"></span> Visita
                            </label>
                            <label class="radio-container">
                                <input type="radio" name="tipo_actividad" value="capacitacion">
                                <span class="radio-custom"></span> Capacitación
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <textarea name="descripcion" rows="3" placeholder="Descripción de la actividad..."></textarea>
                    </div>
                     <div class="form-group">
                        <textarea name="observaciones" rows="2" placeholder="Observaciones..."></textarea>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>Venta y Cobro</legend>
                    <div class="form-group">
                        <label for="monto">Monto Facturado</label>
                        <div class="input-wrapper">
                            <span class="currency-symbol">$</span>
                            <input type="number" name="monto" min="0" step="0.01" placeholder="0.00">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="factura">No. Factura</label>
                        <input type="text" name="factura" placeholder="Ej. A-1234 (Si hubo venta)">
                    </div>
                    <div class="form-group" style="margin-top: 15px;">
                        <label class="radio-container">
                            <input type="checkbox" name="cobranza">
                            <span class="check-custom" style="display:inline-block; width:20px; height:20px; border: 2px solid #cbd5e1; vertical-align:middle; margin-right:8px; border-radius: 4px;"></span>
                            ¿Realizó Cobranza?
                        </label>
                    </div>
                </fieldset>

                <div class="form-actions">
                    <button type="submit" class="btn-submit">Enviar Reporte</button>
                </div>
            </form>
        `;
    },

    attachEvents: (renderApp) => {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            App.Services.Auth.logout();
        });

        // Autocomplete
        const empresaInput = document.getElementById('empresa');
        const suggestionsDiv = document.getElementById('suggestions');

        empresaInput.addEventListener('input', (e) => {
            const val = e.target.value;
            suggestionsDiv.innerHTML = '';
            if (val.length < 2) return;

            const matches = App.Services.Storage.findClient(val);
            if (matches.length > 0) {
                matches.forEach(client => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-item';
                    div.innerHTML = `<strong>${client.name}</strong> - ${client.contact}`;
                    div.addEventListener('click', () => {
                        document.getElementById('empresa').value = client.name;
                        document.getElementById('nombre_cliente').value = client.contact;
                        document.getElementById('contacto').value = client.phone;
                        document.getElementById('tipo_cliente').value = client.type;
                        suggestionsDiv.innerHTML = '';
                    });
                    suggestionsDiv.appendChild(div);
                });
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target !== empresaInput) {
                suggestionsDiv.innerHTML = '';
            }
        });

        // Duplicate
        const contactInput = document.getElementById('contacto');
        contactInput.addEventListener('blur', (e) => {
            const val = e.target.value;
            if (val && App.Services.Storage.checkDuplicateContact(val)) {
                document.getElementById('duplicateAlert').style.display = 'block';
            } else {
                document.getElementById('duplicateAlert').style.display = 'none';
            }
        });

        // Submit
        document.getElementById('vendorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const report = Object.fromEntries(formData.entries());
            report.cobranza = e.target.querySelector('[name="cobranza"]').checked;

            try {
                App.Services.Storage.addReport(report);
                alert('Reporte enviado con éxito');
                e.target.reset();
                document.querySelector('[name="asesor"]').value = App.Services.Auth.getCurrentUser().name;
            } catch (err) {
                alert('Error al guardar: ' + err.message);
            }
        });
    }
};

// ==========================================
// CONTROLLER: Main
// ==========================================
function renderApp() {
    const app = document.getElementById('app');
    const user = App.Services.Auth.getCurrentUser();

    app.innerHTML = '';

    if (!user) {
        app.innerHTML = App.Views.Login.render();
        App.Views.Login.attachEvents((loggedInUser) => {
            renderApp();
        });
        return;
    }

    if (user.role === 'admin') {
        app.innerHTML = App.Views.Admin.render();
        App.Views.Admin.attachEvents(renderApp);
    } else {
        app.innerHTML = App.Views.Form.render();
        App.Views.Form.attachEvents(renderApp);
    }
}

// Start
document.addEventListener('DOMContentLoaded', renderApp);
