import { useEffect, useState } from "react";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
let socket;

export const useSocket = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Parse userId from token (simple decode - in production use jwt-decode)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      socket = io(SOCKET_URL);
      
      socket.on("connect", () => {
        console.log("Socket connected");
        socket.emit("authenticate", userId);
      });

      socket.on("notification", (data) => {
        setNotifications(prev => [data, ...prev]);
        
        // Show browser notification if permitted
        if (Notification.permission === "granted") {
          new Notification("Payment Received", {
            body: data.message,
            icon: "/vite.svg"
          });
        }

        // Auto-remove after 5 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.timestamp !== data.timestamp));
        }, 5000);
      });

      return () => {
        if (socket) socket.disconnect();
      };
    } catch (e) {
      console.error("Socket init error:", e);
    }
  }, []);

  return { notifications };
};
