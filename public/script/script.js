/* =========================================================
   1. INICIALIZAÇÃO E SPLASH SCREEN
========================================================= */
const SPLASH_SEEN_KEY = 'vixcursos_index_splash_seen';

function splashJaFoiVista() {
    try {
        return localStorage.getItem(SPLASH_SEEN_KEY) === '1';
    } catch {
        return false;
    }
}

function marcarSplashComoVista() {
    try {
        localStorage.setItem(SPLASH_SEEN_KEY, '1');
    } catch {
        // Ignora se o navegador bloquear storage.
    }
}

const deveExibirSplash = !splashJaFoiVista();

if (deveExibirSplash) {
    document.body.classList.add('splash-active');
} else {
    const splashInicial = document.getElementById('splash-screen');
    if (splashInicial) {
        splashInicial.remove();
    }
}

window.addEventListener('load', () => {
    if (!deveExibirSplash) {
        document.body.classList.remove('splash-active');
        return;
    }

    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('is-hidden');
            setTimeout(() => splash.remove(), 500);
        }
        document.body.classList.remove('splash-active');
        marcarSplashComoVista();
    }, 2200);
});

document.addEventListener("DOMContentLoaded", inicializarPortal);

let cursosDestaqueDisponiveis = [];
let indiceDestaqueAtual = 0;
let timerRotacaoDestaque = null;
let timerAtualizacaoDestaque = null;

async function inicializarPortal() {
    try {
        const containerCursos = document.getElementById("containerCursos");
        const temFiltros = document.getElementById("filtro-idade");

        if (containerCursos) {
            const cursos = await carregarCursos(); 
            await carregarEstatisticas(cursos); 
            iniciarMonitorDestaques();
        }

        if (temFiltros) {
            await carregarFiltros(); 
            
            const selIdade = document.getElementById("filtro-idade");
            const selLocal = document.getElementById("filtro-local");
            const selCategoria = document.getElementById("filtro-categoria");
            const btnLimpar = document.getElementById("btn-limpar");

            if (selIdade) selIdade.addEventListener("change", aplicarFiltros);
            if (selLocal) selLocal.addEventListener("change", aplicarFiltros);
            
            if (btnLimpar) {
                btnLimpar.addEventListener("click", () => {
                    limparFiltros();
                    if (typeof mascoteImg !== 'undefined' && mascoteImg) {
                        mascoteImg.src = avatarPadrao;
                    }
                });
            }

            ativarBotoesCategoria();
        }
    } catch (error) {
        console.warn("Aviso: Falha ao inicializar alguns módulos.", error);
    }
}

/* =========================================================
   1.5 SISTEMA INTELIGENTE DE FILTROS (PILLS + SELECTS)
========================================================= */

function normalizarTextoCategoria(texto) {
    return (texto || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')  
        .replace(/[\s\/-]/g, '') 
        .trim();
}

const gruposCategorias = {
    tecnologia: ['tecnologia', 'informatica', 'programacao', 'web', 'redes', 'telecom', 'ti', 'automacao', 'eletronica', 'excel'],
    administracao: ['administracao', 'administrativa', 'gestao', 'comercio', 'marketing', 'vendas', 'logistica', 'recursos', 'empresarial', 'assistente'],
    saude: ['saude', 'enfermagem', 'cuidad', 'beleza', 'estetica', 'idosos'],
    idiomas: ['idiomas', 'idioma', 'ingles', 'espanhol', 'frances'],
    artesanato: ['artesanato', 'artesan', 'arte', 'moda', 'confeccao', 'costura'],
    gastronomia: ['gastronomia', 'cozinha', 'panificacao', 'confeitaria', 'doces', 'hotelaria', 'turismo']
};

function obterCategoriaCanonica(texto) {
    const valor = normalizarTextoCategoria(texto);
    if (!valor || valor === 'todas' || valor === 'geral') return '';

    for (const [grupo, termos] of Object.entries(gruposCategorias)) {
        const pertenceAoGrupo = termos.some(termo => valor.includes(termo) || termo.includes(valor));
        if (pertenceAoGrupo) {
            return grupo;
        }
    }
    return valor;
}

function ativarBotoesCategoria() {
    const pills = document.querySelectorAll('.category-pills .pill');
    const selectCategoria = document.getElementById('filtro-categoria');

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            if (selectCategoria) selectCategoria.value = ""; 
            aplicarFiltros();
        });
    });

    if (selectCategoria) {
        selectCategoria.addEventListener('change', () => {
            pills.forEach(p => p.classList.remove('active')); 
            aplicarFiltros();
        });
    }
}

