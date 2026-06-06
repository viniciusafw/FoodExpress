import Header from '../components/Header'
import CatalogoLojas from '../components/CatalogoLojas'
import MobileNavBar from '../components/MobileNavBar'
import Rodape from '../components/Rodape'

export default function Mercados() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-10 flex-1">
        <CatalogoLojas tipo="mercado" />
      </main>
      <Rodape />
      <MobileNavBar />
    </div>
  )
}
