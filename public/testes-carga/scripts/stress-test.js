import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
  stages: [
    { duration: '1m', target: 500 },  // Rampa rápida
    { duration: '4m', target: 1000 }, // Nível de stress
    { duration: '5m', target: 0 }     // Teste de recuperação
  ],
  thresholds: {
    http_req_failed: ['rate<0.25'],  // Tolerância alta
    'http_req_duration{type:PUT}': ['p(95)<2000'],  // Sobrevivência
    'http_req_duration{type:GET}': ['p(95)<1500']   // Cache sob stress
  }
};

const BASE_URL = 'http://nginx-proxy:80';

export default function () {
  const key = `stress-${Date.now()}`;  // Chaves únicas

  // 90% PUT / 10% GET
  if (Math.random() < 0.9) {
    http.put(
      BASE_URL,
      JSON.stringify({ data: { key, value: `val-${__VU}` } }),
      { 
        headers: { 'Content-Type': 'application/json' },
        tags: { type: 'PUT' }
      }
    );
  } else {
    http.get(`${BASE_URL}/word/stress-${Math.floor(Math.random()*1000)}`, {
      tags: { type: 'GET' }
    });
  }

  sleep(0.1);  // Máxima pressão
}

export function handleSummary(data) {
  return {
    "/testes-carga/relatorios/stress-test-report.html": htmlReport(data),
  };
}