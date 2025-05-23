import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '10m', target: 300 },
    { duration: '2m', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{type:PUT}': ['p(95)<1400'],
    'http_req_duration{type:GET}': ['p(95)<700'],
    'http_req_duration{type:DELETE}': ['p(95)<700']
  }
};

const BASE_URL = 'http://nginx-proxy:80';

export default function () {
  const key = `word-${__VU}-${Math.floor(Math.random() * 1000)}`;
  const value = `val-${Date.now()}`;

  if (Math.random() < 0.15) {
    const res = http.put(BASE_URL, JSON.stringify({ data: { key, value } }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { type: 'PUT', name: 'PUT /' }
    });
    check(res, { 'PUT OK': (r) => [200, 201].includes(r.status) });

  } else if (Math.random() < 0.95) {
    // Use a static name to group all GET requests
    const res = http.get(`${BASE_URL}/?key=${key}`, {
      tags: { type: 'GET', name: 'GET /?key' }
    });
    check(res, { 'GET OK': (r) => [200, 404].includes(r.status) });

  } else {
    // Use a static name to group all DELETE requests
    const res = http.del(`${BASE_URL}/?key=${key}`, null, {
      tags: { type: 'DELETE', name: 'DELETE /?key' }
    });
    check(res, { 'DELETE OK': (r) => [200, 404].includes(r.status) });
  }

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    "/testes-carga/relatorios/load-test-report.html": htmlReport(data),
  };
}