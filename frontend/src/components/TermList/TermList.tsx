import React, { useState } from 'react';
import api from '../../services/api';

const TermList = () => {
  const [key, setkey] = useState('');
  const [result, setResult] = useState('');

  const handleGet = async () => {
    try {
      const normalizedKey = key.trim().toLowerCase();
      const response = await api.get<{ data: { value: string } }>(`/word/${normalizedKey}`);
      setResult(response.data.data.value);
    } catch (error) {
      setResult('Word not found');
    }
  };

  return (
    <div className="key-list">
      <h3>🔍 Search Word</h3>
      <div className="search-container">
        <input
          placeholder="Search for a word..."
          value={key}
          onChange={(e) => setkey(e.target.value)}
          className="search-input"
        />
        <button onClick={handleGet} className="btn-search">
          Search
        </button>
      </div>
      {result && (
        <div className="result-box">
          <span className="result-label">Definition:</span>
          <p className="result-text">{result}</p>
        </div>
      )}
    </div>
  );
};

export default TermList;