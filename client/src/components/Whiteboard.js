import React, { useEffect, useState } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { ACTIONS } from '../Actions';

function Whiteboard({ socketRef, roomId }) {
  const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));

  useEffect(() => {
    if (!socketRef.current) return;

    // Listen to local changes and broadcast them
    const unlisten = store.listen(
      (update) => {
        if (update.source === 'user') {
          socketRef.current.emit(ACTIONS.WHITEBOARD_UPDATE, {
            roomId,
            updates: update.changes,
          });
        }
      },
      { scope: 'document', source: 'user' } // only sync document changes made by user
    );

    // Listen to remote changes and apply them
    const handleRemoteUpdate = ({ updates }) => {
      store.mergeRemoteChanges(() => {
        const { added, updated, removed } = updates;
        
        if (added && Object.keys(added).length > 0) {
          store.put(Object.values(added));
        }
        if (updated && Object.keys(updated).length > 0) {
          const toPut = Object.values(updated).map((u) => u[1]); // [old, new]
          store.put(toPut);
        }
        if (removed && Object.keys(removed).length > 0) {
          store.remove(Object.keys(removed));
        }
      });
    };

    socketRef.current.on(ACTIONS.WHITEBOARD_UPDATE, handleRemoteUpdate);

    return () => {
      unlisten();
      socketRef.current.off(ACTIONS.WHITEBOARD_UPDATE, handleRemoteUpdate);
    };
  }, [store, socketRef, roomId]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Tldraw store={store} inferDarkMode />
    </div>
  );
}

export default Whiteboard;
