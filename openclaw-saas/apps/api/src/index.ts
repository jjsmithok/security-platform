import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { stripeRouter } from './routes/stripe.routes.js';
import { protectedRouter } from './routes/protected.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './services/rate-limiter.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/protected', protectedRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});

export default app;
