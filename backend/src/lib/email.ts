// @ts-nocheck
// backend/src/lib/email.ts
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.includes('xxxxx')) return null;
  return new Resend(key);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'FoodExpress <no-reply@resend.dev>';

export async function enviarLinkAcesso(
  email: string, 
  link: string, 
  nome?: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Acesse sua conta FoodExpress</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #FFF8F5; color: #2D3436; }
        .container { max-width: 500px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .header { background: #FF6B35; color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 25px; line-height: 1.6; }
        .button {
          display: inline-block;
          background: #FF6B35;
          color: white;
          padding: 14px 32px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: bold;
          margin: 20px 0;
          font-size: 16px;
        }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #8A7B74; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🍔 FoodExpress</h1>
        </div>
        <div class="content">
          <h2>Olá${nome ? ', ' + nome : ''}! 👋</h2>
          <p>Seu link de acesso à plataforma chegou!</p>
          <p>Clique no botão abaixo para entrar:</p>
          
          <a href="${link}" class="button" target="_blank">ENTRAR NA FOOD EXPRESS</a>
          
          <p><strong>Este link expira em 1 hora.</strong></p>
          <p>Se você não solicitou, pode ignorar este e-mail.</p>
        </div>
        <div class="footer">
          © 2026 FoodExpress • Aracati, CE
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    // Modo desenvolvimento (sem chave configurada)
    const resend = getResend();
    if (!resend) {
      console.log('\n📧 === EMAIL DE TESTE (Modo Dev) ===');
      console.log(`Para: ${email}`);
      console.log(`Link: ${link}`);
      console.log('=====================================\n');
      return { success: true, dev: true };
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Seu link de acesso - FoodExpress',
      html,
    });

    if (error) throw error;

    console.log(`✅ Email enviado com sucesso para ${email}`);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro ao enviar email:', err);
    return { success: false, error: err };
  }
}