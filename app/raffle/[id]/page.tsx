import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import RaffleContent from "@/components/raffle-content"

export default async function RafflePage({ params }: { params: { id: string } }) {
  return (
    <main className="container flex min-h-screen flex-col p-4">
      <Toaster />
      <div className="mb-4">
        <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <Suspense fallback={<div>Loading raffle data...</div>}>
        <RaffleContent raffleId={params.id} />
      </Suspense>
    </main>
  )
}
