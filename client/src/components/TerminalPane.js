import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { ACTIONS } from '../Actions';

const TerminalPane = forwardRef(({ socketRef, roomId }, ref) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);

  useImperativeHandle(ref, () => ({
    executeCode: (code, language) => {
      if (xtermRef.current) {
        xtermRef.current.clear();
        xtermRef.current.writeln(`\x1b[32mExecuting ${language} code...\x1b[0m`);
      }
      socketRef.current.emit(ACTIONS.EXECUTE_START, { roomId, code, language });
    }
  }));

  useEffect(() => {
    if (!socketRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
      },
      cursorBlink: true,
      fontFamily: 'monospace',
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    term.onData(data => {
      socketRef.current.emit(ACTIONS.EXECUTE_INPUT, { roomId, data });
    });

    const handleOutput = ({ output }) => {
      term.write(output);
    };

    const handleEnd = ({ exitCode }) => {
      term.writeln(`\r\n\x1b[33m[Process exited with code ${exitCode}]\x1b[0m`);
    };

    socketRef.current.on(ACTIONS.EXECUTE_OUTPUT, handleOutput);
    socketRef.current.on(ACTIONS.EXECUTE_END, handleEnd);

    return () => {
      window.removeEventListener('resize', handleResize);
      socketRef.current.off(ACTIONS.EXECUTE_OUTPUT, handleOutput);
      socketRef.current.off(ACTIONS.EXECUTE_END, handleEnd);
      term.dispose();
    };
  }, [socketRef, roomId]);

  return <div ref={terminalRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
});

export default TerminalPane;