function aplicarFiltros() {
    const idadeSel = document.querySelector("#filtro-idade") ? document.querySelector("#filtro-idade").value : "";
    const localSel = document.querySelector("#filtro-local") ? document.querySelector("#filtro-local").value : "";
    const categoriaSel = document.querySelector("#filtro-categoria") ? document.querySelector("#filtro-categoria").value : "";

    // Pega o texto da pílula ativa, se houver
    const pillAtiva = document.querySelector('.category-pills .pill.active');
    let textoPill = pillAtiva ? pillAtiva.innerText.replace(/[^\w\sÀ-ÿ]/g, '').trim() : "";
    if (textoPill.toLowerCase() === 'geral' || textoPill.toLowerCase() === 'todas') textoPill = "";

    // Define qual texto usar para filtrar (prioridade para a caixa de seleção)
    let filtroCategoriaStr = categoriaSel !== "" && categoriaSel !== "Todas" ? categoriaSel : textoPill;

    const cards = document.querySelectorAll(".curso-card-novo");
    let encontrouAlgum = false;
    let totalVisiveis = 0;

    cards.forEach(card => {
        const min = parseInt(card.dataset.idadeMin) || 0;
        const max = parseInt(card.dataset.idadeMax) || 99;
        
        // Agora pegamos a categoria E o nome do curso
        const catCard = card.dataset.categoria || "";
        const nomeCard = card.dataset.nome || "";
        const locCard = card.dataset.local || "";

        // 1. Regra de Idade
        let bateIdade = true;
        if (idadeSel && idadeSel !== "Todas") {
            const idadeEscolhida = parseInt(idadeSel);
            bateIdade = (idadeEscolhida >= min && idadeEscolhida <= max);
        }

        // 2. Regra de Local
        let bateLocal = true;
        if (localSel && localSel !== "Todos") {
            bateLocal = normalizarTextoCategoria(locCard) === normalizarTextoCategoria(localSel);
        }

        // 3. Regra de Categoria (Verificando Categoria E Título de forma inteligente)
        let bateCategoria = true;
        if (filtroCategoriaStr && filtroCategoriaStr !== "Todas" && filtroCategoriaStr !== "Geral") {
            const filtroNorm = normalizarTextoCategoria(filtroCategoriaStr);
            const catCardNorm = normalizarTextoCategoria(catCard);
            const nomeCardNorm = normalizarTextoCategoria(nomeCard);
            
            const filtroCanonica = obterCategoriaCanonica(filtroCategoriaStr);
            const catCanonica = obterCategoriaCanonica(catCard);
            const nomeCanonica = obterCategoriaCanonica(nomeCard);
            
            // Verifica se a palavra da busca está dentro da categoria ou do título do curso
            if (catCardNorm.includes(filtroNorm) || nomeCardNorm.includes(filtroNorm)) {
                bateCategoria = true;
            } 
            // Ou verifica pelo nosso sistema de sinônimos (ex: "Assistente" entra em "Administração")
            else if (filtroCanonica !== "" && (catCanonica === filtroCanonica || nomeCanonica === filtroCanonica)) {
                bateCategoria = true;
            } else {
                bateCategoria = false;
            }
        }

        // Aplica a visualização
        if (bateIdade && bateCategoria && bateLocal) {
            card.style.display = "flex";
            encontrouAlgum = true;
            totalVisiveis += 1;
        } else {
            card.style.display = "none";
        }
    });

    gerenciarMensagemVazia(encontrouAlgum);
    atualizarResumoDescoberta(totalVisiveis, {
        idade: idadeSel,
        local: localSel,
        categoria: categoriaSel,
        pill: textoPill
    });
}

function limparFiltros() {
    if(document.getElementById("filtro-idade")) document.getElementById("filtro-idade").value = "";
    if(document.getElementById("filtro-categoria")) document.getElementById("filtro-categoria").value = "";
    if(document.getElementById("filtro-local")) document.getElementById("filtro-local").value = "";
    
    const pills = document.querySelectorAll('.category-pills .pill');
    pills.forEach(p => p.classList.remove('active'));

    aplicarFiltros();
}

function gerenciarMensagemVazia(temCursos) {
    const container = document.getElementById("containerCursos");
    let msg = document.getElementById("msg-vazia");

    if (!temCursos) {
        if (!msg) {
            container.insertAdjacentHTML('beforeend', `
                <div id="msg-vazia" style="width:100%; grid-column: 1/-1; text-align:center; padding:50px; color:#94A3B8;">
                    <p>Nenhum curso localizado com os critérios selecionados.</p>
                </div>
            `);
        }
    } else if (msg) {
        msg.remove();
    }
}

function atualizarResumoDescoberta(totalVisiveis, filtros = {}) {
    const countEl = document.getElementById("discoveryCount");
    const activeEl = document.getElementById("activeFilters");
    if (!countEl || !activeEl) return;

    countEl.textContent = String(totalVisiveis || 0);

    const chips = [];
    if (filtros.idade && filtros.idade !== "Todas") chips.push(`Idade: ${filtros.idade}`);
    if (filtros.local && filtros.local !== "Todos") chips.push(`Local: ${filtros.local}`);

    const categoriaEfetiva =
        filtros.categoria && filtros.categoria !== "Todas"
            ? filtros.categoria
            : (filtros.pill || "");
    if (categoriaEfetiva && categoriaEfetiva !== "Geral") chips.push(`Categoria: ${categoriaEfetiva}`);

    if (chips.length === 0) {
        activeEl.innerHTML = '<span class="active-filter empty">Nenhum filtro aplicado</span>';
        return;
    }

    activeEl.innerHTML = chips
        .map(texto => `<span class="active-filter">${texto}</span>`)
        .join("");
}


