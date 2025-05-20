import React, { useState } from 'react';
import api from '../../services/api';

const TermList = () => {
  const [key, setkey] = useState('');
  const [result, setResult] = useState('');

  const handleGet = async () => {
    try {
      const normalizedKey = key.trim().toLowerCase();
      const response = await api.get<{ data: { value: string } }>(`/?key=${normalizedKey}`);
      setResult(response.data.data.value);
    } catch (error) {
      setResult('Palavra não encontrada.');
    }
  };

  return (
    <div className="key-list">
      <h3>🔍 Buscar Palavra</h3>
      <div className="search-container">
        <input
          placeholder="Digite a palavra para buscar..."
          value={key}
          onChange={(e) => setkey(e.target.value)}
          className="search-input"
        />
        <button onClick={handleGet} className="btn-search">
          Buscar
        </button>
      </div>
      {result && (
        <div className="result-box">
          <span className="result-label">Definição:</span>
          <p className="result-text">{result}</p>
        </div>
      )}
    </div>
  );
};

export default TermList;
