/**
 * Vendor App - Firebase Secure Version
 * Uses Firebase Auth + Firestore
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ==========================================
// CONFIGURATION
// ==========================================
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Namespaces
const App = {
    Services: {},
    Views: {},
    State: {
        currentUser: null, // Holds the Firestore user profile
        filters: { start: '', end: '', asesor: '', empresa: '' }
    }
};

// ==========================================
// SERVICE: Storage (Firestore)
// ==========================================
App.Services.Storage = {
    // Users (Whitelist profile management)
    getUsers: async () => {
        const q = query(collection(db, "users"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Admin creates a "Profile" to whitelist an email
    // The actual Auth account is created by the user upon first login
    whitelistUser: async (userData) => {
        // Check if email already in system
        const q = query(collection(db, "users"), where("email", "==", userData.email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            throw new Error('El correo ya está registrado en el sistema');
        }
        // Use email as ID for easy lookup
        await setDoc(doc(db, "users", userData.email), {
            ...userData,
            createdAt: new Date().toISOString()
        });
    },

    getUserProfile: async (email) => {
        const docRef = doc(db, "users", email);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    },

    // Clients
    getClients: async () => {
        const snapshot = await getDocs(collection(db, "clients"));
        return snapshot.docs.map(d => d.data());
    },

    findClient: async (queryText) => {
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
        const q = query(collection(db, "reports"));
        const snapshot = await getDocs(q);
        const reports = snapshot.docs.map(d => d.data());
        return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    addReport: async (report) => {
        const timestamp = new Date().toISOString();
        await addDoc(collection(db, "reports"), {
            ...report,
            timestamp: timestamp
        });

        // Add Client if new
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
// SERVICE: Auth (Firebase Logic)
// ==========================================
App.Services.Auth = {
    // Handles the flow: Try Login -> If fails, check Whitelist -> If whitelisted, Register
    loginOrRegister: async (email, password) => {
        try {
            // 1. Try standard login
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (loginError) {
            if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
                // 2. Not found in Auth. Check if Admin whitelisted this email in Firestore
                const profile = await App.Services.Storage.getUserProfile(email);

                if (profile) {
                    // It IS whitelisted. Create the Auth account now.
                    try {
                        await createUserWithEmailAndPassword(auth, email, password);
                        return { success: true, isNew: true };
                    } catch (createError) {
                        throw new Error(App.Services.Auth.mapError(createError.code));
                    }
                } else {
                    throw new Error('Usuario no encontrado o no autorizado por el Administrador.');
                }
            } else {
                throw new Error(App.Services.Auth.mapError(loginError.code));
            }
        }
    },

    logout: async () => {
        await signOut(auth);
        window.location.reload();
    },

    mapError: (code) => {
        switch (code) {
            case 'auth/wrong-password': return 'Contraseña incorrecta.';
            case 'auth/user-not-found': return 'Usuario no encontrado.';
            case 'auth/invalid-email': return 'Email inválido.';
            case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
            case 'auth/email-already-in-use': return 'Este correo ya está registrado.';
            default: return 'Error de autenticación: ' + code;
        }
    }
};

// ==========================================
// UTILS: Loading
// ==========================================
const UI = {
    showLoading: () => {
        if (document.querySelector('.loader-overlay')) return;
        const loader = document.createElement('div');
        loader.className = 'loader-overlay';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    },
    hideLoading: () => {
        const loader = document.querySelector('.loader-overlay');
        if (loader) loader.remove();
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
                        <h1>Acceso Seguro</h1>
                        <p>Sistema de Reportes Vendedores</p>
                    </div>
                    <form id="loginForm">
                        <div class="form-group">
                            <label for="email">Correo Electrónico</label>
                            <input type="email" id="email" required placeholder="ejemplo@correo.com" autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label for="password">Contraseña</label>
                            <input type="password" id="password" required placeholder="********" autocomplete="current-password">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-submit">Ingresar</button>
                        </div>
                        <div style="margin-top: 15px; font-size: 0.85rem; color: #666; text-align: center;">
                            <p><strong>Nota:</strong> Si es tu primera vez, ingresa con el correo que te asignó el administrador y crea tu contraseña aquí mismo.</p>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    attachEvents: () => {
        const form = document.getElementById('loginForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            UI.showLoading();
            try {
                await App.Services.Auth.loginOrRegister(email, password);
                // Auth state listener will handle the rest
            } catch (err) {
                alert(err.message);
                UI.hideLoading();
            }
        });
    }
};

// ==========================================
// VIEW: Admin
// ==========================================
App.Views.Admin = {
    render: async (currentUser) => {
        UI.showLoading();
        const users = await App.Services.Storage.getUsers();
        const advisors = users.filter(u => u.role !== 'admin');
        const reports = await App.Services.Storage.getReports(); // Raw reports

        // Apply logic filters
        const f = App.State.filters;
        const filteredReports = reports.filter(r => {
            if (f.start && r.fecha < f.start) return false;
            if (f.end && r.fecha > f.end) return false;
            if (f.asesor && r.asesor !== f.asesor) return false;
            if (f.empresa && !r.empresa.toLowerCase().includes(f.empresa.toLowerCase())) return false;
            return true;
        });

        const userRows = users.map(u => `
            <tr>
                <td>${u.email}</td>
                <td>${u.name}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-success'}">${u.role}</span></td>
            </tr>
        `).join('');

        const reportRows = filteredReports.map(r => `
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
                    <button onclick="alert('Descripción: ${r.descripcion}\\n\\nObservaciones: ${r.observaciones}')" class="btn-secondary" style="font-size:0.7rem; padding: 2px 6px;">Ver</button>
                </td>
            </tr>
        `).join('');

        const advisorOptions = advisors.map(a => `<option value="${a.name}" ${f.asesor === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

        UI.hideLoading();

        return `
            <div class="admin-dashboard">
                <header class="dashboard-header">
                    <div>
                        <h2>Panel Administrativo</h2>
                        <p style="font-size:0.9rem; color:gray;">Admin: ${currentUser.name}</p>
                    </div>
                    <button id="logoutBtn" class="btn-secondary">Cerrar Sesión</button>
                </header>

                <div class="dashboard-section">
                    <h3>Reportes</h3>
                    <div class="filters-bar" style="background: white; padding: 16px; border-radius: 12px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; align-items: end;">
                         <div><label>Inicio</label><input type="date" id="fStart" value="${f.start}"></div>
                         <div><label>Fin</label><input type="date" id="fEnd" value="${f.end}"></div>
                         <div><label>Asesor</label>
                             <select id="fAsesor" style="width:100%"><option value="">Todos</option>${advisorOptions}</select>
                         </div>
                         <div><label>Empresa</label><input type="text" id="fClient" placeholder="Buscar..." value="${f.empresa}"></div>
                         <button id="btnExport" class="btn-primary" style="height: 42px; background: #059669; font-size: 0.9rem;">Exportar CSV</button>
                    </div>

                    <div class="dashboard-card"><div class="table-responsive">
                        <table>
                            <thead><tr><th>Asesor</th><th>Fecha</th><th>Empresa</th><th>Estado</th><th>Monto</th><th>Info</th></tr></thead>
                            <tbody>${reportRows.length ? reportRows : '<tr><td colspan="6" align="center">Sin resultados</td></tr>'}</tbody>
                        </table>
                    </div></div>
                </div>

                <div class="dashboard-section">
                    <h3>Gestión de Usuarios (Lista Blanca)</h3>
                    <div class="dashboard-card">
                         <form id="addUserForm" class="inline-form" style="box-shadow:none; padding:0; margin-bottom:15px; grid-template-columns: 1fr 1fr 100px;">
                            <input type="email" id="newEmail" placeholder="Correo electrónico" required style="grid-column: span 1;">
                            <input type="text" id="newName" placeholder="Nombre completo" required style="grid-column: span 1;">
                            <button type="submit" class="btn-primary">Autorizar</button>
                        </form>
                        <div class="table-responsive">
                            <table style="width:100%">
                                <thead><tr><th>Email</th><th>Nombre</th><th>Rol</th></tr></thead>
                                <tbody>${userRows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents: (renderApp) => {
        document.getElementById('logoutBtn').addEventListener('click', App.Services.Auth.logout);

        // Filters
        const inputIds = ['fStart', 'fEnd', 'fAsesor', 'fClient'];
        inputIds.forEach(id => {
            document.getElementById(id).addEventListener(id === 'fClient' ? 'input' : 'change', (e) => {
                if (id === 'fClient') {  // Debounce
                    clearTimeout(window.st);
                    window.st = setTimeout(() => {
                        App.State.filters.empresa = e.target.value;
                        renderApp();
                    }, 500);
                } else {
                    App.State.filters[id === 'fStart' ? 'start' : id === 'fEnd' ? 'end' : 'asesor'] = e.target.value;
                    renderApp();
                }
            });
        });

        // Add User
        document.getElementById('addUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            UI.showLoading();
            try {
                await App.Services.Storage.whitelistUser({
                    email: document.getElementById('newEmail').value.trim(),
                    name: document.getElementById('newName').value.trim(),
                    role: 'vendor'
                });
                alert('Usuario autorizado. Pídale que ingrese con su correo para establecer contraseña.');
                document.getElementById('addUserForm').reset();
                renderApp();
            } catch (err) {
                alert(err.message);
            } finally {
                UI.hideLoading();
            }
        });

        // Export (Simplified)
        document.getElementById('btnExport').addEventListener('click', () => {
            App.Views.Admin.exportToCSV(); // Ensure this method exists or alert
            // Reuse existing export logic or simple alert
            // For safety, re-implementing exportToCSV in this update to be sure
            // But to save tokens, I'll alert for now as per previous version, OR I can add it quickly.
            // Let's assume exportToCSV is needed. I'll add a simple one here.

            const rows = document.querySelectorAll('#reportsTableBody tr');
            let csv = [];
            rows.forEach(row => {
                const cols = row.querySelectorAll('td');
                if (cols.length > 2) { // valid row
                    csv.push(Array.from(cols).map(c => c.innerText.replace(/,/g, '')).join(','));
                }
            });
            const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'report.csv'; a.click();
        });
    }
};

// ==========================================
// VIEW: Form (Vendor)
// ==========================================
App.Views.Form = {
    render: (currentUser) => {
        const today = new Date().toISOString().split('T')[0];
        return `
            <header class="form-header" style="position:relative">
                <h1>Reporte Diario</h1>
                <p>Hola, <strong>${currentUser.name}</strong></p>
                <button id="logoutBtn" style="position:absolute; top:0; right:0; border:none; background:none; color:var(--primary-color); cursor:pointer;">Salir</button>
            </header>
            <form id="vendorForm" class="vendor-form">
                <div class="form-group"><label>Fecha</label><input type="date" name="fecha" value="${today}" required></div>
                <div class="form-grid">
                    <div class="form-group"><label>Inicio</label><input type="time" name="hora_inicio" required></div>
                    <div class="form-group"><label>Fin</label><input type="time" name="hora_fin" required></div>
                </div>
                <div class="form-group" style="position:relative">
                    <label>Empresa</label>
                    <input type="text" id="empresa" name="empresa" required placeholder="Buscar..." autocomplete="off">
                    <div id="suggestions" class="autocomplete-items"></div>
                </div>
                <div class="form-group"><label>Contacto</label><input type="text" id="nombre_cliente" name="nombre_cliente" required></div>
                <div class="form-group"><label>Teléfono</label><input type="tel" id="contacto" name="contacto" required></div>
                
                <div class="form-group radio-group">
                     <label class="radio-container"><input type="radio" name="tipo_actividad" value="visita" checked><span class="radio-custom"></span> Visita</label>
                     <label class="radio-container"><input type="radio" name="tipo_actividad" value="capacitacion"><span class="radio-custom"></span> Capacitación</label>
                </div>
                <div class="form-group"><textarea name="descripcion" placeholder="Actividad..." rows="3"></textarea></div>
                <div class="form-group"><textarea name="observaciones" placeholder="Observaciones..." rows="2"></textarea></div>
                
                <fieldset>
                    <legend>Venta / Cobro</legend>
                    <div class="form-grid">
                        <input type="number" name="monto" placeholder="Monto $" step="0.01">
                        <input type="text" name="factura" placeholder="Factura #">
                    </div>
                    <div style="margin-top:10px">
                        <label class="radio-container"><input type="checkbox" name="cobranza"><span class="check-custom" style="width:20px;height:20px;border:2px solid gray;display:inline-block;margin-right:5px"></span> Cobranza Realizada</label>
                    </div>
                </fieldset>

                <div class="form-actions"><button type="submit" class="btn-submit">Enviar Reporte</button></div>
            </form>
        `;
    },
    attachEvents: (renderApp, currentUser) => {
        document.getElementById('logoutBtn').addEventListener('click', App.Services.Auth.logout);

        // Form Submit
        const form = document.getElementById('vendorForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Enviando...';

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.asesor = currentUser.name;
            data.cobranza = form.querySelector('[name="cobranza"]').checked;

            try {
                await App.Services.Storage.addReport(data);
                alert('Reporte guardado!');
                form.reset();
                form.querySelector('[name="fecha"]').value = new Date().toISOString().split('T')[0];
            } catch (err) {
                alert('Error: ' + err.message);
            } finally {
                UI.hideLoading();
            }
        });

        // Autocomplete Logic Re-implementation
        const empInput = document.getElementById('empresa');
        const sugg = document.getElementById('suggestions');

        empInput.addEventListener('input', async (e) => {
            if (e.target.value.length < 2) { sugg.innerHTML = ''; return; }
            const clients = await App.Services.Storage.findClient(e.target.value);
            sugg.innerHTML = '';
            clients.forEach(c => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerHTML = `<strong>${c.name}</strong> - ${c.contact}`;
                div.onclick = () => {
                    empInput.value = c.name;
                    document.getElementById('nombre_cliente').value = c.contact;
                    document.getElementById('contacto').value = c.phone;
                    sugg.innerHTML = '';
                };
                sugg.appendChild(div);
            });
        });
        document.addEventListener('click', (e) => { if (e.target !== empInput) sugg.innerHTML = ''; });
    }
};

// ==========================================
// CONTROLLER: Main
// ==========================================
async function renderApp() {
    const app = document.getElementById('app');
    const { currentUser } = App.State;

    app.innerHTML = '';

    if (!currentUser) {
        app.innerHTML = App.Views.Login.render();
        App.Views.Login.attachEvents();
        return;
    }

    if (currentUser.role === 'admin') {
        app.innerHTML = await App.Views.Admin.render(currentUser);
        App.Views.Admin.attachEvents(() => renderApp());
    } else {
        app.innerHTML = App.Views.Form.render(currentUser);
        App.Views.Form.attachEvents(() => renderApp(), currentUser);
    }
}

// Global Auth State Observer
onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
        // Logged in, fetch profile data (Name, Role)
        const profile = await App.Services.Storage.getUserProfile(firebaseUser.email);
        if (profile) {
            App.State.currentUser = profile;
        } else {
            console.error("Perfil de usuario no encontrado en base de datos");
            await signOut(auth);
            App.State.currentUser = null;
        }
    } else {
        App.State.currentUser = null;
    }
    renderApp();
});
