import React, { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";
import Peer from "simple-peer";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Maximize2,
  Save,
  Brain,
  BarChart,
  FileText,
} from "lucide-react";

const socket = io("https://meet-server-3.onrender.com");

export default function VideoCall() {
  const location = useLocation();
  const roomId = new URLSearchParams(location.search).get("room") || "default-room";

  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerRef = useRef();
  const [stream, setStream] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [stats, setStats] = useState({ latency: 0, packetLoss: 0 });
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [peerCreated, setPeerCreated] = useState(false);

  const goFullscreen = (ref) => {
    if (ref.current) {
      ref.current.requestFullscreen();
    }
  };

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(localStream => {
      setStream(localStream);
      localVideo.current.srcObject = localStream;

      socket.emit("join-room", roomId);

      socket.on("user-joined", (peerId) => {
        if (peerCreated) return;
        setPeerCreated(true);

        const peer = new Peer({
          initiator: true,
          trickle: false,
          stream: localStream,
          config: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
          }
        });
        peerRef.current = peer;

        peer.on("signal", signal => {
          socket.emit("signal", { roomId, signal, to: peerId });
        });

        peer.on("stream", remoteStream => {
          remoteVideo.current.srcObject = remoteStream;
        });
      });

      socket.on("signal", ({ signal, from }) => {
        if (peerCreated) {
          peerRef.current.signal(signal);
          return;
        }

        setPeerCreated(true);

        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: localStream,
          config: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
          }
        });
        peerRef.current = peer;

        peer.on("signal", signal => {
          socket.emit("signal", { roomId, signal, to: from });
        });

        peer.on("stream", remoteStream => {
          remoteVideo.current.srcObject = remoteStream;
        });

        peer.signal(signal);
      });
    });

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.onresult = (e) => {
      const line = e.results[e.results.length - 1][0].transcript;
      setTranscript((prev) => [...prev, line]);
    };
    recognition.start();
  }, [roomId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (peerRef.current?._pc) {
        peerRef.current._pc.getStats().then((statsReport) => {
          let latency = 0;
          let packetLoss = 0;
          statsReport.forEach((report) => {
            if (report.type === "remote-inbound-rtp") {
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
    await fetch("https://meet-server-3.onrender.com/api/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: roomId, transcript }),
    });
  };

  const fetchMOM = async () => {
    const res = await fetch(`https://meet-server-3.onrender.com/api/mom/${roomId}`);
    const data = await res.json();
    alert("Action Items:\n" + data.actionItems.join("\n"));
  };

  const toggleMic = () => {
    stream.getAudioTracks()[0].enabled = !micOn;
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    stream.getVideoTracks()[0].enabled = !camOn;
    setCamOn(!camOn);
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col">
      <header className="p-3 flex justify-between items-center border-b border-gray-700">
        <h2 className="text-xl font-semibold">Smart Meet</h2>
        <span className="text-sm text-gray-400">Room: {roomId}</span>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        <div className="relative bg-black rounded-xl overflow-hidden shadow-lg">
          <video ref={localVideo} autoPlay muted className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 bg-gray-800 px-2 py-1 rounded text-xs">You</span>
        </div>
        <div className="relative bg-black rounded-xl overflow-hidden shadow-lg">
          <video ref={remoteVideo} autoPlay className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 bg-gray-800 px-2 py-1 rounded text-xs">Teammate</span>
        </div>
      </main>

      <div className="flex justify-center space-x-4 py-3 bg-gray-800">
        <button onClick={toggleMic} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600">
          {micOn ? <Mic /> : <MicOff className="text-red-500" />}
        </button>
        <button onClick={toggleCam} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600">
          {camOn ? <Video /> : <VideoOff className="text-red-500" />}
        </button>
        <button onClick={() => goFullscreen(remoteVideo)} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600">
          <Maximize2 />
        </button>
        <button onClick={saveTranscript} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600">
          <Save />
        </button>
        <button onClick={fetchMOM} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600">
          <Brain />
        </button>
        <button onClick={() => alert("End Call")} className="p-3 rounded-full bg-red-600 hover:bg-red-500">
          <PhoneOff />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800 border-t border-gray-700">
        <div>
          <h3 className="font-semibold flex items-center space-x-2">
            <BarChart className="w-4 h-4" /> <span>Call Stats</span>
          </h3>
          <p className="text-sm">Latency: {stats.latency.toFixed(2)}s</p>
          <p className="text-sm">Packet Loss: {stats.packetLoss}</p>
        </div>
        <div>
          <h3 className="font-semibold flex items-center space-x-2">
            <FileText className="w-4 h-4" /> <span>Live Transcript</span>
          </h3>
          <div className="h-24 overflow-y-auto mt-1 bg-gray-900 rounded p-2 text-sm">
            {transcript.map((line, i) => (
              <p key={i}>• {line}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
