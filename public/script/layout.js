(function () {
    const root = document.documentElement;
    const headerSlot = document.querySelector("[data-site-header]");
    const footerSlot = document.querySelector("[data-site-footer]");

    if (!headerSlot && !footerSlot) return;

    const layoutBase = root.dataset.layoutBase || "public";
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
        const response = await fetch(`${layoutBase}/components/${fileName}`);
        if (!response.ok) {
            throw new Error(`Falha ao carregar componente: ${fileName}`);
        }

        const html = await response.text();
        target.innerHTML = applyTemplate(html);
    }

    async function initLayout() {
        try {
            await Promise.all([
                injectComponent(headerSlot, "header.html"),
                injectComponent(footerSlot, "footer.html")
            ]);

            markCurrentNav();
            initNavbarInteractions();
            document.dispatchEvent(new CustomEvent("layout:ready"));
        } catch (error) {
            console.warn("Nao foi possivel carregar o layout compartilhado.", error);
        }
    }

    initLayout();
})();
