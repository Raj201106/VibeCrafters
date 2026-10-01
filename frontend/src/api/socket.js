import { io } from 'socket.io-client';

let socket;

export const getSocket = () => {
  if (!socket) {
    const url = import.meta.env.VITE_SOCKET_URL || '/';
    socket = io(url, { withCredentials: true, autoConnect: false });
  }
  return socket;
};
