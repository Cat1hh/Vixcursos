document.addEventListener("DOMContentLoaded", () => {
    
    // =========================================================
    // 1. VERIFICA SE TEM CURSO NA URL (Trava de Segurança)
    // =========================================================
    const urlParams = new URLSearchParams(window.location.search);
    const cursoId = urlParams.get('id');
    const cursoNome = urlParams.get('nome') || 'o curso selecionado'; 

    if (!cursoId) {
        alert("⚠️ Atenção: Você precisa selecionar um curso primeiro!");
        window.location.href = "index.html"; 
        return;
    }

    // =========================================================
    // 2. VARIÁVEIS GERAIS DO CHATBOT
    // =========================================================
    const chatBox = document.getElementById('chatBox');
    const optionsWrapper = document.getElementById('optionsWrapper');
    const documentWrapper = document.getElementById('documentWrapper');
    const documentInput = document.getElementById('documentInput');
    const documentButton = document.getElementById('documentButton');
    const documentNote = document.getElementById('documentNote');
    const documentPreview = document.getElementById('documentPreview');
    const textInputWrapper = document.getElementById('textInputWrapper');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    
    let etapaAtual = 0;
    let aguardandoEscolhaCpf = false;
    let aguardandoConfirmacaoFoto = false;
    let dadosSalvos = null;
    let modoAutoPreenchimento = false;
    let documentoPendente = null;
    const respostasUsuario = {
        curso_id: cursoId,
        possui_necessidade_especial: 'nao',
        tipo_necessidade_especial: '',
        imagem_autorizada: 'sim', // Padrão
        termo_aceito: 'on' // Forçado pelo bot
    };

    // =========================================================
    // 3. ROTEIRO DE PERGUNTAS (A Mágica da Conversa)
    // =========================================================
    const roteiro = [
        {
            pergunta: `Olá! 🐢 Eu sou o Vitoruga, assistente virtual da Vix Cursos. Que legal que você quer se inscrever para <strong>${cursoNome}</strong>! <br><br>Pra começar, qual é o seu <strong>Nome Completo</strong>?`,
            tipo: "texto",
            chave: "nome"
        },
        {
            pergunta: "Prazer em te conhecer! Agora digite seu <strong>CPF</strong> no campo abaixo, só com os números.",
            tipo: "texto",
            chave: "cpf",
            mascara: true
        },
        {
            pergunta: "Perfeito. Agora me informe o número do seu <strong>RG</strong>.",
            tipo: "texto",
            chave: "rg"
        },
        {
            pergunta: "Agora envie uma foto do seu <strong>CPF</strong>. No celular, tire a foto; no computador, anexe o arquivo.",
            tipo: "arquivo",
            chave: "cpf_documento"
        },
        {
            pergunta: "Agora envie uma foto do seu <strong>RG</strong>. No celular, tire a foto; no computador, anexe o arquivo.",
            tipo: "arquivo",
            chave: "rg_documento"
        },
        {
            pergunta: "Ótimo. Qual é o seu <strong>E-mail</strong>?",
            tipo: "texto",
            chave: "email"
        },
        {
            pergunta: "Show! E qual o seu <strong>WhatsApp/Celular</strong> pra gente manter contato?",
            tipo: "texto",
            chave: "telefone",
            mascara: true
        },
        {
            pergunta: "Perfeito. Uma pergunta importante: Você <strong>mora ou trabalha no município de Vitória/ES?</strong>",
            tipo: "botoes",
            chave: "mora_vitoria",
            opcoes: [
                { texto: "Sim, sou morador/trabalho em VIX", valor: "sim" },
                { texto: "Não sou morador/não trabalho", valor: "nao" }
            ]
        },
        {
            pergunta: "Certo. Agora me diga, qual é o seu <strong>Grau de Escolaridade</strong>?",
            tipo: "botoes",
            chave: "escolaridade",
            opcoes: [
                { texto: "Ensino Fundamental Incompleto", valor: "Ensino Fundamental Incompleto" },
                { texto: "Ensino Fundamental Completo", valor: "Ensino Fundamental Completo" },
                { texto: "Ensino Médio Incompleto", valor: "Ensino Médio Incompleto" },
                { texto: "Ensino Médio Completo", valor: "Ensino Médio Completo" },
                { texto: "Ensino Superior Completo", valor: "Ensino Superior Completo" }
            ]
        },
        {
            pergunta: "Você possui alguma <strong>necessidade especial</strong>? (ex: autismo, surdez, cadeirante)",
            tipo: "botoes",
            chave: "tipo_necessidade_especial",
            opcoes: [
                { texto: "Não tenho", valor: "nao" },
                { texto: "Autismo", valor: "autismo" },
                { texto: "Surdez", valor: "surdez" },
                { texto: "Cadeirante", valor: "cadeirante" },
                { texto: "Baixa visão", valor: "baixa_visao" },
                { texto: "Outra", valor: "outra" }
            ]
        },
        {
            pergunta: "Me informa o seu <strong>CEP</strong> por favor? (Vou tentar achar sua rua sozinho 🕵️)",
            tipo: "texto",
            chave: "cep",
            mascara: true,
            buscaCep: true
        },
        {
            pergunta: "E qual é o <strong>Número</strong> da sua residência?",
            tipo: "texto",
            chave: "numero"
        },
        {
            pergunta: "Atenção: A matrícula não garante a vaga, é preciso apresentar os documentos pessoalmente. <strong>Você leu e aceita as condições?</strong>",
            tipo: "botoes",
            chave: "confirmacao_final",
            opcoes: [
                { texto: "Sim, eu aceito e quero confirmar!", valor: "sim" },
                { texto: "Não aceito. Cancelar.", valor: "nao" }
            ]
        }
    ];


    // =========================================================
    // 4. FUNÇÕES DO CHAT (Interface e Animações)
    // =========================================================
    
    function rolarParaFinal() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Faz o bot parecer que está "Pensando..."
    async function mostrarDigitando(tempo = 1000) {
        const idDigitando = `typing-${Date.now()}`;
        const div = document.createElement('div');
        div.className = 'msg msg-bot';
        div.id = idDigitando;
        div.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        chatBox.appendChild(div);
        rolarParaFinal();
        
        return new Promise(resolve => {
            setTimeout(() => {
                document.getElementById(idDigitando).remove();
                resolve();
            }, tempo);
        });
    }

    function addMensagemBot(texto) {
        const div = document.createElement('div');
        div.className = 'msg msg-bot';
        div.innerHTML = texto;
        chatBox.appendChild(div);
        rolarParaFinal();
    }

    function addMensagemUsuario(texto) {
        const div = document.createElement('div');
        div.className = 'msg msg-user';
        div.innerHTML = texto;
        chatBox.appendChild(div);
        rolarParaFinal();
    }

    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
    }

    function isMobileDevice() {
        return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    }

    function normalizarCpf(valor) {
        return String(valor || '').replace(/\D/g, '').slice(0, 11);
    }

    function normalizarRg(valor) {
        return String(valor || '').trim().toUpperCase().replace(/\s+/g, ' ').slice(0, 20);
    }

    function formatarCpf(valor) {
        const cpf = normalizarCpf(valor);
        return cpf
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    function aplicarDadosSalvosNosCampos() {
        if (!dadosSalvos) return;

        ['nome', 'email', 'telefone', 'rg', 'mora_vitoria', 'escolaridade', 'possui_necessidade_especial', 'tipo_necessidade_especial', 'cep', 'numero', 'rua', 'bairro', 'municipio'].forEach(campo => {
            if (dadosSalvos[campo]) {
                respostasUsuario[campo] = dadosSalvos[campo];
            }
        });

        if (dadosSalvos.cpf) {
            respostasUsuario.cpf = dadosSalvos.cpf;
        }
    }

    function obterPassoAtual() {
        return roteiro[etapaAtual] || null;
    }

    function obterConfigDocumentoAtual() {
        const passoAtual = obterPassoAtual();
        if (!passoAtual || passoAtual.tipo !== 'arquivo') {
            return {
                nome: 'documento',
                artigo: 'do',
                chave: null
            };
        }

        if (passoAtual.chave === 'cpf_documento') {
            return { nome: 'CPF', artigo: 'do', chave: 'cpf_documento' };
        }

        return { nome: 'RG', artigo: 'do', chave: 'rg_documento' };
    }

    async function buscarDadosPorCpf(cpf) {
        const cpfLimpo = normalizarCpf(cpf);
        if (cpfLimpo.length !== 11) return null;

        try {
            const response = await fetch(`/api/pre-inscricoes/por-cpf/${cpfLimpo}`);
            if (!response.ok) return null;

            const data = await response.json();
            return data.found ? data.data : null;
        } catch (error) {
            console.error('Erro ao buscar dados do CPF', error);
            return null;
        }
    }

    function toDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function comprimirImagem(file, maxLado = 1280, qualidade = 0.82) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;

                    if (width > height && width > maxLado) {
                        height = Math.round((height * maxLado) / width);
                        width = maxLado;
                    } else if (height >= width && height > maxLado) {
                        width = Math.round((width * maxLado) / height);
                        height = maxLado;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Falha ao processar imagem.'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', qualidade);
                    resolve(dataUrl);
                };

                img.onerror = () => reject(new Error('Imagem inválida.'));
                img.src = reader.result;
            };

            reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
            reader.readAsDataURL(file);
        });
    }

    function configurarCapturaDocumento() {
        const mobile = isMobileDevice();
        const documentoAtual = obterConfigDocumentoAtual();
        documentInput.removeAttribute('capture');
        documentInput.setAttribute('accept', mobile ? 'image/*' : 'image/*,application/pdf');

        if (mobile) {
            documentInput.setAttribute('capture', 'environment');
            documentButton.textContent = `Tirar foto ${documentoAtual.artigo} ${documentoAtual.nome}`;
            documentNote.textContent = `Toque no botão para tirar a foto ${documentoAtual.artigo} seu ${documentoAtual.nome} usando a câmera do celular.`;
        } else {
            documentButton.textContent = `Anexar arquivo ${documentoAtual.artigo} ${documentoAtual.nome}`;
            documentNote.textContent = `Clique no botão para anexar a imagem ou PDF do seu ${documentoAtual.nome} pelo computador.`;
        }
    }

    function esconderCamposEspeciais() {
        textInputWrapper.style.display = 'none';
        optionsWrapper.style.display = 'none';
        documentWrapper.style.display = 'none';
    }

    async function mostrarPerguntaAtual() {
        if (etapaAtual >= roteiro.length) {
            finalizarInscricaoMagica();
            return;
        }

        const passoAtual = roteiro[etapaAtual];
        await mostrarDigitando(1200);
        addMensagemBot(passoAtual.pergunta);

        esconderCamposEspeciais();

        if (passoAtual.tipo === 'texto') {
            const valorPadrao = dadosSalvos && dadosSalvos[passoAtual.chave] ? dadosSalvos[passoAtual.chave] : '';
            userInput.value = valorPadrao;
            userInput.type = passoAtual.chave === 'telefone' ? 'tel' : 'text';
            textInputWrapper.style.display = 'flex';
            userInput.focus();
            if (valorPadrao) {
                userInput.setSelectionRange(userInput.value.length, userInput.value.length);
            }
        } else if (passoAtual.tipo === 'botoes') {
            optionsWrapper.innerHTML = '';
            passoAtual.opcoes.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.innerText = opt.texto;
                btn.onclick = () => processarProximaEtapa(opt.valor, opt.texto);
                optionsWrapper.appendChild(btn);
            });
            optionsWrapper.style.display = 'flex';
        } else if (passoAtual.tipo === 'arquivo') {
            configurarCapturaDocumento();
            documentWrapper.style.display = 'flex';
            documentInput.value = '';
            documentPreview.style.display = 'none';
        }
    }

    // =========================================================
    // 5. MÁSCARAS E BUSCA DE CEP 
    // =========================================================
    userInput.addEventListener('input', function(e) {
        const passoAtual = roteiro[etapaAtual];
        if (!passoAtual || !passoAtual.mascara) return;

        let valor = e.target.value.replace(/\D/g,""); 

        if (passoAtual.chave === 'cpf') {
            valor = formatarCpf(valor);
            if(valor.length > 14) valor = valor.substring(0, 14);
        } else if (passoAtual.chave === 'telefone') {
            valor = valor.replace(/^(\d{2})(\d)/g,"($1) $2");
            valor = valor.replace(/(\d)(\d{4})$/,"$1-$2");
            if(valor.length > 15) valor = valor.substring(0, 15);
        } else if (passoAtual.chave === 'cep') {
            valor = valor.replace(/^(\d{5})(\d)/,"$1-$2");
            if(valor.length > 9) valor = valor.substring(0, 9);
        }
        e.target.value = valor;
    });

    async function buscarCepMagico(cepFormatado) {
        const cepNum = cepFormatado.replace(/\D/g, '');
        if (cepNum.length !== 8) return false;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepNum}/json/`);
            const data = await response.json();
            
            if (!data.erro) {
                respostasUsuario.rua = data.logradouro;
                respostasUsuario.bairro = data.bairro;
                respostasUsuario.municipio = data.localidade || "Vitória";
                
                await mostrarDigitando(800);
                addMensagemBot(`Achei! Rua <strong>${data.logradouro}</strong>, Bairro <strong>${data.bairro}</strong>. Legal, né?`);
                return true;
            }
        } catch (error) {
            console.error("Erro no CEP");
        }
        return false;
    }


    // =========================================================
    // 6. CONTROLADOR DE FLUXO (Avança as perguntas)
    // =========================================================
    async function processarProximaEtapa(respostaUser, labelExibida) {

        if (aguardandoEscolhaCpf) {
            addMensagemUsuario(labelExibida || (respostaUser === 'auto' ? 'Auto-preencher' : 'Quero mudar algo'));
            aguardandoEscolhaCpf = false;
            modoAutoPreenchimento = respostaUser === 'auto';

            if (modoAutoPreenchimento) {
                aplicarDadosSalvosNosCampos();
                await mostrarDigitando(900);
                addMensagemBot('Perfeito. Vou reaproveitar os dados já salvos e seguir para o envio das fotos dos documentos.');
            } else {
                await mostrarDigitando(900);
                addMensagemBot('Certo. Vou deixar os dados salvos como referência e você poderá ajustar o que quiser no restante do formulário.');
            }

            etapaAtual = modoAutoPreenchimento && dadosSalvos && dadosSalvos.rg
                ? roteiro.findIndex(item => item.chave === 'cpf_documento')
                : roteiro.findIndex(item => item.chave === 'rg');
            await mostrarPerguntaAtual();
            return;
        }

        if (aguardandoConfirmacaoFoto) {
            const confirmou = respostaUser === 'confirmar_foto';
            addMensagemUsuario(labelExibida || (confirmou ? 'Usar esta foto' : 'Trocar foto'));
            const documentoAtual = obterConfigDocumentoAtual();

            if (!confirmou) {
                aguardandoConfirmacaoFoto = false;
                documentoPendente = null;
                if (documentoAtual.chave) {
                    respostasUsuario[documentoAtual.chave] = '';
                    respostasUsuario[`${documentoAtual.chave}_nome`] = '';
                    respostasUsuario[`${documentoAtual.chave}_tipo`] = '';
                }

                await mostrarDigitando(700);
                addMensagemBot(`Sem problemas, envie outra foto ou arquivo do ${documentoAtual.nome}.`);
                await mostrarPerguntaAtual();
                return;
            }

            aguardandoConfirmacaoFoto = false;
            if (documentoAtual.chave) {
                respostasUsuario[documentoAtual.chave] = documentoPendente.dataUrl;
                respostasUsuario[`${documentoAtual.chave}_nome`] = documentoPendente.nome;
                respostasUsuario[`${documentoAtual.chave}_tipo`] = documentoPendente.tipo;
            }

            etapaAtual++;
            if (modoAutoPreenchimento && obterPassoAtual() && obterPassoAtual().chave === 'email') {
                etapaAtual = roteiro.findIndex(item => item.chave === 'confirmacao_final');
            }
            await mostrarPerguntaAtual();
            return;
        }
        
        // Esconde inputs enquanto processa
        esconderCamposEspeciais();

        // Mostra a resposta do usuário no chat
        if (respostaUser !== undefined) {
            addMensagemUsuario(labelExibida || respostaUser);
            
            // Salva no objeto geral do payload
            const chaveAtual = roteiro[etapaAtual].chave;
            respostasUsuario[chaveAtual] = chaveAtual === 'cpf'
                ? normalizarCpf(respostaUser)
                : (chaveAtual === 'rg' ? normalizarRg(respostaUser) : respostaUser);

            if (chaveAtual === 'cpf') {
                const cpfLimpo = normalizarCpf(respostaUser);
                if (cpfLimpo.length !== 11) {
                    await mostrarDigitando(800);
                    addMensagemBot('❌ CPF inválido. Digite apenas os 11 números corretos.');
                    etapaAtual = 1;
                    await mostrarPerguntaAtual();
                    return;
                }

                dadosSalvos = await buscarDadosPorCpf(cpfLimpo);
                if (dadosSalvos) {
                    await mostrarDigitando(1000);
                    addMensagemBot('Encontrei seus dados salvos no nosso banco. Você gostaria de auto-preencher ou quer mudar algo?');

                    optionsWrapper.innerHTML = '';

                    const botaoAuto = document.createElement('button');
                    botaoAuto.className = 'option-btn';
                    botaoAuto.innerText = 'Auto-preencher';
                    botaoAuto.onclick = () => processarProximaEtapa('auto', 'Auto-preencher');
                    optionsWrapper.appendChild(botaoAuto);

                    const botaoEditar = document.createElement('button');
                    botaoEditar.className = 'option-btn';
                    botaoEditar.innerText = 'Quero mudar algo';
                    botaoEditar.onclick = () => processarProximaEtapa('editar', 'Quero mudar algo');
                    optionsWrapper.appendChild(botaoEditar);

                    optionsWrapper.style.display = 'flex';
                    aguardandoEscolhaCpf = true;
                    return;
                }
            }

            if (chaveAtual === 'rg' && !normalizarRg(respostaUser)) {
                await mostrarDigitando(800);
                addMensagemBot('❌ RG inválido. Digite o número do RG para continuar.');
                await mostrarPerguntaAtual();
                return;
            }

            if (chaveAtual === 'email' && !validarEmail(respostaUser)) {
                await mostrarDigitando(800);
                addMensagemBot('❌ E-mail inválido. Digite um endereço válido, por exemplo: nome@dominio.com');
                await mostrarPerguntaAtual();
                return;
            }

            // Alerta especial de prioridade
            if (chaveAtual === 'mora_vitoria' && respostaUser === 'nao') {
                await mostrarDigitando(1500);
                addMensagemBot("ℹ️ Lembrete: Os cursos da Prefeitura oferecem prioridade para moradores de Vitória. Sua inscrição ficará em lista de espera secundária, ok?");
            }

            // Busca CEP mágica
            if (roteiro[etapaAtual].buscaCep) {
                await buscarCepMagico(respostaUser);
            }

            if (chaveAtual === 'tipo_necessidade_especial') {
                if (respostaUser === 'nao') {
                    respostasUsuario.possui_necessidade_especial = 'nao';
                    respostasUsuario.tipo_necessidade_especial = '';
                } else {
                    respostasUsuario.possui_necessidade_especial = 'sim';
                    respostasUsuario.tipo_necessidade_especial = labelExibida || respostaUser;
                }
            }

            etapaAtual++; // Avança
        }

        // Verifica se Acabou
        if (etapaAtual >= roteiro.length) {
            if (respostasUsuario.confirmacao_final === 'nao') {
                addMensagemBot("Poxa, que pena. Inscrição cancelada. Redirecionando...");
                setTimeout(() => window.location.href = "index.html", 2000);
                return;
            }
            finalizarInscricaoMagica();
            return;
        }

        await mostrarPerguntaAtual();
    }

    documentInput.addEventListener('change', async (event) => {
        const arquivo = event.target.files && event.target.files[0];
        if (!arquivo) return;

        try {
            const arquivoEhPdf = (arquivo.type || '').toLowerCase() === 'application/pdf';
            const dataUrl = arquivoEhPdf ? await toDataUrl(arquivo) : await comprimirImagem(arquivo);
            const documentoAtual = obterConfigDocumentoAtual();
            documentoPendente = {
                dataUrl,
                nome: arquivo.name,
                tipo: arquivo.type || (arquivoEhPdf ? 'application/pdf' : 'image/*')
            };

            documentPreview.innerHTML = `📎 <strong>${arquivo.name}</strong>`;
            documentPreview.style.display = 'flex';
            addMensagemUsuario(`📎 ${documentoAtual.nome}: ${arquivo.name}`);

            await mostrarDigitando(700);
            addMensagemBot(arquivoEhPdf
                ? `Recebi o arquivo do ${documentoAtual.nome}. Quer usar este documento ou trocar por outro?`
                : `Recebi a imagem do ${documentoAtual.nome}. Quer usar esta foto ou trocar por outra?`);

            optionsWrapper.innerHTML = '';
            const confirmarBtn = document.createElement('button');
            confirmarBtn.className = 'option-btn';
            confirmarBtn.innerText = 'Usar esta foto';
            confirmarBtn.onclick = () => processarProximaEtapa('confirmar_foto', 'Usar esta foto');
            optionsWrapper.appendChild(confirmarBtn);

            const trocarBtn = document.createElement('button');
            trocarBtn.className = 'option-btn';
            trocarBtn.innerText = 'Trocar foto';
            trocarBtn.onclick = () => processarProximaEtapa('trocar_foto', 'Trocar foto');
            optionsWrapper.appendChild(trocarBtn);

            documentWrapper.style.display = 'flex';
            optionsWrapper.style.display = 'flex';
            textInputWrapper.style.display = 'none';
            aguardandoConfirmacaoFoto = true;
        } catch (error) {
            await mostrarDigitando(500);
            addMensagemBot('❌ Não consegui processar esse arquivo. Tente outra imagem ou PDF válido.');
        }
    });

    documentButton.addEventListener('click', () => {
        documentInput.click();
    });

    // Botão de Enviar Texto
    sendBtn.addEventListener('click', () => {
        const txt = userInput.value.trim();
        if (txt) processarProximaEtapa(txt);
    });

    // Enviar no Enter
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const txt = userInput.value.trim();
            if (txt) processarProximaEtapa(txt);
        }
    });

    // =========================================================
    // 7. ENVIO FINAL PARA O BANCO DE DADOS (Igual o antigo)
    // =========================================================
    async function finalizarInscricaoMagica() {
        await mostrarDigitando(2000);
        addMensagemBot("Processando sua pré-inscrição junto à Prefeitura... ⏳");

        try {
            const res = await fetch('/inscricao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(respostasUsuario)
            });

            const resposta = await res.json();
            
            await mostrarDigitando(1000);
            
            if (res.ok && !resposta.error) {
                addMensagemBot(`🎉 <strong>SUCESSO!</strong> <br><br>Sua vaga foi reservada! <br>Aguarde o contato da coordenação.<br><br><em>Redirecionando em 5 segundos...</em>`);
                if (resposta.notificacoes && resposta.notificacoes.canal === 'sms') {
                    addMensagemBot('ℹ️ A confirmação foi enviada por <strong>SMS</strong>. Se você estava aguardando no WhatsApp, peça para a equipe habilitar o canal WhatsApp no Twilio.');
                }
                if (resposta.notificacoes && resposta.notificacoes.sms && resposta.notificacoes.sms !== 'enviado') {
                    if (resposta.notificacoes.sms === 'whatsapp-sandbox-nao-ativado') {
                        addMensagemBot('⚠️ Este número ainda não ativou o WhatsApp Sandbox da Twilio. No WhatsApp desse número, envie <strong>join round-select</strong> para <strong>+1 415 523 8886</strong> e tente novamente.');
                    } else if (resposta.notificacoes.sms === 'telefone-invalido') {
                        addMensagemBot('⚠️ Número inválido. Informe o WhatsApp com DDD.');
                    } else {
                        addMensagemBot(`⚠️ A mensagem não foi enviada agora (${resposta.notificacoes.sms}). Se o número estiver correto, verifique as configurações do Twilio no servidor.`);
                    }
                }
                setTimeout(() => window.location.href = "index.html", 5000); 
            } else {
                addMensagemBot(`❌ Erro: ${resposta.error || 'Vagas Esgotadas'} <br><br>Por favor, tente novamente mais tarde.`);
                // Botão de reiniciar
                setTimeout(() => window.location.reload(), 4000);
            }
        } catch (err) {
            addMensagemBot("❌ Falha na comunicação com o servidor. Verifique sua internet.");
        }
    }

    // =========================================================
    // INICIAR CONVERSA 
    // =========================================================
    // Espera 1 segundinho pra dar um "ar de carregamento" e dispara a primeira pergunta
    setTimeout(() => {
        mostrarPerguntaAtual();
    }, 500);

});