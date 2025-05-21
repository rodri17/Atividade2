import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
  stages: [
    { duration: '1m', target: 200 }, 
    { duration: '1m', target: 500 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'], // Relaxado para detetar limites
    http_req_duration: ['p(95)<1000']
  }
};

const BASE_URL = 'http://nginx-proxy:80';

export default function () {
  const key = `stress-key-${__VU}-${__ITER}`;
  const value = `stress-value-${__VU}`;

  const putRes = http.put(
    `${BASE_URL}`,
    JSON.stringify({ data: { key: key, value: value } }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  // Apenas PUT para forçar limites
  check(putRes, { 
    'PUT Stress OK': (r) => [200, 201].includes(r.status),
  });

  sleep(0.5); // Intervalo menor para maior pressão, Stress Test: Concentrado em sobrecarregar o sistema (apenas PUT para maximizar carga).
}

export function handleSummary(data) {
  return {
    "/testes-carga/relatorios/stress-test-report.html": htmlReport(data),
  };
}