/* =========================================================
   2. API: ESTATÍSTICAS E CURSOS
========================================================= */
async function obterCursosParaEstatisticas(cursosCarregados = null) {
    if (Array.isArray(cursosCarregados)) {
        return cursosCarregados;
    }

    const res = await fetch('/api/cursos-public');
    if (!res.ok) {
        return [];
    }

    return res.json();
}

function somarVagasDisponiveis(cursos) {
    if (!Array.isArray(cursos)) {
        return 0;
    }

    return cursos.reduce((total, curso) => {
        const vagas = parseInt(curso.vagas, 10) || 0;
        if (curso.status !== 'esgotado' && vagas > 0) {
            return total + vagas;
        }
        return total;
    }, 0);
}

async function carregarEstatisticas(cursosCarregados = null) {
    try {
        const cursos = await obterCursosParaEstatisticas(cursosCarregados);
        const totalDisponiveis = somarVagasDisponiveis(cursos);
        const elVagasHoje = document.getElementById('vagasHoje');

        if (elVagasHoje) {
            elVagasHoje.innerText = totalDisponiveis.toLocaleString('pt-BR');
        }
    } catch (err) {
        console.error("Erro ao puxar estatísticas.");
    }
}

async function carregarCursos() {
    try {
        const res = await fetch('/api/cursos-public');
        if (!res.ok) return [];
        
        const cursos = await res.json();
        exibirCursos(cursos);
        atualizarCursosDestaque(cursos, true);
        return cursos;
    } catch (err) {
        console.error("Erro ao carregar cursos.");
        return [];
    }
}

function atualizarCursosDestaque(cursos, reiniciar = false) {
    if (!Array.isArray(cursos)) return;

    cursosDestaqueDisponiveis = cursos.filter((curso) => {
        const vagas = parseInt(curso.vagas, 10) || 0;
        return curso.status !== 'esgotado' && vagas > 0;
    });

    if (reiniciar || indiceDestaqueAtual >= cursosDestaqueDisponiveis.length) {
        indiceDestaqueAtual = 0;
    }

    renderizarCursosDestaque(false);
}

function renderizarCursosDestaque(avancar = true) {
    const lista = document.getElementById('destaquesCursosLista');
    const status = document.getElementById('mcStatusDestaque');
    if (!lista) return;

    if (!cursosDestaqueDisponiveis.length) {
        if (status) status.textContent = 'Sem vagas no momento';
        lista.innerHTML = `
            <div class="mc-item" style="border-bottom: none;">
                <div class="mc-num" style="background: #94A3B8; color: #fff;">!</div>
                <div class="mc-item-text">
                    <strong>Nenhum curso disponível agora</strong>
                    <span>Atualizando automaticamente...</span>
                </div>
                <div class="mc-arrow">↻</div>
            </div>
        `;
        return;
    }

    if (status) status.textContent = `${cursosDestaqueDisponiveis.length} cursos com vagas abertas`;

    const totalExibir = Math.min(3, cursosDestaqueDisponiveis.length);
    const itens = [];

    for (let i = 0; i < totalExibir; i++) {
        const idx = (indiceDestaqueAtual + i) % cursosDestaqueDisponiveis.length;
        const curso = cursosDestaqueDisponiveis[idx];
        const vagas = parseInt(curso.vagas, 10) || 0;
        const semBorda = i === totalExibir - 1 ? ' style="border-bottom: none;"' : '';

        itens.push(`
            <div class="mc-item mc-item-link"${semBorda} onclick="irParaDetalhes(${curso.id})" role="button" tabindex="0" aria-label="Ver detalhes de ${curso.nome || 'curso'}" onkeydown="if(event.key==='Enter' || event.key===' '){event.preventDefault(); irParaDetalhes(${curso.id});}">
                <div class="mc-num">${i + 1}</div>
                <div class="mc-item-text">
                    <strong>${curso.nome || 'Curso'}</strong>
                    <span>${vagas} vagas disponíveis</span>
                </div>
                <span class="mc-arrow-link" aria-hidden="true"><span>→</span></span>
            </div>
        `);
    }

    lista.innerHTML = itens.join('');

    if (avancar && cursosDestaqueDisponiveis.length > 1) {
        indiceDestaqueAtual = (indiceDestaqueAtual + 1) % cursosDestaqueDisponiveis.length;
    }
}

