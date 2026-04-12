/* =========================================================
   MONITORAMENTO DE TURMAS — cursos.js
   Consome /api/admin/cursos-stats e /api/admin/stats
========================================================= */

// Gráficos globais
let chartGenero, chartEvasao, chartDeficientes, chartRegioes;

function toNumber(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
}

function abrirAba(nomeAba, botao) {
    // Esconder todos os tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    // Mostrar tab selecionada
    document.getElementById(nomeAba).classList.add('active');
    if (botao) {
        botao.classList.add('active');
    }
    
    // Redimensionar gráficos se necessário
    setTimeout(() => {
        if (chartGenero) chartGenero.resize();
        if (chartEvasao) chartEvasao.resize();
        if (chartDeficientes) chartDeficientes.resize();
        if (chartRegioes) chartRegioes.resize();
    }, 100);
}

async function carregarMonitoramento() {
    try {
        const lerJsonOuLancar = async (res) => {
            if (res.status === 401 || (res.redirected && String(res.url || '').includes('/admin/login.html'))) {
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
        };

        const [resStats, resCursos] = await Promise.all([
            fetch('/api/admin/stats'),
            fetch('/api/admin/cursos-stats')
        ]);
        const stats = await lerJsonOuLancar(resStats);
        const cursos = await lerJsonOuLancar(resCursos);

        // ── KPIs ──────────────────────────────────────────
        const totalInscritos = cursos.reduce((acc, c) => acc + (Number(c.inscritos) || 0), 0);
        const totalVagas = cursos.reduce((acc, c) => acc + (Number(c.vagas_restantes) || 0), 0);
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
                const inscritos = Number(c.inscritos) || 0;
                const vagasRestantes = Number(c.vagas_restantes) || 0;
                const badge = c.status === 'esgotado'
                    ? '<span class="badge badge-esgotado">ESGOTADO</span>'
                    : '<span class="badge badge-ativo">ATIVO</span>';
                return `
                <tr>
                    <td><strong>${c.nome}</strong></td>
                    <td class="text-sm text-muted">${c.local}</td>
                    <td><strong>${inscritos}</strong></td>
                    <td>${vagasRestantes}</td>
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
            const inscritos = Number(c.inscritos) || 0;
            const vagasRestantes = Number(c.vagas_restantes) || 0;
            const total = inscritos + vagasRestantes;
            const taxa = total > 0 ? Math.round((inscritos / total) * 100) : 0;
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

        // ── Carregar dados avançados ───────────────────────────
        await carregarDadosAvancados();

    } catch (err) {
        console.error('Erro ao carregar monitoramento:', err);
        document.getElementById('tabelaCursos').innerHTML =
            '<tr><td colspan="5" style="color:var(--danger);text-align:center;padding:1.5rem;">Sessão expirada ou erro ao carregar dados do servidor.</td></tr>';
    }
}

async function carregarDadosAvancados() {
    try {
        await Promise.all([
            carregarDadosGenero(),
            carregarDadosEvasao(),
            carregarDadosDeficientes(),
            carregarDadosRegioes()
        ]);
    } catch (err) {
        console.error('Erro ao carregar dados avançados:', err);
    }
}

async function carregarDadosGenero() {
    try {
        const res = await fetch('/api/admin/relatorio-genero');
        if (!res.ok) throw new Error('Erro ao buscar dados de gênero');
        const dados = await res.json();
        
        let feminino = 0, masculino = 0, outro = 0;
        
        // Renderizar tabela
        let htmlTabela = '';
        dados.forEach(curso => {
            const mulheres = toNumber(curso.mulheres);
            const homens = toNumber(curso.homens);
            const outros = toNumber(curso.outros);
            const total = toNumber(curso.total);

            feminino += mulheres;
            masculino += homens;
            outro += outros;
            
            htmlTabela += `
                <tr>
                    <td><strong>${curso.curso || 'Sem curso'}</strong></td>
                    <td><span class="badge badge-info">${mulheres}</span></td>
                    <td><span class="badge badge-info">${homens}</span></td>
                    <td><span class="badge badge-info">${outros}</span></td>
                    <td><strong>${total}</strong></td>
                </tr>
            `;
        });
        
        document.getElementById('tbody-genero').innerHTML = htmlTabela || '<tr><td colspan="5" style="text-align: center; color: #94A3B8;">Nenhum dado disponível</td></tr>';
        
        // Gráfico de pizza
        const ctxGenero = document.getElementById('chartGenero').getContext('2d');
        if (chartGenero) chartGenero.destroy();
        chartGenero = new Chart(ctxGenero, {
            type: 'doughnut',
            data: {
                labels: ['Mulheres', 'Homens', 'Não informado/outros'],
                datasets: [{
                    data: [feminino, masculino, outro],
                    backgroundColor: ['#FF6B9D', '#4A90E2', '#9B59B6'],
                    borderColor: 'rgba(30, 41, 59, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#E2E8F0', font: { size: 14 } }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Erro ao carregar dados de gênero:', err);
        document.getElementById('tbody-genero').innerHTML = '<tr><td colspan="5" style="color: var(--danger); text-align: center;">Erro ao carregar</td></tr>';
    }
}

async function carregarDadosEvasao() {
    try {
        const res = await fetch('/api/admin/relatorio-evasao');
        if (!res.ok) throw new Error('Erro ao buscar dados de evasão');
        const dados = await res.json();
        
        let htmlTabela = '';
        let cursosNomes = [];
        let taxasEvasao = [];
        
        dados.forEach(curso => {
            cursosNomes.push(curso.curso || 'Sem nome');
            const ativos = toNumber(curso.ativos);
            const evadidos = toNumber(curso.evadidos);
            const concluidos = toNumber(curso.concluidos);
            const taxaEvasao = toNumber(curso.taxa_evasao);

            taxasEvasao.push(taxaEvasao);
            
            htmlTabela += `
                <tr>
                    <td><strong>${curso.curso || 'Sem curso'}</strong></td>
                    <td><span class="badge badge-success">${ativos}</span></td>
                    <td><span class="badge badge-danger">${evadidos}</span></td>
                    <td><span class="badge badge-success">${concluidos}</span></td>
                    <td>
                        <strong style="color: ${taxaEvasao > 20 ? '#EF4444' : '#10B981'};">
                            ${taxaEvasao.toFixed(2)}%
                        </strong>
                    </td>
                </tr>
            `;
        });
        
        document.getElementById('tbody-evasao').innerHTML = htmlTabela || '<tr><td colspan="5" style="text-align: center; color: #94A3B8;">Nenhum dado disponível</td></tr>';
        
        // Gráfico de barras
        const ctxEvasao = document.getElementById('chartEvasao').getContext('2d');
        if (chartEvasao) chartEvasao.destroy();
        chartEvasao = new Chart(ctxEvasao, {
            type: 'bar',
            data: {
                labels: cursosNomes,
                datasets: [{
                    label: 'Taxa de Evasão (%)',
                    data: taxasEvasao,
                    backgroundColor: taxasEvasao.map(taxa => taxa > 20 ? '#EF4444' : '#10B981'),
                    borderColor: 'rgba(30, 41, 59, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#E2E8F0' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94A3B8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: { color: '#94A3B8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Erro ao carregar dados de evasão:', err);
        document.getElementById('tbody-evasao').innerHTML = '<tr><td colspan="5" style="color: var(--danger); text-align: center;">Erro ao carregar</td></tr>';
    }
}

async function carregarDadosDeficientes() {
    try {
        const res = await fetch('/api/admin/relatorio-deficientes');
        if (!res.ok) throw new Error('Erro ao buscar dados de deficientes');
        const dados = await res.json();
        
        let deficitariosTotais = 0, naoDef = 0;
        let htmlTabela = '';
        
        dados.forEach(curso => {
            const deficientes = toNumber(curso.deficientes);
            const naoDeficientes = toNumber(curso.nao_deficientes);
            const total = toNumber(curso.total);

            deficitariosTotais += deficientes;
            naoDef += naoDeficientes;
            
            const taxaInclusao = total > 0 ? ((deficientes / total) * 100).toFixed(1) : '0.0';
            
            htmlTabela += `
                <tr>
                    <td><strong>${curso.curso || 'Sem curso'}</strong></td>
                    <td><span class="badge badge-success">${deficientes}</span></td>
                    <td><span class="badge badge-info">${naoDeficientes}</span></td>
                    <td><strong>${total}</strong></td>
                    <td><strong style="color: #10B981;">${taxaInclusao}%</strong></td>
                </tr>
            `;
        });
        
        document.getElementById('tbody-deficientes').innerHTML = htmlTabela || '<tr><td colspan="5" style="text-align: center; color: #94A3B8;">Nenhum dado disponível</td></tr>';
        
        // Gráfico de pizza
        const ctxDef = document.getElementById('chartDeficientes').getContext('2d');
        if (chartDeficientes) chartDeficientes.destroy();
        chartDeficientes = new Chart(ctxDef, {
            type: 'doughnut',
            data: {
                labels: ['Pessoas Deficientes', 'Pessoas Não Deficientes'],
                datasets: [{
                    data: [deficitariosTotais, naoDef],
                    backgroundColor: ['#10B981', '#3B82F6'],
                    borderColor: 'rgba(30, 41, 59, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#E2E8F0', font: { size: 14 } }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Erro ao carregar dados de deficientes:', err);
        document.getElementById('tbody-deficientes').innerHTML = '<tr><td colspan="5" style="color: var(--danger); text-align: center;">Erro ao carregar</td></tr>';
    }
}

async function carregarDadosRegioes() {
    try {
        const res = await fetch('/api/admin/relatorio-regioes');
        if (!res.ok) throw new Error('Erro ao buscar dados de regiões');
        const dados = await res.json();
        
        // Ordenar por total de inscritos (maior para menor)
        dados.sort((a, b) => {
            const aNaoInformado = String(a.regiao || '').trim().toLowerCase() === 'não informado';
            const bNaoInformado = String(b.regiao || '').trim().toLowerCase() === 'não informado';
            if (aNaoInformado && !bNaoInformado) return 1;
            if (!aNaoInformado && bNaoInformado) return -1;
            return toNumber(b.total_inscritos) - toNumber(a.total_inscritos);
        });
        
        // Renderizar tabela
        let htmlTabela = '';
        let regioesNomes = [];
        let inscritosCount = [];
        
        dados.forEach(regiao => {
            const totalInscritos = toNumber(regiao.total_inscritos);
            const mulheres = toNumber(regiao.mulheres);
            const homens = toNumber(regiao.homens);
            const deficientes = toNumber(regiao.deficientes);

            regioesNomes.push((regiao.regiao || 'Não informado').substring(0, 20));
            inscritosCount.push(totalInscritos);
            
            htmlTabela += `
                <tr>
                    <td><strong>${regiao.regiao || 'Não informado'}</strong></td>
                    <td><span class="badge badge-info">${regiao.municipio || 'Não informado'}</span></td>
                    <td><strong style="color: var(--coral-vix);">${totalInscritos}</strong></td>
                    <td><span class="badge badge-info">${mulheres}</span></td>
                    <td><span class="badge badge-info">${homens}</span></td>
                    <td><span class="badge badge-success">${deficientes}</span></td>
                </tr>
            `;
        });
        
        document.getElementById('tbody-regioes').innerHTML = htmlTabela || '<tr><td colspan="6" style="text-align: center; color: #94A3B8;">Nenhum dado disponível</td></tr>';
        
        // Gráfico de barras horizontais
        const ctxRegioes = document.getElementById('chartRegioes').getContext('2d');
        if (chartRegioes) chartRegioes.destroy();
        chartRegioes = new Chart(ctxRegioes, {
            type: 'bar',
            data: {
                labels: regioesNomes,
                datasets: [{
                    label: 'Total de Inscritos',
                    data: inscritosCount,
                    backgroundColor: '#F97360',
                    borderColor: 'rgba(30, 41, 59, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#E2E8F0' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94A3B8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: { color: '#94A3B8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Erro ao carregar dados de regiões:', err);
        document.getElementById('tbody-regioes').innerHTML = '<tr><td colspan="6" style="color: var(--danger); text-align: center;">Erro ao carregar</td></tr>';
    }
}

carregarMonitoramento();
