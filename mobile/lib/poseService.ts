import axios from "axios";

const SERVER_URL = 'http://10.0.0.34:5001'; // Replace with your server's IP address and port

export type Side = "RIGHT" | "LEFT";
export type Facing = "front" | "back";

export type Landmark = { x: number; y: number; z: number };
export type Connection = [number, number];

export type ProcessFrameResponse = {
  landmarks: Landmark[] | null;
  connections: Connection[];
  metrics: any;
  error?: string;
};

export type PrecheckFrameResponse = {
  ok: boolean;
  tooDark: boolean;
  inFrame: boolean;
  kneeVisible: boolean;
  message: string;
  error?: string;
};


export async function processFrame(
  imageBase64: string,
  side: Side,
  facing: Facing
): Promise<ProcessFrameResponse> {
  const mirrored = facing === "front"; // front cam usually mirrored

  const res = await axios.post(
    `${SERVER_URL}/process_frame`,
    { imageBase64, side, mirrored, legsOnly: true },
    { headers: { "Content-Type": "application/json" }, timeout: 15000 }
  );

  return res.data as ProcessFrameResponse;
}

export async function precheckFrame(
  imageBase64: string,
  side: Side,
  facing: Facing
): Promise<PrecheckFrameResponse> {
  const mirrored = facing === "front";

  const res = await axios.post(
    `${SERVER_URL}/precheck_frame`,
    { imageBase64, side, mirrored, legsOnly: true },
    { headers: { "Content-Type": "application/json" }, timeout: 10000 }
  );

  return res.data as PrecheckFrameResponse;
}

export async function resetBackend(): Promise<void> {
  await axios.post(`${SERVER_URL}/reset`, {}, { timeout: 8000 });
}
// export async function getPoseData() {
//   try {
//     const response = await axios.get(`${SERVER_URL}`);
//     return response.data;
//   } catch (error) {
//     console.error('Error fetching pose data:', error);
//     throw new Error('Failed to fetch pose data from server');
//   }
// }