function iniciarMonitorDestaques() {
    if (!document.getElementById('destaquesCursosLista')) return;

    if (!timerRotacaoDestaque) {
        timerRotacaoDestaque = setInterval(() => {
            renderizarCursosDestaque(true);
        }, 10000);
    }

    if (!timerAtualizacaoDestaque) {
        timerAtualizacaoDestaque = setInterval(async () => {
            try {
                const res = await fetch('/api/cursos-public');
                if (!res.ok) return;
                const cursos = await res.json();
                atualizarCursosDestaque(cursos, false);
            } catch (_) {
                // Mantem o ultimo estado visivel e tenta novamente no proximo ciclo.
            }
        }, 45000);
    }
}

function exibirCursos(cursosFiltrados) {
    const container = document.getElementById('containerCursos');
    if (!container) return; 

    container.innerHTML = ''; 

    if (!Array.isArray(cursosFiltrados) || cursosFiltrados.length === 0) {
        gerenciarMensagemVazia(false);
        return;
    }

    cursosFiltrados.forEach(curso => {
        let statusClass = 'status-aberto';
        let vagasClass = 'aberto';
        let vagasTexto = curso.vagas ? `${curso.vagas} Vagas` : 'Vagas Disponíveis';
        let btnTexto = 'Ver Detalhes';
        let btnDisabled = '';

        if (curso.status === 'esgotado' || curso.vagas == 0 || String(curso.vagas).toLowerCase() === "esgotado") {
            statusClass = 'status-esgotado';
            vagasClass = 'esgotado';
            vagasTexto = 'Esgotado';
            btnTexto = 'Lista de Espera';
        } else if (parseInt(curso.vagas) <= 5) {
            statusClass = 'status-alerta';
            vagasClass = 'alerta';
        }

        let textoHorario = "Consulte o edital";
        if (curso.horario_inicio && curso.horario_termino) textoHorario = `${curso.horario_inicio} às ${curso.horario_termino}`;
        else if (curso.horario_inicio) textoHorario = `A partir das ${curso.horario_inicio}`;
        else if (curso.horario) textoHorario = curso.horario;

        let textoDuracao = "A definir";
        if (curso.data_inicio && curso.data_termino) textoDuracao = `${curso.data_inicio} até ${curso.data_termino}`;
        else if (curso.data_inicio) textoDuracao = `Início em ${curso.data_inicio}`;
        else if (curso.duracao) textoDuracao = curso.duracao;

        const idadeDisplay = (curso.idade_min && curso.idade_max) ? `${curso.idade_min} a ${curso.idade_max} anos` : (curso.idade || 'Livre');

        // INJEÇÃO DA VARIÁVEL data-nome AQUI PARA O FILTRO ENCONTRAR
        const cardHTML = `
            <div class="curso-card-novo ${statusClass}" 
                 data-idade-min="${curso.idade_min || 0}" 
                 data-idade-max="${curso.idade_max || 99}" 
                 data-categoria="${curso.categoria || ''}" 
                 data-nome="${curso.nome || curso.titulo || ''}" 
                 data-local="${curso.local || ''}">
                
                <div class="cc-header">
                    <span class="cc-tag">${curso.categoria || 'Geral'}</span>
                    <span class="cc-vagas ${vagasClass}">${vagasTexto}</span>
                </div>
                
                <h3 class="cc-title">${curso.nome || curso.titulo}</h3>
                
                <div class="cc-grid-info">
                    <div class="cc-info-item" title="Local">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        ${curso.local || 'Não informado'}
                    </div>
                    <div class="cc-info-item" title="Duração">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${textoDuracao}
                    </div>
                    <div class="cc-info-item" title="Data/Calendário">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        15/04/2026
                    </div>
                    <div class="cc-info-item" title="Idade">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        ${idadeDisplay}
                    </div>
                </div>

                <div class="cc-horario-box">
                    <span class="cc-horario-label">HORÁRIO</span>
                    <span class="cc-horario-text">${textoHorario}</span>
                </div>

                <button class="cc-btn" ${btnDisabled} onclick="irParaDetalhes(${curso.id})">${btnTexto}</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function irParaDetalhes(id) {
    if (!id) return;
    const timestamp = new Date().getTime();
    window.location.href = `/pages/detalhes.html?id=${id}&v=${timestamp}`;
}

async function carregarFiltros() {
    try {
        let r1 = await fetch("/public/idade");
        let idades = await r1.json();
        let selIdade = document.querySelector("#filtro-idade");
        if(selIdade) {
            selIdade.innerHTML = '<option value="">Todas</option>';
            idades.forEach(i => selIdade.innerHTML += `<option>${i.idade}</option>`);
        }

        let r2 = await fetch("/public/categoria");
        let categorias = await r2.json();
        let selCategoria = document.querySelector("#filtro-categoria");
        if(selCategoria) {
            selCategoria.innerHTML = '<option value="">Todas</option>';
            categorias.forEach(c => selCategoria.innerHTML += `<option>${c.categoria}</option>`);
        }

        let r4 = await fetch("/public/local");
        let locais = await r4.json();
        let selLocal = document.querySelector("#filtro-local");
        if(selLocal) {
            selLocal.innerHTML = '<option value="">Todos</option>';
            locais.forEach(l => selLocal.innerHTML += `<option>${l.local}</option>`);
        }
    } catch (err) {
        console.error("Erro ao carregar opções de filtro.");
    }
}

/* =========================================================
   4. CHATBOT (VITORUGA)
========================================================= */
const avatarPadrao = "../imagem/Vitoruga.png";
const avatarCursos = {
    gastronomia: "../imagem/Vitoruga gastronômica.png",
    culinaria: "../imagem/Vitoruga gastronômica.png",
    cozinha: "../imagem/Vitoruga gastronômica.png",
    artesanato: "../imagem/Vitoruga artesã.png",
    artesanal: "../imagem/Vitoruga artesã.png",
    metalurgia: "../imagem/Vitoruga metalurgica.png",
    mecanica: "../imagem/Vitoruga metalurgica.png",
    soldagem: "../imagem/Vitoruga metalurgica.png",
    solda: "../imagem/Vitoruga metalurgica.png",
    construcao: "../imagem/Vitoruga construção civil.png",
    pedreiro: "../imagem/Vitoruga construção civil.png",
    obra: "../imagem/Vitoruga construção civil.png",
    civil: "../imagem/Vitoruga construção civil.png"
};

const mapaCursos = {
    "administração": ["adm", "admin", "administracao"],
    "artesanato": ["artes", "artesan"],
    "automação industrial": ["auto", "automacao", "industrial", "automa"],
    "beleza": ["estetica", "beleza"],
    "cinema": ["cine"],
    "comércio / gestão empresarial": ["comercio", "gestao", "empresarial", "gest"],
    "confecção": ["confeccao", "confec"],
    "construção civil / serviço": ["construcao", "civil", "servico", "obra"],
    "cultura": ["cultur"],
    "dança": ["danca"],
    "dança e teatro": ["teatro", "danca"],
    "educação": ["educa"],
    "eletrônica": ["eletron", "eletronica"],
    "eletricista / energia": ["eletric", "energia"],
    "enfermagem / saúde": ["enf", "enfermagem", "saude"],
    "estética": ["estetica"],
    "eventos": ["event"],
    "fotografia": ["foto", "fotografia"],
    "gastronomia": ["gastro", "cozinha"],
    "gestão": ["gestao", "gest"],
    "idiomas": ["idioma", "ingles", "espanhol", "frances"],
    "informática / tecnologia": ["info", "informatica", "tec", "tecnologia", "ti"],
    "logística": ["log", "logistica"],
    "manutenção": ["manutencao", "manu"],
    "mecânica": ["mec", "mecanica"],
    "meio ambiente": ["ambiente", "meio"],
    "moda": ["moda", "fashion"],
    "música": ["mus", "musica"],
    "panificação / confeitaria": ["pani", "pao", "confeitaria"],
    "produção cultural": ["producao", "cultural"],
    "programação / ti": ["programacao", "programar", "prog", "dev", "codigo", "ti"],
    "recursos humanos": ["rh", "recurso", "humanos"],
    "redes / telecom": ["redes", "telecom", "net", "wifi", "rede"],
    "segurança do trabalho": ["seg", "seguranca", "trabalho", "sst"],
    "serviço social": ["servico", "social", "ss"],
    "soldagem": ["solda", "sold"],
    "turismo / hotelaria": ["tur", "turismo", "hotelaria", "hotel"],
    "vendas / marketing": ["vendas", "marketing", "mkt"]
};

document.addEventListener('DOMContentLoaded', () => {
    const chatBtn = document.getElementById('avatarImg'); 
    const chatWindow = document.getElementById('chatWindow');
    const chatBody = document.getElementById('chatBody');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const muteToggle = document.getElementById('muteToggle');
    const mascoteImg = document.getElementById("avatarMascote");
    
    let muted = false;

    if (!chatWindow || !chatBtn) return; 

    chatBtn.addEventListener('click', () => {
        const isOpening = chatWindow.style.display !== 'block';
        if (isOpening) {
            chatWindow.style.display = 'block';
            document.body.classList.add('chat-active');
            chatInput.focus();
        } else {
            chatWindow.style.display = 'none';
            document.body.classList.remove('chat-active');
        }
    });

    if (muteToggle) {
        muteToggle.addEventListener('click', () => {
            muted = !muted;
            muteToggle.innerHTML = muted ? `
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                </svg>
            ` : `
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
            `;
            if (muted && speechSynthesis.speaking) speechSynthesis.cancel();
        });
    }

    function atualizarAvatarSeCurso(texto) {
        const t = normalizarTextoCategoria(texto);
        if (!t.includes("curso")) {
            if(mascoteImg) mascoteImg.src = avatarPadrao;
            return;
        }

        let encontrou = false;
        for (const key in avatarCursos) {
            if (t.includes(key)) {
                if(mascoteImg) mascoteImg.src = avatarCursos[key];
                encontrou = true;
                break;
            }
        }
        if (!encontrou && mascoteImg) mascoteImg.src = avatarPadrao;
    }

    if(chatInput) {
        chatInput.addEventListener("input", e => atualizarAvatarSeCurso(e.target.value));
        chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') enviarMensagem(); });
    }
    if(chatSend) chatSend.addEventListener('click', enviarMensagem);

    function startAvatarTalking() { if(chatBtn) chatBtn.classList.add('talking'); }
    function stopAvatarTalking() { if(chatBtn) chatBtn.classList.remove('talking'); }

    function speak(text) {
        if (muted || !text.trim()) return;
        if (speechSynthesis.speaking) speechSynthesis.cancel();

        let t = text.replace(/<[^>]+>/g, "").replace(/[*_~`]/g, "").replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF][\uDC00-\uDFFF])/g, "");
        t = t.replace(/—/g, " - ").replace(/\s+/g, " ").trim();

        const utter = new SpeechSynthesisUtterance(t);
        utter.lang = "pt-BR";
        utter.onstart = startAvatarTalking;
        utter.onend = stopAvatarTalking;
        speechSynthesis.speak(utter);
    }

    function addMessage(who, htmlText) {
        const div = document.createElement('div');
        div.className = `chat-msg ${who === 'user' ? 'user' : 'bot'}`;
        const bubble = document.createElement('div');
        bubble.className = 'bubble';

        const text = htmlText.replace(
            /(https?:\/\/[^\s]*pre_inscricao\.html\?id=\d+|pre_inscricao\.html\?id=\d+)/g,
            `<a href="$1" style="background:#10B981;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:bold;display:block;margin-top:6px;text-align:center;">Realizar Pré-inscrição</a>`
        );

        bubble.innerHTML = text;
        div.appendChild(bubble);
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;

        if (who === 'bot') speak(text.replace(/<[^>]*>?/gm, ''));
    }

    function filtrarCursosChat(respostaBruta, textoUsuario) {
        const user = normalizarTextoCategoria(textoUsuario);
        let termo = user.replace(/curso(s)?\s*(de)?\s*/g, "").trim();

        if (!termo) return respostaBruta;
        const termoNorm = normalizarTextoCategoria(termo);

        const sinonimos = [];
        for (const nome in mapaCursos) {
            sinonimos.push({ nome, nomeNorm: normalizarTextoCategoria(nome), keys: mapaCursos[nome].map(normalizarTextoCategoria) });
        }

        const cursosDetectados = sinonimos.filter(c => {
            return c.nomeNorm.includes(termoNorm) || termoNorm.includes(c.nomeNorm) || c.keys.some(k => k.startsWith(termoNorm)) || c.keys.some(k => termoNorm.startsWith(k));
        });

        if (cursosDetectados.length === 0) return `Não foram encontrados cursos relacionados ao termo "${termo}".`;

        const blocos = respostaBruta.split(/📘/g).map(b => b.trim()).filter(b => b.length > 5);
        const resultados = [];

        for (const bloco of blocos) {
            const blocoNorm = normalizarTextoCategoria(bloco);
            if (cursosDetectados.some(c => blocoNorm.includes(c.nomeNorm))) resultados.push("• " + bloco);
        }

        if (resultados.length === 0) return `O curso foi localizado, porém as informações não estão disponíveis no momento.`;

        return `Localizamos <b>${resultados.length}</b> curso(s) relacionado(s) a <b>${termo}</b>:<br><br>${resultados.join("<br><br>")}`;
    }

    async function enviarMensagem() {
        const text = chatInput.value.trim();
        if (!text) return;

        atualizarAvatarSeCurso(text); 
        addMessage('user', text);
        chatInput.value = ''; 

        if (/inscri|inscrever|matricul|pre[- ]?inscri/i.test(text)) {
            addMessage('bot', `Para prosseguir com sua solicitação, clique no botão abaixo e preencha o formulário de pré-inscrição:<br><br><a href="pre_inscricao.html" style="background:#10B981;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Formulário de Pré-inscrição</a>`);
            return;
        }

        try {
            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            const respostaFiltrada = filtrarCursosChat(data.reply, text);
            addMessage('bot', respostaFiltrada);
        } catch (err) {
            addMessage('bot', 'Houve um erro de comunicação com o servidor. Por favor, tente novamente mais tarde.');
        }
    }
});

