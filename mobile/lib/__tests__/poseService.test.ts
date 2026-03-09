import axios from 'axios';
import { processFrame, resetBackend, Side, Facing } from '../poseService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('poseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processFrame', () => {
    it('should call /process_frame with front camera (mirrored=true)', async () => {
      const mockResponse = {
        data: {
          landmarks: [{ x: 0.1, y: 0.2, z: 0.3 }],
          connections: [[0, 1]],
          metrics: { rep_count: 5 },
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const imageBase64 = 'base64imagestring';
      const side: Side = 'RIGHT';
      const facing: Facing = 'front';

      const result = await processFrame(imageBase64, side, facing);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://10.0.0.101:5001/process_frame', //IP address should change based on your connection but will work for tests
        {
          imageBase64,
          side,
          mirrored: true,
          legsOnly: true,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should call /process_frame with back camera', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await processFrame('img', 'LEFT', 'back');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ mirrored: false }),
        expect.any(Object)
      );
    });

    it('should throw an error if the request fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(processFrame('img', 'RIGHT', 'front')).rejects.toThrow('Network error');
    });
  });

  describe('resetBackend', () => {
    it('should call /reset endpoint', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await resetBackend();

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://10.0.0.101:5001/reset',
        {},
        { timeout: 8000 }
      );
    });

    it('should throw an error if the reset fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Reset failed'));

      await expect(resetBackend()).rejects.toThrow('Reset failed');
    });
  });
});