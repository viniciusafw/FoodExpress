// @ts-nocheck
import { Router, Request, Response } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// POST /api/documentos/upload
// Content-Type: multipart/form-data
// campos: arquivo (File), tipo (string: 'cnpj'|'rg'|'cnh'|'comprovante_endereco')
//
// Em produção: instale multer + @cloudinary/cloudinary-sdk e substitua a lógica de storage.
// Por ora retorna URL simulada e valida tamanho/tipo.
router.post('/upload', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!

    // Se usando multer: req.file estará disponível
    // Sem multer (body JSON com base64):
    const { tipo_documento, nome_arquivo, tamanho, mime_type, base64 } = req.body

    if (!tipo_documento) {
      return res.status(400).json({ erro: 'Tipo de documento não fornecido' })
    }

    // Validar MIME se informado
    if (mime_type && !TIPOS_PERMITIDOS.includes(mime_type)) {
      return res.status(400).json({ erro: 'Tipo de arquivo não permitido. Use JPG, PNG ou PDF' })
    }

    // Validar tamanho se informado
    if (tamanho && tamanho > MAX_SIZE) {
      return res.status(400).json({ erro: 'Arquivo muito grande. Máximo: 5MB' })
    }

    // Simula URL de upload (em produção: upload para Cloudinary e retorna URL real)
    const url_documento = `/uploads/${tipo_documento}-${userId}-${Date.now()}`

    return res.status(201).json({
      mensagem: 'Documento enviado com sucesso',
      tipo_documento,
      url: url_documento,
      nome_arquivo: nome_arquivo || 'documento',
      tamanho_bytes: tamanho || 0,
      status: 'pendente_verificacao'
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao fazer upload do documento' })
  }
})

export default router
