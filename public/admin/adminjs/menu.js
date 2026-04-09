
    function abrirModal() { document.getElementById('modalNovoCurso').classList.add('open'); }
    function fecharModal() {
        document.getElementById('modalNovoCurso').classList.remove('open');
        document.getElementById('formCriarCurso').reset();
    }

    function mostrarPopup(mensagem, tipo = 'info') {
        const icones = {
            success: 'OK',
            error: '!',
            warning: '!',
            info: 'i'
        };

        let container = document.getElementById('admin-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'admin-toast-container';
            container.className = 'admin-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `admin-toast ${tipo}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        toast.innerHTML = `
            <span class="admin-toast-icon">${icones[tipo] || 'i'}</span>
            <div class="admin-toast-content">${mensagem}</div>
            <button type="button" class="admin-toast-close" aria-label="Fechar">x</button>
        `;

        const removerToast = () => toast.remove();
        toast.querySelector('.admin-toast-close').addEventListener('click', removerToast);
        container.appendChild(toast);
        setTimeout(removerToast, 4200);
    }

    function deveRedirecionarLogin(res) {
        return res.status === 401 || (res.redirected && String(res.url || '').includes('/admin/login.html'));
    }

    async function lerJsonOuLancar(res) {
        if (deveRedirecionarLogin(res)) {
            window.location.href = '/admin/login.html';
            throw new Error('sessao-expirada');
        }

        if (!res.ok) {
            throw new Error(`http-${res.status}`);
        }

        const tipo = String(res.headers.get('content-type') || '').toLowerCase();
        if (!tipo.includes('application/json')) {
            throw new Error('resposta-nao-json');
        }

        return res.json();
    }

    async function carregarStats() {
        try {
            const res = await fetch('/api/admin/stats');
            const s = await lerJsonOuLancar(res);
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? '--'; };
            set('kpiTotal', s.total);
            set('kpiAtivos', s.ativos);
            set('kpiInscritos', s.inscritos);
            set('kpiLeads', s.leads);
        } catch (err) {
            console.error('Erro ao carregar stats:', err);
        }
    }

    async function carregarFiltros() {
        // Atualizamos "nome" para "curso" na lista de busca
        const tipos = ["curso", "idade", "local", "modalidade"];
        for (const tipo of tipos) {
            try {
                const req = await fetch(`/public/${tipo}`);
                const dados = await req.json();
                
                if (tipo === "idade") {
                    let options = `<option value="">-- Selecione --</option>`;
                    options += dados.map(d => `<option value="${d.id}">${d.idade} anos</option>`).join("");
                    document.getElementById("idade_min").innerHTML = options;
                    document.getElementById("idade_max").innerHTML = options;
                    continue;
                }

                const select = document.getElementById(tipo);
                if (select) {
                    let options = `<option value="">-- Selecione --</option>`;
                    // Usando d.curso no lugar de d.nome
                    options += dados.map(d => `<option value="${d.id}">${d.curso || d.local || d.modalidade}</option>`).join("");
                    select.innerHTML = options;
                }
            } catch (err) {
                console.error(`Erro filtro ${tipo}:`, err);
            }
        }
    }

    async function carregarCursosAdmin() {
        try {
            const res = await fetch("/cursos");
            const cursos = await lerJsonOuLancar(res);
            const tbody = document.getElementById("listaCursos");
            
            if (cursos.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">Nenhum curso cadastrado.</td></tr>`;
                return;
            }

            let html = "";
            cursos.forEach(c => {
                const badgeClass = c.status === 'esgotado' ? 'badge-esgotado' : 'badge-ativo';
                const statusTexto = c.status ? c.status.toUpperCase() : 'ATIVO';

                // O backend (server.js) continua enviando como c.nome para facilitar o front, então deixamos c.nome aqui!
                html += `
                <tr>
                    <td>
                        <strong style="color: var(--primary);">#${c.id}</strong><br>
                        <span style="font-weight: 500;">${c.nome}</span>
                    </td>
                    <td style="font-size: 0.9rem;">
                        📅 ${c.data_inicio || '-'} até ${c.data_termino || '-'}<br>
                        ⏰ ${c.horario_inicio || '-'} às ${c.horario_termino || '-'}
                    </td>
                    <td style="font-size: 0.9rem;">
                        📍 ${c.local || 'Não definido'}<br>
                        🏫 ${c.modalidade || '-'}
                    </td>
                    <td><strong>${c.vagas}</strong> rest.</td>
                    <td><span class="badge ${badgeClass}">${statusTexto}</span></td>
                    <td class="acoes">
                        <a href="inscritos.html?curso=${c.id}" class="btn btn-outline" title="Ver Inscritos">👥</a>
                        ${c.status !== 'esgotado' 
                            ? `<button onclick="esgotarCurso(${c.id}, '${c.nome}')" class="btn btn-danger" title="Esgotar vagas">🚫</button>` 
                            : `<button class="btn btn-outline" disabled style="opacity: 0.5;">🚫</button>`
                        }
                    </td>
                </tr>`;
            });
            tbody.innerHTML = html;
        } catch (err) {
            console.error(err);
            document.getElementById("listaCursos").innerHTML = `<tr><td colspan="6" style="color: red; text-align: center;">Sessão expirada ou erro ao carregar dados do servidor.</td></tr>`;
        }
    }

    function criarCurso(e) {
        e.preventDefault();

        const dados = {
            curso: document.getElementById("curso").value, // Pegando do ID "curso"
            vagas: document.getElementById("vagas").value,
            idade_min: document.getElementById("idade_min").value,
            idade_max: document.getElementById("idade_max").value,
            modalidade: document.getElementById("modalidade").value, 
            local: document.getElementById("local").value,
            data_inicio: document.getElementById("data_inicio").value,
            data_termino: document.getElementById("data_termino").value,
            horario_inicio: document.getElementById("horario_inicio").value,
            horario_termino: document.getElementById("horario_termino").value
        };

        fetch("/cursos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        })
        .then(r => lerJsonOuLancar(r))
        .then(res => {
            if (res.error) {
                mostrarPopup("Erro ao cadastrar: " + res.error, 'error');
                return;
            }
            mostrarPopup("Curso cadastrado com sucesso!", 'success');
            fecharModal();
            carregarCursosAdmin(); 
        })
        .catch(err => {
            console.error(err);
            mostrarPopup("Erro na conexão com o servidor.", 'error');
        });
    }

    async function esgotarCurso(id, nome) {
        if (!confirm(`Tem certeza que deseja esgotar as vagas do curso de ${nome}?`)) return;

        try {
            const res = await fetch(`/cursos/esgotar/${id}`, { method: 'PUT' });
            await lerJsonOuLancar(res);
            carregarCursosAdmin();
        } catch (err) {
            console.error(err);
            mostrarPopup("Erro de conexão.", 'error');
        }
    }

    carregarFiltros();
    carregarCursosAdmin();
    carregarStats();