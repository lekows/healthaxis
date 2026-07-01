// Flags de rollout simples baseadas em env (sem infra nova). Pedido do épico #64
// (#73): poder ativar/desativar a agenda sem regressão. Default LIGADO; para
// desligar, definir NEXT_PUBLIC_APPOINTMENTS_ENABLED="false".
//
// Usa NEXT_PUBLIC_* para ficar disponível tanto no servidor quanto no cliente.

export const appointmentsEnabled =
  process.env.NEXT_PUBLIC_APPOINTMENTS_ENABLED !== "false";
