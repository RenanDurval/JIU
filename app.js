/**
 * JIUConnect - Core Logic
 */

const JIUConnect = {
    data: {
        tournaments: [
            { name: "Campeonato Brasileiro CBJJ", region: "brasil", level: "all", date: "2026-04-15" },
            { name: "Pan Ams IBJJF", region: "usa", level: "all", date: "2026-03-20" },
            { name: "European Open", region: "europe", level: "all", date: "2026-01-20" },
            { name: "Rio Open", region: "brasil", level: "black", date: "2026-06-10" },
            { name: "São Paulo BJJ Pro", region: "brasil", level: "white", date: "2026-05-05" },
            { name: "World Master IBJJF", region: "usa", level: "all", date: "2026-08-25" }
        ],
        logs: JSON.parse(localStorage.getItem('jiuconnect_logs')) || []
    },

    init() {
        console.log("JIUConnect initialized...");
        this.db = new DatabaseService();
        this.cacheDOM();
        this.bindEvents();
        this.loadData();
        this.loadFederationData();
    },

    cacheDOM() {
        this.exploreBtn = document.getElementById('exploreBtn');
        this.federationList = document.getElementById('federationList');
        // Logs
        this.openLogModal = document.getElementById('openLogModal');
        this.logModal = document.getElementById('logModal');
        this.closeLogBtn = document.querySelector('.close-modal'); // Corrected typo here if needed, but let's stick to update
        this.trainingForm = document.getElementById('trainingForm');
        this.logList = document.getElementById('training-log-list');
        // Filters & Search
        this.regionFilter = document.getElementById('regionFilter');
        this.levelFilter = document.getElementById('levelFilter');
        this.tournSearch = document.getElementById('tournSearch');
        this.btnSearchTourn = document.getElementById('btnSearchTourn');
        this.tournamentGrid = document.getElementById('tournamentGrid');
        // UI
        this.toastContainer = document.getElementById('toast-container');
        this.confirmModal = document.getElementById('confirmModal');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteAction');
        this.cancelDeleteBtn = document.getElementById('cancelDelete');
    },

    bindEvents() {
        if (this.exploreBtn) {
            this.exploreBtn.addEventListener('click', () => {
                window.scrollTo({
                    top: document.getElementById('dashboard').offsetTop - 100,
                    behavior: 'smooth'
                });
            });
        }

        // Modal Logic
        if (this.openLogBtn) this.openLogBtn.addEventListener('click', () => this.logModal.style.display = 'block');
        if (this.closeLogBtn) this.closeLogBtn.addEventListener('click', () => this.logModal.style.display = 'none');

        window.addEventListener('click', (e) => {
            if (e.target == this.logModal) this.logModal.style.display = 'none';
            if (e.target == this.confirmModal) this.confirmModal.style.display = 'none';
            if (e.target == this.techModal) this.techModal.style.display = 'none';
            if (e.target == this.authModal) this.authModal.style.display = 'none';
            if (e.target == this.tournamentModal) this.tournamentModal.style.display = 'none';
            if (e.target == this.settingsModal) this.settingsModal.style.display = 'none';
        });

        // Form Submit
        if (this.trainingForm) {
            this.trainingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addLog();
            });
        }

        // Filters
        this.regionFilter.addEventListener('change', () => this.renderTournaments());
        this.levelFilter.addEventListener('change', () => this.renderTournaments());

        if (this.btnSearchTourn) {
            this.btnSearchTourn.addEventListener('click', () => this.searchTournaments(this.tournSearch.value));
        }
        if (this.tournSearch) {
            this.tournSearch.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.searchTournaments(this.tournSearch.value);
                if (e.target.value === '') this.searchTournaments(''); // Reset on clear
            });
        }

        // Confirm Modal
        if (this.confirmDeleteBtn) this.confirmDeleteBtn.addEventListener('click', () => this.executeDelete());
        if (this.cancelDeleteBtn) this.cancelDeleteBtn.addEventListener('click', () => this.closeConfirmModal());

        // Settings Events
        if (this.userProfileDisplay) {
            // Override click to open settings instead of direct logout
            this.userProfileDisplay.addEventListener('click', (e) => {
                e.stopPropagation();
                this.settingsModal.style.display = 'block';
            });

            // Keyboard accessibility
            this.userProfileDisplay.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.settingsModal.style.display = 'block';
                }
            });
        }

        if (this.closeSettingsBtn) this.closeSettingsBtn.addEventListener('click', () => this.settingsModal.style.display = 'none');

        if (this.btnExport) {
            this.btnExport.addEventListener('click', () => {
                const json = this.db.exportData();
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `jiuconnect_backup_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                this.showToast('Backup baixado com sucesso!');
            });
        }

        if (this.fileImport) {
            this.fileImport.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    const success = this.db.importData(event.target.result);
                    if (success) {
                        this.showToast('Dados restaurados! Recarregando...', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        this.showToast('Erro ao restaurar arquivo.', 'error');
                    }
                };
                reader.readAsText(file);
            });
        }

        if (this.btnLogout) {
            this.btnLogout.addEventListener('click', () => {
                if (confirm("Tem certeza que deseja sair?")) {
                    this.db.clearUser();
                    location.reload();
                }
            });
        }
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle';

        toast.innerHTML = `
            <i class="fas fa-${icon}" style="font-size: 1.2rem; color: ${type === 'success' ? 'var(--color-success)' : type === 'error' ? '#ff4d4f' : 'var(--color-kimono-blue)'}"></i>
            <span>${message}</span>
        `;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    loadData() {
        this.data.logs = this.db.getLogs();
        this.data.tournaments = this.db.getTournaments(); // Load custom tourn.

        if (this.data.tournaments.length === 0) {
            // Suggest some defaults for new users
            const defaultEvents = [
                { name: "Campeonato Brasileiro CBJJ", region: "brasil", level: "all", date: "2026-04-15" },
                { name: "Mundial IBJJF", region: "usa", level: "all", date: "2026-05-30" }
            ];
            // Don't save to DB yet, just show them as "suggested" or save them? 
            // Better to save them as a starter pack so the list isn't empty.
            defaultEvents.forEach(e => this.db.saveTournament(e));
            this.data.tournaments = defaultEvents;
        }

        this.renderLogs();
        this.updateAnalytics();
    },

    addLog() {
        const date = document.getElementById('trainDate').value;
        const duration = document.getElementById('trainDuration').value;
        const type = document.getElementById('trainType').value;
        const focus = document.getElementById('trainFocus').value;

        const log = {
            id: Date.now(),
            date,
            duration,
            type,
            focus
        };

        this.db.saveLog(log);
        this.data.logs.unshift(log); // Update local state for immediate render

        this.renderLogs();
        this.updateAnalytics();
        this.logModal.style.display = 'none';
        this.trainingForm.reset();
        this.showToast('Treino registrado com sucesso!', 'success');
    },

    confirmDelete(id) {
        this.logToDelete = id;
        this.confirmModal.style.display = 'block';
    },

    executeDelete() {
        if (this.logToDelete) {
            this.db.deleteLog(this.logToDelete);
            this.data.logs = this.data.logs.filter(l => l.id !== this.logToDelete);
            this.renderLogs();
            this.updateAnalytics();
            this.showToast('Registro excluído.', 'info');
        }
        this.closeConfirmModal();
    },

    closeConfirmModal() {
        this.logToDelete = null;
        this.confirmModal.style.display = 'none';
    },

    renderLogs() {
        if (this.data.logs.length === 0) {
            this.logList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>Nenhum treino registrado.</p>
                </div>
            `;
            return;
        }

        this.logList.innerHTML = this.data.logs.map(log => `
            <div class="log-entry ${log.type === 'No-Gi' ? 'no-gi' : ''}">
                <div>
                    <strong>${this.formatDate(log.date)}</strong> - ${log.type}
                    <div style="font-size: 0.9em; color: #666;">${log.focus}</div>
                </div>
                <div style="text-align: right">
                    <span style="display:block; font-weight:bold;">${log.duration}min</span>
                    <button class="btn-delete" onclick="JIUConnect.confirmDelete(${log.id})" style="background:none; border:none; color:#ff4d4f; cursor:pointer; font-size:0.9rem; margin-top:5px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    // --- Analytics & Gamification ---

    updateAnalytics() {
        const logs = this.data.logs;
        const totalLogs = logs.length;
        const totalMinutes = logs.reduce((acc, log) => acc + parseInt(log.duration || 0), 0);
        const totalHours = (totalMinutes / 60).toFixed(1);

        // Update Text Stats
        if (this.statTotalLogs) this.statTotalLogs.textContent = totalLogs;
        if (this.statTotalHours) this.statTotalHours.textContent = `${totalHours}h`;

        // Weekly Chart (Simulated)
        // Groups last 7 inputs by day (simple version: just map last 7 logs duration for visual)
        // Improved: Mock a 7-day bar regardless of logs
        if (this.weeklyChart) {
            this.weeklyChart.innerHTML = '';
            // Get last 7 logs reversed (chronological) or just take last 7 from array
            const recentLogs = logs.slice(0, 7).reverse();

            recentLogs.forEach(log => {
                const height = Math.min(parseInt(log.duration), 100); // cap at 100px-ish
                const color = log.type === 'Gi' ? 'var(--color-kimono-blue)' : 'var(--color-tatame-charcoal)';
                const bar = document.createElement('div');
                bar.style.width = '12px';
                bar.style.height = `${height / 2.5}px`; // scale
                bar.style.background = color;
                bar.style.borderRadius = '2px 2px 0 0';
                bar.title = `${log.date}: ${log.duration}min`;
                this.weeklyChart.appendChild(bar);
            });
        }

        // Badges
        if (this.badgeContainer) {
            const badges = [];
            if (totalLogs >= 1) badges.push({ icon: 'fa-user-check', color: '#cd7f32', title: 'Primeiro Passo' });
            if (totalLogs >= 5) badges.push({ icon: 'fa-fist-raised', color: '#c0c0c0', title: 'Persistente (5+)' });
            if (totalLogs >= 10) badges.push({ icon: 'fa-medal', color: '#ffd700', title: 'Dedicado (10+)' });
            if (totalHours >= 10) badges.push({ icon: 'fa-clock', color: '#1890ff', title: 'Tempo de Tatame (10h+)' });

            this.badgeContainer.innerHTML = badges.map(b => `
                <div title="${b.title}" style="color: ${b.color}; background: #fff; padding: 5px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${b.icon}"></i>
                </div>
            `).join('');
        }
    },

    formatDate(dateString) {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return new Date(dateString).toLocaleDateString('pt-BR', options);
    },

    renderTournaments() {
        const region = this.regionFilter.value;
        const level = this.levelFilter.value;

        let filtered = this.data.tournaments.filter(t => {
            const matchRegion = region === 'all' || t.region === region;
            const matchLevel = level === 'all' || t.level === 'all' || t.level === level;
            return matchRegion && matchLevel;
        });

        // Se a busca estiver ativa (resultados temporários)
        if (this.searchResults && this.searchResults.length > 0) {
            filtered = this.searchResults;
        }

        if (filtered.length === 0) {
            this.tournamentGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-search"></i>
                    <p>Nenhum torneio encontrado na sua agenda.</p>
                    <p style="font-size: 0.9em; color: #666;">Tente buscar novas competições na barra acima!</p>
                </div>`;
            return;
        }

        this.tournamentGrid.innerHTML = filtered.map(t => {
            // Check if already imported (saved in user DB)
            const isSaved = this.data.tournaments.some(saved => saved.name === t.name && saved.date === t.date);
            const actionBtn = !isSaved
                ? `<button class="btn btn-sm btn-primary" style="width:100%; margin-top:0.5rem;" onclick="JIUConnect.importTournament('${t.name}')">
                     <i class="fas fa-plus"></i> Importar
                   </button>`
                : `<span style="display:block; text-align:center; margin-top:0.5rem; color:var(--color-success); font-size:0.8rem;">
                     <i class="fas fa-check"></i> Na Agenda
                   </span>`;

            return `
            <div class="card" style="position: relative;">
                <i class="fas fa-medal"></i>
                <h3>${t.name}</h3>
                <p>Data: ${this.formatDate(t.date)}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                     <span style="background:var(--color-kimono-blue); color:white; padding:2px 8px; border-radius:4px; font-size:0.8rem;">
                        ${t.region.toUpperCase()}
                    </span>
                </div>
                ${this.searchResults ? actionBtn : ''} 
            </div>
            `;
        }).join('');
    },

    searchTournaments(query) {
        if (!query) {
            this.searchResults = null; // Clear manual search
            this.renderTournaments();
            return;
        }

        // Simulação de "Database Global" de eventos conhecidos
        const globalEvents = [
            { name: "Campeonato Brasileiro CBJJ", region: "brasil", level: "all", date: "2026-04-15" },
            { name: "Pan Ams IBJJF", region: "usa", level: "all", date: "2026-03-20" },
            { name: "European Open", region: "europe", level: "all", date: "2026-01-20" },
            { name: "Rio Open", region: "brasil", level: "black", date: "2026-06-10" },
            { name: "São Paulo BJJ Pro", region: "brasil", level: "white", date: "2026-05-05" },
            { name: "World Master IBJJF", region: "usa", level: "all", date: "2026-08-25" },
            { name: "Floripa Open", region: "brasil", level: "all", date: "2026-09-12" },
            { name: "Curitiba Summer", region: "brasil", level: "all", date: "2026-02-15" },
            { name: "Salvador Spring", region: "brasil", level: "all", date: "2026-10-05" },
            { name: "Manaus Open", region: "brasil", level: "all", date: "2026-11-20" },
            { name: "Brasileiro Sem Kimono", region: "brasil", level: "all", date: "2026-05-20" }
        ];

        const results = globalEvents.filter(e => e.name.toLowerCase().includes(query.toLowerCase()));

        if (results.length > 0) {
            this.searchResults = results;
            this.showToast(`${results.length} eventos encontrados na web!`, 'info');
        } else {
            this.searchResults = [];
            this.showToast('Nenhum evento encontrado. Tente outro nome.', 'info');
        }

        this.renderTournaments();
    },

    importTournament(name) {
        // Find in global list (recreating list here or moving to a property would be better, but this works for now)
        const globalEvents = [
            { name: "Campeonato Brasileiro CBJJ", region: "brasil", level: "all", date: "2026-04-15" },
            { name: "Pan Ams IBJJF", region: "usa", level: "all", date: "2026-03-20" },
            { name: "European Open", region: "europe", level: "all", date: "2026-01-20" },
            { name: "Rio Open", region: "brasil", level: "black", date: "2026-06-10" },
            { name: "São Paulo BJJ Pro", region: "brasil", level: "white", date: "2026-05-05" },
            { name: "World Master IBJJF", region: "usa", level: "all", date: "2026-08-25" },
            { name: "Floripa Open", region: "brasil", level: "all", date: "2026-09-12" },
            { name: "Curitiba Summer", region: "brasil", level: "all", date: "2026-02-15" },
            { name: "Salvador Spring", region: "brasil", level: "all", date: "2026-10-05" },
            { name: "Manaus Open", region: "brasil", level: "all", date: "2026-11-20" },
            { name: "Brasileiro Sem Kimono", region: "brasil", level: "all", date: "2026-05-20" }
        ];

        const event = globalEvents.find(e => e.name === name);
        if (event) {
            this.db.saveTournament(event);
            this.data.tournaments.unshift(event);
            this.searchResults = null; // Clear search to show updated list
            document.getElementById('tournSearch').value = ''; // clear input
            this.renderTournaments();
            this.showToast('Evento importado para sua agenda!', 'success');
        }
    },

    loadFederationData() {
        // Mock data for information hub feature
        const federations = [
            { name: "IBJJF", site: "https://ibjjf.com", description: "International Brazilian Jiu-Jitsu Federation" },
            { name: "CBJJ", site: "https://cbjj.com.br", description: "Confederação Brasileira de Jiu-Jitsu" },
            { name: "AJP Tour", site: "https://ajptour.com", description: "Abu Dhabi Jiu-Jitsu Pro" }
        ];

        setTimeout(() => {
            if (this.federationList) {
                this.federationList.innerHTML = federations.map(fed => `
                    <div style="background: white; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--color-gold-medal);">
                        <div>
                            <strong>${fed.name}</strong> - ${fed.description}
                        </div>
                        <a href="${fed.site}" target="_blank" class="btn" style="background: var(--color-pure-white); border: 1px solid var(--color-kimono-blue); padding: 0.5rem 1rem;">Visitar</a>
                    </div>
                `).join('');
            }
        }, 800);
    },

    initTechSearch() {
        // Base de dados expandida
        const techniques = [
            // Branca - Finalização
            { name: "Armlock da Guarda Fechada", category: "Finalização", level: "White", description: "Chave de braço clássica partindo da guarda fechada, isolando o braço e usando o quadril como alavanca." },
            { name: "Triângulo", category: "Finalização", level: "White", description: "Estrangulamento usando as pernas para prender a cabeça e um braço do oponente." },
            { name: "Americana", category: "Finalização", level: "White", description: "Chave de ombro partindo da montada ou 100kg." },
            { name: "Kimura da Guarda", category: "Finalização", level: "White", description: "Chave de ombro atacando o braço bent, muito versátil." },
            { name: "Mata-Leão", category: "Finalização", level: "White", description: "Estrangulamento pelas costas, dominando o pescoço." },
            { name: "Ezequiel", category: "Finalização", level: "White", description: "Estrangulamento usando a própria manga, possível de dentro da guarda ou montada." },
            { name: "Guilhotina", category: "Finalização", level: "White", description: "Estrangulamento frontal dominando a cabeça do oponente." },

            // Branca - Raspagem/Queda
            { name: "Raspagem Tesoura", category: "Raspagem", level: "White", description: "Raspagem básica usando a perna como tesoura para desequilibrar." },
            { name: "Baiana (Double Leg)", category: "Queda", level: "White", description: "Entrada nas duas pernas para derrubar o oponente." },
            { name: "Osoto Gari", category: "Queda", level: "White", description: "Grande ganchada externa, técnica clássica do Judô adaptada." },

            // Azul - Guarda
            { name: "Guarda Aranha", category: "Guarda", level: "Blue", description: "Controle dos bíceps do oponente usando as solas dos pés." },
            { name: "Guarda De La Riva", category: "Guarda", level: "Blue", description: "Ganchada externa na perna do oponente, excelente para controlar a distância." },
            { name: "Lasso Guard", category: "Guarda", level: "Blue", description: "Uso da lapela ou perna laçada no braço do oponente para controle forte." },

            // Roxa/Marrom - Avançado
            { name: "Berimbolo", category: "Raspagem", level: "Purple", description: "Inversão giratória partindo da De La Riva para pegar as costas." },
            { name: "Chave de Calcanhar (Heel Hook)", category: "Finalização", level: "Brown/Black", description: "Chave de pé torcional, permitida apenas em regras específicas (No-Gi/ADCC)." },
            { name: "Leg Drag", category: "Passagem", level: "Purple", description: "Técnica de passagem de guarda arrastando a perna do oponente para o lado." }
        ];

        const searchInput = document.getElementById('techSearch');
        const techList = document.getElementById('techList');

        // Modal Elements
        this.techModal = document.getElementById('techModal');
        this.techDetailContent = document.getElementById('techDetailContent');
        this.closeTechBtn = document.getElementById('closeTechModal');

        // Close Modal Event
        if (this.closeTechBtn) {
            this.closeTechBtn.addEventListener('click', () => this.techModal.style.display = 'none');
            window.addEventListener('click', (e) => {
                if (e.target == this.techModal) this.techModal.style.display = 'none';
            });
        }

        window.searchExternal = (term, platform) => {
            const query = encodeURIComponent(`jiu jitsu ${term}`);
            const url = platform === 'youtube'
                ? `https://www.youtube.com/results?search_query=${query}`
                : `https://www.google.com/search?q=${query}`;
            window.open(url, '_blank');
        };

        window.openTechDetails = (techName) => {
            const tech = techniques.find(t => t.name === techName);
            if (!tech) return;

            const tagClass = `tag-${tech.level.toLowerCase().split('/')[0]}`; // simple class mapping

            this.techDetailContent.innerHTML = `
                <div class="tech-detail-header">
                    <h2>${tech.name}</h2>
                    <span class="tech-tag ${tagClass}">${tech.level}</span>
                    <span class="tech-tag tag-white">${tech.category}</span>
                </div>
                <p style="font-size: 1.1rem; line-height: 1.8;">${tech.description}</p>
                
                <div class="external-actions">
                    <button class="btn btn-youtube" onclick="searchExternal('${tech.name}', 'youtube')">
                        <i class="fab fa-youtube"></i> Ver no YouTube
                    </button>
                    <button class="btn btn-google" onclick="searchExternal('${tech.name}', 'google')">
                        <i class="fab fa-google"></i> Ler Artigos
                    </button>
                </div>
            `;
            this.techModal.style.display = 'block';
        };

        const renderTechs = (term = '') => {
            const filtered = techniques.filter(t => t.name.toLowerCase().includes(term.toLowerCase()));

            if (filtered.length === 0) {
                techList.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                        <i class="fas fa-search" style="font-size: 2rem; color: #ccc; margin-bottom: 1rem;"></i>
                        <p>Não encontrei "<strong>${term}</strong>" na nossa base.</p>
                        <p style="margin-bottom: 1.5rem;">Mas o Jiu-Jitsu é infinito! Pesquise fora:</p>
                        <div style="display: flex; gap: 1rem; justify-content: center;">
                            <button class="btn btn-sm btn-youtube" onclick="searchExternal('${term}', 'youtube')">YouTube</button>
                            <button class="btn btn-sm btn-google" onclick="searchExternal('${term}', 'google')">Google</button>
                        </div>
                    </div>
                `;
                return;
            }

            techList.innerHTML = filtered.map(t => `
                <div style="border: 1px solid #eee; padding: 1rem; border-radius: 8px; background: var(--color-soft-gray); cursor: pointer; transition: transform 0.2s;" 
                     onclick="openTechDetails('${t.name}')"
                     onmouseover="this.style.transform='translateY(-3px)'" 
                     onmouseout="this.style.transform='translateY(0)'">
                    <strong style="color: var(--color-kimono-blue)">${t.name}</strong><br>
                    <small>${t.category} • ${t.level}</small>
                </div>
            `).join('');
        };

        if (searchInput) {
            searchInput.addEventListener('input', (e) => renderTechs(e.target.value));
            renderTechs(); // Initial render
        }
    },

    // --- Auth & Events Logic ---

    initAuth() {
        this.loginBtn = document.getElementById('loginBtn');
        this.authModal = document.getElementById('authModal');
        this.authForm = document.getElementById('authForm');
        this.closeAuthBtn = document.getElementById('closeAuthModal');
        this.userProfileDisplay = document.getElementById('userProfileDisplay');
        this.userNameDisplay = document.getElementById('userNameDisplay');
        this.addTournamentBtn = document.getElementById('addTournamentBtn');

        // Tournament Modal
        this.tournamentModal = document.getElementById('tournamentModal');
        this.tournamentForm = document.getElementById('tournamentForm');
        this.closeTournBtn = document.getElementById('closeTournModal');

        // Check Login State
        const savedUser = this.db.getUser();
        if (savedUser) {
            this.user = savedUser;
            this.updateUIForLoggedInUser();
        }

        // Auth Events
        this.loginBtn.addEventListener('click', () => this.authModal.style.display = 'block');
        this.closeAuthBtn.addEventListener('click', () => this.authModal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target == this.authModal) this.authModal.style.display = 'none';
            if (e.target == this.tournamentModal) this.tournamentModal.style.display = 'none';
            if (e.target == this.settingsModal) this.settingsModal.style.display = 'none'; // Also close settings
        });

        this.authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('authName').value;
            const belt = document.getElementById('authBelt').value;

            this.user = { name, belt };
            this.db.saveUser(this.user); // Use DB service

            this.updateUIForLoggedInUser();
            this.authModal.style.display = 'none';
            this.showToast(`Bem-vindo de volta, ${name}!`);
        });

        this.userProfileDisplay.addEventListener('click', (e) => {
            // Updated: now opens settings modal, listener in init() handles it. 
            // This is just to ensure previous confirm logic is removed/replaced
        });

        // Tournament Events
        if (this.addTournamentBtn) {
            this.addTournamentBtn.addEventListener('click', () => this.tournamentModal.style.display = 'block');
        }

        if (this.closeTournBtn) {
            this.closeTournBtn.addEventListener('click', () => this.tournamentModal.style.display = 'none');
        }

        if (this.tournamentForm) {
            this.tournamentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('tournName').value;
                const region = document.getElementById('tournRegion').value;
                const date = document.getElementById('tournDate').value;

                // Add to local data
                this.data.tournaments.unshift({
                    name,
                    region,
                    level: "all",
                    date
                });

                this.renderTournaments();
                this.tournamentModal.style.display = 'none';
                this.tournamentForm.reset();
                this.showToast('Torneio cadastrado com sucesso!');
            });
        }
    },

    updateUIForLoggedInUser() {
        this.loginBtn.style.display = 'none';
        this.userProfileDisplay.style.display = 'flex';
        this.userNameDisplay.textContent = this.user.name;

        if (this.addTournamentBtn) {
            this.addTournamentBtn.style.display = 'block';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    JIUConnect.init();
    JIUConnect.initTechSearch();
    JIUConnect.initAuth();
});
