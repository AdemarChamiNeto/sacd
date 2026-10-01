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

## Arquitetura

```
sacd-frontend/        React + Vite (SPA) — servido pelo Nginx em produção
sacd-backend/         ASP.NET Core Web API
  Controllers/        Denuncias, Usuarios, Stats
  Services/           regras de negócio (injetadas por interface)
  Data/               DbContext do EF Core
sacd-backend-tests/   xUnit + Moq + FluentAssertions
init-db.sql           schema inicial + usuários de exemplo
docker-compose.yml    frontend (Nginx) + API + PostGIS + pgAdmin
```

## Configuração

O Firebase é usado só para autenticação. As credenciais **não ficam no repositório**:

1. No [Console do Firebase](https://console.firebase.google.com/), crie um projeto e ative o login por email/senha.
2. **Frontend:** copie `sacd-frontend/.env.example` para `sacd-frontend/.env.local` e preencha com a config do app Web.
3. **Backend:** em *Configurações do projeto → Contas de serviço*, gere uma chave privada e salve como `sacd-backend/firebase-service-account.json`. Para usar outro caminho, defina a variável `Firebase__CredentialsPath`.

## Rodando com Docker

```bash
docker compose up -d --build
```

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
