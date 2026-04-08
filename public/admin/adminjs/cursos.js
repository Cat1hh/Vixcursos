/* =========================================================
   MONITORAMENTO DE TURMAS — cursos.js
   Consome /api/admin/cursos-stats e /api/admin/stats
========================================================= */

async function carregarMonitoramento() {
    try {
        const [resStats, resCursos] = await Promise.all([
            fetch('/api/admin/stats'),
            fetch('/api/admin/cursos-stats')
        ]);
        const stats = await resStats.json();
        const cursos = await resCursos.json();

        // ── KPIs ──────────────────────────────────────────
        const totalInscritos = cursos.reduce((acc, c) => acc + (c.inscritos || 0), 0);
        const totalVagas = cursos.reduce((acc, c) => acc + (c.vagas_restantes || 0), 0);
        const esgotadas = cursos.filter(c => c.status === 'esgotado').length;

        document.getElementById('kpiTotal').textContent = cursos.length;
        document.getElementById('kpiVagas').textContent = totalVagas;
        document.getElementById('kpiInscritos').textContent = totalInscritos;
        document.getElementById('kpiEsgotadas').textContent = esgotadas;

        // ── Tabela ────────────────────────────────────────
        const tbody = document.getElementById('tabelaCursos');
        if (!cursos.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma turma cadastrada.</td></tr>';
        } else {
            tbody.innerHTML = cursos.map(c => {
                const badge = c.status === 'esgotado'
                    ? '<span class="badge badge-esgotado">ESGOTADO</span>'
                    : '<span class="badge badge-ativo">ATIVO</span>';
                return `
                <tr>
                    <td><strong>${c.nome}</strong></td>
                    <td class="text-sm text-muted">${c.local}</td>
                    <td><strong>${c.inscritos}</strong></td>
                    <td>${c.vagas_restantes}</td>
                    <td>${badge}</td>
                </tr>`;
            }).join('');
        }

        // ── Barras de progresso ───────────────────────────
        const listaProgresso = document.getElementById('listaProgresso');
        if (!cursos.length) {
            listaProgresso.innerHTML = '<p class="text-muted text-sm">Nenhuma turma para exibir.</p>';
            return;
        }

        listaProgresso.innerHTML = cursos.map(c => {
            const total = (c.inscritos || 0) + (c.vagas_restantes || 0);
            const taxa = total > 0 ? Math.round((c.inscritos / total) * 100) : 0;
            let cor = 'var(--success)';
            if (taxa >= 90) cor = 'var(--danger)';
            else if (taxa >= 70) cor = 'var(--warning)';

            return `
            <div class="progresso-item">
                <div class="progresso-header">
                    <span class="fw-600">${c.nome}</span>
                    <span style="color:${cor}">${taxa}%</span>
                </div>
                <div class="barra-fundo">
                    <div class="barra-preench" style="width:${taxa}%; background:${cor};"></div>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error('Erro ao carregar monitoramento:', err);
        document.getElementById('tabelaCursos').innerHTML =
            '<tr><td colspan="5" style="color:var(--danger);text-align:center;padding:1.5rem;">Erro ao conectar com o banco.</td></tr>';
    }
}

carregarMonitoramento();
