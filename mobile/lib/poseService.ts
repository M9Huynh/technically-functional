import axios from "axios";

const SERVER_URL = 'http://192.168.2.142:5001'; // Flask server (keep for reset)
const WS_URL = 'ws://192.168.2.142:5002';       // WebSocket server (new)

export type Side = "RIGHT" | "LEFT";
export type Facing = "front" | "back";

export type Landmark = { x: number; y: number; z: number };
export type Connection = [number, number];

export type ProcessFrameResponse = {
  landmarks: Landmark[] | null;
  connections: Connection[];
  metrics: any;
  processing_time?: number;
};

// WebSocket connection
let ws: WebSocket | null = null;
let messageCallbacks: Map<string, (data: any) => void> = new Map();

export function connectWebSocket(
  onMessage: (data: ProcessFrameResponse) => void,
  onError: (error: Error) => void
) {
  if (ws) {
    ws.close();
  }

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    onError(new Error('WebSocket connection error'));
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    ws = null;
  };

  return () => {
    if (ws) {
      ws.close();
    }
  };
}

export function sendFrame(
  imageBase64: string,
  side: Side,
  facing: Facing
) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('WebSocket not connected');
    return;
  }

  const mirrored = facing === "front";
  
  ws.send(JSON.stringify({
    image: imageBase64,
    side,
    mirrored,
  }));
}

// Keep this for reset and other HTTP calls
export async function resetBackend(): Promise<void> {
  await axios.post(`${SERVER_URL}/reset`, {}, { timeout: 8000 });
}


// import axios from "axios";

// const SERVER_URL = 'http://10.0.0.34:5001'; // Replace with your server's IP address and port

// export type Side = "RIGHT" | "LEFT";
// export type Facing = "front" | "back";

// export type Landmark = { x: number; y: number; z: number };
// export type Connection = [number, number];

// export type ProcessFrameResponse = {
//   landmarks: Landmark[] | null;
//   connections: Connection[];
//   metrics: any;
//   error?: string;
// };

// export async function processFrame(
//   imageBase64: string,
//   side: Side,
//   facing: Facing
// ): Promise<ProcessFrameResponse> {
//   const mirrored = facing === "front"; // front cam usually mirrored

//   const res = await axios.post(
//     `${SERVER_URL}/process_frame`,
//     { imageBase64, side, mirrored, legsOnly: true },
//     { headers: { "Content-Type": "application/json" }, timeout: 15000 }
//   );

//   return res.data as ProcessFrameResponse;
// }

// export async function resetBackend(): Promise<void> {
//   await axios.post(`${SERVER_URL}/reset`, {}, { timeout: 8000 });
// }
// export async function getPoseData() {
//   try {
//     const response = await axios.get(`${SERVER_URL}`);
//     return response.data;
//   } catch (error) {
//     console.error('Error fetching pose data:', error);
//     throw new Error('Failed to fetch pose data from server');
//   }
// }