# SACD — Sistema de Apoio ao Controle da Dengue

Sistema web full stack para apoiar secretarias municipais de saúde no combate à dengue. Cidadãos registram denúncias de focos com localização e fotos. Fiscais e gestores acompanham tudo em um mapa, mudam o status das denúncias e consultam estatísticas por bairro, por status e por raio geográfico.

Projeto desenvolvido como Trabalho de Conclusão de Curso (Engenharia de Software).

**Stack:** React 18 · Vite · Tailwind · Leaflet · C# / .NET 8 (ASP.NET Core Web API) · Entity Framework Core · PostgreSQL + PostGIS · Firebase Authentication · Docker Compose · xUnit · Vitest

## Funcionalidades

- **Denúncias:** o cidadão registra o foco com descrição, localização no mapa e fotos, e acompanha as próprias denúncias.
- **Mapa inteligente:** a visualização muda conforme o perfil do usuário e inclui mapa de calor e busca por raio. A busca por raio usa `ST_DWithin` do PostGIS.
- **Fluxo de trabalho:** o gestor altera o status, arquiva e consulta as denúncias arquivadas.
- **Estatísticas:** painel público e painel administrativo, com números por bairro e por status.
- **Controle de acesso por papel:** `cidadao` → `fiscal` → `gerenciador` → `administrador` → `tecnico`. O token do Firebase é validado na API por um `AuthenticationHandler` próprio, e cada papel vira uma policy de autorização do ASP.NET.
- **Verificação em duas etapas obrigatória** (app autenticador / TOTP) para todos os perfis.

## Arquitetura

```
sacd-frontend/        React + Vite (SPA) — servido pelo Nginx em produção
sacd-backend/         ASP.NET Core Web API
  Controllers/        Denuncias, Usuarios, Stats
  Services/           regras de negócio (injetadas por interface)
  Seguranca/          rate limit, cabeçalhos, verificação do token e do 2FA, validação de imagem
  Data/               DbContext do EF Core
sacd-backend-tests/   xUnit + Moq + FluentAssertions
init-db.sql           schema do banco
seed-dev.sql          usuários de exemplo (só desenvolvimento)
docker-compose.yml    desenvolvimento: frontend (Nginx) + API + PostGIS + pgAdmin
docker-compose.prod.yml  produção: Caddy (HTTPS) + frontend + API + PostGIS
scripts/ativar-totp/  liga o 2FA por app autenticador no Firebase
```

## Configuração

O Firebase é usado só para autenticação. As credenciais **não ficam no repositório**:

