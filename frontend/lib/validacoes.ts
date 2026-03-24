// Validar CNPJ com algoritmo verificador
export function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres especiais
  const cnpj_limpo = cnpj.replace(/[^\d]/g, '')

  // Validar tamanho
  if (cnpj_limpo.length !== 14) {
    return false
  }

  // Verificar se todos os dígitos são iguais (CNPJ inválido)
  if (/^(\d)\1{13}$/.test(cnpj_limpo)) {
    return false
  }

  // Calcular primeiro dígito verificador
  let tamanho = cnpj_limpo.length - 2
  let numeros = cnpj_limpo.substring(0, tamanho)
  let digitos = cnpj_limpo.substring(tamanho)
  let soma = 0
  let pos = 0

  // Primeira sequência (12 números)
  for (let i = tamanho - 1; i >= 0; i--) {
    pos++
    soma += numeros.charAt(tamanho - pos) * (pos % 8 === 0 ? 2 : pos + 1)
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(0))) {
    return false
  }

  // Segunda sequência (13 números)
  tamanho = tamanho + 1
  numeros = cnpj_limpo.substring(0, tamanho)
  soma = 0
  pos = 0

  for (let i = tamanho - 1; i >= 0; i--) {
    pos++
    soma += numeros.charAt(tamanho - pos) * (pos % 8 === 0 ? 2 : pos + 1)
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(1))) {
    return false
  }

  return true
}

// Validar CPF
export function validarCPF(cpf: string): boolean {
  // Remove caracteres especiais
  const cpf_limpo = cpf.replace(/[^\d]/g, '')

  // Validar tamanho
  if (cpf_limpo.length !== 11) {
    return false
  }

  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf_limpo)) {
    return false
  }

  // Calcular primeiro dígito verificador
  let soma = 0
  let resto = 0

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf_limpo.substring(i - 1, i)) * (11 - i)
  }

  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) {
    resto = 0
  }

  if (resto !== parseInt(cpf_limpo.substring(9, 10))) {
    return false
  }

  // Calcular segundo dígito verificador
  soma = 0
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf_limpo.substring(i - 1, i)) * (12 - i)
  }

  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) {
    resto = 0
  }

  if (resto !== parseInt(cpf_limpo.substring(10, 11))) {
    return false
  }

  return true
}

// Formatar CNPJ para exibição
export function formatarCNPJ(cnpj: string): string {
  const cnpj_limpo = cnpj.replace(/[^\d]/g, '')
  return cnpj_limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

// Formatar CPF para exibição
export function formatarCPF(cpf: string): string {
  const cpf_limpo = cpf.replace(/[^\d]/g, '')
  return cpf_limpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}
