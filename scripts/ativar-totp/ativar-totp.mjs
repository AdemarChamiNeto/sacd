// Ativa o 2FA por TOTP (app autenticador) no projeto do Firebase.
// O console do Firebase ainda não tem botão para isso; é pela API de administração.
//
// Antes: Firebase Console → Authentication → Settings → "Upgrade to Identity Platform"
// (tem cota grátis). Depois, nesta pasta:
//   npm install
//   GOOGLE_APPLICATION_CREDENTIALS=../../sacd-backend/firebase-service-account.json npm run ativar
// (no PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS="..\..\sacd-backend\firebase-service-account.json"; npm run ativar)
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({ credential: applicationDefault() });

const config = await getAuth().projectConfigManager().updateProjectConfig({
  multiFactorConfig: {
    providerConfigs: [
      {
        state: 'ENABLED',
        // aceita o código anterior/seguinte (relógio do celular um pouco fora)
        totpProviderConfig: { adjacentIntervals: 1 },
      },
    ],
  },
});

console.log('TOTP ativado:', JSON.stringify(config.multiFactorConfig, null, 2));
