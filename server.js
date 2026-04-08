const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || "";
const TWILIO_CONTENT_SID = process.env.TWILIO_CONTENT_SID || "";
const TWILIO_CONTENT_VARIABLES = process.env.TWILIO_CONTENT_VARIABLES || "";
const TWILIO_TO_NUMBER = process.env.TWILIO_TO_NUMBER || "";
const TWILIO_CHANNEL = process.env.TWILIO_CHANNEL || "sms";
const WHATSAPP_PROVIDER = String(process.env.WHATSAPP_PROVIDER || "twilio").toLowerCase();
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "";
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 465);
const EMAIL_SECURE = String(process.env.EMAIL_SECURE || "true").toLowerCase() === "true";
const EMAIL_FALLBACK_PORT = Number(process.env.EMAIL_FALLBACK_PORT || 587);
const EMAIL_FALLBACK_SECURE = String(process.env.EMAIL_FALLBACK_SECURE || "false").toLowerCase() === "true";
const EMAIL_CONNECT_TIMEOUT = Number(process.env.EMAIL_CONNECT_TIMEOUT || 12000);
const EMAIL_SOCKET_TIMEOUT = Number(process.env.EMAIL_SOCKET_TIMEOUT || 15000);
const EMAIL_USER = process.env.EMAIL_USER || "d3bruyn@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "uwxghfrgzqdftqzf";
const EMAIL_FROM = process.env.EMAIL_FROM || `\"Vix Cursos\" <${EMAIL_USER}>`;
const DB_HOST = process.env.DB_HOST || "34.229.93.210";
const DB_USER = process.env.DB_USER || "vixcursos";
const DB_PASSWORD = process.env.DB_PASSWORD || "123*abc";
const DB_NAME = process.env.DB_NAME || "portal_cursos";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_SSL_ENABLED = String(process.env.DB_SSL_ENABLED || "false").toLowerCase() === "true";
const DB_SSL_REJECT_UNAUTHORIZED = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "true").toLowerCase() === "true";
const DB_WAIT_FOR_CONNECTIONS = String(process.env.DB_WAIT_FOR_CONNECTIONS || "true").toLowerCase() === "true";
const DB_CONNECTION_LIMIT = Number(process.env.DB_CONNECTION_LIMIT || 10);

const ADMIN_COOKIE_NAME = "porto_admin_token";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "porto-admin-secret-change-me";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SERVER_PORT = Number(process.env.PORT) || 3000;

function lerCookie(req, nome) {
    const cookieHeader = req.headers.cookie || "";
    const cookies = cookieHeader.split(";").reduce((acc, item) => {
        const [chave, ...resto] = item.trim().split("=");
        if (!chave) return acc;
        acc[chave] = resto.join("=");
        return acc;
    }, {});

    return cookies[nome] || null;
}

function criarCookieAdmin(token) {
    const partes = [
        `${ADMIN_COOKIE_NAME}=${token}`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        "Max-Age=28800"
    ];

    if (process.env.NODE_ENV === "production") {
        partes.push("Secure");
    }

    return partes.join("; ");
}

function limparCookieAdmin() {
    const partes = [
        `${ADMIN_COOKIE_NAME}=`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        "Max-Age=0"
    ];

    if (process.env.NODE_ENV === "production") {
        partes.push("Secure");
    }

    return partes.join("; ");
}

function eErroTimeoutBanco(erro) {
    return Boolean(erro && (erro.code === "ETIMEDOUT" || erro.code === "PROTOCOL_SEQUENCE_TIMEOUT"));
}

function responderErroBanco(res, erro, mensagem) {
    if (eErroTimeoutBanco(erro)) {
        return res.status(503).json({ error: "Banco de dados indisponivel" });
    }

    console.error(mensagem, erro);
    return res.status(500).json({ error: mensagem.replace(/^Erro na rota\s*/, "").replace(/:$/, "") || "Erro interno" });
}

function verificarTokenAdmin(req) {
    const token = lerCookie(req, ADMIN_COOKIE_NAME);
    if (!token) return null;

    try {
        return jwt.verify(token, ADMIN_JWT_SECRET);
    } catch {
        return null;
    }
}

function exigirAuthAdmin(req, res, next) {
    const payload = verificarTokenAdmin(req);
    if (payload) {
        req.admin = payload;
        return next();
    }

    if (req.accepts("html")) {
        return res.redirect("/admin/login.html");
    }

    return res.status(401).json({ error: "Nao autorizado" });
}

app.use((req, res, next) => {
    if (!req.path.startsWith("/admin")) {
        return next();
    }

    if (req.path === "/admin/login.html") {
        return next();
    }

    const payload = verificarTokenAdmin(req);
    if (payload) {
        req.admin = payload;
        return next();
    }

    return res.redirect("/admin/login.html");
});

let baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${SERVER_PORT}`;

// Servir frontend
app.use(express.static(path.join(__dirname, "public")));

async function createApp() {
    // ======================================
    // MYSQL
    // ======================================
    console.log("[db] Iniciando configuracao da pool MySQL");
    console.log("[db] Host:", DB_HOST);
    console.log("[db] Port:", DB_PORT);
    console.log("[db] Database:", DB_NAME);
    console.log("[db] User:", DB_USER);
    console.log("[db] waitForConnections:", DB_WAIT_FOR_CONNECTIONS);
    console.log("[db] connectionLimit:", DB_CONNECTION_LIMIT);

    const db = mysql.createPool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: DB_WAIT_FOR_CONNECTIONS,
        connectionLimit: DB_CONNECTION_LIMIT,
        ssl: DB_SSL_ENABLED
            ? { rejectUnauthorized: DB_SSL_REJECT_UNAUTHORIZED }
            : undefined
    });

    let bancoDisponivelNaInicializacao = false;

    async function inicializarBanco() {
        try {
            console.log("[db] Pool MySQL criada, validando conexao...");
            const connection = await db.getConnection();
            console.log("[db] Conexao MySQL validada com sucesso");
            connection.release();
            console.log("[db] Conexao MySQL liberada de volta para a pool");

            await garantirColuna("pre_inscricoes", "cpf", "VARCHAR(14) NULL AFTER telefone");
            await garantirColuna("pre_inscricoes", "rg", "VARCHAR(20) NULL AFTER cpf");
            await garantirColuna("pre_inscricoes", "mora_vitoria", "VARCHAR(3) NULL AFTER curso_id");
            await garantirColuna("pre_inscricoes", "escolaridade", "VARCHAR(80) NULL AFTER mora_vitoria");
            await garantirColuna("pre_inscricoes", "cep", "VARCHAR(12) NULL AFTER escolaridade");
            await garantirColuna("pre_inscricoes", "numero", "VARCHAR(20) NULL AFTER cep");
            await garantirColuna("pre_inscricoes", "rua", "VARCHAR(150) NULL AFTER numero");
            await garantirColuna("pre_inscricoes", "bairro", "VARCHAR(120) NULL AFTER rua");
            await garantirColuna("pre_inscricoes", "municipio", "VARCHAR(120) NULL AFTER bairro");
            await garantirColuna("pre_inscricoes", "possui_necessidade_especial", "VARCHAR(3) NULL AFTER municipio");
            await garantirColuna("pre_inscricoes", "tipo_necessidade_especial", "VARCHAR(120) NULL AFTER possui_necessidade_especial");
            await garantirColuna("pre_inscricoes", "cpf_documento", "LONGTEXT NULL AFTER municipio");
            await garantirColuna("pre_inscricoes", "rg_documento", "LONGTEXT NULL AFTER cpf_documento");
            await garantirColuna("pre_inscricoes", "documento_confirmacao", "LONGTEXT NULL AFTER municipio");
            await garantirColuna("pre_inscricoes", "matricula_confirmada", "TINYINT(1) NOT NULL DEFAULT 0 AFTER rg_documento");
            await garantirColuna("pre_inscricoes", "matricula_confirmada_em", "DATETIME NULL AFTER matricula_confirmada");
            await garantirColuna("interessados", "enviado_em", "DATETIME NULL AFTER status");
            await garantirIndice("pre_inscricoes", "idx_pre_inscricoes_cpf", "cpf");
            await garantirIndiceUnico("pre_inscricoes", "uk_pre_inscricoes_curso_cpf", "curso_id, cpf");

            bancoDisponivelNaInicializacao = true;
            console.log("[db] Inicializacao do banco concluida com sucesso");
        } catch (erro) {
            bancoDisponivelNaInicializacao = false;
            console.warn("[db] Banco indisponivel na inicializacao. O servidor vai subir mesmo assim.");
            console.warn("[db] message:", erro?.message || erro);
            console.warn("[db] code:", erro?.code || "sem_code");
            console.warn("[db] errno:", erro?.errno || "sem_errno");
            console.warn("[db] sqlState:", erro?.sqlState || "sem_sqlState");
        }
    }

    void inicializarBanco();

    // ======================================
    // EMAIL
    // ======================================
    function criarTransporterEmail(port, secure) {
        return nodemailer.createTransport({
            host: EMAIL_HOST,
            port,
            secure,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS
            },
            connectionTimeout: EMAIL_CONNECT_TIMEOUT,
            socketTimeout: EMAIL_SOCKET_TIMEOUT,
            tls: {
                minVersion: "TLSv1.2"
            }
        });
    }

    let mailer = criarTransporterEmail(EMAIL_PORT, EMAIL_SECURE);
    let emailDisponivel = false;

    async function inicializarEmail() {
        try {
            await mailer.verify();
            emailDisponivel = true;
            console.log(`[email] SMTP pronto para envio (${EMAIL_HOST}:${EMAIL_PORT})`);
            return;
        } catch (erroPrincipal) {
            console.warn("[email] Falha na conexao SMTP principal:", erroPrincipal.message || erroPrincipal);
        }

        if (EMAIL_FALLBACK_PORT === EMAIL_PORT && EMAIL_FALLBACK_SECURE === EMAIL_SECURE) {
            emailDisponivel = false;
            return;
        }

        const mailerFallback = criarTransporterEmail(EMAIL_FALLBACK_PORT, EMAIL_FALLBACK_SECURE);

        try {
            await mailerFallback.verify();
            mailer = mailerFallback;
            emailDisponivel = true;
            console.log(`[email] SMTP fallback ativo (${EMAIL_HOST}:${EMAIL_FALLBACK_PORT})`);
        } catch (erroFallback) {
            emailDisponivel = false;
            console.error("[email] Falha ao conectar no SMTP fallback:", erroFallback.message || erroFallback);
        }
    }

    void inicializarEmail();

    async function garantirColuna(tabela, coluna, definicao) {
        const [colunas] = await db.query(
            `SELECT COUNT(*) AS total
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND COLUMN_NAME = ?`,
            [tabela, coluna]
        );

        if (colunas[0].total === 0) {
            await db.query(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
        }
    }

    async function garantirIndice(tabela, indice, colunas) {
        const [indices] = await db.query(
            `SELECT COUNT(*) AS total
             FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND INDEX_NAME = ?`,
            [tabela, indice]
        );

        if (indices[0].total === 0) {
            await db.query(`CREATE INDEX ${indice} ON ${tabela} (${colunas})`);
        }
    }

    async function garantirIndiceUnico(tabela, indice, colunas) {
        const [indices] = await db.query(
            `SELECT COUNT(*) AS total
             FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND INDEX_NAME = ?`,
            [tabela, indice]
        );

        if (indices[0].total === 0) {
            try {
                await db.query(`CREATE UNIQUE INDEX ${indice} ON ${tabela} (${colunas})`);
            } catch (err) {
                if (err && err.code === "ER_DUP_ENTRY") {
                    const [duplicados] = await db.query(
                        `SELECT curso_id, cpf, COUNT(*) AS total
                         FROM pre_inscricoes
                         GROUP BY curso_id, cpf
                         HAVING COUNT(*) > 1
                         ORDER BY total DESC`
                    );

                    console.warn(
                        `[db] Nao foi possivel criar o indice unico ${indice} por registros duplicados existentes (${duplicados.length} combinacoes). ` +
                        "A aplicacao vai continuar rodando e bloqueando novas duplicidades pela validacao da API."
                    );
                    return;
                }

                throw err;
            }
        }
    }

    function normalizarCpf(valor) {
        return String(valor || "").replace(/\D/g, "").slice(0, 11);
    }

    function normalizarRg(valor) {
        return String(valor || "")
            .trim()
            .toUpperCase()
            .replace(/\s+/g, " ")
            .slice(0, 20);
    }

    function normalizarTelefoneE164(telefone) {
        const digitos = String(telefone || "").replace(/\D/g, "");

        // BR com DDI já informado: 55 + DDD + numero (10 ou 11 dígitos locais)
        if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
            return `+${digitos}`;
        }

        // BR sem DDI: DDD + numero (10 ou 11 dígitos locais)
        if (digitos.length === 10 || digitos.length === 11) {
            return `+55${digitos}`;
        }

        return null;
    }

    function formatarNumeroTwilio(numero, usarWhatsApp = false) {
        const bruto = String(numero || "").trim();
        if (!bruto) return null;

        const jaTemPrefixoWhatsApp = bruto.toLowerCase().startsWith("whatsapp:");
        const numeroBase = jaTemPrefixoWhatsApp ? bruto.slice("whatsapp:".length) : bruto;
        const e164 = numeroBase.startsWith("+") ? numeroBase : normalizarTelefoneE164(numeroBase);

        if (!e164) return null;

        if (usarWhatsApp || jaTemPrefixoWhatsApp) {
            return `whatsapp:${e164}`;
        }

        return e164;
    }

    function formatarDataBR(valor) {
        if (!valor) return null;

        if (typeof valor === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
            return valor;
        }

        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return String(valor);

        return data.toLocaleDateString("pt-BR");
    }

    function formatarHora(valor) {
        if (!valor) return null;
        return String(valor).slice(0, 5);
    }

    function montarTextoConfirmacao({ cursoNome, dataInicio, dataTermino, horaInicio, horaTermino, local }) {
        const periodo = dataInicio && dataTermino ? `de ${dataInicio} a ${dataTermino}` : null;
        const horario = horaInicio && horaTermino ? `das ${horaInicio}h às ${horaTermino}h` : null;

        return [
            `Recebemos sua pré-matrícula no curso de ${cursoNome}, Curso do Senai em parceria com a PMV${periodo ? `, que acontecerá ${periodo}` : ""}${horario ? `, ${horario}` : ""}${local ? ` no ${local}` : ""}.`,
            "",
            "👉 Menores de idade devem estar acompanhados do responsável legal.",
            "✨ O curso é 100% gratuito e dará direito a vale transporte.",
            "",
            local ? `📍 Endereço para matricula: ${local}.` : null,
            "",
            "Esperamos por você! 🚀"
        ].filter(Boolean).join("\n");
    }

    function montarSmsConfirmacao(dados) {
        return montarTextoConfirmacao(dados);
    }

    const mapaPerfis = {
        gastronomia: ['gastronomia', 'panificação / confeitaria', 'eventos', 'turismo / hotelaria'],
        beleza: ['beleza', 'estética', 'moda', 'confecção', 'artesanato'],
        manutencao: ['manutenção', 'mecânica', 'eletricista / energia', 'eletrônica', 'automação industrial', 'soldagem', 'construção civil / serviço', 'segurança do trabalho', 'meio ambiente'],
        tecnologia: ['informática / tecnologia', 'programação / ti', 'redes / telecom', 'administração', 'gestão', 'comércio / gestão empresarial', 'recursos humanos', 'logística', 'vendas / marketing']
    };

    function normalizarPerfil(perfil) {
        return String(perfil || '').trim().toLowerCase();
    }

    function categoriasDoPerfil(perfil) {
        return mapaPerfis[normalizarPerfil(perfil)] || [normalizarPerfil(perfil)];
    }

    function cursoCombinaComPerfil(curso, perfil) {
        const categorias = categoriasDoPerfil(perfil);
        const nomeCurso = String(curso.nome || '').toLowerCase();
        const categoriaCurso = String(curso.categoria || '').toLowerCase();
        return categorias.some(cat => nomeCurso.includes(cat) || categoriaCurso.includes(cat));
    }

    function montarLinkPreInscricao(curso) {
        return `${baseUrl}/pre_inscricao.html?id=${curso.id}&nome=${encodeURIComponent(curso.nome || 'curso')}`;
    }

    function montarEmailDisponibilidade({ nome, curso, perfil }) {
        const link = montarLinkPreInscricao(curso);
        return {
            subject: `📢 Curso disponível: ${curso.nome || 'Nova oportunidade'}`,
            html: `
                <div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;line-height:1.6;color:#111827;">
                    <p style="margin:0 0 14px;">Olá, <strong>${nome}</strong>!</p>
                    <p style="margin:0 0 14px;">O curso de <strong>${curso.nome || 'Qualificação'}</strong> que combina com o seu perfil de <strong>${perfil}</strong> está disponível.</p>
                    <p style="margin:0 0 14px;">📍 Local: ${curso.local || 'A definir'}</p>
                    ${curso.data_inicio && curso.data_termino ? `<p style="margin:0 0 14px;">🗓️ Período: ${curso.data_inicio} a ${curso.data_termino}</p>` : ''}
                    ${curso.horario_inicio && curso.horario_termino ? `<p style="margin:0 0 18px;">⏰ Horário: ${curso.horario_inicio}h às ${curso.horario_termino}h</p>` : ''}
                    <p style="margin:0 0 18px;">Clique no botão abaixo para acessar e fazer sua pré-inscrição.</p>
                    <a href="${link}" style="display:inline-block;background:#0f2247;color:#fff;padding:12px 22px;text-decoration:none;font-weight:700;border-radius:10px;">Acessar Pré-inscrição</a>
                    <p style="font-size:12px;color:#6b7280;margin-top:20px;">Este é um aviso automático do sistema Vix Cursos.</p>
                </div>
            `
        };
    }

    function montarSmsDisponibilidade({ nome, curso, perfil }) {
        const link = montarLinkPreInscricao(curso);
        return [
            `Olá, ${nome}!`,
            `O curso de ${curso.nome || 'Qualificação'} que combina com o seu perfil de ${perfil} está disponível.`,
            curso.local ? `Local: ${curso.local}.` : null,
            curso.data_inicio && curso.data_termino ? `Período: ${curso.data_inicio} a ${curso.data_termino}.` : null,
            curso.horario_inicio && curso.horario_termino ? `Horário: ${curso.horario_inicio}h às ${curso.horario_termino}h.` : null,
            `Acesse para fazer sua pré-inscrição: ${link}`
        ].filter(Boolean).join(' ');
    }

    async function notificarInteressado(interessado, curso, perfil) {
        const emailPayload = montarEmailDisponibilidade({ nome: interessado.nome, curso, perfil });
        const smsMensagem = montarSmsDisponibilidade({ nome: interessado.nome, curso, perfil });

        const [emailResult, smsResult] = await Promise.allSettled([
            emailDisponivel
                ? mailer.sendMail({
                    from: EMAIL_FROM,
                    to: interessado.email,
                    subject: emailPayload.subject,
                    html: emailPayload.html
                })
                : Promise.reject(new Error("smtp-indisponivel")),
            enviarMensagemTwilio({ telefone: interessado.whatsapp, mensagem: smsMensagem })
        ]);

        if (emailResult.status === 'rejected') {
            console.error(`Erro ao enviar aviso para ${interessado.email}:`, emailResult.reason);
        }

        if (smsResult.status === 'rejected') {
            console.error(`Erro ao enviar mensagem para ${interessado.whatsapp}:`, smsResult.reason);
        }

        if (emailResult.status === 'fulfilled' || (smsResult.status === 'fulfilled' && smsResult.value.sent)) {
            await db.query(`UPDATE interessados SET status = 'enviado', enviado_em = NOW() WHERE id = ?`, [interessado.id]);
            return true;
        }

        return false;
    }

    async function notificarInteressadosPorCurso(curso) {
        if (!curso || curso.status !== 'ativo') return 0;

        const [interessados] = await db.query(
            `SELECT id, nome, whatsapp, email, perfil_curso
             FROM interessados
             WHERE status = 'aguardando'`
        );

        const interessadosDoCurso = interessados.filter(interessado => cursoCombinaComPerfil(curso, interessado.perfil_curso));
        let totalEnviados = 0;

        for (const interessado of interessadosDoCurso) {
            const enviado = await notificarInteressado(interessado, curso, interessado.perfil_curso);
            if (enviado) totalEnviados += 1;
        }

        return totalEnviados;
    }

    async function notificarNovoLeadSeHouverCursoAtivo(interessado) {
        const [cursosAtivos] = await db.query(
            `SELECT
                c.id,
                COALESCE(fc.curso, 'Curso') AS nome,
                COALESCE(fc2.categoria, 'Geral') AS categoria,
                COALESCE(fl.local, 'A definir') AS local,
                DATE_FORMAT(c.data_inicio, '%d/%m/%Y') AS data_inicio,
                DATE_FORMAT(c.data_termino, '%d/%m/%Y') AS data_termino,
                TIME_FORMAT(c.horario_inicio, '%H:%i') AS horario_inicio,
                TIME_FORMAT(c.horario_termino, '%H:%i') AS horario_termino,
                c.status
             FROM cursos c
             LEFT JOIN filtro_curso fc ON fc.id = c.curso_id
             LEFT JOIN filtro_categoria fc2 ON fc2.id = c.categoria_id
             LEFT JOIN filtro_local fl ON fl.id = c.local_id
             WHERE c.status = 'ativo'
             ORDER BY c.id DESC`
        );

        const cursoEncontrado = cursosAtivos.find(curso => cursoCombinaComPerfil(curso, interessado.perfil_curso));
        if (!cursoEncontrado) return false;

        return notificarInteressado(interessado, cursoEncontrado, interessado.perfil_curso);
    }

    async function enviarMensagemTwilio({ telefone, mensagem }) {
        const accountSid = TWILIO_ACCOUNT_SID;
        const authToken = TWILIO_AUTH_TOKEN;
        const fromNumber = TWILIO_FROM_NUMBER;
        const contentSid = TWILIO_CONTENT_SID;
        const contentVariables = TWILIO_CONTENT_VARIABLES;
        const usarWhatsApp = TWILIO_CHANNEL.toLowerCase() === "whatsapp" || String(fromNumber || "").toLowerCase().startsWith("whatsapp:");
        const canal = usarWhatsApp ? "whatsapp" : "sms";
        const toNumber = formatarNumeroTwilio(telefone || TWILIO_TO_NUMBER, usarWhatsApp);
        const from = formatarNumeroTwilio(fromNumber, usarWhatsApp);

        if (canal === "whatsapp" && WHATSAPP_PROVIDER === "evolution") {
            if (!toNumber) {
                return { sent: false, reason: "telefone-invalido", canal };
            }

            if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
                return { sent: false, reason: "evolution-nao-configurado", canal };
            }

            if (typeof fetch !== "function") {
                return { sent: false, reason: "evolution-fetch-indisponivel", canal };
            }

            const numeroDestino = String(toNumber)
                .replace(/^whatsapp:/i, "")
                .replace(/\D/g, "");

            if (!numeroDestino) {
                return { sent: false, reason: "telefone-invalido", canal };
            }

            try {
                const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
                const resposta = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": EVOLUTION_API_KEY
                    },
                    body: JSON.stringify({
                        number: numeroDestino,
                        text: mensagem
                    })
                });

                if (!resposta.ok) {
                    return { sent: false, reason: `evolution-erro-http-${resposta.status}`, canal };
                }

                return { sent: true, canal };
            } catch {
                return { sent: false, reason: "evolution-falha", canal };
            }
        }

        if (!toNumber) {
            return { sent: false, reason: "telefone-invalido", canal };
        }

        if (!accountSid || !authToken || !from) {
            return { sent: false, reason: "twilio-nao-configurado", canal };
        }

        const client = twilio(accountSid, authToken);
        const payload = {
            to: toNumber,
            from
        };

        if (contentSid) {
            payload.contentSid = contentSid;
            if (contentVariables) {
                payload.contentVariables = contentVariables;
            }
        } else {
            payload.body = mensagem;
        }

        try {
            await client.messages.create(payload);
            return { sent: true, canal };
        } catch (err) {
            const code = String(err?.code || "");

            if (usarWhatsApp && code === "63015") {
                return { sent: false, reason: "whatsapp-sandbox-nao-ativado", canal };
            }
            if (code === "21211") {
                return { sent: false, reason: "telefone-invalido", canal };
            }
            if (code === "20003") {
                return { sent: false, reason: "twilio-auth-invalido", canal };
            }

            return {
                sent: false,
                reason: code ? `twilio-erro-${code}` : "twilio-falha",
                canal
            };
        }
    }

    function gerarProtocoloInscricao(idInscricao) {
        const idNum = Number(idInscricao) || 0;
        return `PI-${String(idNum).padStart(6, "0")}`;
    }

    async function enviarEmailRecebimentoPreInscricao({ nome, email, cursoNome, protocolo }) {
        if (!emailDisponivel) {
            throw new Error("smtp-indisponivel");
        }

        await mailer.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject: `Pré-inscrição recebida - ${cursoNome}`,
            html: `
                <div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;line-height:1.6;color:#111827;">
                    <p style="margin:0 0 14px;">Olá, <strong>${nome}</strong>!</p>
                    <p style="margin:0 0 14px;">Recebemos sua pré-inscrição no curso de <strong>${cursoNome}</strong>.</p>
                    <p style="margin:0 0 14px;"><strong>Protocolo:</strong> ${protocolo}</p>
                    <p style="margin:0 0 14px;">Estamos validando seus dados. Fique atento ao seu e-mail para quando confirmarmos sua matrícula.</p>
                    <p style="margin:0 0 14px;">Assim que a validação for concluída, você receberá a confirmação oficial por este canal.</p>
                    <p style="margin:0;font-size:12px;color:#6b7280;">Mensagem automatica do sistema Vix Cursos.</p>
                </div>
            `
        });
    }

    async function enviarEmailMatriculaConfirmada({ nome, email, cursoNome, dataInicio, dataTermino, horaInicio, horaTermino, local, protocolo }) {
        if (!emailDisponivel) {
            throw new Error("smtp-indisponivel");
        }

        await mailer.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject: `Matrícula confirmada - ${cursoNome}`,
            html: `
                <div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;line-height:1.6;color:#111827;">
                    <p style="margin:0 0 14px;">Olá, <strong>${nome}</strong>!</p>
                    <p style="margin:0 0 14px;">Sua matrícula no curso de <strong>${cursoNome}</strong> foi <strong>confirmada</strong>.</p>
                    <p style="margin:0 0 14px;"><strong>Protocolo:</strong> ${protocolo}</p>
                    <p style="margin:0 0 14px;">${dataInicio && dataTermino ? `Período: <strong>${dataInicio}</strong> a <strong>${dataTermino}</strong>.<br>` : ""}${horaInicio && horaTermino ? `Horário: <strong>${horaInicio}h às ${horaTermino}h</strong>.<br>` : ""}${local ? `Local: <strong>${local}</strong>.` : ""}</p>
                    <p style="margin:0 0 14px;">👉 Menores de idade devem estar acompanhados do responsável legal.</p>
                    <p style="margin:0 0 14px;">Esperamos por você! 🚀</p>
                    <p style="margin:0;font-size:12px;color:#6b7280;">Mensagem automatica do sistema Vix Cursos.</p>
                </div>
            `
        });
    }

    app.post("/api/admin/login", (req, res) => {
        const username = String(req.body.username || "").trim();
        const password = String(req.body.password || "").trim();

        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: "Credenciais invalidas" });
        }

        const token = jwt.sign({ username: ADMIN_USERNAME }, ADMIN_JWT_SECRET, { expiresIn: "8h" });
        res.setHeader("Set-Cookie", criarCookieAdmin(token));
        return res.json({ ok: true });
    });

    app.post("/api/admin/logout", (req, res) => {
        res.setHeader("Set-Cookie", limparCookieAdmin());
        return res.json({ ok: true });
    });

    app.get("/api/admin/me", (req, res) => {
        const payload = verificarTokenAdmin(req);
        if (!payload) {
            return res.status(401).json({ authenticated: false });
        }

        return res.json({ authenticated: true, username: payload.username || ADMIN_USERNAME });
    });

    const tabelas = {
        curso: "filtro_curso", 
        idade: "filtro_idade",
        categoria: "filtro_categoria",
        modalidade: "filtro_modalidade",
        local: "filtro_local"
    };

    // ============================================================
    // FILTROS
    // ============================================================
    app.get("/public/:tipo", async (req, res) => {
        try {
            const tabela = tabelas[req.params.tipo];
            if (!tabela) return res.status(400).json({ error: "Filtro inválido" });

            const [rows] = await db.query(`SELECT * FROM ${tabela} ORDER BY id ASC`);
            
            // Adiciona 'Geral' ao inicio da lista de categorias se não existir
            if (req.params.tipo === 'categoria') {
                const temGeral = rows.some(r => r.categoria === 'Geral');
                if (!temGeral) {
                    rows.unshift({ id: 0, categoria: 'Geral' });
                }
            }
            
            res.json(rows);
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao buscar filtro");
        }
    });

    // ============================================================
    // LISTAR CURSOS
    // ============================================================
    app.get("/api/cursos-public", async (req, res) => {
        try {
            const querySql = `
                SELECT 
                    c.id, 
                    COALESCE(fcurso.curso, 'Curso sem nome') AS nome, 
                    c.vagas, 
                    c.status,
                    TIME_FORMAT(c.horario_inicio, '%H:%i') AS horario_inicio, 
                    TIME_FORMAT(c.horario_termino, '%H:%i') AS horario_termino,
                    DATE_FORMAT(c.data_inicio, '%d/%m/%Y') AS data_inicio,
                    DATE_FORMAT(c.data_termino, '%d/%m/%Y') AS data_termino,
                    COALESCE(fc.categoria, 'Geral') AS categoria, 
                    COALESCE(fiMin.idade, '-') AS idade_min, 
                    COALESCE(fiMax.idade, '-') AS idade_max,
                    COALESCE(fm.modalidade, 'Não informada') AS modalidade, 
                    COALESCE(fl.local, 'Vitória') AS local, 
                    c.criado_em
                FROM cursos c
                LEFT JOIN filtro_curso fcurso ON fcurso.id = c.curso_id
                LEFT JOIN filtro_categoria fc ON fc.id = c.categoria_id
                LEFT JOIN filtro_idade fiMin ON fiMin.id = c.idade_min
                LEFT JOIN filtro_idade fiMax ON fiMax.id = c.idade_max
                LEFT JOIN filtro_modalidade fm ON fm.id = c.modalidade_id
                LEFT JOIN filtro_local fl ON fl.id = c.local_id
                ORDER BY c.id DESC
            `;
            const [rows] = await db.query(querySql);
            res.json(rows);
        } catch (err) {
            return responderErroBanco(res, err, "Erro na rota /api/cursos-public:");
        }
    });

    app.get("/cursos", exigirAuthAdmin, async (req, res) => {
        try {
            const { id } = req.query;

            const querySql = `
                SELECT 
                    c.id, 
                    COALESCE(fcurso.curso, 'Curso sem nome') AS nome, 
                    c.vagas, 
                    c.status,
                    TIME_FORMAT(c.horario_inicio, '%H:%i') AS horario_inicio, 
                    TIME_FORMAT(c.horario_termino, '%H:%i') AS horario_termino,
                    DATE_FORMAT(c.data_inicio, '%d/%m/%Y') AS data_inicio,
                    DATE_FORMAT(c.data_termino, '%d/%m/%Y') AS data_termino,
                    COALESCE(fc.categoria, 'Geral') AS categoria, 
                    COALESCE(fiMin.idade, '-') AS idade_min, 
                    COALESCE(fiMax.idade, '-') AS idade_max,
                    COALESCE(fm.modalidade, 'Não informada') AS modalidade, 
                    COALESCE(fl.local, 'Vitória') AS local, 
                    c.criado_em
                FROM cursos c
                LEFT JOIN filtro_curso fcurso ON fcurso.id = c.curso_id
                LEFT JOIN filtro_categoria fc ON fc.id = c.categoria_id
                LEFT JOIN filtro_idade fiMin ON fiMin.id = c.idade_min
                LEFT JOIN filtro_idade fiMax ON fiMax.id = c.idade_max
                LEFT JOIN filtro_modalidade fm ON fm.id = c.modalidade_id
                LEFT JOIN filtro_local fl ON fl.id = c.local_id
                ${id ? "WHERE c.id = ?" : ""}
                ORDER BY c.id DESC
            `;
            const [rows] = await db.query(querySql, id ? [id] : []);

            res.json(rows);
        } catch (err) {
            return responderErroBanco(res, err, "Erro na rota /cursos:");
        }
    });

    // ============================================================
    // CRIAR CURSO COM DISPARO AUTOMÁTICO VIA GMAIL (CORRIGIDO E BLINDADO)
    // ============================================================
    app.post("/cursos", exigirAuthAdmin, async (req, res) => {
        try {
            const { 
                curso, vagas, idade_min, idade_max, local, modalidade, 
                data_inicio, data_termino, horario_inicio, horario_termino, categoria_id 
            } = req.body;

            if (!curso) return res.status(400).json({ error: "Campo 'curso' é obrigatório." });

            // 1. Grava o curso (Tratamento contra erro de "undefined")
            const [result] = await db.query(`
                INSERT INTO cursos 
                (curso_id, vagas, idade_min, idade_max, local_id, modalidade_id, data_inicio, data_termino, horario_inicio, horario_termino, categoria_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                curso, vagas || 0, idade_min || null, idade_max || null, 
                local || null, modalidade || null, data_inicio || null, 
                data_termino || null, horario_inicio || null, horario_termino || null, 
                categoria_id || null
            ]);

            // 2. Procura os nomes reais para o e-mail (usando LEFT JOIN para evitar crash)
            const [linhas] = await db.query(`
                SELECT f.curso, l.local, cat.categoria,
                       DATE_FORMAT(c.data_inicio, '%d/%m/%Y') AS data_inicio,
                       DATE_FORMAT(c.data_termino, '%d/%m/%Y') AS data_termino,
                       TIME_FORMAT(c.horario_inicio, '%H:%i') AS horario_inicio,
                       TIME_FORMAT(c.horario_termino, '%H:%i') AS horario_termino
                FROM cursos c
                LEFT JOIN filtro_curso f ON c.curso_id = f.id
                LEFT JOIN filtro_local l ON c.local_id = l.id
                LEFT JOIN filtro_categoria cat ON c.categoria_id = cat.id
                WHERE c.id = ?
            `, [result.insertId]);

            const info = linhas[0];

            // TRAVA DE SEGURANÇA: Se o curso não tiver categoria informada, pula a automação de email
            if (!info || !info.categoria) {
                return res.json({ status: "ok", msg: "Curso criado (sem avisos automáticos, pois a categoria estava vazia)." });
            }

                const cursoCriado = {
                    id: result.insertId,
                    nome: info.curso || 'Curso',
                    categoria: info.categoria || 'Geral',
                    local: info.local || 'A definir',
                    data_inicio: info.data_inicio || null,
                    data_termino: info.data_termino || null,
                    horario_inicio: info.horario_inicio || null,
                    horario_termino: info.horario_termino || null,
                    status: 'ativo'
                };

                await notificarInteressadosPorCurso(cursoCriado);

            res.json({ status: "ok", msg: "Curso criado e avisos processados automaticamente." });

        } catch (err) {
            return responderErroBanco(res, err, "Erro na automação:");
        }
    });

    // ============================================================
    // ESGOTAR CURSO
    // ============================================================
    app.put("/cursos/esgotar/:id", exigirAuthAdmin, async (req, res) => {
        try {
            await db.query(`UPDATE cursos SET status = 'esgotado' WHERE id = ?`, [req.params.id]);
            res.json({ status: "curso esgotado" });
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao atualizar status");
        }
    });
    
    // ============================================================
    // INSCRIÇÃO
    // ============================================================
    app.post("/inscricao", async (req, res) => {
        try {
            const {
                nome,
                email,
                telefone,
                cpf,
                rg,
                curso_id,
                mora_vitoria,
                escolaridade,
                cep,
                numero,
                rua,
                bairro,
                municipio,
                possui_necessidade_especial,
                tipo_necessidade_especial,
                cpf_documento,
                rg_documento
            } = req.body;

            const cpfLimpo = normalizarCpf(cpf);
            const rgNormalizado = normalizarRg(rg);
            const possuiNecessidadeEspecial = String(possui_necessidade_especial || "nao").toLowerCase() === "sim" ? "sim" : "nao";
            const tipoNecessidadeEspecial = possuiNecessidadeEspecial === "sim"
                ? String(tipo_necessidade_especial || "").trim().slice(0, 120)
                : null;

            if (!nome || !email || !telefone || !cpfLimpo || !rgNormalizado || !curso_id || !cpf_documento || !rg_documento) {
                return res.status(400).json({ error: "Preencha todos os campos obrigatórios, inclusive CPF, RG e as fotos dos dois documentos." });
            }

            const [inscricaoExistente] = await db.query(
                `SELECT id
                 FROM pre_inscricoes
                 WHERE curso_id = ? AND cpf = ?
                 LIMIT 1`,
                [curso_id, cpfLimpo]
            );

            if (inscricaoExistente.length) {
                return res.status(409).json({
                    error: "Você já possui pré-inscrição para este curso com este CPF."
                });
            }

            const [curso] = await db.query(`
                SELECT
                    c.vagas,
                    c.status,
                    COALESCE(fc.curso, 'Curso') AS nome_curso,
                    COALESCE(fl.local, 'A definir') AS local_nome,
                    DATE_FORMAT(c.data_inicio, '%d/%m/%Y') AS data_inicio,
                    DATE_FORMAT(c.data_termino, '%d/%m/%Y') AS data_termino,
                    TIME_FORMAT(c.horario_inicio, '%H:%i') AS horario_inicio,
                    TIME_FORMAT(c.horario_termino, '%H:%i') AS horario_termino
                FROM cursos c
                LEFT JOIN filtro_curso fc ON fc.id = c.curso_id
                LEFT JOIN filtro_local fl ON fl.id = c.local_id
                WHERE c.id = ?
            `, [curso_id]);

            if (!curso.length) return res.status(404).json({ error: "Curso não encontrado" });

            const vagas = curso[0].vagas;
            if (vagas <= 0) return res.json({ error: "Vagas esgotadas" });

            const nomeCurso = curso[0].nome_curso || "Curso";
            const dadosConfirmacao = {
                cursoNome: nomeCurso,
                dataInicio: formatarDataBR(curso[0].data_inicio),
                dataTermino: formatarDataBR(curso[0].data_termino),
                horaInicio: formatarHora(curso[0].horario_inicio),
                horaTermino: formatarHora(curso[0].horario_termino),
                local: curso[0].local_nome
            };

            const [insertResult] = await db.query(`
                INSERT INTO pre_inscricoes (
                    nome,
                    email,
                    telefone,
                    cpf,
                    rg,
                    curso_id,
                    mora_vitoria,
                    escolaridade,
                    cep,
                    numero,
                    rua,
                    bairro,
                    municipio,
                    possui_necessidade_especial,
                    tipo_necessidade_especial,
                    cpf_documento,
                    rg_documento
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                nome,
                email,
                telefone,
                cpfLimpo,
                rgNormalizado,
                curso_id,
                mora_vitoria || null,
                escolaridade || null,
                cep || null,
                numero || null,
                rua || null,
                bairro || null,
                municipio || null,
                possuiNecessidadeEspecial,
                tipoNecessidadeEspecial,
                cpf_documento,
                rg_documento
            ]);

            const protocolo = gerarProtocoloInscricao(insertResult.insertId);

            const novasVagas = vagas - 1;
            await db.query(
                `UPDATE cursos SET vagas = ?, status = ? WHERE id = ?`,
                [novasVagas, novasVagas === 0 ? "esgotado" : "ativo", curso_id]
            );

            const smsMensagem = montarSmsConfirmacao(dadosConfirmacao);

            const [emailResult, smsResult] = await Promise.allSettled([
                enviarEmailRecebimentoPreInscricao({
                    nome,
                    email,
                    cursoNome: dadosConfirmacao.cursoNome,
                    protocolo
                }),
                enviarMensagemTwilio({ telefone, mensagem: smsMensagem })
            ]);

            const notificacoes = {
                email: emailResult.status === "fulfilled" ? "enviado" : "falhou",
                sms: smsResult.status === "fulfilled" && smsResult.value.sent
                    ? "enviado"
                    : (smsResult.status === "fulfilled" ? smsResult.value.reason : "falhou"),
                canal: smsResult.status === "fulfilled" && smsResult.value.canal
                    ? smsResult.value.canal
                    : "sms"
            };

            if (emailResult.status === "rejected") {
                console.error("Falha ao enviar email de pre-inscricao:", emailResult.reason);
            }
            if (smsResult.status === "rejected") {
                console.error("Falha ao enviar SMS de confirmacao:", smsResult.reason);
            }

            res.json({
                status: "ok",
                msg: "Inscrição realizada com sucesso",
                protocolo,
                vagas_restantes: novasVagas,
                notificacoes
            });
        } catch (err) {
            if (err && err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    error: "Você já possui pré-inscrição para este curso com este CPF."
                });
            }

            return responderErroBanco(res, err, "Erro no servidor");
        }
    });

    app.get("/api/pre-inscricoes/por-cpf/:cpf", async (req, res) => {
        try {
            const cpfLimpo = normalizarCpf(req.params.cpf);

            if (cpfLimpo.length !== 11) {
                return res.status(400).json({ error: "CPF inválido" });
            }

            const [rows] = await db.query(
                `SELECT
                    id,
                    nome,
                    email,
                    telefone,
                    cpf,
                    rg,
                    mora_vitoria,
                    escolaridade,
                    cep,
                    numero,
                    rua,
                    bairro,
                    municipio,
                    possui_necessidade_especial,
                    tipo_necessidade_especial,
                    cpf_documento,
                    rg_documento,
                    curso_id
                FROM pre_inscricoes
                WHERE cpf = ?
                ORDER BY criado_em DESC
                LIMIT 1`,
                [cpfLimpo]
            );

            if (!rows.length) {
                return res.status(404).json({ found: false });
            }

            res.json({ found: true, data: rows[0] });
        } catch (err) {
            console.error("Erro ao buscar inscrição por CPF:", err);
            res.status(500).json({ error: "Erro ao buscar CPF" });
        }
    });

    // ============================================================
    // LISTAR INSCRITOS DE UM CURSO ESPECÍFICO (Atualizado)
    // ============================================================
    app.get("/inscritos/:idCurso", exigirAuthAdmin, async (req, res) => {
        try {
            const { idCurso } = req.params;
            const [rows] = await db.query(`
                SELECT
                    id,
                    nome,
                    email,
                    telefone,
                    cpf,
                    rg,
                    mora_vitoria,
                    escolaridade,
                    cep,
                    numero,
                    rua,
                    bairro,
                    municipio,
                    possui_necessidade_especial,
                    tipo_necessidade_especial,
                    cpf_documento,
                    rg_documento,
                    matricula_confirmada,
                    matricula_confirmada_em,
                    criado_em AS data
                FROM pre_inscricoes
                WHERE curso_id = ?
                ORDER BY criado_em DESC
            `, [idCurso]);

            res.json(rows);
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao buscar inscritos");
        }
    });

    // ============================================================
    // CONFIRMAR MATRÍCULA E DISPARAR EMAIL
    // ============================================================
    app.put("/api/inscricoes/:id/confirmar", exigirAuthAdmin, async (req, res) => {
        try {
            const idInscricao = req.params.id;

            const [rows] = await db.query(
                `SELECT
                    pi.id,
                    pi.nome,
                    pi.email,
                    pi.matricula_confirmada,
                    COALESCE(fc.curso, 'Curso') AS curso_nome,
                    COALESCE(fl.local, 'A definir') AS local_nome,
                    DATE_FORMAT(c.data_inicio, '%d/%m/%Y') AS data_inicio,
                    DATE_FORMAT(c.data_termino, '%d/%m/%Y') AS data_termino,
                    TIME_FORMAT(c.horario_inicio, '%H:%i') AS horario_inicio,
                    TIME_FORMAT(c.horario_termino, '%H:%i') AS horario_termino
                 FROM pre_inscricoes pi
                 LEFT JOIN cursos c ON c.id = pi.curso_id
                 LEFT JOIN filtro_curso fc ON fc.id = c.curso_id
                 LEFT JOIN filtro_local fl ON fl.id = c.local_id
                 WHERE pi.id = ?
                 LIMIT 1`,
                [idInscricao]
            );

            if (!rows.length) {
                return res.status(404).json({ error: "Inscrição não encontrada." });
            }

            const inscricao = rows[0];

            if (Number(inscricao.matricula_confirmada) === 1) {
                return res.json({ status: "ja-confirmada", msg: "Matrícula já estava confirmada." });
            }

            await db.query(
                `UPDATE pre_inscricoes
                 SET matricula_confirmada = 1,
                     matricula_confirmada_em = NOW()
                 WHERE id = ?`,
                [idInscricao]
            );

            let emailStatus = "enviado";
            try {
                const protocolo = gerarProtocoloInscricao(inscricao.id);
                await enviarEmailMatriculaConfirmada({
                    nome: inscricao.nome,
                    email: inscricao.email,
                    cursoNome: inscricao.curso_nome,
                    dataInicio: inscricao.data_inicio,
                    dataTermino: inscricao.data_termino,
                    horaInicio: inscricao.horario_inicio,
                    horaTermino: inscricao.horario_termino,
                    local: inscricao.local_nome,
                    protocolo
                });
            } catch (err) {
                emailStatus = "falhou";
                console.error("Falha ao enviar email de matrícula confirmada:", err);
            }

            return res.json({ status: "ok", email: emailStatus });
        } catch (err) {
            console.error("Erro ao confirmar matrícula:", err);
            return res.status(500).json({ error: "Erro ao confirmar matrícula." });
        }
    });

    // ============================================================
    // EXCLUIR INSCRIÇÃO E LIBERAR VAGA AUTOMATICAMENTE
    // ============================================================
    app.delete("/api/inscricoes/:id", exigirAuthAdmin, async (req, res) => {
        try {
            const idInscricao = req.params.id;

            // 1. Descobrir de qual curso é essa inscrição
            const [inscricao] = await db.query(`SELECT curso_id FROM pre_inscricoes WHERE id = ?`, [idInscricao]);
            
            if (!inscricao.length) {
                return res.status(404).json({ error: "Inscrição não encontrada no sistema." });
            }

            const cursoId = inscricao[0].curso_id;

            // 2. Apagar a inscrição
            await db.query(`DELETE FROM pre_inscricoes WHERE id = ?`, [idInscricao]);

            const [cursoRows] = await db.query(`
                SELECT
                    c.id,
                    COALESCE(fcurso.curso, 'Curso') AS nome,
                    COALESCE(fc.categoria, 'Geral') AS categoria,
                    COALESCE(fl.local, 'A definir') AS local,
                    DATE_FORMAT(c.data_inicio, '%d/%m/%Y') AS data_inicio,
                    DATE_FORMAT(c.data_termino, '%d/%m/%Y') AS data_termino,
                    TIME_FORMAT(c.horario_inicio, '%H:%i') AS horario_inicio,
                    TIME_FORMAT(c.horario_termino, '%H:%i') AS horario_termino,
                    c.status
                FROM cursos c
                LEFT JOIN filtro_curso fcurso ON fcurso.id = c.curso_id
                LEFT JOIN filtro_categoria fc ON fc.id = c.categoria_id
                LEFT JOIN filtro_local fl ON fl.id = c.local_id
                WHERE c.id = ?
            `, [cursoId]);

            // 3. Devolver a vaga e garantir que o curso fique 'ativo'
            await db.query(`UPDATE cursos SET vagas = vagas + 1, status = 'ativo' WHERE id = ?`, [cursoId]);

            if (cursoRows.length) {
                await notificarInteressadosPorCurso({ ...cursoRows[0], status: 'ativo' });
            }

            res.json({ message: "Inscrição removida e vaga liberada com sucesso!" });
        } catch (err) {
            console.error("Erro ao excluir inscrição:", err);
            res.status(500).json({ error: "Erro interno no servidor" });
        }
    });

    // ============================================================
    // ROTAS DO QUIZ VOCACIONAL (INTERESSADOS/LEADS)
    // ============================================================
    
    // Salvar o aluno que fez o quiz
    app.post('/api/interessados', async (req, res) => {
        try {
            const { nome, whatsapp, email, regiao, perfil } = req.body;
            const [resultado] = await db.query(`
                INSERT INTO interessados (nome, whatsapp, email, regiao, perfil_curso) 
                VALUES (?, ?, ?, ?, ?)
            `, [nome, whatsapp, email, regiao, perfil]);

            await notificarNovoLeadSeHouverCursoAtivo({
                id: resultado.insertId,
                nome,
                whatsapp,
                email,
                regiao,
                perfil_curso: perfil,
                status: 'aguardando'
            });
            
            res.json({ message: "Interesse salvo com sucesso!" });
        } catch (err) {
            console.error("Erro ao salvar lead:", err);
            res.status(500).json({ error: "Erro ao salvar os dados" });
        }
    });

    // Listar todos os interessados no Admin
    app.get('/api/interessados', exigirAuthAdmin, async (req, res) => {
        try {
            const [rows] = await db.query(`SELECT * FROM interessados ORDER BY id DESC`);
            res.json(rows);
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao listar interessados");
        }
    });

    // Alterar Status do Contato (Aguardando/Enviado)
    app.put('/api/interessados/:id/status', exigirAuthAdmin, async (req, res) => {
        try {
            const { status } = req.body;
            await db.query(
                `UPDATE interessados
                 SET status = ?, enviado_em = CASE WHEN ? = 'enviado' THEN NOW() ELSE NULL END
                 WHERE id = ?`,
                [status, status, req.params.id]
            );
            res.json({ message: "Status atualizado!" });
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao atualizar status");
        }
    });

    // ============================================================
    // ADMIN STATS
    // ============================================================
    app.get("/api/admin/stats", exigirAuthAdmin, async (req, res) => {
        try {
            const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM cursos`);
            const [[{ ativos }]] = await db.query(`SELECT COUNT(*) AS ativos FROM cursos WHERE status = 'ativo'`);
            const [[{ inscritos }]] = await db.query(`SELECT COUNT(*) AS inscritos FROM pre_inscricoes`);
            const [[{ leads }]] = await db.query(`SELECT COUNT(*) AS leads FROM interessados WHERE status = 'aguardando'`);
            res.json({ total, ativos, inscritos, leads });
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao buscar estatísticas");
        }
    });

    app.get("/api/admin/cursos-stats", exigirAuthAdmin, async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT
                    c.id,
                    COALESCE(fcurso.curso, 'Sem nome') AS nome,
                    c.vagas AS vagas_restantes,
                    c.status,
                    COALESCE(fl.local, 'N/A') AS local,
                    COUNT(pi.id) AS inscritos
                FROM cursos c
                LEFT JOIN filtro_curso fcurso ON fcurso.id = c.curso_id
                LEFT JOIN filtro_local fl ON fl.id = c.local_id
                LEFT JOIN pre_inscricoes pi ON pi.curso_id = c.id
                GROUP BY c.id
                ORDER BY inscritos DESC
            `);
            res.json(rows);
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao buscar stats");
        }
    });

    // ============================================================
    // DELETAR CURSO (CASCADE apaga inscrições automaticamente)
    // ============================================================
    app.delete("/cursos/:id", exigirAuthAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const [[curso]] = await db.query(`SELECT id FROM cursos WHERE id = ?`, [id]);
            if (!curso) return res.status(404).json({ error: "Curso não encontrado" });
            await db.query(`DELETE FROM cursos WHERE id = ?`, [id]);
            res.json({ message: "Curso removido com sucesso." });
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao remover curso");
        }
    });

    // ============================================================
    // CHATBOT
    // ============================================================
    app.post("/chat", async (req, res) => {
        try {
            let text = (req.body.message || "")
                .toString().trim().toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (!text) return res.json({ reply: "Diga algo como: 'curso 5', 'vagas', 'locais', 'lista de cursos'." });

            const has = words => words.some(w => text.includes(w));
            const matchId = text.match(/curso\s*(\d+)/) || text.match(/id\s*(\d+)/);

            if (has(["inscricao", "inscrever", "quero me inscrever", "matricula", "pre inscri", "inscrever"])) {
                return res.json({ reply: `🔗 Clique abaixo para fazer sua pré-inscrição:\n${baseUrl}/pre_inscricao.html` });
            }

            if (matchId) {
                const id = matchId[1];
                const [rows] = await db.query(`
                    SELECT c.id, fcurso.curso AS nome, c.vagas, c.status, fl.local, fm.modalidade
                    FROM cursos c
                    LEFT JOIN filtro_curso fcurso ON fcurso.id = c.curso_id
                    LEFT JOIN filtro_local fl ON fl.id = c.local_id
                    LEFT JOIN filtro_modalidade fm ON fm.id = c.modalidade_id
                    WHERE c.id = ?
                `, [id]);

                if (!rows.length) return res.json({ reply: "Curso não encontrado." });
                const c = rows[0];

                return res.json({
                    reply: `📘 *${c.nome}*\n\n📍 Local: ${c.local}\n🏫 Modalidade: ${c.modalidade}\n👥 Vagas: ${c.vagas} — ${c.status}\n\n👉 *Pré-inscrição:* \nhttp://localhost:3000/pre_inscricao.html?id=${c.id}`
                });
            }

            if (has(["vaga", "vagas", "disponivel", "tem vaga"])) {
                const [rows] = await db.query(`SELECT SUM(vagas) AS total FROM cursos WHERE status = 'ativo'`);
                const total = rows[0].total || 0;
                return res.json({ reply: `Atualmente temos *${total} vagas disponíveis*.` });
            }

            if (has(["curso", "cursos", "lista", "catalogo", "mostrar cursos"])) {
                const [rows] = await db.query(`
                    SELECT c.id, fcurso.curso AS nome, c.vagas, c.status, fl.local
                    FROM cursos c
                    LEFT JOIN filtro_curso fcurso ON fcurso.id = c.curso_id
                    LEFT JOIN filtro_local fl ON fl.id = c.local_id
                `);

                const lista = rows.map(r => `📘 *${r.id} — ${r.nome}*\n📍 Local: ${r.local}\n👥 ${r.vagas} vagas — ${r.status}\n👉 Pré-inscrição: http://localhost:3000/pre_inscricao.html?id=${r.id}\n`).join("\n");
                return res.json({ reply: lista });
            }

            return res.json({ reply: `Não entendi 😅  \nTente perguntar:\n\n• "curso 12"\n• "vagas"\n• "lista de cursos"\n• "quero me inscrever"` });

        } catch (err) {
            return responderErroBanco(res, err, "Erro ao processar mensagem.");
        }
    });
        // ============================================================
    // ESTATÍSTICAS DO PAINEL (VAGAS DISPONÍVEIS E PREENCHIDAS)
    // ============================================================
    app.get("/api/estatisticas", async (req, res) => {
        try {
            // 1. Soma todas as vagas restantes de cursos que estão 'ativos'
            const [rowsVagas] = await db.query(`SELECT SUM(vagas) AS totais FROM cursos WHERE status = 'ativo'`);
            const vagasHoje = rowsVagas[0].totais || 0;

            // 2. Conta quantas inscrições (vagas preenchidas) foram feitas no ano de 2026
            const [rowsInscricoes] = await db.query(`SELECT COUNT(id) AS preenchidas FROM pre_inscricoes WHERE YEAR(criado_em) = 2026`);
            const vagas2026 = rowsInscricoes[0].preenchidas || 0;

            res.json({ vagasHoje, vagas2026 });
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao carregar estatísticas:");
        }
    });
    // ============================================================
    // CURSOS DETALHES
    // ============================================================
    app.get("/cursos-detalhes/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const [rows] = await db.query(`
                SELECT 
                    c.id, fcurso.curso AS nome, c.vagas, c.status,
                    TIME_FORMAT(c.horario_inicio, '%H:%i') AS horario_inicio,
                    TIME_FORMAT(c.horario_termino, '%H:%i') AS horario_termino,
                    DATE_FORMAT(c.data_inicio, '%d/%m/%Y') AS data_inicio,
                    DATE_FORMAT(c.data_termino, '%d/%m/%Y') AS data_termino,
                    fl.local, fm.modalidade, fc.categoria
                FROM cursos c
                LEFT JOIN filtro_curso fcurso ON fcurso.id = c.curso_id
                LEFT JOIN filtro_local fl ON fl.id = c.local_id
                LEFT JOIN filtro_modalidade fm ON fm.id = c.modalidade_id
                LEFT JOIN filtro_categoria fc ON fc.id = c.categoria_id
                WHERE c.id = ?
            `, [id]);

            if (rows.length === 0) return res.status(404).json({ error: "Curso não encontrado" });
            res.json(rows[0]);
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao buscar detalhes");
        }
    });

    // ============================================================
    // ROTAS DE PÁGINAS (HTML)
    // ============================================================
    app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "pages", "index.html")));
    app.get("/detalhes", (req, res) => res.sendFile(path.join(__dirname, "public", "pages", "detalhes.html")));

    app.use((req, res) => {
        res.status(404).send("Arquivo não encontrado!");
    });

    return app;
}

if (require.main === module) {
    createApp()
        .then((app) => {
            baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${SERVER_PORT}`;

            const server = app.listen(SERVER_PORT, () => {
                console.log(`Servidor rodando em http://localhost:${SERVER_PORT}`);
            });

            server.on("error", (err) => {
                console.error("Erro ao iniciar servidor HTTP:", err);
                process.exit(1);
            });
        })
        .catch((err) => {
            console.error("Falha ao iniciar aplicação:", err);
            process.exit(1);
        });
}

module.exports = createApp;