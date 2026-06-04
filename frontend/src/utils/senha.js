export function criteriosSenhaForte(senha = '', confirmarSenha = '') {
  return [
    { id: 'minimo', texto: 'Pelo menos 8 caracteres', ok: String(senha).length >= 8 },
    { id: 'maiuscula', texto: 'Uma letra maiúscula', ok: /[A-Z]/.test(String(senha)) },
    { id: 'especial', texto: 'Um caractere especial (@ ! # $ %)', ok: /[@!#$%]/.test(String(senha)) },
    { id: 'confirmacao', texto: 'Confirmação igual à senha', ok: Boolean(senha) && senha === confirmarSenha },
  ]
}

export function senhaForteValida(senha = '', confirmarSenha = '') {
  return criteriosSenhaForte(senha, confirmarSenha).every(item => item.ok)
}
