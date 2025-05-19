import React from 'react';
import TermForm from '../components/TermForm/TermForm';
import TermList from '../components/TermList/TermList';
import '../styles/dictionary.css';

const DictionaryManagementPage = () => {
  return (
    <div className="container">
      <h1>✨ Distributed Dictionary Manager</h1>
      <div className="dashboard">
        <section className="form-section">
          <TermForm />
        </section>
        
        <section className="search-section">
          <TermList />
        </section>
      </div>
    </div>
  );
};

export default DictionaryManagementPage;