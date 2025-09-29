import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { apiClient } from '../apiClient';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create axios instance with correct base URL', () => {
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should add authorization header when token exists', () => {
    const mockInstance = {
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockInstance as any);

    // Set up token in localStorage
    localStorage.setItem('accessToken', 'test-token');

    // Re-import to trigger interceptor setup
    delete require.cache[require.resolve('../apiClient')];
    require('../apiClient');

    // Check that request interceptor was set up
    expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
    
    // Get the request interceptor function
    const requestInterceptor = mockInstance.interceptors.request.use.mock.calls[0][0];
    
    // Test the interceptor
    const config = { headers: {} };
    const result = requestInterceptor(config);
    
    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  it('should not add authorization header when token does not exist', () => {
    const mockInstance = {
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockInstance as any);

    // Ensure no token in localStorage
    localStorage.removeItem('accessToken');

    // Re-import to trigger interceptor setup
    delete require.cache[require.resolve('../apiClient')];
    require('../apiClient');

    // Get the request interceptor function
    const requestInterceptor = mockInstance.interceptors.request.use.mock.calls[0][0];
    
    // Test the interceptor
    const config = { headers: {} };
    const result = requestInterceptor(config);
    
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should handle response interceptor success', () => {
    const mockInstance = {
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockInstance as any);

    // Re-import to trigger interceptor setup
    delete require.cache[require.resolve('../apiClient')];
    require('../apiClient');

    // Get the response interceptor success function
    const responseSuccessInterceptor = mockInstance.interceptors.response.use.mock.calls[0][0];
    
    // Test the interceptor
    const response = { data: { test: 'data' } };
    const result = responseSuccessInterceptor(response);
    
    expect(result).toBe(response);
  });

  it('should handle 401 error and clear tokens', async () => {
    const mockInstance = {
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockInstance as any);

    // Set up tokens in localStorage
    localStorage.setItem('accessToken', 'test-token');
    localStorage.setItem('refreshToken', 'test-refresh-token');

    // Re-import to trigger interceptor setup
    delete require.cache[require.resolve('../apiClient')];
    require('../apiClient');

    // Get the response interceptor error function
    const responseErrorInterceptor = mockInstance.interceptors.response.use.mock.calls[0][1];
    
    // Test the interceptor with 401 error
    const error = {
      response: {
        status: 401,
      },
    };

    try {
      await responseErrorInterceptor(error);
    } catch (e) {
      // Expected to throw
    }

    // Check that tokens were cleared
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('should handle non-401 errors without clearing tokens', async () => {
    const mockInstance = {
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockInstance as any);

    // Set up tokens in localStorage
    localStorage.setItem('accessToken', 'test-token');
    localStorage.setItem('refreshToken', 'test-refresh-token');

    // Re-import to trigger interceptor setup
    delete require.cache[require.resolve('../apiClient')];
    require('../apiClient');

    // Get the response interceptor error function
    const responseErrorInterceptor = mockInstance.interceptors.response.use.mock.calls[0][1];
    
    // Test the interceptor with 500 error
    const error = {
      response: {
        status: 500,
      },
    };

    try {
      await responseErrorInterceptor(error);
    } catch (e) {
      // Expected to throw
    }

    // Check that tokens were not cleared
    expect(localStorage.getItem('accessToken')).toBe('test-token');
    expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token');
  });

  it('should handle network errors', async () => {
    const mockInstance = {
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockInstance as any);

    // Re-import to trigger interceptor setup
    delete require.cache[require.resolve('../apiClient')];
    require('../apiClient');

    // Get the response interceptor error function
    const responseErrorInterceptor = mockInstance.interceptors.response.use.mock.calls[0][1];
    
    // Test the interceptor with network error (no response)
    const error = {
      message: 'Network Error',
    };

    await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
  });
});