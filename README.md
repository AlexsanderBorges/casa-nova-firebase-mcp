# Casa Nova Firebase MCP

Servidor MCP remoto para o Firebase/Firestore do projeto Casa Nova.

## Fase atual

O MCP começa somente com leitura e diagnóstico:

- `firebase_health`
- `firebase_project_info`
- `list_gifts`
- `get_gift`
- `find_gifts_by_reserver`

Nenhuma ferramenta de escrita está habilitada nesta fase.

## Variáveis de ambiente

Configure somente na Vercel, nunca neste repositório:

- `FIREBASE_PROJECT_ID` = `casa-nova-ad182`
- `FIREBASE_SERVICE_ACCOUNT_JSON` = JSON da conta de serviço do Firebase Admin SDK
- `MCP_ACCESS_TOKEN` = token longo e aleatório para proteger o endpoint

Nunca faça commit do JSON da conta de serviço ou do token.

## Endpoint

Depois do deploy:

https://SEU-DOMINIO/api/mcp

Acesso:

Authorization: Bearer SEU_MCP_ACCESS_TOKEN

## Próximo passo

Depois de validar a conexão somente leitura, podemos habilitar ferramentas de escrita específicas para o fluxo de reserva.
