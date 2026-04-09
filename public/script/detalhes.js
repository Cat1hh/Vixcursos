// ==========================================
// DICIONÁRIO DE CURSOS (Textos Inclusivos)
// ==========================================
const infoCursos = {
    'Administração': { 
        aprender: 'Você vai aprender, passo a passo e de forma bem simples, como organizar o dia a dia de um escritório ou do seu próprio negócio. Vamos ensinar como controlar o dinheiro que entra e sai, como preencher documentos importantes e como atender os clientes com excelência.', 
        atuar: 'Você poderá trabalhar como assistente em escritórios, lojas e clínicas do seu bairro, ou até mesmo usar esse conhecimento para organizar as contas da sua própria casa e ajudar sua família.' 
    },
    'Artesanato': { 
        aprender: 'Neste curso, vamos despertar a sua criatividade. Você vai aprender técnicas manuais passo a passo, como escolher os melhores materiais, fazer o acabamento perfeito das peças e, muito importante, como calcular o preço justo para vender o seu trabalho.', 
        atuar: 'É uma ótima oportunidade para trabalhar do conforto da sua casa. Você poderá vender suas criações para amigos, participar de feiras na praça do bairro, vender pela internet ou até montar o seu próprio ateliê.' 
    },
    'AUTOMAÇÃO INDUSTRIAL': { 
        aprender: 'Vamos desmistificar como as máquinas modernas funcionam sozinhas nas grandes fábricas. Você vai aprender o básico sobre painéis elétricos e como os computadores dão ordens para os equipamentos trabalharem de forma segura.', 
        atuar: 'O mercado busca muitos profissionais para essa área. Você poderá trabalhar operando e cuidando da manutenção dessas máquinas inteligentes em grandes indústrias e fábricas da nossa região.' 
    },
    'Beleza': { 
        aprender: 'Você vai aprender os segredos dos grandes salões: técnicas de corte para diferentes tipos de cabelo, como fazer uma escova perfeita, noções de coloração e como receber e tratar bem o seu cliente para que ele sempre volte.', 
        atuar: 'As portas estarão abertas em salões de beleza e barbearias. Além disso, é uma excelente profissão para quem deseja ser dono do próprio nariz, atendendo clientes em casa ou montando um pequeno salão no seu bairro.' 
    },
    'Cinema': { 
        aprender: 'Sabe aqueles vídeos bonitos que vemos na internet e na TV? Você vai aprender como eles são feitos. Vamos ensinar como escrever uma história, como posicionar a câmera ou o celular, como usar a luz a seu favor e como juntar tudo no computador.', 
        atuar: 'Você poderá trabalhar em produtoras de vídeo, fazer filmagens de casamentos e aniversários, ou criar vídeos para ajudar os comércios da sua região a venderem mais pela internet.' 
    },
    'Comércio / Gestão Empresarial': { 
        aprender: 'Vamos mostrar como funciona o coração de uma empresa. Você vai entender como lidar com o público, técnicas simples para vender mais, como controlar o que tem no estoque e como ser um bom líder para a sua equipe.', 
        atuar: 'Ideal para quem quer trabalhar na gerência de lojas, ser um supervisor respeitado ou para quem tem o grande sonho de abrir e administrar o seu próprio comércio com segurança.' 
    },
    'Confecção': { 
        aprender: 'Desde colocar a linha na agulha até a peça pronta! Você vai aprender a usar máquinas de costura (reta e overlock), como tirar medidas, cortar o tecido do jeito certo e fazer pequenos reparos em roupas.', 
        atuar: 'Você terá espaço em fábricas de roupas e oficinas de costura. Também é uma profissão maravilhosa para trabalhar em casa, abrindo um serviço de consertos e ajustes de roupas para a vizinhança.' 
    },
    'Construção Civil / Serviço': { 
        aprender: 'Você vai aprender a colocar a mão na massa com segurança e técnica. Vamos ensinar desde o preparo da massa, alvenaria, colocação de pisos e azulejos, até como ler o desenho de um projeto para não errar na obra.', 
        atuar: 'Poderá trabalhar com carteira assinada em construtoras e empreiteiras, ou trabalhar por conta própria como pedreiro de confiança, pegando reformas e construções na cidade.' 
    },
    'Cultura': { 
        aprender: 'Você vai aprender como transformar ideias em projetos culturais reais. Ensinaremos como buscar apoio financeiro, como organizar eventos para a comunidade e como preservar a história e os costumes do nosso povo.', 
        atuar: 'Você poderá trabalhar em ONGs, associações de bairro, museus, secretarias de cultura, ou ser o organizador das festas e eventos culturais da sua própria comunidade.' 
    },
    'Dança': { 
        aprender: 'Aulas cheias de vida e movimento! Você vai melhorar sua postura, aprender a ouvir o ritmo da música, decorar os passos de forma tranquila e descobrir como a dança faz bem para o corpo e para a mente.', 
        atuar: 'Você poderá se apresentar em grupos de dança, dar aulas para iniciantes em academias e projetos sociais, ou simplesmente usar a dança para ter mais saúde e alegria no dia a dia.' 
    },
    'Dança e Teatro': { 
        aprender: 'Vamos trabalhar a sua timidez e a sua expressão. Você aprenderá a falar bem em público, como usar o corpo para contar uma história, como improvisar e como dar vida a diferentes personagens no palco.', 
        atuar: 'Além de poder atuar em peças de teatro e apresentações culturais, esse curso ajuda muito quem quer perder a vergonha de falar em público, ajudando em vendas e no trabalho em equipe.' 
    },
    'Educação': { 
        aprender: 'Ensinar é um dom que pode ser aperfeiçoado. Você vai aprender de forma carinhosa como transmitir conhecimento, como lidar com crianças e jovens, e como criar brincadeiras e atividades que ajudam no aprendizado.', 
        atuar: 'Você poderá trabalhar como auxiliar de sala em creches e escolas, ser monitor em passeios escolares, ou ajudar em projetos educativos de igrejas e centros comunitários.' 
    },
    'Eletrônica': { 
        aprender: 'Sabe quando um rádio ou uma TV para de funcionar? Vamos te ensinar a abrir esses aparelhos, entender as pecinhas lá dentro, aprender a usar o ferro de solda com segurança e descobrir como consertá-los.', 
        atuar: 'Você poderá conseguir emprego em assistências técnicas e fábricas, ou montar uma pequena oficina na sua casa para consertar os aparelhos eletrônicos dos seus vizinhos.' 
    },
    'Eletricista / Energia': { 
        aprender: 'Energia elétrica exige respeito e técnica. Você vai aprender do zero como passar fios, instalar tomadas, lâmpadas e chuveiros de forma totalmente segura, seguindo todas as normas de proteção para evitar acidentes.', 
        atuar: 'É uma das profissões mais procuradas! Você poderá trabalhar em empresas de manutenção, construtoras, ou ser o eletricista de confiança chamado pelas famílias da sua região.' 
    },
    'Enfermagem / Saúde': { 
        aprender: 'Um curso focado no cuidado e no amor ao próximo. Você aprenderá técnicas de primeiros socorros, como medir a pressão e a febre, como fazer curativos de forma higiênica e como tratar os pacientes com carinho e dignidade.', 
        atuar: 'Você estará preparado para ajudar em hospitais, clínicas e postos de saúde. Também é excelente para quem deseja trabalhar cuidando de idosos ou doentes no conforto do lar (Home Care).' 
    },
    'Estética': { 
        aprender: 'Vamos ensinar como cuidar da pele e do bem-estar das pessoas. Você vai aprender a fazer limpezas de pele profundas, massagens relaxantes, entender quais cremes usar e como deixar as pessoas com a autoestima lá em cima.', 
        atuar: 'Poderá trabalhar em clínicas de estética e salões de beleza renomados, ou investir em uma maca e atender seus próprios clientes, levando beleza e relaxamento até eles.' 
    },
    'Eventos': { 
        aprender: 'Você vai aprender o segredo das festas inesquecíveis. Mostraremos como planejar tudo: desde a lista de convidados, a escolha do lugar, a comida, até como receber as pessoas na porta com um sorriso no rosto.', 
        atuar: 'Você poderá trabalhar organizando casamentos, festas de 15 anos, feiras de negócios, ou ajudar a realizar os eventos e confraternizações da sua igreja ou comunidade.' 
    },
    'Fotografia': { 
        aprender: 'Aprenda a eternizar momentos! Vamos ensinar de forma bem prática como configurar a câmera (ou o celular), como aproveitar a luz do sol, achar o melhor ângulo e como dar aquele toque especial na foto usando o computador.', 
        atuar: 'Você poderá trabalhar fotografando festas infantis e casamentos, tirar fotos de produtos para lojas venderem na internet, ou até vender suas fotos de paisagens.' 
    },
    'Gastronomia': { 
        aprender: 'A cozinha é o coração da casa! Você vai aprender como cortar os alimentos como um chef profissional, como preparar molhos saborosos, técnicas para não queimar a comida e as regras de ouro sobre limpeza e higiene.', 
        atuar: 'As vagas vão desde restaurantes e padarias até as cozinhas de grandes hotéis. Se preferir, você terá a base perfeita para começar a vender marmitas, doces ou jantares feitos em casa.' 
    },
    'Gestão': { 
        aprender: 'Como fazer as coisas funcionarem melhor? Você vai aprender a planejar o futuro, entender o que está dando certo e o que está dando errado, e como motivar um grupo de pessoas a trabalhar junto por um mesmo objetivo.', 
        atuar: 'Você será muito valorizado em cargos de liderança nas empresas, poderá dar conselhos para melhorar outros negócios ou aplicar tudo isso para fazer a sua própria empresa crescer.' 
    },
    'Idiomas': { 
        aprender: 'Aprender uma nova língua abre portas para o mundo. Com muita paciência, vamos ensinar as palavras do dia a dia, como montar frases, como entender o que os gringos falam e como perder o medo de conversar.', 
        atuar: 'Você terá mais chances em empregos no comércio, em hotéis e agências de turismo que recebem estrangeiros, além de ser ótimo para o seu próprio cérebro e memória.' 
    },
    'Informática / Tecnologia': { 
        aprender: 'Sem medo do computador! Vamos ensinar tudo com muita calma: desde como ligar a máquina, usar a internet com segurança, escrever textos, até organizar tabelas. Ninguém vai ficar para trás.', 
        atuar: 'Saber usar o computador é obrigatório em quase todos os empregos de escritório, recepção e caixas de loja. Além disso, vai te dar a liberdade de fazer pesquisas e resolver coisas pela internet sozinho.' 
    },
    'Logística': { 
        aprender: 'Você vai entender como os produtos chegam das fábricas até as nossas casas. Aprenderá como organizar estoques grandes, como controlar as frotas de caminhões e garantir que nenhuma mercadoria se perca no caminho.', 
        atuar: 'Grandes supermercados, transportadoras, empresas de entregas e indústrias estão sempre contratando profissionais organizados e atentos para essa área.' 
    },
    'Manutenção': { 
        aprender: 'Você será aquele profissional que resolve os problemas! Vamos ensinar como identificar falhas antes que elas aconteçam e como fazer os reparos em máquinas e equipamentos de forma segura e eficiente.', 
        atuar: 'Você será essencial na manutenção de prédios, condomínios fechados, escolas, hospitais e também na equipe de consertos dentro de grandes indústrias.' 
    },
    'Mecânica': { 
        aprender: 'Com a mão na graxa e muita técnica, você vai entender como os motores funcionam. Aprenderá a trocar peças, usar ferramentas de precisão e descobrir por que os carros ou máquinas চরণ estão fazendo barulhos estranhos.', 
        atuar: 'Você terá as portas abertas em oficinas mecânicas, concessionárias de carros e motos, ou poderá prestar serviços de socorro mecânico e manutenção industrial.' 
    },
    'Meio Ambiente': { 
        aprender: 'Como cuidar da nossa natureza e da nossa cidade. Você vai aprender sobre como separar o lixo do jeito certo, as regras de proteção ambiental e como ensinar as outras pessoas a não poluírem a nossa água e o nosso solo.', 
        atuar: 'Poderá trabalhar em secretarias do meio ambiente, ajudar empresas a não tomarem multas ecológicas ou atuar em ONGs de proteção à natureza.' 
    },
    'Moda': { 
        aprender: 'Um mergulho no mundo do estilo. Você vai aprender a desenhar suas ideias de roupas, entender quais cores combinam mais com cada pessoa, e como montar a vitrine de uma loja para atrair clientes de longe.', 
        atuar: 'Poderá trabalhar em lojas de roupas aconselhando clientes, montar vitrines incríveis para o comércio do seu bairro ou criar sua própria marca de roupas e acessórios.' 
    },
    'Música': { 
        aprender: 'Aprenda a ler as notas musicais de um jeito fácil. Você vai treinar o seu ouvido, aprender o tempo certo da música e praticar muito, seja cantando com o coração ou tocando um instrumento com precisão.', 
        atuar: 'Você poderá se apresentar em festas e casamentos, tocar na banda da sua igreja, dar aulas particulares para iniciantes ou gravar suas músicas em estúdios.' 
    },
    'Panificação / Confeitaria': { 
        aprender: 'O cheiro de pão quente vai invadir a sala! Você aprenderá, com a mão na massa, o ponto certo da farinha, como fazer bolos decorados que enchem os olhos, docinhos de festa e as normas de limpeza na cozinha.', 
        atuar: 'Trabalhe nas melhores padarias e confeitarias da cidade. Ou, se preferir, seja seu próprio patrão aceitando encomendas de bolos de aniversário e salgadinhos sem sair de casa.' 
    },
    'Produção Cultural': { 
        aprender: 'Você vai aprender a organizar a cultura. Vamos te mostrar como preencher papéis para conseguir dinheiro do governo para projetos (editais), como cuidar do palco e como garantir que um show ou peça de teatro aconteça sem erros.', 
        atuar: 'Profissionais assim são procurados por prefeituras, teatros, organizadores de grandes shows e festivais que acontecem no nosso estado.' 
    },
    'Programação / TI': { 
        aprender: 'Vamos desmistificar a tela do computador! No seu próprio ritmo, você vai entender a língua que os computadores falam e vai aprender passo a passo como construir os sites e os aplicativos de celular que usamos todos os dias.', 
        atuar: 'O mercado de tecnologia não para de crescer. Você poderá trabalhar em grandes empresas de tecnologia, ou criar sites para as lojas e negócios da sua região ganhando dinheiro sem sair de casa.' 
    },
    'Recursos Humanos': { 
        aprender: 'Aprenda a cuidar das pessoas dentro de uma empresa. Ensinaremos como fazer entrevistas para contratar funcionários, como funcionam as leis trabalhistas, as férias e como calcular o salário no fim do mês.', 
        atuar: 'Toda empresa grande precisa desse profissional! Você trabalhará em escritórios no Departamento Pessoal, ou poderá ser contratado para treinar as equipes das lojas.' 
    },
    'Redes / Telecom': { 
        aprender: 'Como a internet chega na nossa casa? Você vai aprender a passar cabos de rede, configurar aparelhos de Wi-Fi para que o sinal fique forte e entender o funcionamento básico da moderna fibra óptica.', 
        atuar: 'Com o aumento da internet, provedores de bairro e operadoras de telefonia estão sempre precisando de técnicos. Você também pode trabalhar instalando Wi-Fi de forma particular.' 
    },
    'Segurança do Trabalho': { 
        aprender: 'A vida em primeiro lugar. Você vai aprender as leis de segurança, como usar capacetes e botas do jeito certo, como evitar incêndios e como alertar as pessoas para que todos voltem inteiros para suas famílias após o serviço.', 
        atuar: 'Será o profissional mais respeitado em canteiros de obra, hospitais e grandes indústrias, pois é você quem cuidará para que acidentes graves não aconteçam no ambiente de trabalho.' 
    },
    'Serviço Social': { 
        aprender: 'Um curso para quem quer lutar por um mundo mais justo. Você vai estudar os direitos do cidadão, como funcionam os benefícios do governo e como escutar e ajudar famílias que estão passando por grandes dificuldades.', 
        atuar: 'O seu local de trabalho será em CRAS (Centros de Referência da Assistência Social), conselhos tutelares, asilos, hospitais e ONGs que cuidam da nossa população.' 
    },
    'Soldagem': { 
        aprender: 'Você vai dominar o fogo e o metal! Aprenderá a usar máquinas de solda pesadas com equipamentos de proteção, como unir peças de ferro e aço de forma perfeita, sem deixar buracos e garantindo muita resistência.', 
        atuar: 'A indústria sempre precisa de bons soldadores. Você poderá trabalhar em portos, estaleiros (onde fazem navios), construção de galpões e metalúrgicas espalhadas pela região.' 
    },
    'Turismo / Hotelaria': { 
        aprender: 'Aprenda a encantar visitantes! Vamos ensinar como receber as pessoas com alegria na recepção de um hotel, como deixar os quartos impecáveis e como dar dicas dos melhores lugares para se visitar na nossa cidade.', 
        atuar: 'Nossa região é muito turística! Você poderá trabalhar nos grandes hotéis, charmosas pousadas, agências de passeios de barco e viagens, ou guiando turistas nos pontos históricos.' 
    },
    'Vendas / Marketing': { 
        aprender: 'O segredo de encantar o cliente. Você vai aprender a perder a vergonha de vender, técnicas para convencer as pessoas de forma honesta, e como usar o celular e as redes sociais para divulgar produtos na internet.', 
        atuar: 'Toda empresa precisa vender! Você poderá ser vendedor em shoppings e comércios, ser corretor, ou trabalhar com o celular de casa ajudando lojistas a venderem pelo Instagram ou WhatsApp.' 
    }
};