/* =========================================================
   5. SISTEMA DE AVALIAÇÃO PROFISSIONAL (QUIZ)
========================================================= */
const perguntasQuiz = [
    {
        pergunta: "1. Como você prefere atuar em suas atividades profissionais diárias?",
        respostas: [
            { texto: "A) Preparando alimentos e elaborando processos gastronômicos.", categoria: "gastronomia" },
            { texto: "B) Utilizando ferramentas para montagem, reparos e operação técnica.", categoria: "manutencao" },
            { texto: "C) Atuando com cuidados pessoais, saúde, estética ou beleza.", categoria: "beleza" },
            { texto: "D) Utilizando recursos tecnológicos para organização, dados e gestão.", categoria: "tecnologia" }
        ]
    },
    {
        pergunta: "2. Se você fosse iniciar um empreendimento autônomo hoje, qual seria o setor?",
        respostas: [
            { texto: "A) Comércio de alimentos, confeitaria ou serviços de buffet.", categoria: "gastronomia" },
            { texto: "B) Centro de estética, salão de beleza ou serviços voltados ao bem-estar.", categoria: "beleza" },
            { texto: "C) Empresa de prestação de serviços técnicos, reparos ou oficina.", categoria: "manutencao" },
            { texto: "D) Consultoria administrativa, serviços digitais ou suporte em TI.", categoria: "tecnologia" }
        ]
    },
    {
        pergunta: "3. Com qual conjunto de equipamentos você possui maior afinidade?",
        respostas: [
            { texto: "A) Equipamentos de cozinha industriais e utensílios culinários.", categoria: "gastronomia" },
            { texto: "B) Sistemas operacionais, planilhas e softwares de gestão.", categoria: "tecnologia" },
            { texto: "C) Instrumentos de estética, cosméticos e cuidados corporais/capilares.", categoria: "beleza" },
            { texto: "D) Equipamentos de elétrica, maquinário e ferramentas manuais.", categoria: "manutencao" }
        ]
    },
    {
        pergunta: "4. Em um ambiente de trabalho focado, você prefere desenvolver:",
        respostas: [
            { texto: "A) Atividades dinâmicas focadas na produção manual de consumo.", categoria: "gastronomia" },
            { texto: "B) Interação direta com o público com foco em atendimento e imagem.", categoria: "beleza" },
            { texto: "C) Concentração na análise técnica e resolução de problemas físicos.", categoria: "manutencao" },
            { texto: "D) Trabalho analítico, processos organizacionais e operação de sistemas.", categoria: "tecnologia" }
        ]
    },
    {
        pergunta: "5. Em uma situação de necessidade técnica de terceiros, qual demanda você atenderia melhor?",
        respostas: [
            { texto: "A) Solução de problemas em redes e formatação de computadores.", categoria: "tecnologia" },
            { texto: "B) Reparo em painéis elétricos ou diagnóstico de equipamentos defeituosos.", categoria: "manutencao" },
            { texto: "C) Auxílio na preparação visual e orientação de estética.", categoria: "beleza" },
            { texto: "D) Organização, planejamento e execução de cardápios para eventos.", categoria: "gastronomia" }
        ]
    },
    {
        pergunta: "6. Qual é o seu principal objetivo estratégico ao buscar qualificação profissional?",
        respostas: [
            { texto: "A) Produzir, inovar e comercializar produtos do setor alimentício.", categoria: "gastronomia" },
            { texto: "B) Ingressar no mercado corporativo ou consolidar-se no setor administrativo.", categoria: "tecnologia" },
            { texto: "C) Prestar serviços técnicos especializados, seja de forma autônoma ou industrial.", categoria: "manutencao" },
            { texto: "D) Desenvolver uma carteira de clientes no mercado de estética e cuidados pessoais.", categoria: "beleza" }
        ]
    },
    {
        pergunta: "7. Qual infraestrutura de aprendizado está mais alinhada às suas expectativas?",
        respostas: [
            { texto: "A) Laboratório de informática e infraestrutura voltada à gestão.", categoria: "tecnologia" },
            { texto: "B) Estrutura equipada com bancadas e instrumentos para procedimentos estéticos.", categoria: "beleza" },
            { texto: "C) Cozinha industrial equipada com fornos, fogões e maquinário de panificação.", categoria: "gastronomia" },
            { texto: "D) Oficina laboratorial contendo painéis de comandos elétricos e motores.", categoria: "manutencao" }
        ]
    }
];

