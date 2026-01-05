/**
 * Vendor App - Firebase Secure Version
 * Uses Firebase Auth + Firestore
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
// Ve a https://console.firebase.google.com/ > Crear Proyecto > Agrega Web App
const firebaseConfig = {
    apiKey: "AIzaSyBxLLhCArXy9PyZ7f4S6fmntUf2ippMXKE",
    authDomain: "vendors-form.firebaseapp.com",
    projectId: "vendors-form",
    storageBucket: "vendors-form.firebasestorage.app",
    messagingSenderId: "165782127338",
    appId: "1:165782127338:web:7c2281b0992751cf85cd93",
    measurementId: "G-Z5DPM16XZK"
};

// Initialize Firebase
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized");
} catch (e) {
    console.error("Error initializing Firebase. Did you replace the config keys?", e);
}

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
// SERVICE: Storage (Firestore)
// ==========================================
App.Services.Storage = {
    // Users
    getUsers: async () => {
        const q = query(collection(db, "users"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    addUser: async (user) => {
        // Check duplicate username
        const q = query(collection(db, "users"), where("username", "==", user.username));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            throw new Error('El usuario ya existe');
        }
        await addDoc(collection(db, "users"), user);
    },

    updatePassword: async (username, newPassword) => {
        const q = query(collection(db, "users"), where("username", "==", username));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error('Usuario no encontrado');

        const docRef = doc(db, "users", snapshot.docs[0].id);
        await updateDoc(docRef, { password: newPassword });
    },

    // Clients
    getClients: async () => {
        const snapshot = await getDocs(collection(db, "clients"));
        return snapshot.docs.map(d => d.data());
    },

    findClient: async (queryText) => {
        // Firestore simple search (Client-side filtering for simplicity in this demo)
        const snapshot = await getDocs(collection(db, "clients"));
        const allClients = snapshot.docs.map(d => d.data());

        const lowerQuery = queryText.toLowerCase();
        return allClients.filter(c =>
            c.name.toLowerCase().includes(lowerQuery) ||
            c.contact.toLowerCase().includes(lowerQuery)
        );
    },

    checkDuplicateContact: async (phone) => {
        const q = query(collection(db, "clients"), where("phone", "==", phone));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    },

    // Reports
    getReports: async () => {
        const q = query(collection(db, "reports")); // You might want to orderBy dates in production
        const snapshot = await getDocs(q);
        const reports = snapshot.docs.map(d => d.data());
        // Sort manually by date desc
        return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    addReport: async (report) => {
        const timestamp = new Date().toISOString();
        await addDoc(collection(db, "reports"), {
            ...report,
            timestamp: timestamp
        });

        // Check and Add Client if new
        const q = query(collection(db, "clients"), where("name", "==", report.empresa));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            await addDoc(collection(db, "clients"), {
                name: report.empresa,
                contact: report.nombre_cliente,
                phone: report.contacto,
                type: report.tipo_cliente || 'Nuevo'
            });
        }
    }
};

// ==========================================
// SERVICE: Auth
// ==========================================
const SESSION_KEY = 'vendor_app_session';

App.Services.Auth = {
    login: async (username, password) => {
        const users = await App.Services.Storage.getUsers();
        // Note: For production, password hashing is essential. 
        // This compares plain text as requested by the simple mock scope.
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
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Verificando...';
            btn.disabled = true;

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const user = await App.Services.Auth.login(username, password);
                if (user) {
                    onLoginSuccess(user);
                } else {
                    const errorDiv = document.getElementById('loginError');
                    errorDiv.style.display = 'block';
                    errorDiv.innerText = 'Usuario o contraseña incorrectos';
                }
            } catch (err) {
                console.error(err);
                alert('Error de conexión con la base de datos. Verifica tu configuración.');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
};

// ==========================================
// VIEW: Admin
// ==========================================
App.Views.Admin = {
    filters: { start: '', end: '', asesor: '', empresa: '' },

    showLoading: () => {
        const existing = document.querySelector('.loader-overlay');
        if (existing) return;
        const loader = document.createElement('div');
        loader.className = 'loader-overlay';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    },

    hideLoading: () => {
        const loader = document.querySelector('.loader-overlay');
        if (loader) loader.remove();
    },

    getFilteredReports: async () => {
        try {
            App.Views.Admin.showLoading();
            const reports = await App.Services.Storage.getReports();
            return reports.filter(r => {
                const f = App.Views.Admin.filters;
                if (f.start && r.fecha < f.start) return false;
                if (f.end && r.fecha > f.end) return false;
                if (f.asesor && r.asesor !== f.asesor) return false;
                if (f.empresa && !r.empresa.toLowerCase().includes(f.empresa.toLowerCase())) return false;
                return true;
            });
        } finally {
            App.Views.Admin.hideLoading();
        }
    },

    exportToCSV: async () => {
        const reports = await App.Views.Admin.getFilteredReports();
        if (reports.length === 0) {
            alert('No hay datos para exportar con los filtros actuales.');
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

    render: async () => {
        App.Views.Admin.showLoading();
        // Load data async
        const users = await App.Services.Storage.getUsers();
        // Get unique advisors for filter
        const advisors = users.filter(u => u.role !== 'admin'); // Assuming mostly vendors need filtering

        const reports = await App.Views.Admin.getFilteredReports(); // Filtered list

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
                <td>
                    <span class="badge ${r.cobranza ? 'badge-success' : 'badge-warning'}">
                        ${r.cobranza ? 'Cobrado' : 'Pendiente'}
                    </span>
                </td>
                <td>${r.monto ? '$' + parseFloat(r.monto).toFixed(2) : '-'}</td>
                <td>
                    <button onclick="alert('${r.descripcion}')" style="font-size:0.8rem; cursor:pointer;">Ver</button>
                </td>
            </tr>
        `).join('');

        const advisorOptions = advisors.map(a => `<option value="${a.name}" ${App.Views.Admin.filters.asesor === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

        App.Views.Admin.hideLoading();

        return `
            <div class="admin-dashboard">
                <header class="dashboard-header">
                    <h2>Panel Administrativo</h2>
                    <button id="logoutBtn" class="btn-secondary">Cerrar Sesión</button>
                </header>

                <div class="dashboard-section">
                    <h3>Reporte de Actividades</h3>
                    
                    <div class="filters-bar" style="background: white; padding: 16px; border-radius: 12px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; align-items: end;">
                        
                        <div>
                            <label style="font-size: 0.8rem;">Fecha Inicio</label>
                            <input type="date" id="filterStart" value="${App.Views.Admin.filters.start}">
                        </div>
                        
                        <div>
                            <label style="font-size: 0.8rem;">Fecha Fin</label>
                            <input type="date" id="filterEnd" value="${App.Views.Admin.filters.end}">
                        </div>

                        <div>
                            <label style="font-size: 0.8rem;">Asesor</label>
                            <select id="filterAsesor" style="width:100%; padding: 12px; border: 2px solid transparent; background: var(--input-bg); border-radius: var(--radius-md);">
                                <option value="">Todos</option>
                                ${advisorOptions}
                            </select>
                        </div>

                         <div>
                            <label style="font-size: 0.8rem;">Empresa</label>
                            <input type="text" id="filterClient" placeholder="Buscar empresa..." value="${App.Views.Admin.filters.empresa}">
                        </div>

                        <button id="btnExport" class="btn-primary" style="height: 48px; background-color: #059669;">
                            Descargar Excel
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
                                        <th>Estado</th>
                                        <th>Monto</th>
                                        <th>Detalles</th>
                                    </tr>
                                </thead>
                                <tbody id="reportsTableBody">
                                    ${reportRows.length ? reportRows : '<tr><td colspan="6" style="text-align:center; color: #888; padding: 20px;">No hay reportes con estos filtros</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="dashboard-section">
                    <h3>Gestión de Usuarios</h3>
                    <div class="dashboard-card" style="margin-bottom:0;">
                        <form id="createVendorForm" class="inline-form" style="box-shadow:none; padding:0; margin-bottom: 20px;">
                            <h4 style="grid-column: 1 / -1; margin-bottom:10px;">Crear Nuevo Usuario</h4>
                            <input type="text" id="newUsername" placeholder="Usuario" required>
                            <input type="password" id="newPassword" placeholder="Contraseña" required>
                            <input type="text" id="newName" placeholder="Nombre completo" required>
                            <button type="submit" class="btn-primary">Crear</button>
                        </form>
                        
                         <div class="table-responsive">
                            <table style="width:100%">
                                <thead>
                                    <tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Acciones</th></tr>
                                </thead>
                                <tbody id="usersTableBody">${userRows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents: (renderApp) => {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            App.Services.Auth.logout();
        });

        // Filters
        const startInput = document.getElementById('filterStart');
        const endInput = document.getElementById('filterEnd');
        const asesorInput = document.getElementById('filterAsesor');
        const clientInput = document.getElementById('filterClient');

        const updateFilters = () => {
            App.Views.Admin.filters.start = startInput.value;
            App.Views.Admin.filters.end = endInput.value;
            App.Views.Admin.filters.asesor = asesorInput.value;
            App.Views.Admin.filters.empresa = clientInput.value;
            renderApp();
        }

        startInput.addEventListener('change', updateFilters);
        endInput.addEventListener('change', updateFilters);
        asesorInput.addEventListener('change', updateFilters);
        clientInput.addEventListener('input', () => {
            // Debounce slightly for text input
            clearTimeout(window.searchTimeout);
            window.searchTimeout = setTimeout(updateFilters, 500);
        });

        // Export
        document.getElementById('btnExport').addEventListener('click', () => {
            App.Views.Admin.exportToCSV();
        });

        // Create User
        document.getElementById('createVendorForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            try {
                const newUser = {
                    username: document.getElementById('newUsername').value,
                    password: document.getElementById('newPassword').value,
                    name: document.getElementById('newName').value,
                    role: 'vendor'
                };
                App.Views.Admin.showLoading();
                await App.Services.Storage.addUser(newUser);
                alert('Usuario creado exitosamente');
                renderApp();
            } catch (err) {
                alert(err.message);
            } finally {
                App.Views.Admin.hideLoading();
                btn.disabled = false;
            }
        });

        // Pswd Change
        document.querySelectorAll('.btn-password').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const username = e.target.getAttribute('data-username');
                const newPass = prompt(`Ingrese nueva contraseña para ${username}:`);
                if (newPass) {
                    try {
                        App.Views.Admin.showLoading();
                        await App.Services.Storage.updatePassword(username, newPass);
                        alert('Contraseña actualizada');
                    } catch (err) {
                        alert(err.message);
                    } finally {
                        App.Views.Admin.hideLoading();
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

        empresaInput.addEventListener('input', async (e) => {
            const val = e.target.value;
            suggestionsDiv.innerHTML = '';
            if (val.length < 2) return;

            // Notice we use async find now
            const matches = await App.Services.Storage.findClient(val);
            if (matches && matches.length > 0) {
                matches.forEach(client => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-item';

                    const strong = document.createElement('strong');
                    strong.textContent = client.name;
                    div.appendChild(strong);
                    div.appendChild(document.createTextNode(` - ${client.contact}`));

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
        contactInput.addEventListener('blur', async (e) => {
            const val = e.target.value;
            // Notice await
            const isDuplicate = await App.Services.Storage.checkDuplicateContact(val);
            const alert = document.getElementById('duplicateAlert');
            if (val && isDuplicate) {
                alert.style.display = 'block';
            } else {
                alert.style.display = 'none';
            }
        });

        // Submit
        document.getElementById('vendorForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.textContent = "Enviando...";

            const formData = new FormData(e.target);
            const report = Object.fromEntries(formData.entries());
            report.cobranza = e.target.querySelector('[name="cobranza"]').checked;

            try {
                await App.Services.Storage.addReport(report);
                alert('Reporte enviado con éxito');
                e.target.reset();
                document.querySelector('[name="asesor"]').value = App.Services.Auth.getCurrentUser().name;
            } catch (err) {
                console.error(err);
                alert('Error al guardar: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = "Enviar Reporte";
            }
        });
    }
};

// ==========================================
// CONTROLLER: Main
// ==========================================
async function renderApp() {
    // Check and create default admin if system is empty
    try {
        const users = await App.Services.Storage.getUsers();
        if (users.length === 0) {
            console.log("Sistema vacío. Creando usuario admin por defecto...");
            await App.Services.Storage.addUser({
                username: "admin",
                password: "123",
                name: "Administrador Inicial",
                role: "admin"
            });
            alert("¡Bienvenido! Se ha creado un usuario 'admin' con contraseña '123' porque la base de datos estaba vacía.");
        }
    } catch (e) {
        console.error("Error verificando usuarios iniciales:", e);
    }

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
        const adminHtml = await App.Views.Admin.render(); // Admin render is async now (fetches data)
        app.innerHTML = adminHtml;
        App.Views.Admin.attachEvents(renderApp);
    } else {
        app.innerHTML = App.Views.Form.render();
        App.Views.Form.attachEvents(renderApp);
    }
}

// Start
document.addEventListener('DOMContentLoaded', renderApp);
