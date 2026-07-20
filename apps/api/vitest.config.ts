import { defineConfig } from "vitest/config";
import path from "path";

const alias = {
    "@": path.resolve(__dirname, "./src"),
};

export default defineConfig({
    test: {
        projects: [
            {
                resolve: { alias },
                test: {
                    name: "unit",
                    include: ["src/**/*.unit.test.ts"],
                },
            },
            {
                resolve: { alias },
                test: {
                    name: "component",
                    include: ["src/**/*.component.test.ts"],
                    setupFiles: ["./src/test/env.setup.ts"],
                    env: { USE_FAKE_REPOSITORIES: "true" },
                },
            },
            {
                resolve: { alias },
                test: {
                    name: "integration",
                    include: ["src/**/*.integration.test.ts"],
                    setupFiles: ["./src/test/env.setup.ts"],
                },
            },
            {
                resolve: { alias },
                test: {
                    name: "e2e",
                    include: ["src/**/*.e2e.test.ts"],
                    setupFiles: ["./src/test/env.setup.ts"],
                },
            },
        ],
    },
});
