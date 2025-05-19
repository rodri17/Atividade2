import React from 'react';
import './Layout.css';

const Header = () => {
  return (
    <header className="header">
      <nav>
        <h1 className="logo">
          <span className="logo-icon">📖</span>
          Distributed Dictionary
        </h1>
        <div className="nav-links">
          <a href="/" className="nav-link">Home</a>
        </div>
      </nav>
    </header>
  );
};

export default Header;