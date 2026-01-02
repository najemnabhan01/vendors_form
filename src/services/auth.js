import { StorageService } from './storage.js';

const SESSION_KEY = 'vendor_app_session';

export const AuthService = {
    login: (username, password) => {
        const users = StorageService.getUsers();
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
    },

    requireAuth: () => {
        const user = AuthService.getCurrentUser();
        if (!user) {
            // If we are not already on the login flow, maybe redirect or handle it in main
            return null;
        }
        return user;
    }
};
