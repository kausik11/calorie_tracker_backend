const mongoose = require("mongoose");
const dns = require("dns");

let connectPromise = null;
let configuredDnsServers = null;

const configureDnsServers = (servers) => {
  if (!servers || configuredDnsServers === servers) {
    return;
  }

  const parsedServers = servers
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (parsedServers.length === 0) {
    return;
  }

  dns.setServers(parsedServers);
  configuredDnsServers = servers;
};

const connectDB = async (uri, options = {}) => {
  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  configureDnsServers(options.dnsServers);

  mongoose.set("strictQuery", true);
  connectPromise = mongoose
    .connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    })
    .then(() => {
      console.log("MongoDB connected");
      return mongoose.connection;
    })
    .catch((error) => {
      connectPromise = null;
      throw error;
    });

  return connectPromise;
};

module.exports = connectDB;
