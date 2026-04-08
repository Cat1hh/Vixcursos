DROP DATABASE IF EXISTS portal_cursos;
CREATE DATABASE portal_cursos;
USE portal_cursos;

-- ==========================================
-- 1. TABELAS DE FILTROS (CATÁLOGOS)
-- ==========================================
CREATE TABLE filtro_idade (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idade INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE filtro_categoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE filtro_modalidade (
    id INT AUTO_INCREMENT PRIMARY KEY,
    modalidade VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE filtro_local (
    id INT AUTO_INCREMENT PRIMARY KEY,
    local VARCHAR(150)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Substituímos "filtro_nome" por "filtro_curso" (Fica muito mais profissional)
CREATE TABLE filtro_curso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso VARCHAR(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==========================================
-- 2. TABELA PRINCIPAL DE TURMAS (cursos)
-- ==========================================
CREATE TABLE cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    curso_id INT NOT NULL, -- Agora liga direto com filtro_curso
    vagas INT DEFAULT 0,
    status ENUM('ativo', 'esgotado') DEFAULT 'ativo',

    categoria_id INT NULL,
    modalidade_id INT NULL,
    local_id INT NULL,
    
    idade_min INT NULL,
    idade_max INT NULL,

    data_inicio DATE NULL,
    data_termino DATE NULL,
    horario_inicio TIME NULL,
    horario_termino TIME NULL,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (curso_id) REFERENCES filtro_curso(id),
    FOREIGN KEY (categoria_id) REFERENCES filtro_categoria(id),
    FOREIGN KEY (modalidade_id) REFERENCES filtro_modalidade(id),
    FOREIGN KEY (local_id) REFERENCES filtro_local(id),
    FOREIGN KEY (idade_min) REFERENCES filtro_idade(id),
    FOREIGN KEY (idade_max) REFERENCES filtro_idade(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==========================================
-- 3. TABELA DE INSCRIÇÕES
-- ==========================================
CREATE TABLE pre_inscricoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    cpf VARCHAR(14) NULL,
    rg VARCHAR(20) NULL,
    curso_id INT NOT NULL,
    mora_vitoria VARCHAR(3) NULL,
    escolaridade VARCHAR(80) NULL,
    cep VARCHAR(12) NULL,
    numero VARCHAR(20) NULL,
    rua VARCHAR(150) NULL,
    bairro VARCHAR(120) NULL,
    municipio VARCHAR(120) NULL,
    possui_necessidade_especial VARCHAR(3) NULL,
    tipo_necessidade_especial VARCHAR(120) NULL,
    cpf_documento LONGTEXT NULL,
    rg_documento LONGTEXT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (curso_id) REFERENCES cursos(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE UNIQUE INDEX uk_pre_inscricoes_curso_cpf
ON pre_inscricoes (curso_id, cpf);

-- ==========================================
-- 4. INSERTS DOS DADOS (O CATÁLOGO)
-- ==========================================

-- Idades
INSERT INTO filtro_idade (idade) VALUES 
(10),(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),
(21),(22),(23),(24),(25),(26),(27),(28),(29),(30),
(31),(32),(33),(34),(35),(36),(37),(38),(39),(40),
(41),(42),(43),(44),(45),(46),(47),(48),(49),(50),
(51),(52),(53),(54),(55),(56),(57),(58),(59),(60),
(61),(62),(63),(64),(65),(66),(67),(68),(69),(70),
(71),(72),(73),(74),(75),(76),(77),(78),(79),(80),(81);

-- Modalidades (Corrigido para as 3 reais)
INSERT INTO filtro_modalidade (modalidade) VALUES
('Presencial'), ('Híbrido'), ('Online');

-- Os 38 Cursos Originais (Agora na tabela filtro_curso)
INSERT INTO filtro_curso (curso) VALUES
('Administração'), ('Artesanato'), ('AUTOMAÇÃO INDUSTRIAL'), ('Beleza'), ('Cinema'), 
('Comércio / Gestão Empresarial'), ('Confecção'), ('Construção Civil / Serviço'), 
('Cultura'), ('Dança'), ('Dança e Teatro'), ('Educação'), ('Eletrônica'), 
('Eletricista / Energia'), ('Enfermagem / Saúde'), ('Estética'), ('Eventos'), 
('Fotografia'), ('Gastronomia'), ('Gestão'), ('Idiomas'), ('Informática / Tecnologia'), 
('Logística'), ('Manutenção'), ('Mecânica'), ('Meio Ambiente'), ('Moda'), ('Música'), 
('Panificação / Confeitaria'), ('Produção Cultural'), ('Programação / TI'), 
('Recursos Humanos'), ('Redes / Telecom'), ('Segurança do Trabalho'), 
('Serviço Social'), ('Soldagem'), ('Turismo / Hotelaria'), ('Vendas / Marketing');

-- As 38 Categorias Originais 
INSERT INTO filtro_categoria (categoria) VALUES
('Administração'), ('Artesanato'), ('AUTOMAÇÃO INDUSTRIAL'), ('Beleza'), ('Cinema'), 
('Comércio / Gestão Empresarial'), ('Confecção'), ('Construção Civil / Serviço'), 
('Cultura'), ('Dança'), ('Dança e Teatro'), ('Educação'), ('Eletrônica'), 
('Eletricista / Energia'), ('Enfermagem / Saúde'), ('Estética'), ('Eventos'), 
('Fotografia'), ('Gastronomia'), ('Gestão'), ('Idiomas'), ('Informática / Tecnologia'), 
('Logística'), ('Manutenção'), ('Mecânica'), ('Meio Ambiente'), ('Moda'), ('Música'), 
('Panificação / Confeitaria'), ('Produção Cultural'), ('Programação / TI'), 
('Recursos Humanos'), ('Redes / Telecom'), ('Segurança do Trabalho'), 
('Serviço Social'), ('Soldagem'), ('Turismo / Hotelaria'), ('Vendas / Marketing');

-- Os 30 Locais Originais
INSERT INTO filtro_local (local) VALUES
('Administração Regional da Praia do Canto'),
('Academia Popular de Santa Martha'),
('Andorinhas'),
('Área de Lazer e Eventos de Jardim Camburi'),
('Bairro da Penha'),
('Bento Ferreira'),
('Bonfim'),
('Caratoíra'),
('Carreta de Eletricidade (Local itinerante - consultar curso específico)'),
('Carreta de Informática (Local itinerante - consultar curso específico)'),
('Carreta de Refrigeração e Climatização (Local itinerante - consultar curso específico)'),
('Centro de Formação Profissional do Senac Vitória'),
('Centro de Referência da Assistência Social (CRAS) Jucutuquara'),
('Centro de Referência da Assistência Social (CRAS) São Pedro V'),
('Centro de Referência para a Juventude (CRJ) Andorinhas'),
('Comunidade de Piedade'),
('Horto de Maruípe'),
('Ilha de Santa Maria'),
('Jardim Camburi'),
('Jardim da Penha'),
('Mata da Praia'),
('Mário Cypreste'),
('Parque Moscoso'),
('Praça do Hi-Fi'),
('Residencial Santo André'),
('SENAI Cícero Freire'),
('SENAI Porto de Santana'),
('Santa Martha'),
('Santos Dumont'),
('São Benedito');
-- Tabela para salvar quem fez o Quiz
CREATE TABLE interessados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    whatsapp VARCHAR(20),
    email VARCHAR(100),
    regiao VARCHAR(50),
    perfil_curso VARCHAR(50),
    status VARCHAR(20) DEFAULT 'aguardando'
);

-- Tabela para os Alunos que realmente se inscreveram no curso
CREATE TABLE inscricoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT,
    nome VARCHAR(100),
    whatsapp VARCHAR(20),
    email VARCHAR(100),
    bairro VARCHAR(50),
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
);