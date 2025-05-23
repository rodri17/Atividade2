import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate==0'],  // 0% de falhas
    'http_req_duration{type:PUT}': ['p(95)<500'],
    'http_req_duration{type:GET}': ['p(95)<200'],
  }
};

const BASE_URL = 'http://nginx-proxy:80';

export default function () {
  const key = `smoke-${__VU}-${__ITER}`;
  const value = `val-${Date.now()}`;

  // PUT
  const resput = http.put(BASE_URL, JSON.stringify({ data: { key, value } }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { type: 'PUT', name: 'PUT /' }
      });
  check(resput, { 'PUT OK': (r) => [200, 201].includes(r.status) });

  // GET
  const resget = http.get(`${BASE_URL}/?key=${key}`, {
       tags: { type: 'GET', name: 'GET /?key' }
     });
  check(resget, { 'GET OK': (r) => [200, 404].includes(r.status) });
  sleep(1);
}

export function handleSummary(data) {
  return {
    "/testes-carga/relatorios/smoke-test-report.html": htmlReport(data),
  };
}