import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground flex items-center">
            Made with <Heart className="mx-1 h-4 w-4 text-red-500 fill-current" /> by{" "}
            <Link 
              href="https://schererleander.de" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium ml-1"
            >
              me
            </Link>
          </p>
          
          <div className="flex items-center space-x-6 text-sm">
            <Button variant="link" className="h-auto p-0 text-muted-foreground" asChild>
              <Link href="/privacy">Privacy</Link>
            </Button>
            <Button variant="link" className="h-auto p-0 text-muted-foreground" asChild>
              <Link href="/legal">Legal</Link>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}
