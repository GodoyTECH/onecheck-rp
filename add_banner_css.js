const fs = require('fs');
let css = fs.readFileSync('css/platform.css', 'utf8');

const bannerCss = `
/* ==========================================================================
   GANG BANNER (Desktop Only)
   ========================================================================== */
.gang-banner {
    display: none;
}
.btn-white {
    background: white;
    color: black;
    border: none;
    font-weight: 700;
}
.btn-white:hover {
    background: #e0e0e0;
}

@media (min-width: 768px) {
    .gang-banner {
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 0;
        left: var(--sidebar-w);
        width: 280px;
        height: 100vh;
        background: var(--red-dark);
        z-index: 40;
        box-shadow: 5px 0 20px rgba(0,0,0,0.5);
        border-right: 2px solid var(--red);
        overflow: hidden;
    }
    .gang-banner-bg {
        position: absolute;
        inset: 0;
        background: url('/icons/icon-512.png') center/cover no-repeat;
        opacity: 0.1;
        mix-blend-mode: multiply;
    }
    .gang-banner-content {
        position: relative;
        z-index: 2;
        padding: 40px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        height: 100%;
    }
    .gang-banner-logo {
        width: 140px;
        height: 140px;
        margin-bottom: 20px;
        filter: drop-shadow(0 10px 15px rgba(0,0,0,0.5));
    }
    .gang-banner-title {
        font-family: var(--ff-title);
        font-size: 2.5rem;
        color: white;
        text-shadow: 2px 2px 0 #000;
        line-height: 1;
        margin-bottom: 5px;
    }
    .gang-banner-subtitle {
        font-size: 1rem;
        color: rgba(255,255,255,0.9);
        font-weight: 600;
        margin-bottom: 30px;
        text-shadow: 1px 1px 0 #000;
    }
    .gang-banner-stats {
        width: 100%;
        background: rgba(0,0,0,0.3);
        border-top: 1px solid rgba(255,255,255,0.1);
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding: 15px 0;
        margin-bottom: auto;
    }
    .gb-stat {
        font-family: var(--ff-title);
        font-size: 1.4rem;
        color: white;
        margin: 10px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    /* Adjust main layout to fit the banner */
    .app-shell {
        padding-left: calc(var(--sidebar-w) + 280px);
    }
    .topbar {
        left: calc(var(--sidebar-w) + 280px);
    }
    .chat-screen {
        left: calc(var(--sidebar-w) + 280px);
        width: calc(100% - var(--sidebar-w) - 280px);
    }
    /* Adjust sidebar background */
    .sidebar {
        background: #090909; /* Darker to contrast with red */
    }
}
`;

css = css.replace(/  \.app-shell {\s*padding-left: var\(--sidebar-w\);\s*}/, '');
css = css.replace(/  \.topbar {\s*left: var\(--sidebar-w\);\s*}/, '');
css = css.replace(/  \.chat-screen {\s*left: var\(--sidebar-w\);\s*width: calc\(100% - var\(--sidebar-w\)\);\s*}/, '');

fs.appendFileSync('css/platform.css', '\n' + bannerCss, 'utf8');
console.log('CSS banner added');
