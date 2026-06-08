# Regras de negócio — status atual

## Visão geral

Este documento foi atualizado para refletir o estado real verificado em 2026-06-08.

## Status consolidado

| Regra / área | Status | Observação |
|---|---|---|
| Autenticação OTP / login | Parcial | Fluxo de login e confirmação existe, mas a sessão ainda precisa revisão de segurança |
| Cadastro de cliente | Parcial | O endpoint `/api/auth/registrar` existe, mas o caminho `/api/auth/session` com `cadastro=true` precisa ser fechado |
| Rate limiting | Parcial | Ativo, mas com risco de vazamento de memória e duplicidade de lógica |
| JWT de longa duração | Parcial | 30 dias sem revogação; precisa blacklist ou tabela de revogação |
| Build e validação | OK | Backend e frontend compilaram com sucesso |
| Runtime com banco | Pendente | O ambiente precisa de configuração correta do banco para testes completos |

## Prioridades imediatas

1. Fechar o bypass de sessão com `cadastro=true`.
2. Melhorar o rate limiter para evitar crescimento indefinido da memória.
3. Implementar revogação de JWT.
4. Validar fluxo completo com banco real configurado.
