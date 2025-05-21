import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
  stages: [
    { duration: '1m', target: 50 },  
    { duration: '3m', target: 100 }, 
    { duration: '1m', target: 0 },   
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    // Novos thresholds específicos por operação
    'http_req_duration{type:PUT}': ['p(95)<500'],
    'http_req_duration{type:GET}': ['p(95)<200'],
    'http_req_duration{type:DELETE}': ['p(95)<300'],
  }
};

const BASE_URL = 'http://nginx-proxy:80';

export default function () {
  const key = `load-key-${__VU}`;
  const value = `load-value-${__VU}`;

  // Endpoints com tag
  const putRes = http.put(
    `${BASE_URL}`,
    JSON.stringify({ data: { key: key, value: value } }),
    { 
      headers: { 'Content-Type': 'application/json' },
      tags: { type: 'PUT' } 
    }
  );
  check(putRes, { 'PUT Load OK': (r) => [200, 201].includes(r.status) });

  const getRes = http.get(`${BASE_URL}/word/${key}`, {
    tags: { type: 'GET' }
  });
  check(getRes, { 'GET Load OK': (r) => r.status === 200 });

  const delRes = http.del(
    `${BASE_URL}/word?key=${key}`,
    null,
    { tags: { type: 'DELETE' } }
  );
  check(delRes, { 'DELETE Load OK': (r) => r.status === 200 });

  sleep(1);
  
}

export function handleSummary(data) {
  return {
    "/testes-carga/relatorios/load-test-report.html": htmlReport(data),
  };
}