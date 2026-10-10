import React from 'react';

/** Política de privacidade (LGPD). Linguagem simples, o que é coletado e para quê. */
function Privacidade() {
  return (
    <article className="max-w-3xl mx-auto prose prose-slate">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Privacidade</h1>
      <p className="text-sm text-slate-500 mb-8">Última atualização: 10/10/2026</p>

      <h2 className="text-xl font-bold mt-6 mb-2">Quais dados o SACD guarda</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Conta:</strong> nome e e-mail. A senha e o segundo fator (app autenticador) ficam no Firebase Authentication (Google); o SACD nunca recebe a sua senha.</li>
        <li><strong>Denúncias:</strong> descrição, localização no mapa, bairro, data e as fotos que você enviar.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-2">Para que os dados são usados</h2>
      <p>Somente para registrar e acompanhar focos de dengue. As denúncias são vistas pelos fiscais e gestores que cuidam do atendimento. Os dados não são vendidos nem usados para publicidade.</p>

      <h2 className="text-xl font-bold mt-6 mb-2">Cookies de análise</h2>
      <p>Se você <strong>aceitar</strong> no aviso de cookies, o site usa o Google Analytics 4 (IP anonimizado) e o Microsoft Clarity (gravações anônimas da navegação, com campos de texto mascarados) para entender como ele é usado. Se recusar, nenhum dos dois é carregado. Dá para mudar a escolha pelo link “Cookies” no rodapé.</p>

      <h2 className="text-xl font-bold mt-6 mb-2">Seus direitos</h2>
      <p>Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail de contato do rodapé.</p>
    </article>
  );
}

export default Privacidade;
