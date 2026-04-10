# Como Verificar o Erro no Vercel

## Passo 1: Acessar os Logs
1. Vá em https://vercel.com/dashboard
2. Selecione o projeto **Vixcursos**
3. Clique em **"Deployments"**
4. Encontre o último deploy (com status vermelho ou que finalizou)
5. Clique nele para expandir os detalhes

## Passo 2: Ver o Erro
Procure por estas seções:
- **Build Logs** — erros durante a compilação (npm install, build, etc)
- **Runtime Logs** — erros quando a aplicação está rodando
- **Function Logs** — erros nos serverless functions (/api/*)

## Passo 3: Copiar a Mensagem
Procure por linhas que começam com:
- `Error:`
- `TypeError:`
- `ReferenceError:`
- `SyntaxError:`
- `ECONNREFUSED` (erro de conexão)
- `Cannot find module`

## Passo 4: Colar Aqui
Cole a mensagem completa do erro no chat.

---

**Exemplos de como pode aparecer:**
```
Error: Cannot find module 'pg'
TypeError: Cannot read property 'query' of undefined
ECONNREFUSED: Connection refused 127.0.0.1:5432
```

Quando você colar, consigo identificar exatamente o que está errado e corrigir.
