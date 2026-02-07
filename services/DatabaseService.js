/**
 * DatabaseService - Gerencia persistência local e backups
 */
class DatabaseService {
    constructor() {
        this.STORAGE_KEY_LOGS = 'jiuconnect_logs';
        this.STORAGE_KEY_USER = 'jiuconnect_user';
        this.STORAGE_KEY_TOURNAMENTS = 'jiuconnect_tournaments';
    }

    // --- Logs ---
    getLogs() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY_LOGS)) || [];
    }

    saveLog(log) {
        const logs = this.getLogs();
        logs.unshift(log);
        localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(logs));
        return logs;
    }

    deleteLog(id) {
        let logs = this.getLogs();
        logs = logs.filter(log => log.id !== id);
        localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(logs));
        return logs;
    }

    // --- User ---
    getUser() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY_USER));
    }

    saveUser(user) {
        localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(user));
    }

    clearUser() {
        localStorage.removeItem(this.STORAGE_KEY_USER);
    }

    // --- Tournaments ---
    getTournaments() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY_TOURNAMENTS)) || [];
    }

    saveTournament(tournament) {
        const tourns = this.getTournaments();
        tourns.unshift(tournament);
        localStorage.setItem(this.STORAGE_KEY_TOURNAMENTS, JSON.stringify(tourns));
        return tourns;
    }

    // --- Backup & Restore ---
    exportData() {
        const data = {
            logs: this.getLogs(),
            user: this.getUser(),
            tournaments: this.getTournaments(),
            version: '1.0',
            exportedAt: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    }

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.logs || !data.user) {
                throw new Error('Formato de arquivo inválido.');
            }

            localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(data.logs || []));
            localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(data.user || null));
            localStorage.setItem(this.STORAGE_KEY_TOURNAMENTS, JSON.stringify(data.tournaments || []));
            return true;
        } catch (e) {
            console.error('Erro ao importar:', e);
            return false;
        }
    }
}
