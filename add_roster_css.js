const fs = require('fs');
let css = fs.readFileSync('css/platform.css', 'utf8');

const newCss = `
/* Roster Grid */
.roster-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
}
.roster-card {
    background: var(--bg-card2);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
}
.roster-card:hover {
    border-color: var(--border2);
}
.roster-card-avatar {
    width: 48px;
    height: 48px;
    border-radius: var(--r-full);
    object-fit: cover;
    background: var(--bg-card3);
}
.roster-card-info {
    flex: 1;
}
.roster-card-nick {
    font-family: var(--ff-title);
    font-size: 1.2rem;
    color: var(--text-1);
    letter-spacing: 0.5px;
}
.roster-card-cargo {
    font-size: 0.75rem;
    color: var(--gold);
    text-transform: uppercase;
    font-weight: 600;
}
.roster-card-actions {
    display: flex;
    gap: 0.5rem;
}
`;
fs.appendFileSync('css/platform.css', '\n' + newCss, 'utf8');
console.log('CSS updated');
