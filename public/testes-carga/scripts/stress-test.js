import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
  stages: [
    { duration: '1m', target: 1000 }, // Nível de stress
  ],
  thresholds: {
    http_req_failed: ['rate<0.25'],  // Tolerância alta
    'http_req_duration{type:PUT}': ['p(95)<2000'],
    'http_req_duration{type:GET}': ['p(95)<1000'],
    'http_req_duration{type:DELETE}': ['p(95)<1500'],
  }
};

const BASE_URL = 'http://nginx-proxy:80';

export default function () {
  const key = `smoke-${__VU}-${__ITER}`;
  const value = `val-${Date.now()}`;
  
  const resput = http.put(BASE_URL, JSON.stringify({ data: { key, value } }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'PUT', name: 'PUT /' }
  });
  check(resput, { 'PUT OK': (r) => [200, 201].includes(r.status) });

  // Use a static name to group all GET requests
  const resget = http.get(`${BASE_URL}/?key=${key}`, {
    tags: { type: 'GET', name: 'GET /?key' }
  });
  check(resget, { 'GET OK': (r) => [200, 404].includes(r.status) });

  // Use a static name to group all DELETE requests
  const resdel = http.del(`${BASE_URL}/?key=${key}`, null, {
    tags: { type: 'DELETE', name: 'DELETE /?key' }
  });
  check(resdel, { 'DELETE OK': (r) => [200, 404].includes(r.status) });
}

export function handleSummary(data) {
  return {
    "/testes-carga/relatorios/stress-test-report.html": htmlReport(data),
  };
}