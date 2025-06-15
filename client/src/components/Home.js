import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    toast.success("New Room ID Generated!");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }

    navigate(`/editor/${roomId}`, {
      state: { username },
    });
    toast.success("Room Joined Successfully!");
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100 bg-dark"
      style={{
        background: "linear-gradient(135deg, #1c1c1e, #2e2e33)",
      }}
    >
      <div
        className="card p-4"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          width: "100%",
          maxWidth: "400px",
          color: "#ffffff",
        }}
      >
        <div className="text-center mb-4">
          <img
            src="/images/codetogether.png"
            alt="CodeTogether Logo"
            style={{ width: "100px", marginBottom: "10px" }}
          />
          <h3 style={{ fontWeight: "600" }}>Join a Code Room</h3>
        </div>

        <div className="mb-3">
          <label className="form-label" style={{ color: "#aaa" }}>
            Room ID
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="e.g. a1b2-c3d4-e5f6"
            className="form-control"
            onKeyUp={handleInputEnter}
            style={{ backgroundColor: "#222", color: "#fff", border: "none" }}
          />
        </div>

        <div className="mb-4">
          <label className="form-label" style={{ color: "#aaa" }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
            className="form-control"
            onKeyUp={handleInputEnter}
            style={{ backgroundColor: "#222", color: "#fff", border: "none" }}
          />
        </div>

        <button
          onClick={joinRoom}
          className="btn btn-success btn-block mb-3"
          style={{ fontWeight: "600" }}
        >
          JOIN ROOM
        </button>

        <p className="text-center text-light">
          Don’t have a room?{" "}
          <span
            onClick={generateRoomId}
            style={{ cursor: "pointer", color: "#0d6efd", fontWeight: "600" }}
          >
            Create New
          </span>
        </p>
      </div>
    </div>
  );
}

export default Home;
