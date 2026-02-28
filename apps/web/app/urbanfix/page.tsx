import { Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export default function UrbanFixPage() {
  return (
    <main className={`${sora.className} min-h-screen bg-[#21002f]`}>
      <img
        src="/urbanfix/services-page-01.png"
        alt="Servicios UrbanFix"
        className="block h-auto w-full"
        loading="eager"
      />
    </main>
  );
}
