const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const gangBanner = `
        <!-- ══════════════════════════════════════════════
             GANG BANNER (Desktop Only)
        ══════════════════════════════════════════════ -->
        <aside class="gang-banner">
            <div class="gang-banner-bg"></div>
            <div class="gang-banner-content">
                <img src="/icons/icon-192.png" alt="Logo" class="gang-banner-logo">
                <div class="gang-banner-title">GoddoY RK</div>
                <div class="gang-banner-subtitle"><i class="ri-knife-blood-line"></i> Gangue de Rua</div>
                
                <div class="gang-banner-stats">
                    <div class="gb-stat"><i class="ri-vip-crown-line text-gold"></i> <span id="gbPontosGerais">0</span> PTS</div>
                    <div class="gb-stat"><i class="ri-group-line"></i> <span id="gbMembrosGerais">0</span> Membros</div>
                </div>

                <button class="btn btn-white w-full" style="color: black;" onclick="navigateTo('home')">
                    <i class="ri-map-pin-user-fill"></i> QG DA GANGUE
                </button>
            </div>
        </aside>
`;

if (!html.includes('gang-banner')) {
    html = html.replace('<!-- ══════════════════════════════════════════════\n         MAIN CONTENT AREA', gangBanner + '\n        <!-- ══════════════════════════════════════════════\n         MAIN CONTENT AREA');
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Added Gang Banner HTML');
}
