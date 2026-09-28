# Segtrack — Frontend

Painel das rotas de Aparecida.

**Deploy:** [Vercel](https://vercel.com)  
**Repositório backend:** https://github.com/alekal02/STBACK

## Local

O painel local continua saindo do Python, em http://127.0.0.1:6480. O `config.js` deixa a API no mesmo endereço.

## Vercel

1. Import este repositório
2. Framework: Other
3. Build: `npm run build` · Output: `dist`
4. Variável obrigatória:

```text
SAGTRACK_API_URL=https://sagtrack-backend.onrender.com
```

5. Cada push na branch principal publica de novo.

O endereço da Vercel precisa terminar em `.vercel.app`, ou então esse domínio tem que estar em `CORS_ORIGIN` no Render.
