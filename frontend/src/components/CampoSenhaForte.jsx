import { useState } from 'react'
import { Eye, EyeOff, Lock, CheckCircle, XCircle } from 'lucide-react'
import { criteriosSenhaForte } from '../utils/senha'

export default function CampoSenhaForte({
  senha,
  confirmarSenha,
  onSenhaChange,
  onConfirmarSenhaChange,
  label = 'Senha *',
  confirmLabel = 'Confirme sua senha *',
  accentClass = 'text-accent',
  focusClass = 'focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,107,53,0.08)]',
  iconPadding = true,
}) {
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)
  const criterios = criteriosSenhaForte(senha, confirmarSenha)
  const wrapperFocusClass = focusClass.replaceAll('focus:', 'focus-within:')
  const wrapperBase = `grid items-stretch overflow-hidden rounded-xl border border-border bg-surface-2 transition-all ${wrapperFocusClass}`
  const inputClass = 'min-w-0 w-full bg-transparent px-4 py-3.5 text-sm font-semibold text-text-primary outline-none placeholder:text-text-muted placeholder:font-normal'
  const eyeButtonClass = 'aspect-square self-stretch border-none bg-transparent text-text-muted cursor-pointer hover:text-text-primary transition-colors grid place-items-center'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-extrabold text-text-secondary uppercase tracking-wide">{label}</label>
        <div className={`${wrapperBase} ${iconPadding ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[1fr_auto]'}`}>
          {iconPadding && (
            <span className="grid place-items-center pl-4 text-text-muted pointer-events-none">
              <Lock size={15} />
            </span>
          )}
          <input
            type={mostrarSenha ? 'text' : 'password'}
            placeholder="Mínimo 8 caracteres"
            value={senha}
            onChange={e => onSenhaChange(e.target.value)}
            minLength={8}
            required
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(s => !s)}
            className={eyeButtonClass}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {mostrarSenha ? <EyeOff size={16} className="block shrink-0" /> : <Eye size={16} className="block shrink-0" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-extrabold text-text-secondary uppercase tracking-wide">{confirmLabel}</label>
        <div className={`${wrapperBase} grid-cols-[1fr_auto]`}>
          <input
            type={mostrarConfirmacao ? 'text' : 'password'}
            placeholder="Digite novamente"
            value={confirmarSenha}
            onChange={e => onConfirmarSenhaChange(e.target.value)}
            minLength={8}
            required
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setMostrarConfirmacao(s => !s)}
            className={eyeButtonClass}
            aria-label={mostrarConfirmacao ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
          >
            {mostrarConfirmacao ? <EyeOff size={16} className="block shrink-0" /> : <Eye size={16} className="block shrink-0" />}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-3 flex flex-col gap-2">
        {criterios.map(item => (
          <div key={item.id} className={`flex items-center gap-2 text-xs font-bold ${item.ok ? accentClass : 'text-red-500'}`}>
            {item.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {item.texto}
          </div>
        ))}
      </div>
    </div>
  )
}
