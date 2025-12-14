const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';

const defaultApiBase = `${origin}/api`;
const defaultWsBase = `${wsProtocol}//${host}`;

const apiBase = import.meta.env.VITE_API_BASE_URL ?? defaultApiBase;
const wsBase = import.meta.env.VITE_WS_BASE_URL ?? defaultWsBase;

export const API_BASE_URL = apiBase;
export const WS_BASE_URL = wsBase;

export const ENGINE_WS_URL = `${WS_BASE_URL}/ws/engine`;
export const ENGINE_API_PREFIX = `${API_BASE_URL}`;