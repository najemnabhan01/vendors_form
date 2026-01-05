/**
 * Vendor App - Firestore Custom Auth Version
 * Secure enough for internal tools, Zero Configuration required
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Initialize Firebase (Only Firestore, No Auth Service needed)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SESSION_KEY = 'vendor_app_session_v2';

// ==========================================
// UTILS
// ==========================================
const Utils = {
    // Simple hash for passwords (basic security to avoid plain text)
    hash: async (string) => {
        const msgBuffer = new TextEncoder().encode(string);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

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
// SERVICES
// ==========================================
const App = {
    Services: {},
    Views: {},
    State: {
        currentUser: null,
        filters: { start: '', end: '', asesor: '', empresa: '' }
    }
};

App.Services.Auth = {
    // Custom Login Logic using Firestore
    login: async (email, password) => {
        // 1. Hash password to match stored hash
        const passwordHash = await Utils.hash(password);

        // 2. Query User
        const q = query(collection(db, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error("Usuario no encontrado.");
        }

        const userData = snapshot.docs[0].data();

        // 3. Verify Password
        if (userData.password !== passwordHash) {
            throw new Error("Contraseña incorrecta.");
        }

        // 4. Save Session
        const sessionUser = {
            email: userData.email,
            name: userData.name,
            role: userData.role,
            id: snapshot.docs[0].id
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        App.State.currentUser = sessionUser;
        return sessionUser;
    },

    logout: () => {
        localStorage.removeItem(SESSION_KEY);
        window.location.reload();
    },

    getCurrentUser: () => {
        const session = localStorage.getItem(SESSION_KEY);
        const user = session ? JSON.parse(session) : null;
        App.State.currentUser = user;
        return user;
    },

    // Register method for Admin to use
    registerUser: async (newUser) => {
        // Check duplicate
        const q = query(collection(db, "users"), where("email", "==", newUser.email));
        const snap = await getDocs(q);
        if (!snap.empty) throw new Error("El correo ya existe.");

        // Hash pwd
        const hashedPassword = await Utils.hash(newUser.password);

        await addDoc(collection(db, "users"), {
            ...newUser,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        });
    },

    updateUserPassword: async (email, newPassword) => {
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const docRef = snap.docs[0].ref;
            const hashedPassword = await Utils.hash(newPassword);
            await updateDoc(docRef, { password: hashedPassword });
        }
    }
};

App.Services.Storage = {
    // Users
    getUsers: async () => {
        const snap = await getDocs(collection(db, "users"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Reports
    getReports: async () => {
        const q = query(collection(db, "reports"));
        const snap = await getDocs(q);
        const reports = snap.docs.map(d => d.data());
        return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    addReport: async (report) => {
        await addDoc(collection(db, "reports"), {
            ...report, timestamp: new Date().toISOString()
        });

        // Auto-save client if new
        const q = query(collection(db, "clients"), where("name", "==", report.empresa));
        const snap = await getDocs(q);
        if (snap.empty) {
            await addDoc(collection(db, "clients"), {
                name: report.empresa,
                contact: report.nombre_cliente,
                phone: report.contacto,
                type: report.tipo_cliente || 'Nuevo'
            });
        }
    },

    // Clients
    findClient: async (text) => {
        const snap = await getDocs(collection(db, "clients"));
        const all = snap.docs.map(d => d.data());
        return all.filter(c => c.name.toLowerCase().includes(text.toLowerCase()));
    }
};

// ==========================================
// VIEWS
// ==========================================

App.Views.Login = {
    render: () => `
        <div class="login-wrapper">
            <div class="vendor-form login-form" style="max-width: 400px; margin: 0 auto;">
                <h1>Iniciar Sesión</h1>
                <p>Sistema de Reportes</p>
                <form id="loginForm">
                    <div class="form-group">
                        <label>Correo</label>
                        <input type="email" id="email" required placeholder="admin@app.com" autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label>Contraseña</label>
                        <input type="password" id="password" required placeholder="******" autocomplete="current-password">
                    </div>
                    <button type="submit" class="btn-submit">Ingresar</button>
                </form>
            </div>
        </div>
    `,
    attachEvents: (render) => {
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            Utils.showLoading();
            try {
                await App.Services.Auth.login(
                    document.getElementById('email').value.trim(),
                    document.getElementById('password').value
                );
                render();
            } catch (err) {
                alert(err.message);
            } finally {
                Utils.hideLoading();
            }
        });
    }
};

App.Views.Admin = {
    render: async (user) => {
        Utils.showLoading();
        const reports = await App.Services.Storage.getReports();
        const users = await App.Services.Storage.getUsers();

        // Filter Logic
        const f = App.State.filters;
        const filtered = reports.filter(r => {
            if (f.start && r.fecha < f.start) return false;
            if (f.end && r.fecha > f.end) return false;
            if (f.asesor && r.asesor !== f.asesor) return false;
            if (f.empresa && !r.empresa.toLowerCase().includes(f.empresa.toLowerCase())) return false;
            return true;
        });

        const reportRows = filtered.map(r => `
            <tr>
                <td>${r.asesor}</td>
                <td>${r.fecha}</td>
                <td>${r.empresa}</td>
                <td><span class="badge ${r.cobranza ? 'badge-success' : 'badge-warning'}">${r.cobranza ? 'Cobrado' : 'Pendiente'}</span></td>
                <td>${r.monto ? '$' + r.monto : '-'}</td>
            </tr>`).join('');

        const userRows = users.map(u => `
            <tr>
                <td>${u.email}</td>
                <td>${u.name}</td>
                <td>${u.role}</td>
                <td><button class="btn-sm btn-pass" data-email="${u.email}">Cambiar Clave</button></td>
            </tr>`).join('');

        const advisors = users.filter(u => u.role !== 'admin').map(u => `<option value="${u.name}">${u.name}</option>`).join('');

        Utils.hideLoading();

        return `
            <div class="admin-dashboard">
                <header class="dashboard-header">
                    <h2>Panel Admin</h2>
                    <button id="logoutBtn" class="btn-secondary">Salir</button>
                </header>
                
                <div class="dashboard-section">
                    <h3>Reportes</h3>
                    <div class="filters-bar" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
                        <input type="date" id="fStart" value="${f.start}">
                        <input type="date" id="fEnd" value="${f.end}">
                        <select id="fAsesor"><option value="">Todos los Asesores</option>${advisors}</select>
                        <input type="text" id="fClient" placeholder="Buscar empresa..." value="${f.empresa}">
                    </div>
                    <div class="dashboard-card table-responsive">
                        <table>
                            <thead><tr><th>Asesor</th><th>Fecha</th><th>Empresa</th><th>Estado</th><th>Monto</th></tr></thead>
                            <tbody>${reportRows || '<tr><td colspan="5">Sin datos</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>

                <div class="dashboard-section">
                    <h3>Usuarios</h3>
                    <div class="dashboard-card">
                        <form id="addUserForm" class="inline-form" style="display:grid; grid-template-columns: 1fr 1fr 1fr auto; gap:10px; margin-bottom:15px;">
                            <input type="email" id="newEmail" placeholder="Email" required>
                            <input type="password" id="newPass" placeholder="Clave" required>
                            <input type="text" id="newName" placeholder="Nombre" required>
                            <button type="submit" class="btn-primary">Crear</button>
                        </form>
                        <div class="table-responsive">
                            <table style="width:100%"><thead><tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Acciones</th></tr></thead><tbody>${userRows}</tbody></table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    attachEvents: (render) => {
        document.getElementById('logoutBtn').onclick = App.Services.Auth.logout;

        // Filter Events
        ['fStart', 'fEnd', 'fAsesor', 'fClient'].forEach(id => {
            document.getElementById(id).onchange = (e) => {
                const key = id === 'fAsesor' ? 'asesor' : id === 'fClient' ? 'empresa' : id === 'fStart' ? 'start' : 'end';
                App.State.filters[key] = e.target.value;
                render();
            };
        });

        // Add User
        document.getElementById('addUserForm').onsubmit = async (e) => {
            e.preventDefault();
            Utils.showLoading();
            try {
                await App.Services.Auth.registerUser({
                    email: document.getElementById('newEmail').value,
                    password: document.getElementById('newPass').value,
                    name: document.getElementById('newName').value,
                    role: 'vendor'
                });
                alert('Usuario creado');
                render();
            } catch (err) { alert(err.message); }
            finally { Utils.hideLoading(); }
        };

        // Change Pass
        document.querySelectorAll('.btn-pass').forEach(btn => {
            btn.onclick = async () => {
                const mail = btn.dataset.email;
                const newP = prompt(`Nueva clave para ${mail}:`);
                if (newP) {
                    await App.Services.Auth.updateUserPassword(mail, newP);
                    alert("Clave actualizada");
                }
            };
        });
    }
};

App.Views.Form = {
    render: (user) => `
        <header class="form-header" style="display:flex; justify-content:space-between;">
            <div><h1>Reporte</h1><p>${user.name}</p></div>
            <button id="logoutBtn" style="background:none; border:none; color:var(--primary-color);">Salir</button>
        </header>
        <form id="vendorForm" class="vendor-form">
            <div class="form-group"><label>Fecha</label><input type="date" name="fecha" value="${new Date().toISOString().split('T')[0]}" required></div>
            <div class="form-grid">
                <div class="form-group"><label>Inicio</label><input type="time" name="hora_inicio" required></div>
                <div class="form-group"><label>Fin</label><input type="time" name="hora_fin" required></div>
            </div>
            <div class="form-group" style="position:relative">
                <label>Empresa</label><input type="text" id="empresa" name="empresa" required autocomplete="off">
                <div id="suggestions" class="autocomplete-items"></div>
            </div>
            <div class="form-group"><label>Contacto</label><input type="text" id="nombre_cliente" name="nombre_cliente" required></div>
            <div class="form-group"><label>Teléfono</label><input type="tel" id="contacto" name="contacto" required></div>
            <div class="form-group"><label>Actividad: </label> <label><input type="radio" name="tipo_actividad" value="visita" checked> Visita</label> <label><input type="radio" name="tipo_actividad" value="capacitacion"> Capacitacion</label></div>
            <div class="form-group"><textarea name="descripcion" placeholder="Detalles..." rows="3"></textarea></div>
             <div class="form-grid">
                <input type="number" name="monto" placeholder="Monto $" step="0.01">
                <input type="text" name="factura" placeholder="Factura #">
            </div>
             <div style="margin-top:10px">
                <label><input type="checkbox" name="cobranza"> Cobranza Realizada</label>
            </div>
            <button type="submit" class="btn-submit">Enviar</button>
        </form>
    `,
    attachEvents: (render, user) => {
        document.getElementById('logoutBtn').onclick = App.Services.Auth.logout;

        const form = document.getElementById('vendorForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.asesor = user.name;
            data.cobranza = form.querySelector('[name="cobranza"]').checked;

            Utils.showLoading();
            try {
                await App.Services.Storage.addReport(data);
                alert("Reporte Enviado");
                form.reset();
                form.querySelector('[name="fecha"]').value = new Date().toISOString().split('T')[0];
            } catch (e) { alert(e.message); }
            finally { Utils.hideLoading(); }
        };

        const empInput = document.getElementById('empresa');
        const sugg = document.getElementById('suggestions');
        empInput.oninput = async (e) => {
            if (e.target.value.length < 2) { sugg.innerHTML = ''; return; }
            const clients = await App.Services.Storage.findClient(e.target.value);
            sugg.innerHTML = clients.map(c => `<div class="autocomplete-item" onclick="document.getElementById('empresa').value='${c.name}';document.getElementById('nombre_cliente').value='${c.contact}';document.getElementById('contacto').value='${c.phone}';document.getElementById('suggestions').innerHTML=''"><strong>${c.name}</strong></div>`).join('');
        };
    }
};

// ==========================================
// MAIN CONTROLLER
// ==========================================
async function renderApp() {
    const app = document.getElementById('app');
    const user = App.Services.Auth.getCurrentUser();

    // AUTO-BOOTSTRAP ADMIN
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        if (usersSnap.empty) {
            console.log("Bootstraping Admin...");
            const passHash = await Utils.hash("admin123");
            await addDoc(collection(db, "users"), {
                email: "admin@vendors.com",
                name: "Super Admin",
                password: passHash,
                role: "admin",
                createdAt: new Date().toISOString()
            });
            alert("⚠️ PRIMER INICIO\n\nUsuario Admin Creado Automáticamente:\nEmail: admin@vendors.com\nClave: admin123");
        }
    } catch (e) {
        if (e.code === 'permission-denied') {
            console.warn("Bloqueado por reglas de seguridad. Configura Firestore para permitir lectura.");
        } else {
            console.error("Auto-init error", e);
        }
    }

    if (!user) {
        app.innerHTML = App.Views.Login.render();
        App.Views.Login.attachEvents(renderApp);
    } else {
        if (user.role === 'admin') {
            app.innerHTML = await App.Views.Admin.render(user);
            App.Views.Admin.attachEvents(renderApp);
        } else {
            app.innerHTML = App.Views.Form.render(user);
            App.Views.Form.attachEvents(renderApp, user);
        }
    }
}

renderApp();
```
