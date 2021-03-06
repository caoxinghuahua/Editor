let express = require("express");
let app = express();
let path = require("path");
let fs = require("fs");
let cors = require("cors");
let logger = require("morgan");
let bodyParser = require("body-parser");
//let multer = require("multer");
let http = require("http").Server(app);
let io = require("socket.io")(http);

// 跨域
let allowCors = function(req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
};
app.use(allowCors); //使用跨域中间件
app.use(logger("dev"));

//const upload = multer({ dest: __dirname + "/tmp/img" }); //设置上传的目录文件夹

app.use(express.static(path.join(__dirname, "public")));
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());

var editors = []; // 编辑器对象数组
var stages = []; // 舞台对象数组

app.get("/", (req, res) => {
  res.sendFile(__dirname + "../public/index.html");
});

// 引入七牛云配置
const qnconfig = require("./config.js");
// 处理请求
app.get("/token", (req, res, next) => {
  // console.log(qnconfig.uploadToken)
  res.status(200).send(qnconfig.uploadToken);
});

app.post("/data", (req, res, next) => {
  let str_json = JSON.stringify(req.body);
  console.log(str_json);
  fs.writeFile("data.json", str_json, "utf8", () => {
    // 保存完成后的回调函数
    console.log("保存完成");
    str_json = "";
    res.send({
      code: 1
    });
  });
});

//客户端连接
io.on("connection", socket => {
  console.log("客户端连接", socket.id);

  //客户端连接失败
  socket.on("connect_failed", () => {
    console.log("connect_failed to Server");
  });
  //客户端连接出错
  socket.on("error", () => {
    console.log("error");
    alert("connect error");
  });
  //客户端重连中
  socket.on("reconnecting", () => {
    console.log("reconnecting");
  });
  //客户端重连成功
  socket.on("reconnect", () => {
    console.log("reconnect");
  });

  //客户端断开连接
  socket.on("disconnect", () => {
    console.log("客户端断开连接", socket.id);
    // if (stages.findIndex(item => item.sid === socket.id)) {
    //   stages.splice(stages.findIndex(item => item.sid === socket.id), 1);
    // }
    // if (editors.findIndex(item => item.sid === socket.id)) {
    //   editors.splice(editors.findIndex(item => item.sid === socket.id), 1);
    // }
  });

  // 上线
  socket.on("online", info => {
    if (info.type == "editor") {
      console.log("编辑器上线", info.appid);
      editors.push({
        appid: info.appid,
        sid: socket.id
      });
    } else if (info.type == "stage") {
      console.log("舞台上线", info.appid);
      stages.push({
        appid: info.appid,
        sid: socket.id
      });
    }
    socket.join(info.appid);
    console.log(editors, stages);
    //socket.broadcast.emit("online", name);
  });

  app.post("/clear", (req, res, next) => {
    console.log(req.body);
    socket.broadcast.to(req.body.appid).emit("clearStage");
    console.log("舞台数据清除");
    res.send({
      code: 1
    });
    //next();
  });

  app.post("/apply", (req, res, next) => {
    console.log(req.body);
    socket.broadcast.to(req.body.appid).emit("onceUpdate");
    console.log("请求编辑器更新舞台数据");
    res.send({
      code: 1
    });
    //next();
  });

  // 坐标
  socket.on("sendMsg", data => {
    console.log("编辑器数据获取", data);
    socket.broadcast.to(data.appid).emit("receiveMsg", data.data);
  });

  // 预览
  socket.on("sendMsgPre", data => {
    console.log("编辑器数据获取", data);
    socket.broadcast.to(data.appid).emit("receiveMsgPre", data.data);
  });
});

http.listen(3006, () => {
  console.log("listening on*:3006");
});
