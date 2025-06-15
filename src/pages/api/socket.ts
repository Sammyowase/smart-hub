import { NextApiRequest } from "next";
import { NextApiResponseServerIO, socketManager } from "@/lib/socket";

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    console.log("Socket.io already running");
  } else {
    console.log("Socket.io starting...");
    const io = socketManager.initialize(res.socket.server);
    res.socket.server.io = io;
    console.log("Socket.io started successfully");
  }
  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
