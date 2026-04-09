(function () {
    const html = document.documentElement;
    const body = document.body;
    const enabled = (body?.dataset.autoRefresh ?? html?.dataset.autoRefresh ?? "true").toLowerCase() !== "false";
    if (!enabled) return;

    const intervalSecondsRaw = body?.dataset.autoRefreshSeconds || html?.dataset.autoRefreshSeconds;
    const intervalSeconds = Math.max(30, Number(intervalSecondsRaw) || 120);
    const intervalMs = intervalSeconds * 1000;

    function hasOpenModal() {
        const modals = document.querySelectorAll('.modal, .modal-overlay, [role="dialog"]');
        for (const modal of modals) {
            const style = window.getComputedStyle(modal);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                return true;
            }
        }
        return false;
    }

    function userIsEditing() {
        const active = document.activeElement;
        if (!active) return false;

        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            return true;
        }

        return active.isContentEditable;
    }

    function canReloadNow() {
        if (document.visibilityState !== 'visible') return false;
        if (hasOpenModal()) return false;
        if (userIsEditing()) return false;
        return true;
    }

    let lastUserActionAt = Date.now();
    const onUserAction = () => {
        lastUserActionAt = Date.now();
    };

    ['click', 'keydown', 'touchstart', 'scroll'].forEach((evt) => {
        window.addEventListener(evt, onUserAction, { passive: true });
    });

    setInterval(() => {
        const idleFor = Date.now() - lastUserActionAt;
        const minIdle = 10000;

        if (!canReloadNow()) return;
        if (idleFor < minIdle) return;

        window.location.reload();
    }, intervalMs);
})();
