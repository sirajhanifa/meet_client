import React, { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io('https://meet-server-3.onrender.com');

export default function VideoCall() {
  const location = useLocation();
  const roomId = new URLSearchParams(location.search).get('room') || 'default-room';

  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerRef = useRef();
  const [stream, setStream] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [stats, setStats] = useState({ latency: 0, packetLoss: 0 });

  const goFullscreen = (ref) => {
    if (ref.current) {
      ref.current.requestFullscreen();
    }
  };

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(localStream => {
      setStream(localStream);
      localVideo.current.srcObject = localStream;

      socket.emit('join-room', roomId);

      socket.on('user-joined', (peerId) => {
        const peer = new Peer({
          initiator: true,
          trickle: false,
          stream: localStream,
          config: {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          }
        });
        peerRef.current = peer;

        peer.on('signal', signal => {
          socket.emit('signal', { roomId, signal, to: peerId });
        });

        peer.on('stream', remoteStream => {
          remoteVideo.current.srcObject = remoteStream;
        });
      });

      socket.on('signal', ({ signal, from }) => {
        if (!peerRef.current) {
          const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: localStream,
            config: {
              iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            }
          });
          peerRef.current = peer;

          peer.on('signal', signal => {
            socket.emit('signal', { roomId, signal, to: from });
          });

          peer.on('stream', remoteStream => {
            remoteVideo.current.srcObject = remoteStream;
          });

          peer.signal(signal);
        } else {
          peerRef.current.signal(signal);
        }
      });
    });

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.onresult = e => {
      const line = e.results[e.results.length - 1][0].transcript;
      setTranscript(prev => [...prev, line]);
    };
    recognition.start();
  }, [roomId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (peerRef.current?._pc) {
        peerRef.current._pc.getStats().then(statsReport => {
          let latency = 0;
          let packetLoss = 0;
          statsReport.forEach(report => {
            if (report.type === 'remote-inbound-rtp') {
              latency = report.roundTripTime || 0;
              packetLoss = report.packetsLost || 0;
            }
          });
          setStats({ latency, packetLoss });
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const saveTranscript = async () => {
    await fetch('https://meet-server-3.onrender.com/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: roomId, transcript })
    });
  };

  const fetchMOM = async () => {
    const res = await fetch(`https://meet-server-3.onrender.com/api/mom/${roomId}`);
    const data = await res.json();
    alert('Action Items:\n' + data.actionItems.join('\n'));
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold text-indigo-600">🎥 Smart Meeting Assistant</h2>
      <p className="text-sm text-gray-600">Room ID: <span className="font-mono">{roomId}</span></p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <video ref={localVideo} autoPlay muted className="w-full h-auto rounded shadow-lg border" />
          <span className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">You</span>
        </div>
        <div className="relative">
          <video ref={remoteVideo} autoPlay className="w-full h-auto rounded shadow-lg border" />
          <span className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">Teammate</span>
        </div>
      </div>

      <div className="space-x-2">
        <button onClick={() => goFullscreen(localVideo)} className="px-4 py-2 bg-gray-300 rounded">🔍 Fullscreen Me</button>
        <button onClick={() => goFullscreen(remoteVideo)} className="px-4 py-2 bg-gray-300 rounded">🔍 Fullscreen Teammate</button>
      </div>

      <div className="space-x-2">
        <button onClick={saveTranscript} className="px-4 py-2 bg-blue-500 text-white rounded">💾 Save Transcript</button>
        <button onClick={fetchMOM} className="px-4 py-2 bg-green-500 text-white rounded">🧠 Generate MOM</button>
      </div>

      <div>
        <h3 className="font-semibold text-lg">📊 Call Stats</h3>
        <p>Latency: {stats.latency.toFixed(2)}s</p>
        <p>Packet Loss: {stats.packetLoss}</p>
      </div>

      <div>
        <h3 className="font-semibold text-lg">📝 Live Transcript</h3>
        <ul className="list-disc pl-5 space-y-1">
          {transcript.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      </div>
    </div>
  );
}
