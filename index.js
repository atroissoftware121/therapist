const cors = require("cors");
const http = require("http");
const express = require("express");
const Routes = require("./src/routes");
const { errors } = require("celebrate");
const { Server } = require("socket.io");
const { PORT } = require("./src/config");
const bodyParser = require("body-parser");
const mongodb = require("./src/loaders/mongodb");
const {handleSocket, server, app} = require("./src/loaders/socket");

mongodb();
// Allow all incoming traffic (not recommended for production)

app.use(cors({
  origin: 'https://shahya-admin-panel-xy88.vercel.app', // Allow your frontend's origin
  methods: ['GET', 'POST'], // Adjust methods as needed
}));

app.get("/status", (req, res) => {
  res.status(200).end();
});

app.head("/status", (req, res) => {
  res.status(200).end();
});

app.enable("trust proxy");

// app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use("/", Routes());

app.use(errors());

app.use((req, res, next) => {
  const err = new Error("Not Found");
  err["status"] = 404;
  next(err);
});

app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    return res.status(err.status).send({ message: err.message }).end();
  }
  return next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({
    errors: {
      message: err.message,
    },
  });
});
server.listen(PORT, () => console.log("App listen on PORT:" + PORT));
handleSocket();
