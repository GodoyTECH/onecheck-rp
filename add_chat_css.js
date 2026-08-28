const fs = require('fs');
const css = `
/* ==========================================================================
   Chat Message — Nick + Cargo + Mentions
   ========================================================================== */
.chat-msg-nick {
  font-weight: 700;
  color: var(--text-1);
  font-size: 0.875rem;
}
.chat-msg-cargo {
  font-size: 0.7rem;
  color: rgba(245, 197, 24, 0.55);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 4px;
}
.chat-msg-author {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}
.chat-msg-time {
  font-size: 0.68rem;
  color: var(--text-3);
  margin-left: auto;
  flex-shrink: 0;
}
.chat-msg-time-me {
  text-align: right;
  margin-bottom: 2px;
}
.chat-mention {
  color: var(--red);
  font-weight: 600;
  background: rgba(255,0,0,0.08);
  border-radius: 3px;
  padding: 0 2px;
}
`;
fs.appendFileSync('css/platform.css', css, 'utf8');
console.log('Chat CSS added');
