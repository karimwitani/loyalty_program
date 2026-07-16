import express from 'express';
import { type Express } from 'express';
import { RegisterRoutes } from './generated/routes';
import swaggerUi from 'swagger-ui-express';

const app: Express = express();

app.use(express.json());

// Generate a Swagger UI
let cachedSpec: object | null = null;
app.use(
  "/docs",
  swaggerUi.serve,
  async (_req: express.Request, res: express.Response) => {
    if (!cachedSpec) {
      const fs = await import("fs");
      const path = await import("path");
      const raw = fs.readFileSync(
        path.resolve(__dirname, "../build/swagger.json"),
        "utf-8",
      );
      cachedSpec = JSON.parse(raw) as object;
    }
    return res.send(swaggerUi.generateHTML(cachedSpec));
  },
);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Register tsoa routes with the app
RegisterRoutes(app);

export default app;