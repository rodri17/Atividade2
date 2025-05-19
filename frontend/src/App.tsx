import React from 'react';
import { Route, Routes } from 'react-router-dom';
import DictionaryManagementPage from './pages/DictionaryManagementPage';
import Layout from './components/Layout/Layout';
import './styles/dictionary.css';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DictionaryManagementPage />} />
        <Route path="/keys" element={<DictionaryManagementPage />} />
      </Routes>
    </Layout>
  );
}

export default App;