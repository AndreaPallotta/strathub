import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

declare global {
  interface Window {
    Apex?: any;
  }
}

window.Apex = {
  chart: {
    background: 'transparent',
    foreColor: '#e9ecef',
    toolbar: { show: true },
  },
  grid: {
    borderColor: '#343a40',
    strokeDashArray: 3,
  },
  xaxis: {
    labels: {
      style: {
        colors: '#adb5bd',
      },
    },
    axisBorder: {
      color: '#495057',
    },
    axisTicks: {
      color: '#495057',
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: '#adb5bd',
      },
    },
  },
  legend: {
    labels: {
      colors: '#e9ecef',
    },
  },
  theme: {
    mode: 'dark',
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider
      defaultColorScheme='dark'
      theme={{
      fontFamily: 'Inter, sans-serif',
      primaryColor: 'blue',
      defaultRadius: 'md',
    }}>
      <Notifications />
      <App />
    </MantineProvider>
  </React.StrictMode>
);