let perguntaAtual = 0;
let pontuacao = { gastronomia: 0, beleza: 0, manutencao: 0, tecnologia: 0 };

document.addEventListener('DOMContentLoaded', () => {
    const btnAbrirQuiz = document.getElementById('btnAbrirQuiz');
    const quizModal = document.getElementById('quizModal');
    const btnFecharQuiz = document.getElementById('fecharQuiz');
    const quizBody = document.getElementById('quizBody');
    const quizResultado = document.getElementById('quizResultado');
    const btnSalvarLead = document.getElementById('btnSalvarLead');

    if (!btnAbrirQuiz || !quizModal || !btnFecharQuiz || !quizBody || !quizResultado || !btnSalvarLead) {
        return;
    }

    btnAbrirQuiz.addEventListener('click', () => {
        perguntaAtual = 0;
        pontuacao = { gastronomia: 0, beleza: 0, manutencao: 0, tecnologia: 0 };
        quizResultado.style.display = 'none';
        quizBody.style.display = 'block';
        mostrarPergunta();
        quizModal.classList.add('is-open');
    });

    btnFecharQuiz.addEventListener('click', () => {
        quizModal.classList.remove('is-open');
    });

    quizModal.addEventListener('click', (event) => {
        if (event.target === quizModal) {
            quizModal.classList.remove('is-open');
        }
    });

    function mostrarPergunta() {
        const dadosPergunta = perguntasQuiz[perguntaAtual];
        if (!dadosPergunta) {
            mostrarResultado();
            return;
        }

        quizBody.innerHTML = '';

        const titulo = document.createElement('div');
        titulo.className = 'quiz-pergunta';
        titulo.innerText = dadosPergunta.pergunta;
        quizBody.appendChild(titulo);

        dadosPergunta.respostas.forEach(resposta => {
            const botao = document.createElement('button');
            botao.className = 'quiz-option';
            botao.innerText = resposta.texto;
            
            botao.addEventListener('click', () => {
                pontuacao[resposta.categoria]++;
                perguntaAtual++;
                
                if (perguntaAtual < perguntasQuiz.length) mostrarPergunta();
                else mostrarResultado();
            });
            quizBody.appendChild(botao);
        });
    }

    function mostrarResultado() {
        quizBody.style.display = 'none';
        quizResultado.style.display = 'block';
        
        let categoriaVencedora = Object.keys(pontuacao).reduce((a, b) => pontuacao[a] > pontuacao[b] ? a : b);
        
        const mensagens = {
            gastronomia: { 
                titulo: "Seu Perfil: Gastronomia e Alimentação", 
                texto: "Sua avaliação indica forte aderência às atividades de produção alimentícia. A área oferece excelentes perspectivas tanto para empreendedorismo quanto para atuação em cozinhas industriais e estabelecimentos comerciais." 
            },
            beleza: { 
                titulo: "Seu Perfil: Estética e Cuidados Pessoais", 
                texto: "Sua análise demonstra grande capacidade analítica para cuidados interpessoais. Trata-se de um mercado em constante expansão, ideal para profissionais dedicados e com perfil autônomo ou de liderança em centros de estética." 
            },
            manutencao: { 
                titulo: "Seu Perfil: Manutenção Técnica e Reparos", 
                texto: "O resultado aponta para um perfil altamente prático e resolutivo. O setor industrial e de serviços demanda de forma contínua profissionais qualificados em áreas como elétrica, refrigeração e mecânica." 
            },
            tecnologia: { 
                titulo: "Seu Perfil: Tecnologia e Gestão Administrativa", 
                texto: "Identificamos uma forte compatibilidade com o ambiente corporativo e sistemas digitais. Áreas administrativas, análise de dados e suporte tecnológico são setores com altos índices de empregabilidade para o seu perfil." 
            }
        };

        document.getElementById('resultadoTitulo').innerText = mensagens[categoriaVencedora].titulo;
        document.getElementById('resultadoTexto').innerText = mensagens[categoriaVencedora].texto;
    }

    btnSalvarLead.addEventListener('click', async () => {
        const nomeInput = document.getElementById('leadNome');
        const whatsappInput = document.getElementById('leadWhatsapp');
        const emailInput = document.getElementById('leadEmail');
        const regiaoInput = document.getElementById('leadRegiao');

        if (!nomeInput || !whatsappInput || !emailInput || !regiaoInput) {
            alert('Nao foi possivel carregar o formulario do quiz. Recarregue a pagina.');
            return;
        }

        const nome = nomeInput.value.trim();
        const whatsapp = whatsappInput.value.trim();
        const email = emailInput.value.trim();
        const regiao = regiaoInput.value;
        const perfil = Object.keys(pontuacao).reduce((a, b) => pontuacao[a] > pontuacao[b] ? a : b);

        if (nome && whatsapp && email && regiao) {
            try {
                const res = await fetch('/api/interessados', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, whatsapp, email, regiao, perfil })
                });
                
                if (res.ok) {
                    alert(`Cadastro realizado com sucesso, ${nome}. Você será notificado sobre a abertura de novas turmas relacionadas ao seu perfil em sua região.`);
                    quizModal.classList.remove('is-open');
                    nomeInput.value = '';
                    whatsappInput.value = '';
                    emailInput.value = '';
                    regiaoInput.value = '';
                } else {
                    alert('Houve uma falha no registro dos dados. Por favor, tente novamente.');
                }
            } catch (erro) {
                alert('Falha na comunicação com o servidor de banco de dados.');
            }
        } else {
            alert('Aviso: É necessário preencher todos os campos solicitados para efetuar o registro.');
        }
    });
});