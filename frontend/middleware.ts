// frontend/middleware.ts
import { authMiddleware } from "@clerk/nextjs";
 
export default authMiddleware({
  publicRoutes: [
    "/",
    "/sobre",
    "/contato",
    "/api/webhooks(.*)",
    "/selecionar-role",
    "/cliente(.*)",
    "/entregador(.*)",
    "/restaurante(.*)",
    "/operador(.*)",
    "/gerente(.*)",
    "/relatorios(.*)",
  ],
  ignoredRoutes: ["/api/webhooks/stripe"],
});
 
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};