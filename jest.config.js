/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src"],
    testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
    transform: {
        "^.+\\.tsx?$": ["ts-jest", {
            tsconfig: {
                moduleResolution: "node",
                paths: {
                    "@/*": ["./src/*"]
                }
            }
        }],
    },
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}",
        "!src/**/*.d.ts",
        "!src/**/__tests__/**",
    ],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    moduleDirectories: ["node_modules", "src"],
    setupFilesAfterEnv: [],
};