1. No [Console do Firebase](https://console.firebase.google.com/), crie um projeto e ative o login por email/senha.
2. **Frontend:** copie `sacd-frontend/.env.example` para `sacd-frontend/.env.local` e preencha com a config do app Web.
   Ative também o 2FA no projeto (veja **Ativar o 2FA no Firebase**).
3. **Backend:** em *Configurações do projeto → Contas de serviço*, gere uma chave privada e salve como `sacd-backend/firebase-service-account.json`. Para usar outro caminho, defina a variável `Firebase__CredentialsPath`.

## Rodando com Docker

```bash
docker compose up -d --build
```

> Ambiente de desenvolvimento: senhas fixas e portas abertas de propósito. Para publicar, veja **Produção**.
> Sem TOTP ativo no seu Firebase de teste, dá para desligar o 2FA localmente com `SACD_EXIGIR_2FA=false docker compose up` (e `VITE_EXIGIR_2FA=false` no front).

| Serviço | URL |
|---|---|
| App | http://localhost |
| API (Swagger) | http://localhost:5000/swagger |
| pgAdmin | http://localhost:5050 |

## Rodando em desenvolvimento

```bash
docker compose up -d db                      # só o PostGIS

cd sacd-backend
dotnet run --urls http://localhost:5000 \
  --ConnectionStrings:DefaultConnection="Host=localhost;Port=5432;Database=sacd_db;Username=sacd_user;Password=sacd_password"

cd sacd-frontend
npm install && npm run dev                   # http://localhost:5173
```

## Segurança

- **Senhas:** quem guarda é o Firebase Authentication (a API nunca recebe a senha). O banco do SACD não tem coluna de senha.
- **2FA obrigatório:** depois do cadastro e da confirmação do e-mail, o usuário cadastra um app autenticador (QR code). A API recusa (403) qualquer token que não tenha usado o segundo fator — a regra fica no servidor, não só na tela.
- **Rate limit em todos os endpoints** (`Seguranca/LimitesDeRequisicao.cs`): cadastro 5 a cada 15 min por IP; upload 10/min; escrita 30/min; leitura 120/min por usuário. Resposta `429` com `Retry-After`.
- **Cadastro seguro:** `POST /api/usuarios` lê uid e e-mail do token verificado, nunca do corpo; o papel é sempre `cidadao`.
- **Uploads:** até 5 MB, tipo conferido pelos bytes do arquivo (JPEG/PNG/WEBP), nome gerado pela API e servidos com CSP que impede execução.
- **Segredos fora do Git:** connection string e credencial do Firebase Admin só por variável de ambiente/arquivo de segredo; o CI roda o **gitleaks** em todo push.
- **Cabeçalhos de segurança** na API e no Nginx; HTTPS com HSTS pelo Caddy; CORS fechado em produção (front e API no mesmo domínio).

### Ativar o 2FA no Firebase (uma vez)

1. Console do Firebase → **Authentication → Settings → Upgrade to Identity Platform** (tem cota grátis).
2. Em `scripts/ativar-totp`: `npm install` e rode com a credencial do Admin:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=../../sacd-backend/firebase-service-account.json npm run ativar
   ```
3. Em **Authentication → Settings → Authorized domains**, adicione o domínio de produção.

> **Recuperação:** o Firebase não gera códigos de recuperação para TOTP. Se alguém perder o celular, depois de confirmar a identidade da pessoa o técnico roda `node scripts/ativar-totp/remover-2fa.mjs pessoa@email.com`; no próximo login ela cadastra o autenticador de novo.

## Produção

`docker-compose.prod.yml` sobe **Caddy** (HTTPS automático) → **Nginx** (front + proxy da API) → **API** → **PostGIS**. Só o Caddy fica exposto; banco e API ficam na rede interna, sem senha fixa e sem pgAdmin.

1. Servidor com Docker (ex.: uma VPS pequena) e o DNS do domínio apontando para ele.
2. ```bash
   cp .env.example .env            # preencha: DOMINIO, POSTGRES_PASSWORD (forte), config Web do Firebase
   mkdir segredos && cp <chave-do-firebase-admin>.json segredos/firebase-service-account.json
   docker compose -f docker-compose.prod.yml up -d --build
   ```
3. Crie a sua conta pelo site e promova a técnico:
   ```bash
   docker compose -f docker-compose.prod.yml exec db psql -U sacd_user -d sacd_db \
     -c "UPDATE usuarios SET role = 'tecnico' WHERE email = 'seu@email.com';"
   ```
4. **Backup diário do banco** (cron no servidor):
   ```bash
   docker compose -f docker-compose.prod.yml exec -T db pg_dump -U sacd_user sacd_db | gzip > backup-$(date +%F).sql.gz
   ```
   As fotos ficam no volume `uploads-data` (inclua no backup).

`init-db.sql` só cria as tabelas; os usuários de exemplo ficam em `seed-dev.sql`, carregado apenas no `docker-compose.yml` de desenvolvimento.

### SEO e medição

`index.html` tem meta tags, Open Graph e JSON-LD; `public/` tem favicon, `manifest.webmanifest`, `robots.txt` (bloqueia a área logada), `sitemap.xml` e `llms.txt`. Google Analytics e Microsoft Clarity entram pelos IDs `VITE_GA_ID`/`VITE_CLARITY_ID` e **só carregam depois do consentimento** (aviso de cookies + página `/privacidade`). Para o Search Console, cole a meta de verificação indicada no `index.html`.

## Testes

```bash
dotnet test sacd-backend-tests               # controllers e services (xUnit)
cd sacd-frontend && npm run test:run         # componentes, contexto e hooks (Vitest)
cd sacd-frontend && npm run lint
```

O GitHub Actions roda lint, testes e build a cada push (`.github/workflows/ci.yml`).

## API (resumo)

| Método | Rota | Acesso |
|---|---|---|
| GET | `/api/stats/public` | público |
| GET | `/api/usuarios/me` | cidadão+ |
| POST | `/api/denuncias` · `/api/denuncias/{id}/fotos` | cidadão+ |
| GET | `/api/denuncias/minhas` | cidadão+ |
| GET | `/api/denuncias` | fiscal+ |
| GET | `/api/stats/denuncias-por-raio?lat=&lng=&metros=` | fiscal+ |
| PUT | `/api/denuncias/{id}` · POST `/api/denuncias/{id}/arquivar` | gerenciador+ |
| GET | `/api/denuncias/arquivadas` · `/api/stats/summary` · `/api/usuarios` | administrador+ |
| DELETE | `/api/denuncias/{id}` · PUT `/api/usuarios/permissao/{id}` | técnico |

A documentação completa fica no Swagger (ambiente de desenvolvimento).

## Autor

Ademar C. Neto
