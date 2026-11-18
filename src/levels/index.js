/*
  Lista de fases.
  O Vite encontra sozinho todo arquivo "faseN-*.js" desta pasta (import.meta.glob),
  então cada integrante só precisa criar o seu arquivo: não é preciso editar este.
  A ordem segue o campo `order` de cada fase.
*/
const modules = import.meta.glob('./fase*.js', { eager: true });

export const LEVELS = Object.values(modules)
  .map((m) => m.default)
  .filter(Boolean)
  .sort((a, b) => a.order - b.order);
