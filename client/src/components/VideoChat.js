import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { ACTIONS } from '../Actions';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

function VideoChat({ socketRef, roomId, username }) {
  const [inCall, setInCall] = useState(false);
  const [peers, setPeers] = useState({});
  const [myPeerId, setMyPeerId] = useState(null);
  const [stream, setStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const myVideoRef = useRef();
  const peerInstance = useRef(null);

  useEffect(() => {
    if (!inCall || !socketRef.current) return;

    // Initialize PeerJS
    const peer = new Peer(undefined, {
      path: '/',
      secure: true,
    });

    peerInstance.current = peer;

    peer.on('open', (id) => {
      setMyPeerId(id);
      // Broadcast to others that we joined the call
      socketRef.current.emit(ACTIONS.USER_CALL, { roomId, peerId: id, username });
    });

    // Get Local Media Stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((mediaStream) => {
      setStream(mediaStream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = mediaStream;
      }

      // Answer incoming calls
      peer.on('call', (call) => {
        call.answer(mediaStream); // Answer with our stream
        call.on('stream', (userVideoStream) => {
          setPeers(prev => ({ ...prev, [call.peer]: userVideoStream }));
        });
      });

      // Listen for other users joining
      socketRef.current.on(ACTIONS.USER_CALL, ({ peerId, username }) => {
        const call = peer.call(peerId, mediaStream);
        call.on('stream', (userVideoStream) => {
          setPeers(prev => ({ ...prev, [peerId]: userVideoStream }));
        });
        call.on('close', () => {
          setPeers(prev => {
            const newPeers = { ...prev };
            delete newPeers[peerId];
            return newPeers;
          });
        });
      });
    }).catch(err => {
      console.error("Failed to get local stream", err);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.USER_CALL);
      }
      if (peerInstance.current) {
        peerInstance.current.destroy();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [inCall, roomId, socketRef]);

  // Handle toggling audio/video
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => track.enabled = audioEnabled);
      stream.getVideoTracks().forEach(track => track.enabled = videoEnabled);
    }
  }, [audioEnabled, videoEnabled, stream]);

  const joinCall = () => setInCall(true);
  const leaveCall = () => {
    setInCall(false);
    setPeers({});
    setMyPeerId(null);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (peerInstance.current) {
      peerInstance.current.destroy();
    }
  };

  const toggleAudio = () => setAudioEnabled(prev => !prev);
  const toggleVideo = () => setVideoEnabled(prev => !prev);

  if (!inCall) {
    return (
      <div className="p-2 d-flex justify-content-center border-bottom border-secondary" style={{ backgroundColor: "#1e1e1e" }}>
        <button className="btn btn-sm btn-outline-success w-100" onClick={joinCall}>
          <Video size={14} className="me-2" /> Join Video Call
        </button>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column border-bottom border-secondary p-2" style={{ backgroundColor: "#1e1e1e", maxHeight: "300px", overflowY: "auto" }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#ccc" }}>VIDEO CALL</span>
        <button className="btn btn-sm btn-danger py-0 px-2" onClick={leaveCall} style={{ fontSize: "11px" }}>Leave</button>
      </div>
      
      <div className="d-flex flex-wrap gap-2 justify-content-center">
        {/* Local Video */}
        <div className="position-relative" style={{ width: "120px", height: "90px", backgroundColor: "#000", borderRadius: "8px", overflow: "hidden" }}>
          <video playsInline muted ref={myVideoRef} autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div className="position-absolute bottom-0 start-0 w-100 p-1" style={{ background: "rgba(0,0,0,0.5)", fontSize: "10px", color: "white" }}>
            {username} (You)
          </div>
          <div className="position-absolute top-0 end-0 p-1 d-flex gap-1">
            <button className="btn btn-sm btn-dark p-0" style={{ width: "20px", height: "20px" }} onClick={toggleAudio}>
              {audioEnabled ? <Mic size={10} /> : <MicOff size={10} color="#ff4444" />}
            </button>
            <button className="btn btn-sm btn-dark p-0" style={{ width: "20px", height: "20px" }} onClick={toggleVideo}>
              {videoEnabled ? <Video size={10} /> : <VideoOff size={10} color="#ff4444" />}
            </button>
          </div>
        </div>

        {/* Remote Videos */}
        {Object.keys(peers).map((peerId) => (
          <div key={peerId} className="position-relative" style={{ width: "120px", height: "90px", backgroundColor: "#000", borderRadius: "8px", overflow: "hidden" }}>
            <VideoPlayer stream={peers[peerId]} />
            <div className="position-absolute bottom-0 start-0 w-100 p-1" style={{ background: "rgba(0,0,0,0.5)", fontSize: "10px", color: "white" }}>
              Peer
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const VideoPlayer = ({ stream }) => {
  const ref = useRef();
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return <video playsInline autoPlay ref={ref} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
};

export default VideoChat;
