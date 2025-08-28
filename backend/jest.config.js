module.exports = {
  reporters: [
    "default",
    ["jest-junit", { outputDirectory: "./backend", outputName: "junit-report.xml" }]
  ],
  testEnvironment: "node",
};
