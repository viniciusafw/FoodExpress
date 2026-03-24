import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// POST - Fazer upload de documento
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const arquivo = formData.get('arquivo') as File
    const tipo_documento = formData.get('tipo') as string // 'cnpj', 'rg', 'cnh', 'comprovante_endereco'

    // Validar arquivo
    if (!arquivo) {
      return NextResponse.json(
        { erro: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    if (!tipo_documento) {
      return NextResponse.json(
        { erro: 'Tipo de documento não fornecido' },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 5MB)
    const max_size = 5 * 1024 * 1024 // 5MB
    if (arquivo.size > max_size) {
      return NextResponse.json(
        { erro: 'Arquivo muito grande. Máximo: 5MB' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const tipos_permitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!tipos_permitidos.includes(arquivo.type)) {
      return NextResponse.json(
        { erro: 'Tipo de arquivo não permitido. Use JPG, PNG ou PDF' },
        { status: 400 }
      )
    }

    // Converter arquivo para Base64 (para simular upload)
    // Em produção, usar Cloudinary SDK
    const buffer = await arquivo.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const dataUri = `data:${arquivo.type};base64,${base64}`

    // Gerar URL simulada (em produção usar Cloudinary)
    const url_documento = `/uploads/${tipo_documento}-${userId}-${Date.now()}`

    return NextResponse.json({
      mensagem: 'Documento enviado com sucesso',
      tipo_documento,
      url: url_documento,
      nome_arquivo: arquivo.name,
      tamanho_bytes: arquivo.size,
      status: 'pendente_verificacao'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    return NextResponse.json(
      { erro: 'Erro ao fazer upload do documento' },
      { status: 500 }
    )
  }
}
