/* =========================================================
   SISTEMA MESTRE-DETALHE (REAL COM BANCO DE DADOS)
========================================================= */

let cursosGlobais = []; 
let cursoAbertoAtual = null; 
let alunosGlobais = []; // NOVO: Guarda a lista de alunos daquele curso

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

async function lerJsonOuLancar(res) {
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
}

function escapeHtml(valor) {
    return String(valor || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toggleAcoesMenu(event) {
    event.stopPropagation();
    const menu = event.target.closest('.acoes-menu');
    const dropdown = menu.querySelector('.acoes-dropdown');
    
    // Fecha todos os outros menus abertos
    document.querySelectorAll('.acoes-dropdown.open').forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('open');
        }
    });
    
    dropdown.classList.toggle('open');
}

// Fecha menu ao clicar fora
document.addEventListener('click', () => {
    document.querySelectorAll('.acoes-dropdown.open').forEach(d => {
        d.classList.remove('open');
    });
});

function formatarCpf(cpf) {
    const limpo = String(cpf || '').replace(/\D/g, '').slice(0, 11);
    if (limpo.length !== 11) return cpf || '-';
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarDataBr(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return dataIso;
    return data.toLocaleString('pt-BR');
}

/* =========================================================
   1. FUNÇÃO PARA BUSCAR E DESENHAR OS CURSOS (TELA 1)
========================================================= */
async function carregarCursos() {
    try {
        const res = await fetch('/cursos'); 
        cursosGlobais = await lerJsonOuLancar(res);

        const tbody = document.getElementById('tabelaCursosBody');
        tbody.innerHTML = '';

        if (cursosGlobais.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum curso cadastrado.</td></tr>`;
            return;
        }

        cursosGlobais.forEach(curso => {
            const estaEsgotado = (curso.status === 'esgotado');
            const statusHtml = estaEsgotado 
                ? '<span class="badge esgotado">ESGOTADO</span>' 
                : '<span class="badge aberto">ABERTO</span>';

            tbody.innerHTML += `
                <tr>
                    <td><strong>${curso.nome}</strong></td>
                    <td>${curso.local}</td>
                    <td>${curso.vagas} restantes</td>
                    <td>${statusHtml}</td>
                    <td>
                        <button onclick="abrirListaAlunos(${curso.id})" class="btn-acao btn-ver">👥 Ver Lista</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Erro ao carregar cursos:", err);
        document.getElementById('tabelaCursosBody').innerHTML = `<tr><td colspan="5" style="color: red; text-align: center;">Sessão expirada ou erro ao carregar dados do servidor.</td></tr>`;
    }
}

/* =========================================================
   2. FUNÇÃO PARA BUSCAR E DESENHAR OS ALUNOS (TELA 2)
========================================================= */
async function abrirListaAlunos(idCurso) {
    cursoAbertoAtual = cursosGlobais.find(c => c.id === idCurso);
    const btnPdf = document.getElementById('btnGerarPdfInscritos');

    document.getElementById('tituloCursoDetalhe').innerText = cursoAbertoAtual.nome;
    document.getElementById('localCursoDetalhe').innerText = cursoAbertoAtual.local;
    document.getElementById('vagasCursoDetalhe').innerText = `${cursoAbertoAtual.vagas} vagas restantes`;

    const tbody = document.getElementById('tabelaAlunosBody');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Buscando alunos... 🐢</td></tr>`;

    document.getElementById('telaCursos').classList.add('tela-oculta');
    document.getElementById('telaAlunos').classList.remove('tela-oculta');

    try {
        const res = await fetch(`/inscritos/${idCurso}`);
        alunosGlobais = await lerJsonOuLancar(res); // Salva os alunos na memória para a ficha
        if (btnPdf) btnPdf.style.display = 'inline-flex';

        tbody.innerHTML = ''; 

        if (alunosGlobais.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Nenhum aluno inscrito ainda.</td></tr>`;
        } else {
            alunosGlobais.forEach(aluno => {
                const bairroAluno = aluno.bairro || 'Não informado';
                const foneLimpo = (aluno.telefone || '').replace(/\D/g, '');
                const linkWhats = foneLimpo ? `https://wa.me/55${foneLimpo}` : '#';
                const nomeEscapadoJs = String(aluno.nome || '').replace(/'/g, "\\'");
                const matriculaConfirmada = Number(aluno.matricula_confirmada) === 1;
                const possuiNecessidadeEspecial = String(aluno.possui_necessidade_especial || '').toLowerCase() === 'sim';
                const tipoNecessidadeEspecial = possuiNecessidadeEspecial
                    ? (aluno.tipo_necessidade_especial || 'Não informado')
                    : 'Não';
                const badgeNecessidade = possuiNecessidadeEspecial
                    ? `<span class="badge-necessidade sim">⚠️ ${escapeHtml(tipoNecessidadeEspecial)}</span>`
                    : '<span class="badge-necessidade nao">✅ Não</span>';

                const botaoConfirmacao = matriculaConfirmada
                    ? `<span class="btn-acao btn-confirmado">✅ Confirmada</span>`
                    : `<button onclick="confirmarMatricula(${aluno.id}, '${nomeEscapadoJs}')" class="btn-acao btn-confirmar">✅ Confirmar Matrícula</button>`;

                tbody.innerHTML += `
                    <tr class="${possuiNecessidadeEspecial ? 'aluno-necessidade' : ''}">
                        <td><strong>${escapeHtml(aluno.nome)}</strong></td>
                        <td>${escapeHtml(formatarCpf(aluno.cpf))}</td>
                        <td>${aluno.telefone || '-'}</td>
                        <td>${escapeHtml(bairroAluno)}</td>
                        <td>${badgeNecessidade}</td>
                        <td>
                            <div class="acoes-container">
                                ${botaoConfirmacao}
                                <div class="acoes-menu">
                                    <button class="acoes-toggle" onclick="toggleAcoesMenu(event)" title="Mais ações">⋮</button>
                                    <div class="acoes-dropdown" data-aluno-id="${aluno.id}">
                                        <button onclick="abrirFichaAluno(${aluno.id})" title="Ver detalhes completos">📄 Ficha</button>
                                        <a href="${linkWhats}" target="_blank" ${foneLimpo ? '' : 'style="pointer-events:none;opacity:.55;"'} title="Abrir WhatsApp">💬 WhatsApp</a>
                                        <button onclick="excluirAluno(${aluno.id}, '${nomeEscapadoJs}')" title="Remover e liberar vaga">❌ Excluir</button>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (err) {
        console.error("Erro ao buscar alunos:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="color: red; text-align: center;">Erro ao carregar lista de alunos.</td></tr>`;
    }
}

/* =========================================================
   3. SISTEMA DA FICHA COMPLETA DO ALUNO (MODAL)
========================================================= */
function abrirFichaAluno(idAluno) {
    // Procura o aluno na lista global
    const aluno = alunosGlobais.find(a => a.id === idAluno);
    if (!aluno) return;

    const conteudo = document.getElementById('conteudoDetalhes');
    
    // Função auxiliar para evitar "null" na tela
    const checar = (valor) => valor ? valor : '<em style="color:#64748b">Não inf.</em>';

    const renderizarDocumento = (documento, label) => {
        if (!documento) {
            return '<em style="color:#64748b">Não enviado</em>';
        }

        if (String(documento).startsWith('data:application/pdf')) {
            return `<a href="${documento}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:10px;padding:12px 16px;border-radius:10px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;text-decoration:none;">📄 Abrir PDF do ${label}</a>`;
        }

        return `<img src="${documento}" alt="Documento ${label}" style="width:100%;max-height:280px;object-fit:contain;border-radius:10px;border:1px solid #334155;background:#0f172a;padding:8px;">`;
    };

    const cpfDocumento = renderizarDocumento(aluno.cpf_documento, 'CPF');
    const rgDocumento = renderizarDocumento(aluno.rg_documento, 'RG');

    // Monta a grade com os detalhes organizados
    conteudo.innerHTML = `
        <div class="detalhe-secao">👤 Dados Pessoais</div>
        <div class="detalhe-item"><span>Nome Completo</span><strong>${checar(aluno.nome)}</strong></div>
        <div class="detalhe-item"><span>CPF</span><strong>${checar(formatarCpf(aluno.cpf))}</strong></div>
        <div class="detalhe-item"><span>RG</span><strong>${checar(aluno.rg)}</strong></div>
        <div class="detalhe-item"><span>E-mail</span><strong>${checar(aluno.email)}</strong></div>
        <div class="detalhe-item"><span>Celular Principal</span><strong>${checar(aluno.telefone)}</strong></div>
        <div class="detalhe-item"><span>Data da Pré-inscrição</span><strong>${checar(formatarDataBr(aluno.data))}</strong></div>
        <div class="detalhe-item"><span>Escolaridade</span><strong>${checar(aluno.escolaridade)}</strong></div>
        <div class="detalhe-item"><span>Mora/Trabalha em Vitória?</span><strong>${aluno.mora_vitoria === 'sim' ? '✅ Sim' : (aluno.mora_vitoria === 'nao' ? '❌ Não' : checar(aluno.mora_vitoria))}</strong></div>
        <div class="detalhe-item"><span>Necessidade Especial?</span><strong>${String(aluno.possui_necessidade_especial || '').toLowerCase() === 'sim' ? '✅ Sim' : '❌ Não'}</strong></div>
        <div class="detalhe-item"><span>Tipo da Necessidade</span><strong>${String(aluno.possui_necessidade_especial || '').toLowerCase() === 'sim' ? checar(aluno.tipo_necessidade_especial) : 'Não possui'}</strong></div>
        
        <div class="detalhe-secao">📞 Contato & Endereço</div>
        <div class="detalhe-item"><span>CEP</span><strong>${checar(aluno.cep)}</strong></div>
        <div class="detalhe-item"><span>Endereço</span><strong>${checar(aluno.rua)}, Nº ${checar(aluno.numero)} - ${checar(aluno.bairro)}</strong></div>
        <div class="detalhe-item"><span>Município</span><strong>${checar(aluno.municipio)}</strong></div>

        <div class="detalhe-secao">🪪 Documentos enviados</div>
        <div class="detalhe-item" style="grid-column: 1 / -1;"><span>CPF</span><strong>${cpfDocumento}</strong></div>
        <div class="detalhe-item" style="grid-column: 1 / -1;"><span>RG</span><strong>${rgDocumento}</strong></div>
    `;

    // Mostra a janela preta
    document.getElementById('modalDetalhes').style.display = 'flex';
}

function fecharModalDetalhes() {
    document.getElementById('modalDetalhes').style.display = 'none';
}


/* =========================================================
   4. VOLTAR PARA CURSOS E EXCLUIR
========================================================= */
function voltarParaCursos() {
    const btnPdf = document.getElementById('btnGerarPdfInscritos');
    if (btnPdf) btnPdf.style.display = 'none';

    document.getElementById('telaAlunos').classList.add('tela-oculta');
    document.getElementById('telaCursos').classList.remove('tela-oculta');
    carregarCursos();
}

function gerarPdfInscritos() {
    if (!cursoAbertoAtual) {
        mostrarPopup('Selecione um curso primeiro.', 'warning');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        mostrarPopup('Biblioteca de PDF não carregou. Recarregue a página.', 'warning');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const hoje = new Date().toLocaleString('pt-BR');
    const totalInscritos = alunosGlobais.length;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Relatório de Inscritos - Vix Cursos', 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Curso: ${cursoAbertoAtual.nome || '-'}`, 14, 24);
    doc.text(`Local: ${cursoAbertoAtual.local || '-'}`, 14, 30);
    doc.text(`Data de geração: ${hoje}`, 14, 36);
    doc.text(`Total de inscritos: ${totalInscritos}`, 14, 42);

    const linhas = alunosGlobais.map((aluno, idx) => [
        String(idx + 1),
        String(aluno.nome || '-'),
        String(formatarCpf(aluno.cpf) || '-'),
        String(aluno.rg || '-'),
        String(String(aluno.possui_necessidade_especial || '').toLowerCase() === 'sim'
            ? (aluno.tipo_necessidade_especial || 'Sim')
            : 'Não'),
        String(aluno.telefone || '-'),
        String(aluno.email || '-')
    ]);

    doc.autoTable({
        startY: 48,
        head: [['#', 'Nome', 'CPF', 'RG', 'Necessidade', 'Telefone', 'E-mail']],
        body: linhas.length ? linhas : [['-', 'Nenhum inscrito', '-', '-', '-', '-', '-']],
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 34, 71] }
    });

    const nomeArquivo = `inscritos_${String(cursoAbertoAtual.nome || 'curso').replace(/\s+/g, '_').toLowerCase()}.pdf`;
    doc.save(nomeArquivo);
}

async function excluirAluno(idAluno, nomeAluno) {
    const confirmacao2 = confirm(`⚠️ Tem certeza? Isso vai excluir ${nomeAluno} e LIBERAR UMA VAGA automaticamente.`);
    
    if (confirmacao2) {
        try {
            const res = await fetch(`/api/inscricoes/${idAluno}`, { method: 'DELETE' });
            if (res.ok) {
                mostrarPopup('Inscrição removida. Vaga devolvida.', 'success');
                abrirListaAlunos(cursoAbertoAtual.id);
            } else {
                mostrarPopup('Erro ao tentar excluir no banco de dados.', 'error');
            }
        } catch (err) {
            mostrarPopup('Falha na comunicação com o servidor.', 'error');
        }
    }
}

async function confirmarMatricula(idAluno, nomeAluno) {
    const ok = confirm(`Confirmar matrícula de ${nomeAluno}?`);
    if (!ok) return;

    try {
        const res = await fetch(`/api/inscricoes/${idAluno}/confirmar`, { method: 'PUT' });
        const data = await res.json();

        if (!res.ok) {
            mostrarPopup(data.error || 'Erro ao confirmar matrícula.', 'error');
            return;
        }

        if (data.status === 'ja-confirmada') {
            mostrarPopup('Matrícula já estava confirmada.', 'info');
        } else if (data.email === 'falhou') {
            mostrarPopup('Matrícula confirmada, mas o e-mail não foi enviado.', 'warning');
        } else {
            mostrarPopup('Matrícula confirmada e e-mail enviado!', 'success');
        }

        abrirListaAlunos(cursoAbertoAtual.id);
    } catch (err) {
        mostrarPopup('Falha na comunicação com o servidor.', 'error');
    }
}

carregarCursos();