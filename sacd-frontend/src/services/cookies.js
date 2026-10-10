/** Evento para reabrir o aviso de cookies (link "Cookies" do rodapé). */
export const EVENTO_ABRIR_COOKIES = 'sacd:abrir-cookies';

export function abrirPreferenciasDeCookies() {
  window.dispatchEvent(new Event(EVENTO_ABRIR_COOKIES));
}
