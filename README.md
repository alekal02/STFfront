# Sala técnica — painel

Site estático publicado na Vercel. A API é a do Render.

O build grava `dist/config.js` com `window.SAGTRACK_API`. Defina `SAGTRACK_API_URL=https://sagtrack-backend.onrender.com` no projeto da Vercel. Sem essa variável, o build usa o mesmo endereço.
