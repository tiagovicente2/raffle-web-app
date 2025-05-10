"use client"

import { useState, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { QrCode, Download, Share2, Copy } from "lucide-react"

interface QRCodeDialogProps {
  raffleId: string
  title?: string | null
  friendlyId?: string
}

export default function QRCodeDialog({ raffleId, title, friendlyId }: QRCodeDialogProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  // Gerar a URL completa para a rifa
  const raffleUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/raffle/${friendlyId || raffleId}`
      : `/raffle/${friendlyId || raffleId}`

  const handleDownload = () => {
    if (!qrRef.current) return

    try {
      // Obter o elemento SVG
      const svgElement = qrRef.current.querySelector("svg")
      if (!svgElement) return

      // Criar um elemento canvas
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Definir dimensões do canvas (maior para melhor qualidade)
      canvas.width = 1024
      canvas.height = 1024

      // Criar uma imagem a partir do SVG
      const img = new Image()
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const svgUrl = URL.createObjectURL(svgBlob)

      img.onload = () => {
        // Preencher fundo branco
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Desenhar a imagem centralizada com padding
        const padding = 100
        ctx.drawImage(img, padding, padding, canvas.width - padding * 2, canvas.height - padding * 2)

        // Adicionar informações da rifa na parte inferior
        ctx.fillStyle = "black"
        ctx.font = "bold 40px Arial"
        ctx.textAlign = "center"
        ctx.fillText(
          title ? `Rifa: ${title}` : `Rifa #${friendlyId || raffleId.slice(0, 8)}`,
          canvas.width / 2,
          canvas.height - 40,
        )

        // Converter para URL de dados e baixar
        const dataUrl = canvas.toDataURL("image/png")
        const link = document.createElement("a")
        link.download = `rifa-${friendlyId || raffleId.slice(0, 8)}.png`
        link.href = dataUrl
        link.click()

        // Limpar
        URL.revokeObjectURL(svgUrl)
      }

      img.src = svgUrl
    } catch (error) {
      console.error("Erro ao baixar código QR:", error)
      toast({
        title: "Falha no Download",
        description: "Ocorreu um erro ao baixar o código QR.",
        variant: "destructive",
      })
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(raffleUrl).then(
      () => {
        toast({
          title: "Link Copiado",
          description: "Link da rifa copiado para a área de transferência!",
        })
      },
      (err) => {
        console.error("Não foi possível copiar o texto: ", err)
        toast({
          title: "Falha ao Copiar",
          description: "Falha ao copiar o link para a área de transferência.",
          variant: "destructive",
        })
      },
    )
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title ? `Participe da Rifa: ${title}` : `Participe da Rifa #${friendlyId || raffleId.slice(0, 8)}`,
          text: "Participe da minha rifa e tente a sorte!",
          url: raffleUrl,
        })
      } catch (error) {
        console.error("Erro ao compartilhar:", error)
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          <span className="hidden sm:inline">Compartilhar QR Code</span>
          <span className="inline sm:hidden">QR</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar Rifa</DialogTitle>
          <DialogDescription>
            Compartilhe este código QR para que outros possam participar da sua rifa.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <div ref={qrRef} className="bg-white p-4 rounded-lg shadow-sm border">
            <QRCodeSVG
              value={raffleUrl}
              size={200}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"H"}
              includeMargin={false}
            />
          </div>
          <p className="mt-4 text-sm text-center text-muted-foreground break-all">{raffleUrl}</p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar Link
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
          <Button className="flex-1" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Baixar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
