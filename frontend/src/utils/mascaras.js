export function mascaraTelefone(valor) {
  const n = valor.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 10)
    return n.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return n.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function mascaraCNPJ(valor) {
  const n = valor.replace(/\D/g, '').slice(0, 14)
  return n
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function mascaraCPF(valor) {
  const n = valor.replace(/\D/g, '').slice(0, 11)
  return n
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function validarCPF(valor) {
  const cpf = String(valor || '').replace(/\D/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let soma = 0
  for (let i = 0; i < 9; i += 1) {
    soma += Number(cpf[i]) * (10 - i)
  }
  let digito = 11 - (soma % 11)
  if (digito >= 10) digito = 0
  if (digito !== Number(cpf[9])) return false

  soma = 0
  for (let i = 0; i < 10; i += 1) {
    soma += Number(cpf[i]) * (11 - i)
  }
  digito = 11 - (soma % 11)
  if (digito >= 10) digito = 0
  return digito === Number(cpf[10])
}
