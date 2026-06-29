import express from 'express';
import { type Express } from 'express';
import { RegisterRoutes } from './generated/routes';

const app: Express = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Register tsoa routes with the app
RegisterRoutes(app);

export default app;