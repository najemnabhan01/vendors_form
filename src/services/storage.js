const STORAGE_KEY = 'vendor_app_data';

// Initial Mock Data
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

export const StorageService = {
    getUsers: () => getData().users,
    
    addUser: (user) => {
        const data = getData();
        // Check if username exists
        if (data.users.some(u => u.username === user.username)) {
            throw new Error('El usuario ya existe');
        }
        data.users.push(user);
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
        
        // Auto-save new client if not exists (simple logic)
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
