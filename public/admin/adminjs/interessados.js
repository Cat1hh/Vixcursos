/* =========================================================
   VARIÁVEL GLOBAL PARA O GRÁFICO
   Índices: 0=Gastronomia, 1=Tecnologia, 2=Beleza, 3=Manutenção
========================================================= */
let contagemGrafico = [0, 0, 0, 0];

function formatarDataHoraBR(valor) {
    if (!valor) return '-';
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;
    return data.toLocaleString('pt-BR');
}

/* =========================================================
   1. CARREGAR DADOS DO BANCO (Tabela, Gráfico e Automação)
========================================================= */
async function carregarInteressados() {
    try {
        // Agora, buscamos a FILA DE INTERESSADOS (Leads)
        const resLeads = await fetch('/api/interessados');
        if (resLeads.status === 401 || (resLeads.redirected && String(resLeads.url || '').includes('/admin/login.html'))) {
            window.location.href = '/admin/login.html';
            return;
        }

        if (!resLeads.ok) {
            throw new Error(`http-${resLeads.status}`);
        }

        const tipo = String(resLeads.headers.get('content-type') || '').toLowerCase();
        if (!tipo.includes('application/json')) {
            throw new Error('resposta-nao-json');
        }

        const dados = await resLeads.json();
        
        const tbody = document.querySelector('.tabela-admin tbody');
        tbody.innerHTML = '';

        contagemGrafico = [0, 0, 0, 0]; // Zera gráfico

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhum interessado ainda.</td></tr>';
            return;
        }
        
        dados.forEach(lead => {
            // Conta os perfis para o Gráfico
            const perfilBusca = (lead.perfil_curso || '').toLowerCase();
            if (perfilBusca === 'gastronomia') contagemGrafico[0]++;
            else if (perfilBusca === 'tecnologia') contagemGrafico[1]++;
            else if (perfilBusca === 'beleza') contagemGrafico[2]++;
            else if (perfilBusca === 'manutencao') contagemGrafico[3]++;

            const classeStatus = lead.status === 'enviado' ? 'enviado' : 'aguardando';
            const textoStatus = lead.status === 'enviado'
                ? '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Enviado'
                : '<i class="bi bi-hourglass-split" aria-hidden="true"></i> Esperando curso';

            // Formatação do nome da categoria com a primeira letra maiúscula
            const perfilCapitalizado = lead.perfil_curso.charAt(0).toUpperCase() + lead.perfil_curso.slice(1);

            tbody.innerHTML += `
                <tr>
                    <td><strong>${lead.nome}</strong></td>
                    <td>${lead.whatsapp}</td>
                    <td style="text-transform: capitalize;">${lead.regiao.replace('_', ' ')}</td>
                    <td>${perfilCapitalizado}</td>
                    <td>
                        <span class="status ${classeStatus}">
                            ${textoStatus}
                        </span>
                    </td>
                    <td>${formatarDataHoraBR(lead.enviado_em)}</td>
                </tr>
            `;
        });
    } catch (e) { 
        console.error("Erro ao carregar dados:", e);
        const mensagem = String(e?.message || '').startsWith('http-')
            ? `Erro ao carregar fila de interessados (${e.message.replace('http-', 'HTTP ')}).`
            : 'Erro ao carregar banco de dados.';
        document.querySelector('.tabela-admin tbody').innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">${mensagem}</td></tr>`;
    }
}

/* =========================================================
   2. LÓGICA DO GRÁFICO (CHART.JS)
========================================================= */
let meuGrafico;

function inicializarGrafico(tipo) {
    const ctx = document.getElementById('graficoDemanda').getContext('2d');
    if (meuGrafico) meuGrafico.destroy();

    meuGrafico = new Chart(ctx, {
        type: tipo,
        data: {
            labels: ['Gastronomia', 'Tecnologia', 'Beleza', 'Manutenção'],
            datasets: [{
                label: 'Número de Interessados (Demanda Real)',
                data: contagemGrafico, 
                backgroundColor: ['rgba(214, 34, 64, 0.7)', 'rgba(15, 34, 71, 0.7)', 'rgba(249, 200, 82, 0.7)', 'rgba(153, 153, 153, 0.7)'],
                borderColor: ['#D62240', '#0f2247', '#f9c852', '#999999'],
                borderWidth: 2,
                tension: 0.3 
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function mudarTipoGrafico(tipo) {
    document.getElementById('btnBarra').classList.remove('ativo');
    document.getElementById('btnLinha').classList.remove('ativo');
    if(tipo === 'bar') document.getElementById('btnBarra').classList.add('ativo');
    if(tipo === 'line') document.getElementById('btnLinha').classList.add('ativo');
    inicializarGrafico(tipo);
}

function abrirModalGrafico() {
    document.getElementById('modalGrafico').style.display = 'flex';
    mudarTipoGrafico('bar'); 
}
function fecharModalGrafico() { document.getElementById('modalGrafico').style.display = 'none'; }

// Iniciar a Página
carregarInteressados();