(function () {
    const html = document.documentElement;
    const timeoutMs = 4000;
    let liberado = false;

    function mostrarPagina() {
        if (liberado) return;
        liberado = true;
        html.style.visibility = 'visible';
    }

    function redirecionarLogin() {
        window.location.replace('/admin/login.html');
    }

    html.style.visibility = 'hidden';

    const timer = setTimeout(() => {
        if (!liberado) {
            redirecionarLogin();
        }
    }, timeoutMs);

    fetch('/api/admin/me', { credentials: 'same-origin' })
        .then((res) => {
            if (!res.ok) {
                throw new Error('nao-autorizado');
            }
            return res.json();
        })
        .then(() => {
            clearTimeout(timer);
            mostrarPagina();
        })
        .catch(() => {
            clearTimeout(timer);
            redirecionarLogin();
        });
})();