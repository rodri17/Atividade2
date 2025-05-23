import http from 'k6/http';
import { check } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate==0'],  // 0% de falhas
    'http_req_duration{type:PUT}': ['p(95)<500'],
    'http_req_duration{type:GET}': ['p(95)<200'],
    'http_req_duration{type:DELETE}': ['p(95)<300']
  }
};

const BASE_URL = 'http://nginx-proxy:80';

export default function () {
  const key = `smoke-${__VU}-${__ITER}`;
  const value = `val-${Date.now()}`;

  // PUT
  const putRes = http.put(
    BASE_URL,
    JSON.stringify({ data: { key, value } }),
    { 
      headers: { 'Content-Type': 'application/json' },
      tags: { type: 'PUT' }
    }
  );
  check(putRes, { 'PUT OK': (r) => [200, 201].includes(r.status) });

  // GET
  const getRes = http.get(`${BASE_URL}/word/${key}`, { tags: { type: 'GET' } });
  check(getRes, { 'GET OK': (r) => r.status === 200 });

  // DELETE
  const delRes = http.del(
    `${BASE_URL}/word?key=${key}`,
    null,
    { tags: { type: 'DELETE' } }
  );
  check(delRes, { 'DELETE OK': (r) => r.status === 200 });
}

export function handleSummary(data) {
  return {
    "/testes-carga/relatorios/smoke-test.html": htmlReport(data),
  };
}