// config should be first file
import "./config";
import express, { Request, Response } from "express";
import multer from "multer";

import cors from "cors";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { extname, join } from "path";
import serveIndex from "serve-index";

import http from 'http';
import https from 'https';

const app = express();

// app.use(cors());
app.use(cors({
  origin: ["https://translation.aicte-india.org/","https://anuvadini.aicte-india.org/","http://localhost:3000"]
}));
app.use(express.json());
app.use(express.urlencoded());

// const port = process.env.PORT || 8080;

const directory = process.env.DIRECTORY || "./uploads" || tmpdir();

app.use(
  "/cdn",
  express.static(directory),
  serveIndex(directory, { icons: true })
);

if (!existsSync(directory)) {
  try {
    mkdirSync(directory);
  } catch (err) {
    console.error(err);
  }
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, directory);
  },
  filename: function (_req, file, cb) {
    // Rename the file to have _ instead of space

    const uniquePrefix = Date.now() + "_" + Math.round(Math.random() * 1e9);
    cb(
      null,
      uniquePrefix +
        "_" +
        file.originalname
          .substring(0, file.originalname.lastIndexOf("."))
          .replace(/[^a-zA-Z0-9]+/, "_") +
        "." +
        extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

app.post(
  "/upload",
  upload.single("file"),
  async (
    req: Request<
      {},
      {},
      {
        source: string;
        dest: string;
      }
    >,
    res: Response
  ) => {
    const { source, dest } = req.body;
    console.log(
      source,
      JSON.parse(dest).value.replace("-IN", ""),
      req.file?.path,
      "body"
    );
    const spawn = require("child_process").spawn;
    const pythonProcess = spawn("python", [
      ".\\translator\\run.py",
      "--file",
      req.file?.filename,
      "--input_dir",
      join(__dirname, "..", directory),
      "--languages",
      JSON.parse(dest).value.replace("-IN", ""),
      "--from_language",
      JSON.parse(source).value.replace("-IN", ""),
    ]);
    try {
      const data = await new Promise((resolve) => {
        pythonProcess.stdout.on("data", (data: any) => {
          try {
            console.log(data.toString());
          } catch (err) {
            console.error(err);
          }
        });
        pythonProcess.stderr.on("data", (data: any) => {
          console.error("err", data.toString());
        });
        pythonProcess.on("close", (code: any) => {
          const filename = req.file?.filename as string;
          // remove extension from filename
          const file = filename.substring(0, filename.lastIndexOf("."));
          resolve(file);
          console.log("close", code);
        });
      });
      console.log({ data });
      return res.send(data);
    } catch (err) {
      console.error(err);
      return res.status(500).send();
    }
  }
);

const parentPath = `C:\\Users\\aicte\\Work\\.ssl\\translation-independent-1.aniketbiprojit.me`
// Certificate
const privateKey = readFileSync(join(parentPath,'privkey.pem'), 'utf8');
const certificate = readFileSync(join(parentPath,'cert.pem'), 'utf8');
const ca = readFileSync(join(parentPath,'chain.pem'), 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(80, () => {
	console.log('HTTP Server running on port 80');
});

httpsServer.listen(443, () => {
	console.log('HTTPS Server running on port 443');
});