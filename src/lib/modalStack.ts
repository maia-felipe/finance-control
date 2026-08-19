// Contador de modais abertos. Serve para atalhos globais de teclado saberem
// que há um diálogo na frente e se calarem (ver src/lib/quickAdd.ts).
// Fica fora de Modal.tsx para não misturar export de componente com export de
// valor no mesmo módulo (regra do react-refresh).

let openCount = 0

export function pushModal() {
  openCount++
}

export function popModal() {
  openCount = Math.max(0, openCount - 1)
}

export function isAnyModalOpen(): boolean {
  return openCount > 0
}
