import https from 'node:https';

const url = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries/ARG.geo.json';

const fetchText = (targetUrl) =>
  new Promise((resolve, reject) => {
    https
      .get(targetUrl, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Request failed (${response.statusCode})`));
          return;
        }

        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          raw += chunk;
        });
        response.on('end', () => resolve(raw));
      })
      .on('error', reject);
  });

const toRings = (geojson) => {
  const geometry = geojson.type === 'FeatureCollection' ? geojson.features[0].geometry : geojson.geometry;
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flatMap((polygon) => polygon);
  throw new Error(`Unsupported geometry type: ${geometry.type}`);
};

const main = async () => {
  const payload = await fetchText(url);
  const geojson = JSON.parse(payload);
  const rings = toRings(geojson);

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
  }

  const viewBox = { x: 70, y: 0, width: 140, height: 430, padding: 10 };
  const scaleX = (viewBox.width - viewBox.padding * 2) / (maxLon - minLon);
  const scaleY = (viewBox.height - viewBox.padding * 2) / (maxLat - minLat);
  const drawWidth = scaleX * (maxLon - minLon);
  const drawHeight = scaleY * (maxLat - minLat);
  const offsetX = viewBox.x + viewBox.padding + (viewBox.width - viewBox.padding * 2 - drawWidth) / 2;
  const offsetY = viewBox.y + viewBox.padding + (viewBox.height - viewBox.padding * 2 - drawHeight) / 2;

  const project = ([lon, lat]) => ({
    x: offsetX + (lon - minLon) * scaleX,
    y: offsetY + (maxLat - lat) * scaleY,
  });

  const commands = [];

  for (const ring of rings) {
    if (!ring.length) continue;
    const first = project(ring[0]);
    commands.push(`M${first.x.toFixed(2)} ${first.y.toFixed(2)}`);
    for (let index = 1; index < ring.length; index += 1) {
      const point = project(ring[index]);
      commands.push(`L${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
    }
    commands.push('Z');
  }

  console.log(commands.join(' '));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
