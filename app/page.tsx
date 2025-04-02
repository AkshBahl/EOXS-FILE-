import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="h-16 flex items-center px-4 sm:px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/" className="flex items-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LOGO-iZKjcWij4vfxfUuaJ19T8bUqjZrXoP.jpeg"
            alt="EOXS Logo"
            width={120}
            height={40}
            className="object-contain"
          />
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link href="/admin-login">
            <Button variant="outline">Admin</Button>
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">Welcome to EOXS Video Tool</h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-300 mb-8">
            A powerful platform for managing and sharing video content in the steel industry
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <footer className="h-12 flex items-center justify-center px-4 sm:px-6 md:px-8 border-t border-neutral-200 dark:border-neutral-800 text-sm text-neutral-500 dark:text-neutral-400">
        &copy; {new Date().getFullYear()} EOXS. All rights reserved.
      </footer>
    </div>
  )
}

