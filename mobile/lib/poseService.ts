import axios from 'axios';

const SERVER_URL = ''; // Replace with your server's IP address and port

export async function getPoseData() {
  try {
    const response = await axios.get(`${SERVER_URL}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching pose data:', error);
    throw new Error('Failed to fetch pose data from server');
  }
}