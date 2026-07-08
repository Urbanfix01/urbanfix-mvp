import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import AuthHashHandler from '../components/AuthHashHandler';
import FloatingWhatsappChannelButton from '../components/home/FloatingWhatsappChannelButton';
import HomeAnimatedHero from '../components/home/HomeAnimatedHero';
import HomeScrollReveal from '../components/home/HomeScrollReveal';
import PublicTopNav from '../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCFl1TKQuJGScUp4b0J';

export const metadata: Metadata = {
  title: 'UrbanFix | Plataforma operativa',
  description:
    'UrbanFix conecta clientes, técnicos y empresas para pedir trabajos, cotizar y hacer seguimiento en una sola plataforma.',
};

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />
      <HomeScrollReveal />

      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/" />

        <HomeAnimatedHero />

        <section
          id="que-es-urbanfix"
          className="home-about-section border-t border-white/10 bg-[#21002f] px-5 py-16 text-white sm:px-8 sm:py-20"
        >
          <div className="home-about-section__content mx-auto max-w-5xl">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.24em] text-[#ffbf7a]">
              Qu&eacute; es UrbanFix
            </p>
            <h2 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-normal sm:text-5xl">
              Una plataforma para encontrar, ordenar y resolver trabajos t&eacute;cnicos.
            </h2>
            <div className="mt-7 max-w-4xl space-y-5 text-base leading-8 text-white/72 sm:text-lg">
              <p>
                UrbanFix conecta personas que necesitan resolver arreglos, mantenimiento o servicios con t&eacute;cnicos y
                empresas disponibles.
              </p>
              <p>
                Desde un mismo lugar se puede buscar profesionales cercanos, publicar una solicitud, recibir
                presupuestos, revisar perfiles y seguir el trabajo hasta que quede cerrado.
              </p>
              <p>
                Para t&eacute;cnicos y empresas, UrbanFix funciona como un panel operativo para mostrar disponibilidad,
                organizar pedidos, cotizar con valores de mano de obra y mantener la comunicaci&oacute;n con cada cliente.
              </p>
            </div>
          </div>
        </section>

        <section
          id="donde-trabajamos"
          className="home-about-section border-t border-white/10 bg-[#21002f] px-5 py-16 text-white sm:px-8 sm:py-20"
        >
          <div className="home-about-section__content mx-auto max-w-5xl">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.24em] text-[#ffbf7a]">
              &iquest;En qu&eacute; parte trabajamos?
            </p>
            <h2 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-normal sm:text-5xl">
              UrbanFix est&aacute; pensado para operar en todo el mundo.
            </h2>
            <div className="mt-7 max-w-4xl space-y-5 text-base leading-8 text-white/72 sm:text-lg">
              <p>
                La plataforma parte del pa&iacute;s que el usuario selecciona, para ordenar mejor la experiencia,
                las ubicaciones y la forma en que se muestran los t&eacute;cnicos disponibles.
              </p>
              <p>
                Cada mercado puede tener sus propias ciudades, rubros, zonas de trabajo y criterios de referencia
                para organizar solicitudes y presupuestos.
              </p>
              <p>
                Hoy UrbanFix se prepara con una estructura global: primero consolidamos la operaci&oacute;n donde ya
                hay actividad y luego podemos activar nuevos pa&iacute;ses con reglas, valores y nombres locales.
              </p>
            </div>
          </div>
        </section>

        <section
          id="necesitas-arreglar-algo"
          className="home-about-section border-t border-white/10 bg-[#21002f] px-5 py-16 text-white sm:px-8 sm:py-20"
        >
          <div className="home-about-section__content mx-auto max-w-5xl">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.24em] text-[#ffbf7a]">
              &iquest;Necesit&aacute;s arreglar algo en tu casa?
            </p>
            <h2 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-normal sm:text-5xl">
              Encontr&aacute; t&eacute;cnicos disponibles y resolv&eacute; tu solicitud con m&aacute;s orden.
            </h2>
            <div className="mt-7 max-w-4xl space-y-5 text-base leading-8 text-white/72 sm:text-lg">
              <p>
                Cuando aparece un problema en casa, UrbanFix te ayuda a pasar de la urgencia al pedido concreto:
                busc&aacute; t&eacute;cnicos, revis&aacute; perfiles y eleg&iacute; a qui&eacute;n contactar.
              </p>
              <p>
                Tambi&eacute;n pod&eacute;s publicar una solicitud con el rubro, la zona, una descripci&oacute;n del trabajo
                y la franja horaria que te convenga.
              </p>
              <p>
                La plataforma organiza la informaci&oacute;n para que el t&eacute;cnico entienda mejor el pedido y vos
                puedas seguir cada respuesta sin perder conversaciones.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/vidriera"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#ff8f1f] px-7 text-sm font-extrabold uppercase tracking-normal text-[#21002f] shadow-[0_18px_42px_rgba(255,143,31,0.24)] transition hover:bg-[#ffbf7a]"
              >
                Buscar t&eacute;cnicos
              </a>
              <a
                href="/cliente?mode=register&quick=1&intent=create-request"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-7 text-sm font-extrabold uppercase tracking-normal text-white transition hover:border-[#ff8f1f]/70 hover:text-[#ffbf7a]"
              >
                Publicar solicitud
              </a>
            </div>
          </div>
        </section>

        <section
          id="tenes-un-oficio"
          className="home-about-section border-t border-white/10 bg-[#21002f] px-5 py-16 text-white sm:px-8 sm:py-20"
        >
          <div className="home-about-section__content mx-auto max-w-5xl">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.24em] text-[#ffbf7a]">
              &iquest;Ten&eacute;s un oficio?
            </p>
            <h2 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-normal sm:text-5xl">
              Mostr&aacute; tu trabajo y recib&iacute; solicitudes desde un solo lugar.
            </h2>
            <div className="mt-7 max-w-4xl space-y-5 text-base leading-8 text-white/72 sm:text-lg">
              <p>
                Si sos electricista, plomero, gasista, pintor, alba&ntilde;il, instalador o ten&eacute;s un oficio
                t&eacute;cnico, UrbanFix te ayuda a ordenar tu presencia online.
              </p>
              <p>
                Pod&eacute;s crear tu perfil, definir tu zona de trabajo, mostrar tus rubros, recibir consultas y
                responder solicitudes con una imagen m&aacute;s profesional.
              </p>
              <p>
                La idea es que el cliente encuentre r&aacute;pido a qui&eacute;n contactar, y que vos puedas gestionar
                oportunidades sin depender de mensajes perdidos o publicaciones sueltas.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/tecnicos?mode=register&perfil=tecnico&next=%2Ftecnicos"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#ff8f1f] px-7 text-sm font-extrabold uppercase tracking-normal text-[#21002f] shadow-[0_18px_42px_rgba(255,143,31,0.24)] transition hover:bg-[#ffbf7a]"
              >
                Crear perfil t&eacute;cnico
              </a>
              <a
                href="/tecnicos?mode=login&perfil=tecnico&next=%2Ftecnicos"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-7 text-sm font-extrabold uppercase tracking-normal text-white transition hover:border-[#ff8f1f]/70 hover:text-[#ffbf7a]"
              >
                Ya tengo cuenta
              </a>
            </div>
          </div>
        </section>
      </main>
      <FloatingWhatsappChannelButton href={WHATSAPP_CHANNEL_URL} />
    </div>
  );
}
