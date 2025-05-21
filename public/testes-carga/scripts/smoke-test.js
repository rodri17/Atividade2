import http from 'k6/http';
import { check } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
  vus: 10, 
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300']
  }
};

const BASE_URL = 'http://nginx-proxy:80';

export default function () {
  const key = `smoke-key-${__VU}`;
  const value = `smoke-value-${__VU}`;

  const putRes = http.put(
    `${BASE_URL}`,
    JSON.stringify({ data: { key: key, value: value } }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(putRes, { 'PUT Smoke OK': (r) => [200, 201].includes(r.status) });

  const getRes = http.get(`${BASE_URL}/word/${key}`);
  check(getRes, { 'GET Smoke OK': (r) => r.status === 200 });
}

export function handleSummary(data) {
  return {
    "/testes-carga/relatorios/smoke-test-report.html": htmlReport(data),
  };
}