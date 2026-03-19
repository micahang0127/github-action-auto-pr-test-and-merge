import { Footer } from './Footer'
import { Header } from './Header'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      <Footer />
    </div>
  )
}
