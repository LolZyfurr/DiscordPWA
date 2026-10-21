import React from 'https://esm.sh/react@18';
import ReactDOM from 'https://esm.sh/react-dom@18/client';
import App from './components/App.js';

const e = React.createElement;

ReactDOM.createRoot(document.getElementById('root')).render(
    e(React.StrictMode, null, e(App))
);