import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import VideoCall from './components/VideoCall';
import MOM from './components/MOM';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/call" element={<VideoCall />} />
        <Route path="/mom" element={<MOM />} />
      </Routes>
    </Router>
  );
}

export default App;
