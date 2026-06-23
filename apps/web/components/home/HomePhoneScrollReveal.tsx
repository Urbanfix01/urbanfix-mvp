export default function HomePhoneScrollReveal() {
  return (
    <section data-ufx-reveal className="home-phone-scroll ufx-reveal" aria-label="UrbanFix mobile">
      <div className="home-phone-scroll__network" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="home-phone-scroll__visual">
        <img
          src="/hero/home-scroll-phone.png"
          alt="UrbanFix en celular"
          className="home-phone-scroll__device"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="home-phone-scroll__soon">Proximamente</div>
    </section>
  );
}
