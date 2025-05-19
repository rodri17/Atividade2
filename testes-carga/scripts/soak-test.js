import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
  vus: 50,
  duration: '2h', // Longa duração
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500']
  }
};

const BASE_URL = 'http://nginx-proxy:80';

export default function () {
  const key = `soak-key-${__VU}-${__ITER}`;
  const value = `soak-value-${Date.now()}`; // Valor único

  // Ciclo completo
  const putRes = http.put(
    `${BASE_URL}`,
    JSON.stringify({ data: { key: key, value: value } }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(putRes, { 'PUT Soak OK': (r) => [200, 201].includes(r.status) });

  const getRes = http.get(`${BASE_URL}/word/${key}`);
  check(getRes, { 'GET Soak OK': (r) => r.status === 200 });

  const delRes = http.del(`${BASE_URL}/word?key=${key}`);
  check(delRes, { 'DELETE Smoke OK': (r) => r.status === 204 });

  sleep(5); // Intervalo maior para simular uso realista
}

export function handleSummary(data) {
  return {
    "/testes-carga/relatorios/soak-test-report.html": htmlReport(data),
  };
}