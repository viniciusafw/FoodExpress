'use client'

import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-orange-600 text-center mb-6">🍕 FoodExpress - Login</h1>
        <SignIn path="/login" routing="hash" afterSignInUrl="/selecionar-role" />
      </div>
    </div>
  )
}
