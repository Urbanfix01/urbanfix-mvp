import { Sora } from 'next/font/google';
import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export default function UrbanFixPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen bg-[#21002f] text-white">
        <PublicTopNav activeHref="/urbanfix" sticky />

        <img
          src="/urbanfix/services-page-01.png"
          alt="Servicios UrbanFix"
          className="block h-auto w-full"
          loading="eager"
        />
      </main>
    </div>
  );
}
