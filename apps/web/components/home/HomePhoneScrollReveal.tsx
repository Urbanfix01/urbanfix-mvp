export default function HomePhoneScrollReveal() {
  return (
    <section data-ufx-reveal className="home-phone-scroll ufx-reveal" aria-label="UrbanFix mobile">
      <div className="home-phone-scroll__network" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="home-phone-scroll__promo">
        <img
          src="/hero/home-notebook-summary.png"
          alt="UrbanFix para ordenar presupuestos y cotizar en el momento"
          className="home-phone-scroll__promo-image"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="home-phone-scroll__soon">Proximamente</div>
      <div className="home-phone-scroll__visual">
        <img
          src="/hero/home-scroll-phone.png"
          alt="UrbanFix en celular"
          className="home-phone-scroll__device"
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  );
}