// ==========================================
// FUNÇÃO PRINCIPAL DE CARREGAMENTO
// ==========================================
async function carregarPaginaDetalhes() {
    // 1. Pega o ID da URL
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) return;

    // 2. Elementos Visuais do HTML
    const tituloNome = document.getElementById("detalhe-nome");
    const areaTexto = document.getElementById("texto-dinamico");
    const areaAprender = document.getElementById("areaAprender"); 
    const areaAtuar = document.getElementById("areaAtuar");       

    if (areaTexto) areaTexto.innerHTML = "Carregando novos dados... 🚀";
    if (tituloNome) tituloNome.innerText = "Carregando...";

    try {
        // 3. FETCH COM TIMESTAMP (Evita cache do navegador)
        const res = await fetch(`/api/cursos-public/${id}?t=${Date.now()}`);
        
        // Verifica se o curso existe
        if (!res.ok) throw new Error('Curso não encontrado');
        
        const curso = await res.json();

        if (curso) {
            // Tratamentos anti-null/undefined
            const nome = curso.nome || "Curso sem nome";
            const local = curso.local || "Local a definir";
            const categoria = curso.categoria || "Geral";
            const modalidade = curso.modalidade || "Presencial";
            const horario = `${curso.horario_inicio || '--:--'} às ${curso.horario_termino || '--:--'}`;
            const duracao = (curso.data_inicio && curso.data_termino) 
                ? `${curso.data_inicio} até ${curso.data_termino}` 
                : "A definir";

            // 4. PREENCHIMENTO DO HTML
            if (tituloNome) tituloNome.innerText = nome;
            
            const elLocal = document.getElementById("detalhe-local");
            if (elLocal) elLocal.innerText = local;

            const elVagas = document.getElementById("detalhe-vagas");
            if (elVagas) elVagas.innerText = curso.vagas || "0";

            const elModalidade = document.getElementById("detalhe-modalidade");
            if (elModalidade) elModalidade.innerText = modalidade;
            
            const elHorario = document.getElementById("detalhe-horario");
            if (elHorario) elHorario.innerText = horario;

            const elDuracao = document.getElementById("detalhe-duracao");
            if (elDuracao) elDuracao.innerText = duracao;

            // ==========================================
            // 5. ATUALIZA A IMAGEM GRANDE (Profissional)
            // ==========================================
            const mascoteImg = document.getElementById("avatarMascote");
            
            if (mascoteImg) {
                // Dicionário mapeando o Nome do Curso para o arquivo da imagem
                const imagensCursos = {
                    'Administração': '../imagem/proficao/administracao.jpg',
                    'Artesanato': '../imagem/proficao/artesanato.jpg',
                    'AUTOMAÇÃO INDUSTRIAL': '../imagem/proficao/automacao.jpg',
                    'Beleza': '../imagem/proficao/beleza.jpg',
                    'Cinema': '../imagem/proficao/cinema.jpg',
                    'Comércio / Gestão Empresarial': '../imagem/proficao/comercio.jpg',
                    'Confecção': '../imagem/proficao/confeccao.jpg',
                    'Construção Civil / Serviço': '../imagem/proficao/construcao.jpg',
                    'Cultura': '../imagem/proficao/cultura.jpg',
                    'Dança': '../imagem/proficao/danca.jpg',
                    'Dança e Teatro': '../imagem/proficao/teatro.jpg',
                    'Educação': '../imagem/proficao/educacao.jpg',
                    'Eletrônica': '../imagem/proficao/eletronica.jpg',
                    'Eletricista / Energia': '../imagem/proficao/eletricista.jpg',
                    'Enfermagem / Saúde': '../imagem/proficao/enfermagem.jpg',
                    'Estética': '../imagem/proficao/estetica.jpg',
                    'Eventos': '../imagem/proficao/eventos.jpg',
                    'Fotografia': '../imagem/proficao/fotografia.jpg',
                    'Gastronomia': '../imagem/proficao/gastronomia.jpg',
                    'Gestão': '../imagem/proficao/gestao.jpg',
                    'Idiomas': '../imagem/proficao/idiomas.jpg',
                    'Informática / Tecnologia': '../imagem/proficao/informatica.jpg',
                    'Logística': '../imagem/proficao/logistica.jpg',
                    'Manutenção': '../imagem/proficao/manutencao.jpg',
                    'Mecânica': '../imagem/proficao/mecanica.jpg',
                    'Meio Ambiente': '../imagem/proficao/meio-ambiente.jpg',
                    'Moda': '../imagem/proficao/moda.jpg',
                    'Música': '../imagem/proficao/musica.jpg',
                    'Panificação / Confeitaria': '../imagem/proficao/panificacao.jpg',
                    'Produção Cultural': '../imagem/proficao/producao-cultural.jpg',
                    'Programação / TI': '../imagem/proficao/programacao.jpg',
                    'Recursos Humanos': '../imagem/proficao/rh.jpg',
                    'Redes / Telecom': '../imagem/proficao/redes.jpg',
                    'Segurança do Trabalho': '../imagem/proficao/seguranca-trabalho.jpg',
                    'Serviço Social': '../imagem/proficao/servico-social.jpg',
                    'Soldagem': '../imagem/proficao/soldagem.jpg',
                    'Turismo / Hotelaria': '../imagem/proficao/turismo.jpg',
                    'Vendas / Marketing': '../imagem/proficao/marketing.jpg'
                };

                // Puxa a imagem da lista. Se não tiver ou der erro, usa uma imagem padrão profissional
                const imagemEscolhida = imagensCursos[nome] || '../imagem/padrao-profissional.jpg';
                
                mascoteImg.src = imagemEscolhida;
            }

            // 6. VERIFICAÇÃO DE VAGAS (Trava o botão)
            if (typeof verificarVagas === 'function') {
                verificarVagas(curso.vagas);
            }

            // ==========================================
            // 7. INJEÇÃO DOS TEXTOS PERSONALIZADOS (A MÁGICA)
            // ==========================================
            
            // Texto curto de apresentação
            if (areaTexto) {
                areaTexto.innerHTML = `
                    O curso de <b>${nome}</b> no portal <b>Vix Cursos</b> está com inscrições abertas! 
                    Aulas no formato <b>${modalidade}</b> na região de <b>${local}</b>.
                `;
            }

            // Busca os textos do Dicionário
            const info = infoCursos[nome] || {
                aprender: "Este curso oferece um ensino prático e acolhedor. Você vai aprender passo a passo as principais técnicas desta profissão para se destacar.",
                atuar: "O mercado de trabalho tem muitas vagas para essa área na nossa cidade. Você poderá trabalhar em empresas locais ou atuar por conta própria."
            };

            // Preenche as áreas
            if (areaAprender) areaAprender.innerText = info.aprender;
            if (areaAtuar) areaAtuar.innerText = info.atuar;
        }
    } catch (err) {
        console.error("Erro ao carregar detalhes:", err);
        if (areaTexto) areaTexto.innerText = "Erro ao carregar os dados do curso.";
    }
}

// Inicializa a página
carregarPaginaDetalhes();

// ==========================================
// FUNÇÕES EXTRAS (Botões)
// ==========================================
function fazerInscricao() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    window.location.href = `pre_inscricao.html?id=${id}`;
}

function verificarVagas(vagas) {
    const btn = document.querySelector(".btn-grande"); // Ajuste se a classe do seu botão for diferente
    if (btn && (vagas === 0 || vagas === "0" || vagas === "Esgotado")) {
        btn.innerText = "Vagas Esgotadas 🚫";
        btn.style.backgroundColor = "#888";
        btn.disabled = true;
        btn.onclick = null;
    }
}