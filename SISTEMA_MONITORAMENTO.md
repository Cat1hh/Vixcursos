# 📊 Sistema de Monitoramento Completo - Vix Cursos

## Resumo das Implementações

Foi desenvolvido um **sistema de monitoramento avançado** para a Prefeitura de Vitória/ES com métricas detalhadas sobre os cursos oferecidos.

---

## 🎯 Funcionalidades Implementadas

### 1. **Campos de Coleta de Dados**
- ✅ **Gênero**: Masculino, Feminino, Outro, Prefiro não dizer
- ✅ **Status de Inscrição**: Ativo, Evadido, Concluído, Desistiu, Em Andamento
- ✅ **Análise de Pessoas Deficientes**: Já coletava, agora com análises específicas

### 2. **Nova Aba no Formulário**
A pergunta sobre gênero foi adicionada ao formulário de pré-inscrição (chatbot):
```
"Com qual gênero você se identifica?"
- Masculino
- Feminino
- Outro
- Prefiro não dizer
```

### 3. **Rotas de API Criadas**

#### `/api/admin/monitoramento-geral`
Retorna métricas gerais:
- Total de inscritos
- Total de evadidos
- Mulheres inscritas
- Homens inscritos
- Pessoas deficientes inscritas
- Top 5 cursos mais procurados

#### `/api/admin/monitoramento-curso/:cursoId`
Retorna métricas específicas de um curso:
- Total de inscritos
- Distribuição por gênero (mulheres, homens, outros)
- Status das inscrições (ativos, evadidos, concluídos)
- Pessoas deficientes naquele curso
- Taxa de evasão

#### `/api/admin/relatorio-genero`
Retorna distribuição de gênero por curso

#### `/api/admin/relatorio-evasao`
Retorna taxa de evasão por curso com:
- Ativos
- Evadidos
- Concluídos
- Desistiram
- Taxa de evasão em percentual

#### `/api/admin/relatorio-deficientes`
Retorna dados sobre inclusão de pessoas deficientes

### 4. **Novo Dashboard de Monitoramento Avançado**

**Arquivo**: `public/admin/monitoramento-completo.html`

#### Seções Principais:

**📊 Métricas Gerais (Topo)**
- Total de inscritos
- Total de evadidos
- Mulheres inscritas (com percentual)
- Homens inscritos (com percentual)
- Pessoas deficientes (com percentual)
- Top 5 cursos mais procurados

**🔍 Abas Interativas**

1. **Aba Gênero**
   - Gráfico de pizza com distribuição de gênero
   - Tabela com inscrições por gênero por curso
   - Visualização comparativa

2. **Aba Evasão**
   - Gráfico de barras com taxa de evasão por curso
   - Tabela com detalhes (ativos, evadidos, concluídos)
   - Identificação visual de cursos com alta evasão

3. **Aba Pessoas Deficientes**
   - Gráfico de pizza com proporção de deficientes
   - Tabela com taxa de inclusão por curso
   - Análise de tipos de necessidades especiais

4. **Aba Cursos Populares**
   - Ranking dos cursos mais procurados
   - Barras de progresso visual

---

## 📁 Arquivos Modificados

### 1. **server.js**
- Adicionadas 4 novas rotas de API para monitoramento
- Atualizada rota `/inscricao` para aceitar campo `genero`

### 2. **public/script/pre_inscricao.js**
- Adicionado campo `genero` ao objeto `respostasUsuario`
- Adicionada pergunta sobre gênero no roteiro do chatbot
- Atualizada lista de campos a serem salvos

### 3. **public/admin/menu.html**
- Adicionado link para "Monitoramento Avançado"

### 4. **public/admin/cursos.html**
- Adicionado link para "Monitoramento Avançado"

### 5. **public/admin/monitoramento-completo.html** (NOVO)
- Dashboard completo com gráficos interativos
- 4 abas de análise
- Tabelas responsivas
- Chart.js para visualizações

---

## 📋 Arquivo de Migração

**Arquivo**: `migracao_monitoramento.sql`

Execute este arquivo SQL no seu banco de dados para:
```sql
-- Adicionar coluna genero à tabela pre_inscricoes
ALTER TABLE pre_inscricoes 
ADD COLUMN IF NOT EXISTS genero VARCHAR(20);

-- Adicionar coluna status_inscricao
ALTER TABLE pre_inscricoes 
ADD COLUMN IF NOT EXISTS status_inscricao VARCHAR(30) DEFAULT 'ativo';

-- Criar tabela de histórico de monitoramento
CREATE TABLE IF NOT EXISTS monitoramento_cursos (...)

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pre_inscricoes_genero ...
```

---

## 🚀 Instruções de Uso

### 1. **Executar a Migração do Banco**
```bash
# Execute o arquivo migracao_monitoramento.sql no seu Supabase ou PostgreSQL
```

### 2. **Acessar o Dashboard**
- URL: `/admin/monitoramento-completo.html`
- Ou através do menu lateral em "Monitoramento Avançado"

### 3. **Atualizar Dados**
- Clique em "Atualizar" para recarregar as métricas em tempo real

### 4. **Navegar pelas Abas**
- Clique nas abas para visualizar diferentes análises
- Os gráficos são responsivos e se adaptam ao tamanho da tela

---

## 📊 Exemplos de Dados Exibidos

### Total de Inscritos
Todos os inscritos em todos os cursos, podendo ser filtrados por:
- Gênero
- Status de inscrição
- Necessidade especial
- Curso

### Análise por Gênero
```
Feminino: 150 (45%)
Masculino: 160 (48%)
Outro: 15 (4%)
Prefiro não dizer: 10 (3%)
```

### Taxa de Evasão
Por curso, com identificação visual:
- 🔴 Alta (> 20%)
- 🟢 Baixa (≤ 20%)

### Inclusão de Deficientes
Pessoa com deficiência x Pessoas sem deficiência
Taxa de inclusão por curso

---

## 🔧 Tecnologias Utilizadas

- **Backend**: Node.js + PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **Gráficos**: Chart.js 4.4.0
- **Ícones**: Bootstrap Icons
- **Responsividade**: Mobile-first design

---

## ✨ Recursos Adicionais

1. **Gráficos Interativos**: Clique nas legendas para mostrar/ocultar dados
2. **Tabelas Responsivas**: Scroll horizontal em dispositivos pequenos
3. **Atualização em Tempo Real**: Botão para recarregar dados
4. **Design Moderno**: Interface consistente com o resto da aplicação
5. **Acessibilidade**: Labels descritivas e cores contrastantes

---

## 🎓 Próximos Passos (Sugestões)

1. **Exportar Relatórios**: Adicionar função para exportar em PDF/Excel
2. **Filtros Avançados**: Filtrar por período, local, modalidade
3. **Alertas Automáticos**: Notificar quando taxa de evasão ultrapassar limite
4. **Histórico**: Guardar snapshots diários/semanais
5. **Comparativos**: Comparar períodos diferentes

---

## 📞 Suporte

Para questões sobre integração ou modificações, consulte os arquivos comentados:
- `server.js` - Rotas de API
- `pre_inscricao.js` - Lógica do formulário
- `monitoramento-completo.html` - Interface do dashboard

---

**Sistema implementado em: Abril de 2026**
**Prefeitura de Vitória - Espírito Santo**
