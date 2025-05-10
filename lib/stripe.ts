import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Chave secreta do Stripe não encontrada nas variáveis de ambiente")
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  appInfo: {
    name: "Aplicativo de Rifa",
    version: "1.0.0",
  },
})

export default stripe

// Configurações para pagamentos brasileiros
export const paymentMethods = {
  card: {
    name: "Cartão de Crédito",
    icon: "credit-card",
    enabled: true,
  },
  pix: {
    name: "PIX",
    icon: "qr-code",
    enabled: true,
  },
}
