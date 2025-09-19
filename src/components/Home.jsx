import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = Math.random().toString(36).substring(2, 8);
    setRoomId(id);
  }, []);

  // Replace with your actual IP or tunnel URL
  const frontendURL = 'http://172.31.98.86:5173'; // 👈 Update this if using ngrok or localtunnel
  const shareLink = `${frontendURL}/call?room=${roomId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center">
      <div className="text-center p-6 max-w-md bg-white shadow-lg rounded-lg">
        <h1 className="text-3xl font-extrabold text-indigo-600 mb-4">
          Smart Meeting Assistant
        </h1>
        <p className="text-gray-700 mb-4">
          Share this link with your teammate to join the same meeting:
        </p>
        <div className="bg-gray-100 p-2 rounded mb-2 text-sm break-all">
          🔗 <a href={shareLink} className="text-blue-600 underline">{shareLink}</a>
        </div>
        <button
          onClick={copyToClipboard}
          className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          📋 {copied ? 'Link Copied!' : 'Copy Link'}
        </button>
        <Link
          to={`/call?room=${roomId}`}
          className="inline-block px-6 py-3 bg-indigo-500 text-white font-semibold rounded hover:bg-indigo-600 transition"
        >
          🚀 Start Video Call
        </Link>
      </div>
    </div>
  );
}
