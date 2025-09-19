import React, { useState } from 'react';

export default function MOM() {
  const [mom, setMom] = useState([]);

  const fetchMOM = async () => {
    const res = await fetch('http://localhost:5000/api/mom/demo-room');
    const data = await res.json();
    setMom(data.actionItems);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Minutes of Meeting</h2>
      <button onClick={fetchMOM} className="bg-green-500 text-white px-4 py-2 rounded">Fetch MOM</button>
      <ul className="mt-4">{mom.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>
  );
}
