const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");

const PORT = env.PORT;

const startServer = async () => {
  try {
    await connectDB(env.MONGO_URI, { dnsServers: env.MONGO_DNS_SERVERS });
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
