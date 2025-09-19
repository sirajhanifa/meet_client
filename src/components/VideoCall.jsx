import React, { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io('http://172.31.98.86:5000'); // 👈 Your backend IP

export default function VideoCall() {
  const location = useLocation();
  const roomId = new URLSearchParams(location.search).get('room') || 'default-room';

  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerRef = useRef();
  const [stream, setStream] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [stats, setStats] = useState({ latency: 0, packetLoss: 0 });

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(localStream => {
      setStream(localStream);
      localVideo.current.srcObject = localStream;

      socket.emit('join-room', roomId);

      socket.on('user-joined', () => {
        const peer = new Peer({ initiator: true, trickle: false, stream: localStream });
        peerRef.current = peer;

        peer.on('signal', signal => {
          socket.emit('signal', { roomId, signal });
        });

        peer.on('stream', remoteStream => {
          remoteVideo.current.srcObject = remoteStream;
        });

        socket.on('signal', ({ signal }) => {
          peer.signal(signal);
        });
      });

      socket.on('signal', ({ signal }) => {
        if (!peerRef.current) {
          const peer = new Peer({ initiator: false, trickle: false, stream: localStream });
          peerRef.current = peer;

          peer.on('signal', signal => {
            socket.emit('signal', { roomId, signal });
          });

          peer.on('stream', remoteStream => {
            remoteVideo.current.srcObject = remoteStream;
          });

          peer.signal(signal);
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
    await fetch('http://172.31.98.86:5000/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: roomId, transcript })
    });
  };

  const fetchMOM = async () => {
    const res = await fetch(`http://172.31.98.86:5000/api/mom/${roomId}`);
    const data = await res.json();
    alert('Action Items:\n' + data.actionItems.join('\n'));
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">🎥 Smart Meeting Assistant</h2>
      <p className="text-sm text-gray-500">Room ID: <span className="font-mono">{roomId}</span></p>
      <div className="flex gap-4">
        <video ref={localVideo} autoPlay muted className="w-1/2 border rounded" />
        <video ref={remoteVideo} autoPlay className="w-1/2 border rounded" />
      </div>
      <div className="space-x-2">
        <button onClick={saveTranscript} className="px-4 py-2 bg-blue-500 text-white rounded">Save Transcript</button>
        <button onClick={fetchMOM} className="px-4 py-2 bg-green-500 text-white rounded">Generate MOM</button>
      </div>
      <div>
        <h3 className="font-semibold">📊 Call Stats</h3>
        <p>Latency: {stats.latency.toFixed(2)}s</p>
        <p>Packet Loss: {stats.packetLoss}</p>
      </div>
      <div>
        <h3 className="font-semibold">📝 Live Transcript</h3>
        <ul className="list-disc pl-5">{transcript.map((line, i) => <li key={i}>{line}</li>)}</ul>
      </div>
    </div>
  );
}
