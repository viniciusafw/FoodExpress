import { useState } from 'react'
import { Eye, EyeOff, Lock, CheckCircle, XCircle } from 'lucide-react'
import { motion as Motion } from 'framer-motion'
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
  const inputBase = 'w-full py-3.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-surface-2 outline-none transition-all placeholder:text-text-muted placeholder:font-normal'
  const senhaPadding = iconPadding ? 'pl-10 pr-14' : 'px-4 pr-14'
  const eyeButtonClass = 'absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-text-muted bg-transparent border-none cursor-pointer hover:text-text-primary transition-colors flex items-center justify-center'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-extrabold text-text-secondary uppercase tracking-wide">{label}</label>
        <div className="relative">
          {iconPadding && <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />}
          <input
            type={mostrarSenha ? 'text' : 'password'}
            placeholder="Mínimo 8 caracteres"
            value={senha}
            onChange={e => onSenhaChange(e.target.value)}
            minLength={8}
            required
            className={`${inputBase} ${senhaPadding} ${focusClass}`}
          />
          <Motion.button
            type="button"
            onClick={() => setMostrarSenha(s => !s)}
            className={eyeButtonClass}
            whileTap={{ scale: 0.85 }}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {mostrarSenha ? <EyeOff size={16} className="block shrink-0" /> : <Eye size={16} className="block shrink-0" />}
          </Motion.button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-extrabold text-text-secondary uppercase tracking-wide">{confirmLabel}</label>
        <div className="relative">
          <input
            type={mostrarConfirmacao ? 'text' : 'password'}
            placeholder="Digite novamente"
            value={confirmarSenha}
            onChange={e => onConfirmarSenhaChange(e.target.value)}
            minLength={8}
            required
            className={`${inputBase} px-4 pr-14 ${focusClass}`}
          />
          <Motion.button
            type="button"
            onClick={() => setMostrarConfirmacao(s => !s)}
            className={eyeButtonClass}
            whileTap={{ scale: 0.85 }}
            aria-label={mostrarConfirmacao ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
          >
            {mostrarConfirmacao ? <EyeOff size={16} className="block shrink-0" /> : <Eye size={16} className="block shrink-0" />}
          </Motion.button>
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
