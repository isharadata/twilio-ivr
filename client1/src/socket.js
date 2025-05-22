import { io } from 'socket.io-client';

import AppContext from './AppContext';

// "undefined" means the URL will be computed from the `window.location` object
//const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3001';

const bUrl = `${window.location.host}`;

var baseUrl = "";

if(bUrl.includes("localhost"))
    baseUrl = "http://localhost:3001";
else
    baseUrl = AppContext.baseUrl;

export const socket = io(baseUrl);