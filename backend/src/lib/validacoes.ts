// @ts-nocheck
export function validarCNPJ(cnpj: string): boolean {
  const cnpj_limpo = cnpj.replace(/[^\d]/g, '')
  if (cnpj_limpo.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj_limpo)) return false

  let tamanho = cnpj_limpo.length - 2
  let numeros = cnpj_limpo.substring(0, tamanho)
  const digitos = cnpj_limpo.substring(tamanho)
  let soma = 0
  let pos = 0

  for (let i = tamanho - 1; i >= 0; i--) {
    pos++
    soma += Number(numeros.charAt(tamanho - pos)) * (pos % 8 === 0 ? 2 : pos + 1)
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(0))) return false

  tamanho += 1
  numeros = cnpj_limpo.substring(0, tamanho)
  soma = 0
  pos = 0
  for (let i = tamanho - 1; i >= 0; i--) {
    pos++
    soma += Number(numeros.charAt(tamanho - pos)) * (pos % 8 === 0 ? 2 : pos + 1)
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  return resultado === parseInt(digitos.charAt(1))
}

export function validarCPF(cpf: string): boolean {
  const cpf_limpo = cpf.replace(/[^\d]/g, '')
  if (cpf_limpo.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf_limpo)) return false

  let soma = 0
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf_limpo.substring(i - 1, i)) * (11 - i)
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf_limpo.substring(9, 10))) return false

  soma = 0
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf_limpo.substring(i - 1, i)) * (12 - i)
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  return resto === parseInt(cpf_limpo.substring(10, 11))
}

export function formatarCNPJ(cnpj: string): string {
  return cnpj.replace(/[^\d]/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function formatarCPF(cpf: string): string {
  return cpf.replace(/[^\d]/g, '').replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}
