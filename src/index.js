const express = require("express");
const { ServerConfig } = require("./config");
const apiRoutes = require("./routes");
const Crons = require("./utils/common/cronJobs");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRoutes);

app.listen(ServerConfig.PORT, () => {
  console.log("Server is listening at port", ServerConfig.PORT);
  Crons();
});
