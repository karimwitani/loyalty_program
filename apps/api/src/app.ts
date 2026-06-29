import express from 'express';
import { type Express } from 'express';

const app: Express = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

export default app;