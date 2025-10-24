import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import hederaRoutes from './hedera/route.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/hedera', hederaRoutes);

// app.listen(port, () => {
//     console.log('Hotel Booking Backend running on port', port);
//     console.log('Hedera Network:', process.env.HEDERA_NETWORK);
//     console.log('Available at: http://localhost:' + port);
// });

export default app;