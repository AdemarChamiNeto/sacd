// Remove o 2FA de uma conta (ex.: a pessoa perdeu o celular). No próximo login ela cadastra de novo.
// Uso: GOOGLE_APPLICATION_CREDENTIALS=../../sacd-backend/firebase-service-account.json node remover-2fa.mjs pessoa@email.com
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv[2];
if (!email) {
  console.error('Informe o e-mail: node remover-2fa.mjs pessoa@email.com');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const usuario = await auth.getUserByEmail(email);
await auth.updateUser(usuario.uid, { multiFactor: { enrolledFactors: null } });
await auth.revokeRefreshTokens(usuario.uid); // derruba as sessões abertas
console.log(`2FA removido de ${email}. Confirme a identidade da pessoa antes de rodar isto.`);
