import React, { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io("https://your-server-url.com"); // replace with your deployed server

export default function VideoCall() {
  const location = useLocation();
  const roomId = new URLSearchParams(location.search).get("room") || "default-room";

  const localVideo = useRef();
  const [peers, setPeers] = useState([]);
  const peersRef = useRef([]);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(localStream => {
      setStream(localStream);
      localVideo.current.srcObject = localStream;

      socket.emit("join-room", roomId);

      // New user joined
      socket.on("user-joined", peerId => {
        const peer = createPeer(peerId, socket.id, localStream);
        peersRef.current.push({ peerId, peer });
        setPeers(prev => [...prev, { peerId, peer }]);
      });

      // Signal received
      socket.on("signal", ({ signal, from }) => {
        const item = peersRef.current.find(p => p.peerId === from);
        if (item) {
          item.peer.signal(signal);
        } else {
          const peer = addPeer(signal, from, localStream);
          peersRef.current.push({ peerId: from, peer });
          setPeers(prev => [...prev, { peerId: from, peer }]);
        }
      });

      // User left
      socket.on("user-left", peerId => {
        const item = peersRef.current.find(p => p.peerId === peerId);
        if (item) {
          item.peer.destroy();
        }
        peersRef.current = peersRef.current.filter(p => p.peerId !== peerId);
        setPeers(peersRef.current);
      });
    });
  }, [roomId]);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream
    });

    peer.on("signal", signal => {
      socket.emit("signal", { roomId, signal, to: userToSignal });
    });

    return peer;
  }

  function addPeer(incomingSignal, peerId, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream
    });

    peer.on("signal", signal => {
      socket.emit("signal", { roomId, signal, to: peerId });
    });

    peer.signal(incomingSignal);
    return peer;
  }

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col">
      <div className="p-3 text-white font-bold">Room: {roomId}</div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
        <video ref={localVideo} autoPlay muted className="w-full h-auto" />
        {peers.map(p => (
          <Video key={p.peerId} peer={p.peer} />
        ))}
      </div>
    </div>
  );
}

function Video({ peer }) {
  const ref = useRef();

  useEffect(() => {
    peer.on("stream", stream => {
      ref.current.srcObject = stream;
    });
  }, [peer]);

  return <video ref={ref} autoPlay className="w-full h-auto" />;
}
