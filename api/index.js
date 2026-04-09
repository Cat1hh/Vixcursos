const express = require('express');
const supabase = require('./supabase'); // Importa a conexão que você acabou de criar

function createApp() {
    const app = express();
    app.use(express.json()); // Permite receber dados em JSON

    // 👇 Rota para buscar os cursos no Supabase
    app.get('/api/cursos', async (req, res) => {
        const { data, error } = await supabase
            .from('filtro_curso')
            .select('*');

        if (error) {
            console.error("Erro no Supabase:", error);
            return res.status(500).json({ erro: "Falha ao buscar cursos" });
        }

        // Devolve os cursos em formato JSON para o seu frontend/bot
        return res.status(200).json(data);
    });

    // ... (suas outras rotas que já existem) ...

    return app;
}

module.exports = createApp;