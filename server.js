const express = require("express");
const fs = require("fs");
const { Pool } = require("pg");
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
const limparEnv = (valor) => String(valor || "").trim().replace(/^['\"]|['\"]$/g, "");
const POSTGRES_HOST = limparEnv(process.env.POSTGRES_HOST);
const POSTGRES_USER = limparEnv(process.env.POSTGRES_USER);
const POSTGRES_PASSWORD = limparEnv(process.env.POSTGRES_PASSWORD);
const POSTGRES_DATABASE = limparEnv(process.env.POSTGRES_DATABASE) || "postgres";
const POSTGRES_PORT = Number(process.env.POSTGRES_PORT || 5432);
const DATABASE_URL_RAW =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    "";
const DATABASE_URL_FROM_PARTS = POSTGRES_HOST && POSTGRES_USER
    ? `postgresql://${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(POSTGRES_PASSWORD)}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}`
    : "";
const DATABASE_URL = DATABASE_URL_FROM_PARTS || DATABASE_URL_RAW;
const DB_SSL_ENABLED = String(process.env.DB_SSL_ENABLED || "true").toLowerCase() !== "false";
const DB_SSL_REJECT_UNAUTHORIZED = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true";
const DB_CONNECT_TIMEOUT = Number(process.env.DB_CONNECT_TIMEOUT || 6000);
const DB_QUERY_TIMEOUT = Number(process.env.DB_QUERY_TIMEOUT || 7000);
const DB_CONNECTION_LIMIT = Number(process.env.DB_CONNECTION_LIMIT || 10);
const DB_HOST_REF = `${POSTGRES_HOST} ${DATABASE_URL}`.toLowerCase();
const DB_IS_SUPABASE = DB_HOST_REF.includes("supabase.co") || DB_HOST_REF.includes("supabase.com");

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
    const code = erro && erro.code;
    return Boolean(
        code && [
            "ETIMEDOUT",
            "PROTOCOL_SEQUENCE_TIMEOUT",
            "ECONNREFUSED",
            "ENOTFOUND",
            "EHOSTUNREACH",
            "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR"
        ].includes(code)
    );
}

function converterPlaceholdersSql(sql) {
    let indice = 0;
    return String(sql || "").replace(/\?/g, () => `$${++indice}`);
}

function responderErroBanco(res, erro, mensagem) {
    if (eErroTimeoutBanco(erro)) {
        console.error("[db] erro de conexao/timeout:", erro?.code || "sem_code", erro?.message || erro);
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
    // POSTGRESQL / SUPABASE
    // ======================================
    console.log("[db] Iniciando configuracao da pool PostgreSQL");
    console.log("[db] Connection limit:", DB_CONNECTION_LIMIT);
    console.log("[db] connectTimeout:", DB_CONNECT_TIMEOUT);
    console.log("[db] queryTimeout:", DB_QUERY_TIMEOUT);
    console.log("[db] SSL habilitado:", DB_SSL_ENABLED);
    console.log("[db] SSL rejectUnauthorized:", DB_SSL_REJECT_UNAUTHORIZED);
    console.log("[db] Host Supabase detectado:", DB_IS_SUPABASE);

    const pgPool = new Pool({
        connectionString: DATABASE_URL || undefined,
        max: DB_CONNECTION_LIMIT,
        connectionTimeoutMillis: DB_CONNECT_TIMEOUT,
        statement_timeout: DB_QUERY_TIMEOUT,
        ssl: DB_SSL_ENABLED
            ? { rejectUnauthorized: DB_IS_SUPABASE ? false : DB_SSL_REJECT_UNAUTHORIZED }
            : false
    });

    const db = {
        query: async (sql, values) => {
            const text = typeof sql === "string" ? converterPlaceholdersSql(sql) : sql;
            const result = await pgPool.query(text, values);
            return [result.rows, result.fields];
        },
        getConnection: async () => {
            const client = await pgPool.connect();
            return {
                release: () => client.release()
            };
        }
    };

    let bancoDisponivelNaInicializacao = false;

    async function inicializarBanco() {
        try {
            console.log("[db] Pool PostgreSQL criada, validando conexao...");
            const connection = await db.getConnection();
            console.log("[db] Conexao PostgreSQL validada com sucesso");
            connection.release();
            console.log("[db] Conexao PostgreSQL liberada de volta para a pool");

            await garantirColuna("pre_inscricoes", "cpf", "VARCHAR(14) NULL");
            await garantirColuna("pre_inscricoes", "rg", "VARCHAR(20) NULL");
            await garantirColuna("pre_inscricoes", "mora_vitoria", "VARCHAR(3) NULL");
            await garantirColuna("pre_inscricoes", "escolaridade", "VARCHAR(80) NULL");
            await garantirColuna("pre_inscricoes", "cep", "VARCHAR(12) NULL");
            await garantirColuna("pre_inscricoes", "numero", "VARCHAR(20) NULL");
            await garantirColuna("pre_inscricoes", "rua", "VARCHAR(150) NULL");
            await garantirColuna("pre_inscricoes", "bairro", "VARCHAR(120) NULL");
            await garantirColuna("pre_inscricoes", "municipio", "VARCHAR(120) NULL");
            await garantirColuna("pre_inscricoes", "possui_necessidade_especial", "VARCHAR(3) NULL");
            await garantirColuna("pre_inscricoes", "tipo_necessidade_especial", "VARCHAR(120) NULL");
            await garantirColuna("pre_inscricoes", "cpf_documento", "TEXT NULL");
            await garantirColuna("pre_inscricoes", "rg_documento", "TEXT NULL");
            await garantirColuna("pre_inscricoes", "documento_confirmacao", "TEXT NULL");
            await garantirColuna("pre_inscricoes", "matricula_confirmada", "SMALLINT NOT NULL DEFAULT 0");
            await garantirColuna("pre_inscricoes", "matricula_confirmada_em", "TIMESTAMP NULL");
            await garantirColuna("interessados", "enviado_em", "TIMESTAMP NULL");
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
             WHERE TABLE_SCHEMA = current_schema()
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
                         FROM pg_indexes
                         WHERE schemaname = current_schema()
                             AND tablename = ?
                             AND indexname = ?`,
            [tabela, indice]
        );

        if (indices[0].total === 0) {
            await db.query(`CREATE INDEX ${indice} ON ${tabela} (${colunas})`);
        }
    }

    async function garantirIndiceUnico(tabela, indice, colunas) {
        const [indices] = await db.query(
            `SELECT COUNT(*) AS total
                         FROM pg_indexes
                         WHERE schemaname = current_schema()
                             AND tablename = ?
                             AND indexname = ?`,
            [tabela, indice]
        );

        if (indices[0].total === 0) {
            try {
                await db.query(`CREATE UNIQUE INDEX ${indice} ON ${tabela} (${colunas})`);
            } catch (err) {
                if (err && (err.code === "23505" || err.code === "ER_DUP_ENTRY")) {
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

    const EMAIL_BRIDGE_CID = "vix-terceira-ponte";
    const EMAIL_BRIDGE_ASSET_PATH = path.join(__dirname, "public", "imagem", "terceira_ponte.png");

    function montarAnexosEmailPadrao() {
        if (!fs.existsSync(EMAIL_BRIDGE_ASSET_PATH)) {
            return [];
        }

        return [
            {
                filename: "terceira_ponte.png",
                path: EMAIL_BRIDGE_ASSET_PATH,
                cid: EMAIL_BRIDGE_CID
            }
        ];
    }

    function montarLayoutEmailBase({ tituloSecao, subtituloSecao, conteudoHtml, exibirPonte = false, modoPonte = "padrao" }) {
        const classePonte = modoPonte === "cobertura"
            ? "bridge-wrap bridge-cover"
            : "bridge-wrap bridge-soft";

        const camadaPonte = exibirPonte
            ? `
                <div class="${classePonte}">
                    <img src="cid:${EMAIL_BRIDGE_CID}" alt="Terceira Ponte" class="bridge-img">
                    <div class="bridge-fade"></div>
                </div>
            `
            : "";

        return `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { margin: 0; padding: 0; background: #fdfbf9; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; }
                    .wrapper { max-width: 640px; margin: 0 auto; background: #fdfbf9; }
                    .hero { position: relative; overflow: hidden; background: linear-gradient(135deg, #004564 0%, #1a5874 100%); padding: 34px 28px 86px; }
                    .hero-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 28px 28px; }
                    .bridge-wrap { position: absolute; left: 0; right: 0; bottom: 0; overflow: hidden; pointer-events: none; z-index: 1; }
                    .bridge-soft { height: 46%; opacity: 0.22; }
                    .bridge-cover { height: 68%; opacity: 0.3; }
                    .bridge-img { position: absolute; left: 50%; transform: translateX(-50%); max-width: none; }
                    .bridge-soft .bridge-img { width: 108%; bottom: -10px; }
                    .bridge-cover .bridge-img { width: 132%; bottom: -32px; }
                    .bridge-fade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,69,100,0.76) 8%, rgba(0,69,100,0.42) 45%, rgba(0,69,100,0) 100%); }
                    .hero-content { position: relative; z-index: 2; }
                    .brand { color: #f8fafc; font-weight: 800; font-size: 23px; letter-spacing: -0.02em; margin: 0; }
                    .subtitle { color: #d7eaf3; margin: 6px 0 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
                    .card { background: #ffffff; margin: -56px 18px 0; border: 1px solid #e2e8f0; border-radius: 14px; padding: 28px 24px; box-shadow: 0 14px 36px rgba(2, 26, 43, 0.14); position: relative; z-index: 2; }
                    .section-title { margin: 0 0 4px; color: #0f172a; font-size: 20px; }
                    .section-subtitle { margin: 0 0 20px; color: #64748b; font-size: 13px; }
                    .line { border-top: 1px solid #e2e8f0; margin: 18px 0; }
                    .text { margin: 0 0 12px; color: #334155; font-size: 14px; line-height: 1.65; }
                    .highlight { color: #004564; font-weight: 700; }
                    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin: 16px 0; }
                    .info-item { margin: 8px 0; color: #334155; font-size: 14px; line-height: 1.5; }
                    .info-icon { display: inline-block; width: 18px; color: #1a5874; font-weight: 700; }
                    .cta-wrap { text-align: center; margin: 24px 0 6px; }
                    .cta { display: inline-block; text-decoration: none; background: linear-gradient(135deg, #ff8a5a 0%, #f36c6f 100%); color: #ffffff; padding: 12px 24px; border-radius: 999px; font-weight: 700; font-size: 14px; }
                    .footer { text-align: center; color: #64748b; font-size: 11px; padding: 18px 22px 26px; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="hero">
                        <div class="hero-grid"></div>
                        ${camadaPonte}
                        <div class="hero-content">
                            <p class="brand">Vix Cursos</p>
                            <p class="subtitle">Prefeitura de Vitoria</p>
                        </div>
                    </div>

                    <div class="card">
                        <h2 class="section-title">${tituloSecao}</h2>
                        <p class="section-subtitle">${subtituloSecao}</p>
                        ${conteudoHtml}
                    </div>

                    <div class="footer">
                        <p style="margin:0;">Vix Cursos | Prefeitura de Vitoria</p>
                        <p style="margin:6px 0 0;">Mensagem automatica. Nao responda este e-mail.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    function montarEmailDisponibilidade({ nome, curso, perfil }) {
        const link = montarLinkPreInscricao(curso);
        const anexos = montarAnexosEmailPadrao();

        const conteudoHtml = `
            <p class="text">Ola, <span class="highlight">${nome}</span>.</p>
            <p class="text">Encontramos uma oportunidade alinhada ao seu perfil para o curso <span class="highlight">${curso.nome || "Qualificacao"}</span>.</p>

            <div class="info-box">
                <p class="info-item"><span class="info-icon">&#9679;</span><strong>Perfil:</strong> ${perfil || "Geral"}</p>
                <p class="info-item"><span class="info-icon">&#9679;</span><strong>Local:</strong> ${curso.local || "A definir"}</p>
                ${curso.data_inicio && curso.data_termino ? `<p class="info-item"><span class="info-icon">&#9679;</span><strong>Periodo:</strong> ${curso.data_inicio} a ${curso.data_termino}</p>` : ""}
                ${curso.horario_inicio && curso.horario_termino ? `<p class="info-item"><span class="info-icon">&#9679;</span><strong>Horario:</strong> ${curso.horario_inicio}h as ${curso.horario_termino}h</p>` : ""}
            </div>

            <div class="cta-wrap">
                <a href="${link}" class="cta">Fazer pre-inscricao</a>
            </div>
        `;

        return {
            subject: `Curso disponível: ${curso.nome || 'Nova oportunidade'}`,
            html: montarLayoutEmailBase({
                tituloSecao: "Curso disponivel para inscricao",
                subtituloSecao: "Aviso de oportunidade",
                conteudoHtml,
                exibirPonte: anexos.length > 0
            }),
            attachments: anexos
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
                    html: emailPayload.html,
                    attachments: emailPayload.attachments || []
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
                TO_CHAR(c.data_inicio, 'DD/MM/YYYY') AS data_inicio,
                TO_CHAR(c.data_termino, 'DD/MM/YYYY') AS data_termino,
                TO_CHAR(c.horario_inicio, 'HH24:MI') AS horario_inicio,
                TO_CHAR(c.horario_termino, 'HH24:MI') AS horario_termino,
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

        const anexos = montarAnexosEmailPadrao();
        const conteudoHtml = `
            <p class="text">Ola, <span class="highlight">${nome}</span>.</p>
            <p class="text">Recebemos sua pre-inscricao no curso <span class="highlight">${cursoNome}</span>.</p>

            <div class="info-box">
                <p class="info-item"><span class="info-icon">&#9679;</span><strong>Protocolo:</strong> ${protocolo}</p>
                <p class="info-item"><span class="info-icon">&#9679;</span><strong>Status:</strong> Em analise</p>
            </div>

            <div class="line"></div>
            <p class="text">Sua inscricao sera validada e voce recebera novo aviso por e-mail assim que a matricula for confirmada.</p>
        `;

        await mailer.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject: `Pré-inscrição recebida - ${cursoNome}`,
            html: montarLayoutEmailBase({
                tituloSecao: "Pre-inscricao recebida",
                subtituloSecao: "Confirmacao de registro",
                conteudoHtml,
                exibirPonte: anexos.length > 0
            }),
            attachments: anexos
        });
    }

    async function enviarEmailMatriculaConfirmada({ nome, email, cursoNome, dataInicio, dataTermino, horaInicio, horaTermino, local, protocolo }) {
        if (!emailDisponivel) {
            throw new Error("smtp-indisponivel");
        }

        const anexos = montarAnexosEmailPadrao();
        const conteudoHtml = `
            <p class="text">Ola, <span class="highlight">${nome}</span>.</p>
            <p class="text">Sua matricula no curso <span class="highlight">${cursoNome}</span> foi confirmada.</p>

            <div class="info-box">
                <p class="info-item"><span class="info-icon">&#9679;</span><strong>Protocolo:</strong> ${protocolo}</p>
                ${dataInicio && dataTermino ? `<p class="info-item"><span class="info-icon">&#9679;</span><strong>Periodo:</strong> ${dataInicio} a ${dataTermino}</p>` : ""}
                ${horaInicio && horaTermino ? `<p class="info-item"><span class="info-icon">&#9679;</span><strong>Horario:</strong> ${horaInicio}h as ${horaTermino}h</p>` : ""}
                ${local ? `<p class="info-item"><span class="info-icon">&#9679;</span><strong>Local:</strong> ${local}</p>` : ""}
            </div>

            <div class="line"></div>
            <p class="text"><span class="highlight">Importante:</span> menores de idade devem estar acompanhados do responsavel legal.</p>
        `;

        await mailer.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject: `Matrícula Confirmada - ${cursoNome}`,
            html: montarLayoutEmailBase({
                tituloSecao: "Matricula confirmada",
                subtituloSecao: "Dados da turma",
                conteudoHtml,
                exibirPonte: anexos.length > 0,
                modoPonte: "cobertura"
            }),
            attachments: anexos
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
                    c.vagas AS vagas_totais, 
                    COALESCE(COUNT(pi.id), 0) AS inscritos,
                    (c.vagas - COALESCE(COUNT(pi.id), 0)) AS vagas_disponiveis,
                    c.status,
                    TO_CHAR(c.horario_inicio, 'HH24:MI') AS horario_inicio, 
                    TO_CHAR(c.horario_termino, 'HH24:MI') AS horario_termino,
                    TO_CHAR(c.data_inicio, 'DD/MM/YYYY') AS data_inicio,
                    TO_CHAR(c.data_termino, 'DD/MM/YYYY') AS data_termino,
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
                LEFT JOIN pre_inscricoes pi ON pi.curso_id = c.id
                GROUP BY c.id
                ORDER BY c.id DESC
            `;
            const [rows] = await db.query(querySql);
            
            // Filtrar cursos esgotados e manter compatibilidade
            const cursosFormatados = rows.map(curso => ({
                ...curso,
                vagas: curso.vagas_disponiveis, // Para compatibilidade com frontend
                disponivel: curso.vagas_disponiveis > 0
            }));
            
            res.json(cursosFormatados);
        } catch (err) {
            return responderErroBanco(res, err, "Erro na rota /api/cursos-public:");
        }
    });

    app.get("/api/cursos-public/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const querySql = `
                SELECT 
                    c.id, 
                    COALESCE(fcurso.curso, 'Curso sem nome') AS nome, 
                    c.vagas AS vagas_totais, 
                    COALESCE(COUNT(pi.id), 0) AS inscritos,
                    (c.vagas - COALESCE(COUNT(pi.id), 0)) AS vagas_disponiveis,
                    c.status,
                    TO_CHAR(c.horario_inicio, 'HH24:MI') AS horario_inicio, 
                    TO_CHAR(c.horario_termino, 'HH24:MI') AS horario_termino,
                    TO_CHAR(c.data_inicio, 'DD/MM/YYYY') AS data_inicio,
                    TO_CHAR(c.data_termino, 'DD/MM/YYYY') AS data_termino,
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
                LEFT JOIN pre_inscricoes pi ON pi.curso_id = c.id
                WHERE c.id = ?
                GROUP BY c.id
            `;
            const [rows] = await db.query(querySql, [id]);
            
            if (rows.length === 0) {
                return res.status(404).json({ error: "Curso não encontrado" });
            }
            
            // Adicionar campo para indicar se ainda tem vagas
            const curso = {
                ...rows[0],
                vagas: rows[0].vagas_disponiveis, // Para compatibilidade com frontend
                disponivel: rows[0].vagas_disponiveis > 0
            };
            
            res.json(curso);
        } catch (err) {
            return responderErroBanco(res, err, "Erro na rota /api/cursos-public/:id:");
        }
    });

    /**
     * Endpoint para verificar disponibilidade de vagas de um curso
     * GET /api/cursos-public/:id/vagas
     * Retorna: { disponivel: boolean, vagas_disponiveis: number, vagas_totais: number, inscritos: number }
     */
    app.get("/api/cursos-public/:id/vagas", async (req, res) => {
        try {
            const { id } = req.params;
            
            const [rows] = await db.query(`
                SELECT 
                    c.vagas AS vagas_totais,
                    COALESCE(COUNT(pi.id), 0) AS inscritos,
                    (c.vagas - COALESCE(COUNT(pi.id), 0)) AS vagas_disponiveis,
                    c.status
                FROM cursos c
                LEFT JOIN pre_inscricoes pi ON pi.curso_id = c.id
                WHERE c.id = ?
                GROUP BY c.id
            `, [id]);
            
            if (rows.length === 0) {
                return res.status(404).json({ error: "Curso não encontrado" });
            }
            
            const resultado = rows[0];
            const disponivel = resultado.vagas_disponiveis > 0 && resultado.status !== 'esgotado';
            
            res.json({
                disponivel,
                vagas_disponiveis: resultado.vagas_disponiveis,
                vagas_totais: resultado.vagas_totais,
                inscritos: resultado.inscritos,
                status: resultado.status
            });
        } catch (err) {
            return responderErroBanco(res, err, "Erro ao verificar vagas do curso:");
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
                    TO_CHAR(c.horario_inicio, 'HH24:MI') AS horario_inicio, 
                    TO_CHAR(c.horario_termino, 'HH24:MI') AS horario_termino,
                    TO_CHAR(c.data_inicio, 'DD/MM/YYYY') AS data_inicio,
                    TO_CHAR(c.data_termino, 'DD/MM/YYYY') AS data_termino,
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
                RETURNING id
            `, [
                curso, vagas || 0, idade_min || null, idade_max || null, 
                local || null, modalidade || null, data_inicio || null, 
                data_termino || null, horario_inicio || null, horario_termino || null, 
                categoria_id || null
            ]);

            // 2. Procura os nomes reais para o e-mail (usando LEFT JOIN para evitar crash)
            const [linhas] = await db.query(`
                SELECT f.curso, l.local, cat.categoria,
                       TO_CHAR(c.data_inicio, 'DD/MM/YYYY') AS data_inicio,
                       TO_CHAR(c.data_termino, 'DD/MM/YYYY') AS data_termino,
                       TO_CHAR(c.horario_inicio, 'HH24:MI') AS horario_inicio,
                       TO_CHAR(c.horario_termino, 'HH24:MI') AS horario_termino
                FROM cursos c
                LEFT JOIN filtro_curso f ON c.curso_id = f.id
                LEFT JOIN filtro_local l ON c.local_id = l.id
                LEFT JOIN filtro_categoria cat ON c.categoria_id = cat.id
                WHERE c.id = ?
            `, [result[0].id]);

            const info = linhas[0];

            // TRAVA DE SEGURANÇA: Se o curso não tiver categoria informada, pula a automação de email
            if (!info || !info.categoria) {
                return res.json({ status: "ok", msg: "Curso criado (sem avisos automáticos, pois a categoria estava vazia)." });
            }

                const cursoCriado = {
                    id: result[0].id,
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
                    TO_CHAR(c.data_inicio, 'DD/MM/YYYY') AS data_inicio,
                    TO_CHAR(c.data_termino, 'DD/MM/YYYY') AS data_termino,
                    TO_CHAR(c.horario_inicio, 'HH24:MI') AS horario_inicio,
                    TO_CHAR(c.horario_termino, 'HH24:MI') AS horario_termino
                FROM cursos c
                LEFT JOIN filtro_curso fc ON fc.id = c.curso_id
                LEFT JOIN filtro_local fl ON fl.id = c.local_id
                WHERE c.id = ?
            `, [curso_id]);

            if (!curso.length) return res.status(404).json({ error: "Curso não encontrado" });

            // ======== VALIDAÇÃO DE VAGAS ========
            const vagasDefinidas = curso[0].vagas;
            
            // Contar quantas inscrições já foram feitas neste curso
            const [contagem] = await db.query(
                `SELECT COUNT(*) as total FROM pre_inscricoes WHERE curso_id = ?`,
                [curso_id]
            );
            
            const inscritosAtuais = contagem[0].total;
            const vagasDisponiveis = vagasDefinidas - inscritosAtuais;
            
            // Se não há vagas ou o status está marcado como esgotado
            if (vagasDisponiveis <= 0 || curso[0].status === 'esgotado') {
                return res.status(400).json({ 
                    error: "Este curso atingiu o número máximo de inscrições. Infelizmente, as vagas estão esgotadas.",
                    vagas_disponiveis: 0,
                    inscritos: inscritosAtuais,
                    vagas_totais: vagasDefinidas
                });
            }

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
                RETURNING id
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

            const protocolo = gerarProtocoloInscricao(insertResult[0].id);

            // Atualizar vagas e status: quando as vagas chegam a 0, marca como esgotado
            const novasVagas = vagasDisponiveis - 1;
            const novoStatus = novasVagas === 0 ? "esgotado" : "ativo";
            
            await db.query(
                `UPDATE cursos SET vagas = ?, status = ? WHERE id = ?`,
                [novasVagas, novoStatus, curso_id]
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
            if (err && (err.code === "23505" || err.code === "ER_DUP_ENTRY")) {
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
                    TO_CHAR(c.data_inicio, 'DD/MM/YYYY') AS data_inicio,
                    TO_CHAR(c.data_termino, 'DD/MM/YYYY') AS data_termino,
                    TO_CHAR(c.horario_inicio, 'HH24:MI') AS horario_inicio,
                    TO_CHAR(c.horario_termino, 'HH24:MI') AS horario_termino
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
            let emailErro = null;
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
                emailErro = err?.code || err?.responseCode || err?.message || "erro-desconhecido";
                console.error("Falha ao enviar email de matrícula confirmada:", err);
            }

            return res.json({ status: "ok", email: emailStatus, email_erro: emailErro });
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
                    TO_CHAR(c.data_inicio, 'DD/MM/YYYY') AS data_inicio,
                    TO_CHAR(c.data_termino, 'DD/MM/YYYY') AS data_termino,
                    TO_CHAR(c.horario_inicio, 'HH24:MI') AS horario_inicio,
                    TO_CHAR(c.horario_termino, 'HH24:MI') AS horario_termino,
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
                RETURNING id
            `, [nome, whatsapp, email, regiao, perfil]);

            await notificarNovoLeadSeHouverCursoAtivo({
                id: resultado[0].id,
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
            const [rowsInscricoes] = await db.query(`SELECT COUNT(id) AS preenchidas FROM pre_inscricoes WHERE EXTRACT(YEAR FROM criado_em) = 2026`);
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
                    TO_CHAR(c.horario_inicio, 'HH24:MI') AS horario_inicio,
                    TO_CHAR(c.horario_termino, 'HH24:MI') AS horario_termino,
                    TO_CHAR(c.data_inicio, 'DD/MM/YYYY') AS data_inicio,
                    TO_CHAR(c.data_termino, 'DD/MM/YYYY') AS data_termino,
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