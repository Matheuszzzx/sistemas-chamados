# Sistema de Chamados

API REST para cadastro de pessoas e tipos de problema, abertura e
acompanhamento de chamados e registro de comentários, usando NestJS, MySQL e
Prisma. Não é necessário Docker.

## Requisitos

- Node.js 20 ou superior
- MySQL 8 ou compatível, instalado e em execução localmente
- Uma base MySQL criada para o sistema

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um arquivo `.env` com base no `.env.example` e informe os dados de
   conexão:

   ```env
   DATABASE_URL="mysql://usuario:senha@localhost:3306/sistema_chamados"
   PORT=3000
   ```

   Se `.env` já existir, preserve `DATABASE_URL` e apenas acrescente as novas
   variáveis; não substitua o arquivo inteiro.

3. Crie as tabelas e gere o cliente Prisma:

   ```bash
   npm run prisma:sync
   npm run prisma:generate
   ```

   `prisma:sync` cria ou atualiza as tabelas sem Docker. Para um banco de
   desenvolvimento que já contém os dados originais do projeto, isso adiciona
   os campos de autenticação sem apagar os registros existentes.

4. No `.env`, configure `JWT_SECRET` com uma chave aleatória de pelo menos 32
   caracteres e defina `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. A senha
   inicial deve ter pelo menos 12 caracteres. Não compartilhe esse arquivo.

5. Crie a conta administrativa:

   ```bash
   npm run admin:create
   ```

   A conta inicial tem perfil técnico e permissão administrativa. Use-a para
   autenticar chamadas administrativas no Swagger; cada conta de pessoa recebe
   uma senha inicial definida pelo administrador.

6. Inicie a API:

   ```bash
   npm run start:dev
   ```

A API fica disponível em `http://localhost:3000/api`; a documentação interativa
fica em `http://localhost:3000/docs`.

Use o Swagger em `http://localhost:3000/docs` para acessar a API. Faça login em
`POST /api/auth/login` com o e-mail e a senha da conta administrativa, copie
`accessToken` e clique em **Authorize** no Swagger para autenticar as chamadas.
Para gerar uma chave JWT, use `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`
e copie o resultado para `JWT_SECRET` no `.env`.

## Recursos da API

- `POST`, `GET`, `GET/:id`, `PATCH/:id`, `DELETE/:id` em `/api/people`
- `POST`, `GET`, `GET/:id`, `PATCH/:id`, `DELETE/:id` em
  `/api/problem-types`
- `POST`, `GET`, `GET/:id` em `/api/tickets`
- `POST /api/tickets/:id/assignment` para designar ou reatribuir técnico
- `PATCH /api/tickets/:id/status` para atualizar a situação
- `POST /api/tickets/:id/comments` para adicionar comentário
- `POST /api/auth/login` para iniciar sessão e `GET /api/auth/me` para consultar
  a sessão atual

Chamados podem ser filtrados com `status`, `priority`, `problemTypeId` e
`technicianId`. A consulta individual retorna também a conversa, ordenada
cronologicamente.

Valores aceitos:

- Pessoa `role`: `REQUESTER`, `TECHNICIAN`
- Prioridade: `LOW`, `MEDIUM` (padrão), `HIGH`, `CRITICAL`
- Situação: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELED`

O chamado nasce como `OPEN`, sem técnico. A designação de um técnico ativo
altera automaticamente a situação para `IN_PROGRESS`. O fluxo de situação é
`OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`; chamados abertos podem ser
cancelados pelo solicitante, e chamados em atendimento pelo técnico responsável.
Chamados resolvidos podem receber comentários até serem fechados. Fechados e
cancelados não podem mais ser alterados nem comentados.

As regras de unicidade, participantes ativos, tipo ativo, limite de cinco
chamados simultâneos por técnico, remoção de registros com histórico,
comentários imutáveis e transições de situação são verificadas pela aplicação e
reforçadas pelas relações do banco.

## Desenvolvimento

```bash
npm run build
npm test
npm run lint
```

A autenticação usa tokens Bearer JWT com validade de oito horas. Senhas são
armazenadas com hash bcrypt. Nunca publique a API sem manter `JWT_SECRET` e as
credenciais administrativas protegidos.
