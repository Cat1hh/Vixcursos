(function () {
    const root = document.documentElement;
    const headerSlot = document.querySelector("[data-site-header]");
    const footerSlot = document.querySelector("[data-site-footer]");

    if (!headerSlot && !footerSlot) return;

    function obterLayoutBase() {
        const dataBase = root.dataset.layoutBase;
        if (dataBase) return dataBase;

        // Fallback seguro para páginas sem data-layout-base.
        return window.location.pathname.includes("/pages/") ? ".." : ".";
    }

    const layoutBase = obterLayoutBase();
    const replacements = {
        HOME_URL: root.dataset.homeUrl || "index.html",
        COURSES_URL: root.dataset.coursesUrl || "#cursos",
        VOCATIONAL_URL: root.dataset.vocationalUrl || "public/pages/vocacional.html",
        ABOUT_URL: root.dataset.aboutUrl || "public/pages/informacoes.html",
        CONTACT_URL: root.dataset.contactUrl || "#rodape",
        LOGO_SRC: root.dataset.logoSrc || "public/imagem/VIxcursos.png",
        GOV_LOGO_SRC: root.dataset.govLogoSrc || "public/imagem/prefeitura.png",
        ADMIN_URL: root.dataset.adminUrl || "public/admin/menu.html"
    };

    function applyTemplate(html) {
        return html.replace(/\{\{(\w+)\}\}/g, (_, key) => replacements[key] || "");
    }

    function markCurrentNav() {
        const currentPage = root.dataset.currentPage;
        if (!currentPage) return;

        document.querySelectorAll(`[data-nav-item="${currentPage}"]`).forEach((link) => {
            link.classList.add("nav-current");
            link.setAttribute("aria-current", "page");
        });
    }

    function initNavbarInteractions() {
        const navbar = document.querySelector(".light-navbar");
        if (!navbar) return;

        const menuToggle = navbar.querySelector(".ln-menu-toggle");
        const menuLinks = navbar.querySelector(".ln-links");
        if (!menuToggle || !menuLinks) return;

        let menuOpen = false;
        let lastScrollY = window.scrollY;
        let scrollTicking = false;

        function setMenuOpen(value) {
            menuOpen = Boolean(value);
            navbar.classList.toggle("nav-menu-open", menuOpen);
            menuToggle.setAttribute("aria-expanded", menuOpen ? "true" : "false");
        }

        menuToggle.addEventListener("click", () => {
            setMenuOpen(!menuOpen);
        });

        menuLinks.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => setMenuOpen(false));
        });

        document.addEventListener("click", (event) => {
            if (!menuOpen) return;
            if (!navbar.contains(event.target)) {
                setMenuOpen(false);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                setMenuOpen(false);
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 900 && menuOpen) {
                setMenuOpen(false);
            }
        });

        function atualizarNavbarNoScroll() {
            const currentY = window.scrollY;
            const scrollingDown = currentY > lastScrollY;
            const passouLimite = currentY > 120;

            if (passouLimite && scrollingDown) {
                navbar.classList.add("nav-hidden");
            } else {
                navbar.classList.remove("nav-hidden");
            }

            lastScrollY = currentY;
            scrollTicking = false;
        }

        window.addEventListener("scroll", () => {
            if (scrollTicking) return;
            scrollTicking = true;
            window.requestAnimationFrame(atualizarNavbarNoScroll);
        }, { passive: true });
    }

    async function injectComponent(target, fileName) {
        if (!target) return;
        const tentativas = [
            `${layoutBase}/components/${fileName}`,
            `../components/${fileName}`,
            `/components/${fileName}`
        ];

        for (const rota of tentativas) {
            try {
                const response = await fetch(rota, { cache: "no-store" });
                if (!response.ok) continue;

                const html = await response.text();
                target.innerHTML = applyTemplate(html);
                return;
            } catch {
                // Tenta a próxima rota.
            }
        }

        throw new Error(`Falha ao carregar componente: ${fileName}`);
    }

    async function initLayout() {
        const [headerResult, footerResult] = await Promise.allSettled([
            injectComponent(headerSlot, "header.html"),
            injectComponent(footerSlot, "footer.html")
        ]);

        if (headerResult.status === "rejected") {
            console.warn("Nao foi possivel carregar o header compartilhado.", headerResult.reason);
        }

        if (footerResult.status === "rejected") {
            console.warn("Nao foi possivel carregar o footer compartilhado.", footerResult.reason);
        }

        markCurrentNav();
        initNavbarInteractions();
        document.dispatchEvent(new CustomEvent("layout:ready"));
    }

    initLayout();
})();
