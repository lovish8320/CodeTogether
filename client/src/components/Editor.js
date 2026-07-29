import React, { useRef, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";
import { ACTIONS } from "../Actions";

const LANGUAGES = [
  "javascript", "python", "cpp", "c", "java", "html", "css", "json", "plaintext"
];

function Editor({ socketRef, roomId, username, activeFile, onCodeChange, onLanguageChange }) {
  const editorRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const monacoRef = useRef(null);
  const remoteCursorsRef = useRef({}); // { username: { position, decorationIds: [] } }

  // Generate a consistent color for a username
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  useEffect(() => {
    if (!socketRef.current) return;

    const handleCursorChange = ({ username: remoteUser, position, fileId }) => {
      if (!activeFile || fileId !== activeFile.id || remoteUser === username) return;
      if (!editorRef.current || !monacoRef.current) return;

      const color = stringToColor(remoteUser);
      
      // Inject CSS for this user if not already present
      const styleId = `remote-cursor-style-${remoteUser}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
          .remote-cursor-${remoteUser} { border-left: 2px solid ${color}; position: relative; z-index: 10; }
          .remote-cursor-${remoteUser}::after {
            content: '${remoteUser}';
            position: absolute;
            top: -15px;
            left: 0;
            background-color: ${color};
            color: white;
            font-size: 10px;
            padding: 2px 4px;
            border-radius: 2px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 20;
          }
        `;
        document.head.appendChild(style);
      }

      const prevDecorations = remoteCursorsRef.current[remoteUser]?.decorationIds || [];
      const newDecorations = editorRef.current.deltaDecorations(prevDecorations, [
        {
          range: new monacoRef.current.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          options: {
            className: `remote-cursor-${remoteUser}`,
            hoverMessage: { value: remoteUser },
          },
        },
      ]);

      remoteCursorsRef.current[remoteUser] = { position, decorationIds: newDecorations };
    };

    socketRef.current.on(ACTIONS.CURSOR_CHANGE, handleCursorChange);

    return () => {
      socketRef.current.off(ACTIONS.CURSOR_CHANGE, handleCursorChange);
    };
  }, [socketRef, activeFile, username]);

  // Handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      if (socketRef.current && activeFile) {
        socketRef.current.emit(ACTIONS.CURSOR_CHANGE, {
          roomId,
          username,
          fileId: activeFile.id,
          position: e.position,
        });
      }
    });
  };

  // Handle local code changes
  const handleEditorChange = (value) => {
    if (activeFile) {
      onCodeChange(activeFile.id, value);
      if (socketRef.current) {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          fileId: activeFile.id,
          code: value,
        });

        // Typing indicator logic
        socketRef.current.emit(ACTIONS.TYPING, { roomId, username });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current.emit(ACTIONS.STOP_TYPING, { roomId, username });
        }, 1000);
      }
    }
  };

  if (!activeFile) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100" style={{ backgroundColor: '#1e1e1e', color: '#888' }}>
        <p>Select a file to start coding</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 16px", backgroundColor: "#1e1e1e", color: "#ccc", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{activeFile.name}</span>
        <select 
          value={activeFile.language} 
          onChange={(e) => onLanguageChange(activeFile.id, e.target.value)}
          className="form-select form-select-sm"
          style={{ width: "auto", backgroundColor: "#333", color: "#fff", border: "1px solid #444" }}
        >
          {LANGUAGES.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <MonacoEditor
          height="100%"
          language={activeFile.language}
          theme="vs-dark"
          value={activeFile.code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}

export default Editor;
