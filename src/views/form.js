import { StorageService } from '../services/storage.js';
import { AuthService } from '../services/auth.js';

export const FormView = {
    render: () => {
        const user = AuthService.getCurrentUser();
        const today = new Date().toISOString().split('T')[0];

        return `
            <header class="form-header" style="position: relative;">
                <h1>Reporte de Visita</h1>
                <p>Bienvenido, <strong>${user.name}</strong></p>
                <button id="logoutBtn" style="position: absolute; top: 0; right: 0; background: none; border: none; color: var(--primary-color); cursor: pointer;">Cerrar Sesión</button>
            </header>

            <form id="vendorForm" class="vendor-form">
                <!-- Información del Asesor (Auto-filled) -->
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

                <!-- Horario -->
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

                <!-- Datos del Cliente (Smart) -->
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
                        <small id="duplicateAlert" style="color: #eab308; display: none;">⚠ Este número ya existe en el sistema</small>
                    </div>
                </fieldset>

                <!-- Detalles -->
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

                <!-- Facturación y Cobranza (New) -->
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
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            AuthService.logout();
        });

        // Autocomplete Logic
        const empresaInput = document.getElementById('empresa');
        const suggestionsDiv = document.getElementById('suggestions');

        empresaInput.addEventListener('input', (e) => {
            const val = e.target.value;
            suggestionsDiv.innerHTML = '';
            if (val.length < 2) return;

            const matches = StorageService.findClient(val);
            if (matches.length > 0) {
                matches.forEach(client => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-item';
                    div.innerHTML = `<strong>${client.name}</strong> - ${client.contact}`;
                    div.addEventListener('click', () => {
                        // Autofill
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

        // Close suggestions on click outside
        document.addEventListener('click', (e) => {
            if (e.target !== empresaInput) {
                suggestionsDiv.innerHTML = '';
            }
        });

        // Duplicate Check
        const contactInput = document.getElementById('contacto');
        contactInput.addEventListener('blur', (e) => {
            const val = e.target.value;
            if (val && StorageService.checkDuplicateContact(val)) {
                document.getElementById('duplicateAlert').style.display = 'block';
            } else {
                document.getElementById('duplicateAlert').style.display = 'none';
            }
        });

        // Form Submit
        document.getElementById('vendorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const report = Object.fromEntries(formData.entries());

            // Handle Checkbox manual check (checkboxes are weird in FormData if unchecked)
            report.cobranza = e.target.querySelector('[name="cobranza"]').checked;

            try {
                StorageService.addReport(report);
                alert('Reporte enviado con éxito');
                e.target.reset();
                // Reset Read-only name
                document.querySelector('[name="asesor"]').value = AuthService.getCurrentUser().name;
            } catch (err) {
                alert('Error al guardar: ' + err.message);
            }
        });
    }
};
