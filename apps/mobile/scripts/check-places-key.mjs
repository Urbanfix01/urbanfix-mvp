#!/usr/bin/env node

const argMap = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [rawKey, ...rest] = arg.slice(2).split('=');
      return [rawKey, rest.join('=')];
    })
);

const keyFromArgs = argMap.key || '';
const query = (argMap.query || 'Av Corrientes 1200 Buenos Aires').trim();
const country = (argMap.country || 'ar').trim().toLowerCase();
const timeoutMs = Number(argMap.timeout || 10000);

const resolvedKey =
  keyFromArgs ||
  process.env.EXPO_PUBLIC_PLACES_API_KEY ||
  process.env.EXPO_PUBLIC_IOS_API_KEY ||
  process.env.EXPO_PUBLIC_ANDROID_API_KEY ||
  '';

const maskKey = (value) => {
  if (!value) return '(vacía)';
  if (value.length <= 10) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const printChecklist = () => {
  console.log('\nChecklist para resolver REQUEST_DENIED:');
  console.log('1) Google Cloud Billing habilitado para el proyecto.');
  console.log('2) APIs habilitadas: Places API y Maps JavaScript API (si usas web).');
  console.log('3) Restricciones de key correctas por plataforma:');
  console.log('   - iOS: bundle com.urbanfix.urbanfix');
  console.log('   - Android: package com.urbanfix.app + SHA-1');
  console.log('   - Web: referrers de tu dominio');
  console.log('4) Si dudas, crea una key temporal sin restricciones para aislar el problema.');
  console.log('5) Para builds EAS, verifica variables EXPO_PUBLIC_* en el entorno production.');
};

if (!resolvedKey) {
  console.error('No hay API key. Usa --key=TU_KEY o define EXPO_PUBLIC_PLACES_API_KEY.');
  process.exit(1);
}

const run = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log('Google Places check');
    console.log(`- key: ${maskKey(resolvedKey)}`);
    console.log(`- query: "${query}"`);
    console.log(`- country: ${country}`);

    const sessionToken = Math.random().toString(36).slice(2);
    const autocompleteUrl =
      'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
      `?input=${encodeURIComponent(query)}` +
      `&key=${encodeURIComponent(resolvedKey)}` +
      '&language=es' +
      '&types=geocode' +
      `&components=country:${encodeURIComponent(country)}` +
      `&sessiontoken=${sessionToken}`;

    const autocompleteRes = await fetch(autocompleteUrl, { signal: controller.signal });
    const autocompleteJson = await autocompleteRes.json();
    const acStatus = autocompleteJson?.status || 'UNKNOWN';
    const acError = autocompleteJson?.error_message || '';
    const predictions = Array.isArray(autocompleteJson?.predictions) ? autocompleteJson.predictions : [];

    console.log(`\nAutocomplete status: ${acStatus}`);
    if (acError) console.log(`Autocomplete error_message: ${acError}`);
    console.log(`Autocomplete predictions: ${predictions.length}`);
    predictions.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.description || '(sin descripción)'}`);
    });

    if (!predictions.length) {
      if (acStatus === 'REQUEST_DENIED') printChecklist();
      return;
    }

    const firstPlaceId = predictions[0]?.place_id;
    if (!firstPlaceId) return;

    const detailsUrl =
      'https://maps.googleapis.com/maps/api/place/details/json' +
      `?place_id=${encodeURIComponent(firstPlaceId)}` +
      `&key=${encodeURIComponent(resolvedKey)}` +
      '&language=es' +
      '&fields=geometry,formatted_address,place_id' +
      `&sessiontoken=${sessionToken}`;

    const detailsRes = await fetch(detailsUrl, { signal: controller.signal });
    const detailsJson = await detailsRes.json();
    const detailsStatus = detailsJson?.status || 'UNKNOWN';
    const detailsError = detailsJson?.error_message || '';
    const selectedAddress = detailsJson?.result?.formatted_address || '(sin formatted_address)';

    console.log(`\nDetails status: ${detailsStatus}`);
    if (detailsError) console.log(`Details error_message: ${detailsError}`);
    console.log(`Details address: ${selectedAddress}`);

    if (acStatus === 'REQUEST_DENIED' || detailsStatus === 'REQUEST_DENIED') {
      printChecklist();
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.error(`Timeout (${timeoutMs}ms) consultando Google Places.`);
    } else {
      console.error('Error consultando Google Places:', error?.message || error);
    }
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
};

run();
