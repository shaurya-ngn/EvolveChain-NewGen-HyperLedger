const app = require("express").Router();
const AppController = require("../controllers/app/AppController");
const AuthMiddleware = require("../middlewares/CheckAuth");

app.post("/initialize", AppController.Initialize.bind(AppController));
app.post("/setpin/:key", AppController.SetPin.bind(AppController));
app.post("/checkpin/:key", AppController.CheckPin.bind(AppController));
app.post("/changepin/:key", AppController.ChangePin.bind(AppController));
app.post("/login/:key", AppController.Login.bind(AppController));
app.post("/getprofile/:key", AppController.GetProfile.bind(AppController));
app.post("/logout/:key", AppController.Logout.bind(AppController));

app.use(AuthMiddleware(["app"]));

module.exports = app;
