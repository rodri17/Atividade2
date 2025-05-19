const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({ target: 'http://php-api:80', changeOrigin: true })
  );

  // Health Check para o Frontend
  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
};