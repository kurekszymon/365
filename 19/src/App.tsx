import { useEffect, useState } from 'react';
import './App.css';

const params = new URLSearchParams(document.location.search);

function App() {


  return (
    <>
      <h1>Search params: id - {params.get('id')}</h1>
      <h1>Search params: name - {params.get('name')}</h1>

      <div>
      </div>
      <button id="ping-btn">
        Ping with me
      </button>
    </>
  );
}

export default App;
