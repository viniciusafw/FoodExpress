import Header from '../components/Header'
import CatalogoLojas from '../components/CatalogoLojas'
import MobileNavBar from '../components/MobileNavBar'
import Rodape from '../components/Rodape'

export default function Mercados() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 pb-24 sm:px-8 sm:py-8 md:pb-10">
        <CatalogoLojas tipo="mercado" />
      </main>
      <Rodape />
      <MobileNavBar />
    </div>
  )
}
